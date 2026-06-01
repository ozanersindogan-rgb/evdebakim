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

// ── YEDEK AL: Firestore'a kaydet (masaüstüne indirme yok) ──
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
    const temizVeri = allData.map(r => { const { _fbId, ...rest } = r; return rest; });
    const icerik = JSON.stringify({
      meta: { tarih: bugun, zaman, aciklama: aciklama || `Manuel — ${bugun}`, ozet, olusturan: currentUser?.ad || 'Sistem' },
      veri: temizVeri
    });

    // Firestore'a kaydet — tarih ID olarak kullan (gün başına 1 yedek)
    const docId = bugun; // örn: 2026-06-01
    await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(docId).set({
      tarih: bugun,
      zaman,
      aciklama: aciklama || `Manuel — ${bugun}`,
      olusturan: currentUser?.ad || 'Sistem',
      ozet,
      veri: icerik, // JSON string olarak sakla
    });

    localStorage.setItem('evdebakim_son_yedek', bugun);
    showToast(`✅ Yedek kaydedildi — ${ozet.toplamKayit} kayıt`);

    // Sayfadaysa listeyi yenile + 8. günü temizle
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

// ── İNDİR: Firestore'dan JSON olarak indir ──
async function yedekIndir(yedekId) {
  if (!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  try {
    showToast('⏳ Yedek hazırlanıyor...');
    const doc = await firebase.firestore().collection(YEDEK_KOLEKSIYON).doc(yedekId).get();
    if (!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    const v = doc.data();
    const icerik = v.veri || JSON.stringify({ meta: { tarih: v.tarih }, veri: [] });
    const blob = new Blob([icerik], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evdebakim_yedek_${v.tarih}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ ${v.tarih} yedeği indirildi`);
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

function yedekleriGoster() { navTo('yedekler', document.getElementById('nav-yedekler')); }
function yedekModalKapat() {}
