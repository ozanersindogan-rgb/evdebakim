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
// ─ Her gün ilk girişte otomatik yedek alır (TR saati ~08:30 sonrası)
// ─ Yedekler Firestore'da "yedekler" koleksiyonunda saklanır
// ─ Son 30 yedek tutulur, eskiler silinir
// ═══════════════════════════════════════════════════════════

const YEDEK_KOLEKSIYON = 'yedekler';
const YEDEK_MAKS = 30; // kaç yedek tutulsun

// TR saat diliminde bugünün tarihini döndürür: "2026-03-22"
function trBugunTarih() {
  return new Date().toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('.').reverse().join('-'); // GG.AA.YYYY → YYYY-MM-DD
}

// TR saatinde şu anki saati döndürür (0-23)
function trSaat() {
  return parseInt(new Date().toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false
  }));
}

async function yedekGunlukKontrol() {
  try {
    const bugun = trBugunTarih();
    const saat  = trSaat();
    // Sabah 08:30 sonrası ilk girişte yedek al
    const trDakika = parseInt(new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', minute: '2-digit' }));
    const trToplamDakika = saat * 60 + trDakika;
    if (trToplamDakika < 8 * 60 + 30) {
      console.log(`[Yedek] Saat ${saat}:${String(trDakika).padStart(2,'0')} — yedek saati henüz gelmedi (08:30 bekleniyor)`);
      return;
    }
    const mevcutSnap = await firebase.firestore()
      .collection(YEDEK_KOLEKSIYON)
      .where('tarih', '==', bugun)
      .limit(1).get();
    if (!mevcutSnap.empty) {
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
  showToast('💾 Yedek alınıyor...');
  try {
    const bugun = trBugunTarih();
    const zaman = new Date().toISOString();
    const ozet  = {
      toplamKayit: allData.length,
      aktif: allData.filter(r=>r.DURUM==='AKTİF').length,
      aylar: [...new Set(allData.map(r=>r.AY).filter(Boolean))],
    };
    const temizVeri = allData.map(r => { const {_fbId,...rest}=r; return rest; });
    await firebase.firestore().collection(YEDEK_KOLEKSIYON).add({
      tarih: bugun, zaman,
      aciklama: aciklama || `Manuel — ${bugun}`,
      ozet, veri: JSON.stringify(temizVeri),
      olusturan: currentUser?.ad || 'Sistem',
    });
    showToast(`✅ Yedek alındı — ${ozet.toplamKayit} kayıt`);
    yedekEskilerSil();
    // Sayfa açıksa listeyi yenile
    if(document.getElementById('page-yedekler')?.classList.contains('active')) yedekSayfaYukle();
  } catch(e) {
    console.error('[Yedek] Hata:', e);
    showToast('❌ Yedek alınamadı: ' + e.message);
  }
}

async function yedekEskilerSil() {
  try {
    const snap = await firebase.firestore().collection(YEDEK_KOLEKSIYON).orderBy('zaman','desc').get();
    if (snap.size <= YEDEK_MAKS) return;
    const silinecekler = snap.docs.slice(YEDEK_MAKS);
    await Promise.all(silinecekler.map(d=>d.ref.delete()));
    console.log(`[Yedek] ${silinecekler.length} eski yedek silindi.`);
  } catch(e) { console.warn('[Yedek] Temizleme hatası:', e.message); }
}

async function yedekSayfaYukle() {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  const liste = document.getElementById('yedek-liste');
  if(!liste) return;
  liste.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8">
    <div style="font-size:24px;margin-bottom:8px">⏳</div>Yedekler yükleniyor...
  </div>`;
  try {
    const snap = await firebase.firestore()
      .collection(YEDEK_KOLEKSIYON)
      .orderBy('zaman','desc')
      .limit(YEDEK_MAKS).get();
    if(snap.empty) {
      liste.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8">
        <div style="font-size:32px;margin-bottom:12px">💾</div>
        <div style="font-weight:700">Henüz yedek alınmamış</div>
        <div style="font-size:12px;margin-top:4px">Yukarıdaki "Şimdi Yedek Al" butonuna basın</div>
      </div>`;
      return;
    }
    liste.innerHTML = snap.docs.map(d => {
      const v = d.data();
      const tarihStr = new Date(v.zaman).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const otomatikMi = (v.aciklama||'').startsWith('Otomatik');
      const etiket = otomatikMi
        ? `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700">OTO</span>`
        : `<span style="background:#dcfce7;color:#15803d;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700">MANUEL</span>`;
      return `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-weight:800;font-size:14px;color:#1A237E">${v.tarih}</span>
                ${etiket}
              </div>
              <div style="font-size:12px;color:#64748b;margin-bottom:4px">🕐 ${tarihStr}</div>
              <div style="font-size:12px;color:#475569">
                📦 <strong>${v.ozet?.toplamKayit||0}</strong> kayıt &nbsp;·&nbsp;
                ✅ <strong>${v.ozet?.aktif||0}</strong> aktif &nbsp;·&nbsp;
                👤 ${v.olusturan||''}
              </div>
              ${v.ozet?.aylar?.length ? `<div style="font-size:11px;color:#94a3b8;margin-top:3px">📅 ${v.ozet.aylar.join(', ')}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button onclick="yedekIndir('${d.id}')"
              style="flex:1;min-width:80px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:#15803d;cursor:pointer">
              ⬇️ İndir
            </button>
            <button onclick="yedekGeriYukle('${d.id}','${v.tarih}',${v.ozet?.toplamKayit||0})"
              style="flex:1;min-width:80px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:#c2410c;cursor:pointer">
              🔄 Geri Yükle
            </button>
            <button onclick="yedekSil('${d.id}','${v.tarih}')"
              style="flex:1;min-width:80px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:#dc2626;cursor:pointer">
              🗑️ Sil
            </button>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    liste.innerHTML = `<div style="padding:20px;color:#B71C1C;text-align:center">❌ Hata: ${e.message}</div>`;
  }
}

async function yedekIndir(yedekId) {
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
    a.href     = url;
    a.download = `evdebaki_yedek_${v.tarih}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ ${v.tarih} yedeği indirildi`);
  } catch(e) { showToast('❌ İndirme hatası: '+e.message); }
}

async function yedekSil(yedekId, tarih) {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  if(!confirm(`"${tarih}" tarihli yedeği silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) return;
  try {
    await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).delete();
    showToast('🗑️ Yedek silindi');
    yedekSayfaYukle();
  } catch(e) { showToast('❌ Silme hatası: '+e.message); }
}

async function yedekGeriYukle(yedekId, tarih, kayitSayisi) {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  // 1. Uyarı
  if(!confirm(
    `⚠️ DİKKAT — GERİ YÜKLEME\n\n` +
    `"${tarih}" tarihli yedek geri yüklenecek.\n` +
    `Bu yedekte ${kayitSayisi} kayıt var.\n\n` +
    `Mevcut TÜM veriler silinip yedekteki veriler yüklenecek.\n` +
    `Bu işlem GERİ ALINAMAZ!\n\n` +
    `Devam etmek istiyor musunuz?`
  )) return;
  // 2. Son onay
  const girdi = prompt(
    `Son onay için aşağıya "EVET" yazın:\n(Mevcut veriler silinecek, ${tarih} yedeği yüklenecek)`
  );
  if((girdi||'').trim().toUpperCase() !== 'EVET') {
    showToast('İptal edildi');
    return;
  }
  try {
    showToast('⏳ Geri yükleniyor... Lütfen bekleyin');
    const doc = await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).get();
    if(!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    const yedekVeri = JSON.parse(doc.data().veri);
    // Mevcut vatandaslar koleksiyonunu temizle
    const mevcutSnap = await firebase.firestore().collection('vatandaslar').get();
    for(let i=0;i<mevcutSnap.docs.length;i+=400) {
      await Promise.all(mevcutSnap.docs.slice(i,i+400).map(d=>d.ref.delete()));
    }
    // Yedeği yükle
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
    showToast('❌ Geri yükleme hatası: '+e.message);
  }
}


// ── JSON DOSYASINDAN GERİ YÜKLEME ──
function yedekJsonSecDosya() {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async (e) => {
    const dosya = e.target.files[0];
    if (!dosya) return;
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
  input.click();
}
window.yedekJsonSecDosya = yedekJsonSecDosya;

// Artık kullanılmıyor ama eski çağrılar için boş bırakıldı
function yedekleriGoster() { navTo('yedekler', document.getElementById('nav-yedekler')); }
function yedekModalKapat() {}


