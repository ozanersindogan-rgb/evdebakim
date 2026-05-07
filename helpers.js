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

const YEDEK_KOLEKSIYON = 'yedekler';
const YEDEK_MAKS = 5;

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

async function yedekAl(aciklama) {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  if (!allData.length) { showToast('⚠️ Yedeklenecek veri yok'); return; }
  showToast('💾 Yedek kaydediliyor...');
  try {
    const bugun = trBugunTarih();
    const zaman = new Date().toISOString();
    const ozet  = {
      toplamKayit: allData.length,
      aktif: allData.filter(r=>r.DURUM==='AKTİF').length,
      aylar: [...new Set(allData.map(r=>r.AY).filter(Boolean))],
    };
    const temizVeri = allData.map(r => { const {_fbId,...rest}=r; return rest; });

    // Firestore'a kaydet — veri JSON string olarak saklanır (1MB altı)
    await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(bugun).set({
      tarih: bugun,
      zaman,
      aciklama: aciklama || `Otomatik — ${bugun}`,
      ozet,
      olusturan: currentUser?.ad || 'Sistem',
      veri: JSON.stringify(temizVeri),
    });

    localStorage.setItem('evdebakim_son_yedek', bugun);
    showToast(`✅ Yedek kaydedildi — ${ozet.toplamKayit} kayıt`);

    // Eski yedekleri temizle (5 günlük limit)
    await yedekEskilerSil();

    if(document.getElementById('page-yedekler')?.classList.contains('active')) yedekSayfaYukle();
  } catch(e) {
    console.error('[Yedek] Hata:', e);
    showToast('❌ Yedek kaydedilemedi: ' + e.message);
  }
}

async function yedekEskilerSil() {
  try {
    const snap = await firebase.firestore().collection(YEDEK_KOLEKSIYON)
      .orderBy('tarih', 'desc').get();
    if (snap.size <= YEDEK_MAKS) return;
    const silinecekler = snap.docs.slice(YEDEK_MAKS);
    await Promise.all(silinecekler.map(d => d.ref.delete()));
    console.log(`[Yedek] ${silinecekler.length} eski yedek silindi.`);
  } catch(e) {
    console.warn('[Yedek] Eski yedek temizleme hatası:', e.message);
  }
}

async function yedekSayfaYukle() {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  const liste = document.getElementById('yedek-liste');
  if(!liste) return;
  const bugun = trBugunTarih();
  const allDataOzet = allData.length
    ? `${allData.length} kayıt · ${allData.filter(r=>r.DURUM==='AKTİF').length} aktif`
    : 'Veri yüklenmedi';

  liste.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8">⏳ Yedekler yükleniyor...</div>`;

  let yedekler = [];
  try {
    const snap = await firebase.firestore().collection(YEDEK_KOLEKSIYON)
      .orderBy('tarih', 'desc').limit(YEDEK_MAKS + 2).get();
    yedekler = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    liste.innerHTML = `<div style="color:#ef4444;padding:16px">❌ Yedekler yüklenemedi: ${e.message}</div>`;
    return;
  }

  const sonYedek = yedekler.length ? yedekler[0].tarih : '—';

  const yedekSatirlari = yedekler.map(y => {
    const bugunMu = y.tarih === bugun;
    const ozet = y.ozet || {};
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #f1f5f9;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px">${bugunMu ? '⭐ ' : ''}${y.tarih}
          <span style="font-size:11px;font-weight:400;color:#64748b;margin-left:6px">${y.aciklama||''}</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">
          ${ozet.toplamKayit||'?'} kayıt · ${ozet.aktif||'?'} aktif
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button onclick="yedekIndir('${y.id}')"
          style="background:#f0fdf4;border:1px solid #86efac;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#15803d;cursor:pointer">⬇️ İndir</button>
        <button onclick="yedekGeriYukle('${y.id}','${y.tarih}',${ozet.toplamKayit||0})"
          style="background:#fff7ed;border:1px solid #fed7aa;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#c2410c;cursor:pointer">🔄 Yükle</button>
        <button onclick="yedekSil('${y.id}','${y.tarih}')"
          style="background:#fef2f2;border:1px solid #fca5a5;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer">🗑️</button>
      </div>
    </div>`;
  }).join('');

  liste.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-weight:800;color:#15803d;margin-bottom:6px">☁️ Firestore Yedekleme</div>
      <div style="font-size:13px;color:#166534">
        Yedekler otomatik olarak buluta kaydedilir. Son 5 gün saklanır.<br>
        Son yedek: <strong>${sonYedek}</strong> &nbsp;·&nbsp; Mevcut veri: <strong>${allDataOzet}</strong>
      </div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:10px">💾 Şimdi Yedek Al</div>
      <button onclick="yedekAl()" style="background:#1A237E;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;width:100%">
        ☁️ Firestore'a Yedekle (${allData.length} kayıt)
      </button>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:12px">
      <div style="padding:12px 14px;font-weight:700;background:#f8fafc;border-bottom:1px solid #e2e8f0">
        📋 Kayıtlı Yedekler (${yedekler.length}/${YEDEK_MAKS})
      </div>
      ${yedekler.length ? yedekSatirlari : '<div style="padding:16px;color:#94a3b8;text-align:center">Henüz yedek yok</div>'}
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
      <div style="font-weight:700;margin-bottom:10px">🔄 Dosyadan Geri Yükle</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:10px">Daha önce indirdiğiniz JSON yedek dosyasını seçin.</div>
      <input type="file" id="yedek-dosya-input" accept=".json" onchange="yedekDosyaSecildi(this)" style="display:none">
      <button onclick="document.getElementById('yedek-dosya-input').click()"
        style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;color:#c2410c;cursor:pointer;width:100%">
        📂 JSON Dosyası Seç ve Geri Yükle
      </button>
    </div>`;
}

async function yedekIndir(yedekId) {
  // Eski Firestore yedeklerini indirmek için (geriye dönük uyumluluk)
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  try {
    showToast('⏳ Yedek hazırlanıyor...');
    const doc = await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).get();
    if(!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    const v = doc.data();
    const icerik = JSON.stringify({ meta: { tarih:v.tarih, zaman:v.zaman, aciklama:v.aciklama, ozet:v.ozet, olusturan:v.olusturan }, veri: JSON.parse(v.veri) }, null, 2);
    const blob = new Blob([icerik], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `evdebakim_yedek_${v.tarih}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ ${v.tarih} yedeği indirildi`);
  } catch(e) { showToast('❌ İndirme hatası: '+e.message); }
}

async function yedekSil(yedekId, tarih) {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  if(!confirm(`"${tarih}" tarihli yedeği silmek istediğinize emin misiniz?`)) return;
  try {
    await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).delete();
    showToast('🗑️ Yedek silindi'); yedekSayfaYukle();
  } catch(e) { showToast('❌ Silme hatası: '+e.message); }
}

async function yedekDosyaSecildi(input) {
  const dosya = input.files[0];
  if (!dosya) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target.result);
      const yedekVeri = json.veri || json;
      const tarih = json.meta?.tarih || dosya.name;
      const kayitSayisi = Array.isArray(yedekVeri) ? yedekVeri.length : '?';
      if (!confirm(
        `⚠️ DİKKAT — GERİ YÜKLEME\n\n"${tarih}" tarihli yedek geri yüklenecek.\n` +
        `Bu yedekte ${kayitSayisi} kayıt var.\n\nMevcut TÜM veriler silinip yedekteki veriler yüklenecek.\n` +
        `Bu işlem GERİ ALINAMAZ!\n\nDevam etmek istiyor musunuz?`
      )) return;
      const girdi = prompt(`Son onay için "EVET" yazın:`);
      if ((girdi||'').trim().toUpperCase() !== 'EVET') { showToast('İptal edildi'); return; }
      await _yedekGeriYukleVeri(yedekVeri, tarih);
    } catch(e) {
      alert('❌ Dosya okunamadı: ' + e.message);
    }
  };
  reader.readAsText(dosya);
}

async function yedekGeriYukle(yedekId, tarih, kayitSayisi) {
  // Eski Firestore yedeklerinden geri yükleme
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  if(!confirm(`⚠️ "${tarih}" tarihli yedek geri yüklenecek (${kayitSayisi} kayıt).\nMevcut TÜM veriler silinecek. GERİ ALINAMAZ!\nDevam?`)) return;
  const girdi = prompt(`Son onay için "EVET" yazın:`);
  if((girdi||'').trim().toUpperCase() !== 'EVET') { showToast('İptal edildi'); return; }
  try {
    const doc = await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).get();
    if(!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    await _yedekGeriYukleVeri(JSON.parse(doc.data().veri), tarih);
  } catch(e) { alert('❌ Geri yükleme hatası: ' + e.message); }
}

async function _yedekGeriYukleVeri(yedekVeri, tarih) {
  try {
    showToast('⏳ Geri yükleniyor... Lütfen bekleyin');
    const mevcutSnap = await firebase.firestore().collection('vatandaslar').get();
    for(let i=0;i<mevcutSnap.docs.length;i+=400) {
      await Promise.all(mevcutSnap.docs.slice(i,i+400).map(d=>d.ref.delete()));
    }
    for(let i=0;i<yedekVeri.length;i+=400) {
      await Promise.all(yedekVeri.slice(i,i+400).map(r=>
        firebase.firestore().collection('vatandaslar').add(normalizeRecord({...r}))
      ));
      showToast(`⏳ Yükleniyor: ${Math.min(i+400,yedekVeri.length)}/${yedekVeri.length}`);
    }
    showToast('✅ Geri yükleme tamamlandı! Sayfa yenileniyor...');
    setTimeout(()=>location.reload(), 1800);
  } catch(e) {
    console.error('[Yedek] Geri yükleme hatası:', e);
    alert('❌ Geri yükleme hatası: ' + e.message);
  }
}

// ── JSON DOSYASINDAN GERİ YÜKLEME ──
function yedekJsonSecDosya() {
  // Artık kullanılmıyor — HTML'deki label/input ile tetikleniyor
  const inp = document.getElementById('json-yukle-input');
  if (inp) inp.click();
}
window.yedekJsonSecDosya = yedekJsonSecDosya;

async function yedekJsonDosyaSecildi(inputEl) {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  const dosya = inputEl.files[0];
  if (!dosya) return;
  // Input'u sıfırla — aynı dosya tekrar seçilebilsin
  inputEl.value = '';
  const reader = new FileReader();
  reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // Hem düz array hem meta+veri formatını destekle
        let veri = Array.isArray(parsed) ? parsed : (parsed.veri || null);
        if (!veri || !Array.isArray(veri)) { showToast('❌ Geçersiz yedek dosyası'); return; }
        const meta = parsed.meta || {};
        const kayitSayisi = veri.length;
        const tarih = meta.tarih || dosya.name;

        if (!confirm(
          `⚠️ DİKKAT — JSON'dan GERİ YÜKLEME\n\n` +
          `Dosya: ${dosya.name}\n` +
          `${tarih ? 'Tarih: ' + tarih + '\n' : ''}` +
          `Kayıt sayısı: ${kayitSayisi}\n\n` +
          `Mevcut TÜM veriler silinip bu dosyadaki veriler yüklenecek.\n` +
          `Bu işlem GERİ ALINAMAZ!\n\n` +
          `Devam etmek istiyor musunuz?`
        )) return;

        const girdi = prompt(`Son onay için "EVET" yazın:\n(${kayitSayisi} kayıt yüklenecek)`);
        if ((girdi||'').trim().toUpperCase() !== 'EVET') { showToast('İptal edildi'); return; }

        showToast('⏳ JSON yükleniyor... Lütfen bekleyin');
        // Mevcut verileri sil
        const mevcutSnap = await firebase.firestore().collection('vatandaslar').get();
        for (let i = 0; i < mevcutSnap.docs.length; i += 400) {
          await Promise.all(mevcutSnap.docs.slice(i, i+400).map(d => d.ref.delete()));
        }
        // JSON verisini yükle
        for (let i = 0; i < veri.length; i += 400) {
          await Promise.all(veri.slice(i, i+400).map(r =>
            firebase.firestore().collection('vatandaslar').add(normalizeRecord({...r}))
          ));
          showToast(`⏳ Yükleniyor: ${Math.min(i+400, veri.length)}/${veri.length}`);
        }
        // İşlemi logla
        if (currentUser) {
          firebase.firestore().collection('islem_log').add({
            yapan: currentUser.ad, uid: currentUser.uid,
            zaman: firebase.firestore.FieldValue.serverTimestamp(),
            isim: '-', degisiklik: 'JSON GERİ YÜKLEME',
            detay: `Dosya: ${dosya.name} | ${kayitSayisi} kayıt`
          }).catch(() => {});
        }
        showToast('✅ JSON geri yükleme tamamlandı! Sayfa yenileniyor...');
        setTimeout(() => location.reload(), 1800);
      } catch(e) {
        console.error('[Yedek JSON] Hata:', e);
        showToast('❌ Dosya okunamadı: ' + e.message);
      }
    };
    reader.readAsText(dosya);
};
window.yedekJsonDosyaSecildi = yedekJsonDosyaSecildi;

// Artık kullanılmıyor ama eski çağrılar için boş bırakıldı
function yedekleriGoster() { navTo('yedekler', document.getElementById('nav-yedekler')); }
function yedekModalKapat() {}
