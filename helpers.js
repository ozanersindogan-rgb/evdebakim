// ── Paylaşılan Sabitler ──
window.AY_SIRA = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

// ── HELPERS + XLSX WRITER ──
// ============ HELPERS ============

// Yedekleme yetkisi sadece bu UID'ye ait kullanıcıda
const YEDEK_YETKILI_UID = 'SBIyovehB5RAkSkhc05bIm88PJs2'; // Ozan Ersin DOĞAN


// ============ PURE JS XLSX WRITER (no dependencies) ============
// Uses browser CompressionStream API for ZIP creation

async function uint8ToBase64(bytes) {
  return new Promise(resolve => {
    const blob = new Blob([bytes]);
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

async function deflateRaw(data) {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  const reader = cs.readable.getReader();
  writer.write(data);
  writer.close();
  const chunks = [];
  while(true) {
    const {done, value} = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s,c)=>s+c.length,0);
  const out = new Uint8Array(total);
  let off=0;
  for(const ch of chunks) { out.set(ch,off); off+=ch.length; }
  return out;
}

function crc32(data) {
  const table = new Int32Array(256);
  for(let i=0;i<256;i++){
    let c=i;
    for(let j=0;j<8;j++) c=c&1?0xEDB88320^(c>>>1):c>>>1;
    table[i]=c;
  }
  let crc=0xFFFFFFFF;
  for(let i=0;i<data.length;i++) crc=table[(crc^data[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}

function le16(v){const b=new Uint8Array(2);b[0]=v&0xFF;b[1]=(v>>8)&0xFF;return b;}
function le32(v){const b=new Uint8Array(4);b[0]=v&0xFF;b[1]=(v>>8)&0xFF;b[2]=(v>>16)&0xFF;b[3]=(v>>24)&0xFF;return b;}
function str(s){return new TextEncoder().encode(s);}
function concat(...arrays){
  const total=arrays.reduce((s,a)=>s+a.length,0);
  const out=new Uint8Array(total);let off=0;
  for(const a of arrays){out.set(a,off);off+=a.length;}
  return out;
}


// ═══════════════════════════════════════════════════════════
// YEDEKLEME SİSTEMİ
// ─ Yedekler bilgisayara JSON dosyası olarak indirilir (Firestore limiti yok)
// ─ Her gün ilk girişte (08:30 sonrası) otomatik yedek indirmesi tetiklenir
// ─ Geri yükleme: JSON dosyası seç → Firestore'a aktar
// ═══════════════════════════════════════════════════════════

const YEDEK_KOLEKSIYON = 'yedekler'; // geriye dönük uyumluluk için
const YEDEK_MAKS = 30;

function trBugunTarih() {
  return new Date().toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('.').reverse().join('-');
}

function trSaat() {
  return parseInt(new Date().toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false
  }));
}

async function yedekGunlukKontrol() {
  try {
    const bugun = trBugunTarih();
    const saat  = trSaat();
    const trDakika = parseInt(new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', minute: '2-digit' }));
    const trToplamDakika = saat * 60 + trDakika;
    if (trToplamDakika < 8 * 60 + 30) {
      console.log(`[Yedek] Saat ${saat}:${String(trDakika).padStart(2,'0')} — yedek saati henüz gelmedi`);
      return;
    }
    const sonYedek = localStorage.getItem('evdebakim_son_yedek');
    if (sonYedek === bugun) {
      console.log(`[Yedek] Bugün (${bugun}) zaten yedek alınmış.`);
      return;
    }
    await yedekAl(`Otomatik — ${bugun}`);
  } catch(e) {
    console.warn('[Yedek] Kontrol hatası:', e.message);
  }
}

// ── YEDEK AL: Firestore'a kaydet (byte bazlı parçalı yazma) ──
async function yedekAl(aciklama) {
  if (!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  if (!allData.length) { showToast('⚠️ Yedeklenecek veri yok'); return; }
  showToast('💾 Yedek kaydediliyor...');
  try {
    const bugun = trBugunTarih();
    const zaman = new Date().toISOString();
    const ozet = {
      toplamKayit: allData.length,
      aktif: allData.filter(r => r.DURUM === 'AKTİF').length,
      aylar: [...new Set(allData.map(r => r.AY).filter(Boolean))],
    };
    const temizVeri = allData.map(r => { const { _fbId, _tpRef, _tpFbId, ...rest } = r; return rest; });

    // ── BYTE BAZLI PARÇALAMA: Firestore tek doc limiti 1MB ──
    // Her parçanın JSON boyutunu ölçerek 700KB altında tut (güvenli marj)
    const BYTE_LIMIT = 700 * 1024; // 700KB
    const parcalar = [];
    let mevcutParca = [];
    let mevcutBoyut = 2; // [] için 2 byte

    for (const kayit of temizVeri) {
      const kayitJson = JSON.stringify(kayit);
      const kayitBoyut = new TextEncoder().encode(kayitJson).length + 1; // +1 virgül
      if (mevcutBoyut + kayitBoyut > BYTE_LIMIT && mevcutParca.length > 0) {
        parcalar.push(mevcutParca);
        mevcutParca = [];
        mevcutBoyut = 2;
      }
      mevcutParca.push(kayit);
      mevcutBoyut += kayitBoyut;
    }
    if (mevcutParca.length > 0) parcalar.push(mevcutParca);

    const docId = bugun;
    const db = firebase.firestore();

    // Ana dökümanı yaz (veri içermez, sadece meta)
    await db.collection(YEDEK_KOLEKSIYON).doc(docId).set({
      tarih: bugun,
      zaman,
      aciklama: aciklama || `Manuel — ${bugun}`,
      olusturan: currentUser?.ad || 'Sistem',
      ozet,
      parcaSayisi: parcalar.length,
    });

    // Her parçayı alt koleksiyona yaz
    await Promise.all(parcalar.map((parca, idx) =>
      db.collection(YEDEK_KOLEKSIYON).doc(docId)
        .collection('parcalar').doc(String(idx))
        .set({ veri: JSON.stringify(parca) })
    ));

    localStorage.setItem('evdebakim_son_yedek', bugun);
    showToast(`✅ Yedek kaydedildi — ${ozet.toplamKayit} kayıt (${parcalar.length} parça)`);

    await yedekEskilerSil();
    if (document.getElementById('page-yedekler')?.classList.contains('active')) yedekSayfaYukle();
  } catch(e) {
    console.error('[Yedek] Hata:', e);
    showToast('❌ Yedek alınamadı: ' + e.message);
  }
}

// ── ESKİ YEDEKLERİ SİL: 7 günden eski olanları Firestore'dan temizle ──
async function yedekEskilerSil() {
  try {
    const snap = await firebase.firestore().collection(YEDEK_KOLEKSIYON)
      .orderBy('tarih', 'asc')
      .get();
    if (snap.size <= 7) return; // 7 veya daha az yedek varsa dokunma
    const fazla = snap.size - 7;
    const silinecekler = snap.docs.slice(0, fazla); // en eski olanlar
    for (const doc of silinecekler) {
      await doc.ref.delete();
      console.log('[Yedek] Eski yedek silindi:', doc.id);
    }
  } catch(e) {
    console.warn('[Yedek] Eski silme hatası:', e.message);
  }
}

// ── YEDEK SAYFASI: Firestore'daki yedekleri listele ──
async function yedekSayfaYukle() {
  if (!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  const liste = document.getElementById('yedek-liste');
  if (!liste) return;
  liste.innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px">⏳ Yedekler yükleniyor...</div>';

  try {
    const snap = await firebase.firestore().collection(YEDEK_KOLEKSIYON)
      .orderBy('tarih', 'desc')
      .limit(7)
      .get();

    const sonYedek = localStorage.getItem('evdebakim_son_yedek') || '—';
    const allDataOzet = allData.length
      ? `${allData.length} kayıt · ${allData.filter(r => r.DURUM === 'AKTİF').length} aktif`
      : 'Veri yüklenmedi';

    let yedeklerHtml = '';
    if (snap.empty) {
      yedeklerHtml = '<div style="padding:16px;color:#64748b;font-size:13px;text-align:center">Henüz yedek yok</div>';
    } else {
      snap.docs.forEach(doc => {
        const v = doc.data();
        const ozet = v.ozet || {};
        const aciklama = v.aciklama || '';
        const otomatik = aciklama.startsWith('Otomatik');
        yedeklerHtml += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #f1f5f9;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;color:#1e293b">${v.tarih}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px">
                ${ozet.toplamKayit || '?'} kayıt · ${ozet.aktif || '?'} aktif
                &nbsp;·&nbsp; <span style="color:${otomatik ? '#0d9488' : '#7c3aed'}">${otomatik ? '🤖 Otomatik' : '👤 Manuel'}</span>
              </div>
            </div>
            <button onclick="yedekIndir('${doc.id}')"
              style="background:#1A237E;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">
              ⬇️ İndir
            </button>
          </div>`;
      });
    }

    liste.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="font-weight:800;color:#15803d;margin-bottom:4px">☁️ Firestore Yedekleme Sistemi</div>
        <div style="font-size:13px;color:#166534">
          Son yedek: <strong>${sonYedek}</strong> &nbsp;·&nbsp; Mevcut veri: <strong>${allDataOzet}</strong><br>
          Son 7 günlük yedek tutulur. 8. günde en eski otomatik silinir.
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;overflow:hidden">
        <div style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center">
          <span>📋 Yedek Listesi</span>
          <button onclick="yedekAl()" style="background:#1A237E;color:#fff;border:none;border-radius:7px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">
            + Şimdi Yedekle
          </button>
        </div>
        ${yedeklerHtml}
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
        <div style="font-weight:700;margin-bottom:10px">🔄 Yedeği Geri Yükle</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px">Listeden bir yedek indirip geri yükleme yapabilirsiniz.</div>
        <input type="file" id="yedek-dosya-input" accept=".json" onchange="yedekDosyaSecildi(this)" style="display:none">
        <button onclick="document.getElementById('yedek-dosya-input').click()"
          style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;color:#c2410c;cursor:pointer;width:100%">
          📂 JSON Dosyası Seç ve Geri Yükle
        </button>
      </div>`;
  } catch(e) {
    console.error('[Yedek] Sayfa yükleme hatası:', e);
    liste.innerHTML = `<div style="padding:16px;color:#dc2626;font-size:13px">❌ Yedekler yüklenemedi: ${e.message}</div>`;
  }
}

// ── İNDİR: Firestore'dan JSON olarak indir (parçaları birleştirerek) ──
async function yedekIndir(yedekId) {
  if (!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  try {
    showToast('⏳ Yedek hazırlanıyor...');
    const db = firebase.firestore();
    const doc = await db.collection(YEDEK_KOLEKSIYON).doc(yedekId).get();
    if (!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    const v = doc.data();

    let tumVeri = [];

    if (v.parcaSayisi) {
      // Yeni format: parçalı alt koleksiyon
      const parcalarSnap = await db.collection(YEDEK_KOLEKSIYON).doc(yedekId)
        .collection('parcalar').orderBy(firebase.firestore.FieldPath.documentId()).get();
      parcalarSnap.docs.forEach(pd => {
        try { tumVeri = tumVeri.concat(JSON.parse(pd.data().veri || '[]')); } catch(e) {}
      });
    } else if (v.veri) {
      // Eski format: tek dokümanda veri alanı
      try {
        const parsed = JSON.parse(v.veri);
        tumVeri = parsed.veri || parsed || [];
      } catch(e) { tumVeri = []; }
    }

    const icerik = JSON.stringify({
      meta: { tarih: v.tarih, zaman: v.zaman, aciklama: v.aciklama, ozet: v.ozet, olusturan: v.olusturan },
      veri: tumVeri
    }, null, 2);

    const blob = new Blob([icerik], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evdebakim_yedek_${v.tarih}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ ${v.tarih} yedeği indirildi — ${tumVeri.length} kayıt`);
  } catch(e) {
    showToast('❌ İndirme hatası: ' + e.message);
  }
}

async function yedekSil(yedekId, tarih) {
  if (!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  if (!confirm(`"${tarih}" tarihli yedeği silmek istediğinize emin misiniz?`)) return;
  try {
    await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).delete();
    showToast('🗑️ Yedek silindi'); yedekSayfaYukle();
  } catch(e) { showToast('❌ Silme hatası: ' + e.message); }
}

// ── GERİ YÜKLEME: JSON dosyasını seç → Firestore'a aktar ──
async function yedekDosyaSecildi(input) {
  const dosya = input.files[0];
  if (!dosya) return;
  if (!dosya.name.endsWith('.json')) { showToast('❌ Sadece .json dosyası seçin'); return; }

  showToast('⏳ Dosya okunuyor...');
  try {
    const metin = await dosya.text();
    const parsed = JSON.parse(metin);

    // Hem yeni format ({meta, veri}) hem eski format (düz dizi) destekle
    const veri = Array.isArray(parsed) ? parsed : (parsed.veri || []);
    const meta = parsed.meta || {};

    if (!veri.length) { showToast('❌ Dosyada kayıt bulunamadı'); return; }

    const onay = confirm(
      `📂 "${dosya.name}"\n\n` +
      `${meta.tarih ? 'Tarih: ' + meta.tarih + '\n' : ''}` +
      `${veri.length} kayıt bulundu.\n\n` +
      `⚠️ Bu işlem Firestore'a toplu yazma yapar.\n` +
      `Mevcut veriler SİLİNMEZ — sadece eksik kayıtlar eklenir.\n\n` +
      `Devam etmek istiyor musunuz?`
    );
    if (!onay) { input.value = ''; return; }

    await yedekGeriYukle(veri);
  } catch(e) {
    console.error('[Yedek] Geri yükleme hatası:', e);
    showToast('❌ Dosya okunamadı: ' + e.message);
  }
  input.value = ''; // input'u sıfırla, aynı dosya tekrar seçilebilsin
}
window.yedekDosyaSecildi = yedekDosyaSecildi;

async function yedekGeriYukle(veri) {
  if (!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  if (!veri || !veri.length) { showToast('⚠️ Yüklenecek kayıt yok'); return; }

  const db = firebase.firestore();
  const BATCH_LIMIT = 400; // Firestore batch max 500, güvenli marj

  showToast(`⏳ ${veri.length} kayıt yükleniyor...`);

  try {
    // Mevcut _fbId'leri çek — zaten var olanları atla
    const mevcutSnap = await db.collection('vatandaslar').get();
    const mevcutIdler = new Set(mevcutSnap.docs.map(d => d.id));

    // Yedek dosyasında _fbId olan kayıtlar → aynı ID ile yaz (overwrite)
    // _fbId olmayanlar → yeni doc olarak ekle
    const yazilacaklar = veri.filter(r => {
      const id = r._fbId || r.id;
      // Zaten mevcut ve üzerine yazma istemiyoruz — sadece eksik olanları ekle
      return !id || !mevcutIdler.has(id);
    });

    if (!yazilacaklar.length) {
      showToast('✅ Tüm kayıtlar zaten mevcut, ekleme yapılmadı.');
      return;
    }

    const onay2 = confirm(
      `${veri.length} kayıttan ${yazilacaklar.length} tanesi Firestore'da eksik.\n\n` +
      `Bu ${yazilacaklar.length} kaydı eklemek istiyor musunuz?`
    );
    if (!onay2) return;

    let eklenen = 0;
    for (let i = 0; i < yazilacaklar.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const parca = yazilacaklar.slice(i, i + BATCH_LIMIT);
      parca.forEach(r => {
        // _fbId, _tpRef gibi iç alanları temizle
        const { _fbId, _tpRef, _tpFbId, id, ...temiz } = r;
        const docRef = _fbId
          ? db.collection('vatandaslar').doc(_fbId)
          : db.collection('vatandaslar').doc(); // yeni ID
        batch.set(docRef, temiz);
      });
      await batch.commit();
      eklenen += parca.length;
      showToast(`⏳ ${eklenen}/${yazilacaklar.length} kayıt yazıldı...`);
    }

    showToast(`✅ Geri yükleme tamamlandı — ${eklenen} kayıt eklendi. Sayfayı yenileyiniz.`);

    // Log
    firebase.firestore().collection('islem_log').add({
      yapan: currentUser.ad,
      uid: currentUser.uid,
      zaman: firebase.firestore.FieldValue.serverTimestamp(),
      isim: '—',
      hizmet: '—',
      degisiklik: 'YEDEK GERİ YÜKLEME',
      detay: `${eklenen} kayıt eklendi`
    }).catch(() => {});

  } catch(e) {
    console.error('[Yedek] Geri yükleme Firestore hatası:', e);
    showToast('❌ Yükleme hatası: ' + e.message);
  }
}
window.yedekGeriYukle = yedekGeriYukle;


function yedekModalKapat() {}