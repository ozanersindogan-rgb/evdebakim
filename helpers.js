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
// YEDEKLEME SİSTEMİ — GitHub Gist
// ─ Yedekler GitHub Gist'e JSON olarak kaydedilir
// ─ Her hafta bir yedek tutulur, eski yedek üzerine yazılır
// ─ Geri yükleme: Gist'ten çek → Firestore'a aktar
// ═══════════════════════════════════════════════════════════

// GitHub token kodda saklanmaz — localStorage'dan okunur
// İlk yedek alımında otomatik sorulur
function _githubTokenOku() { return localStorage.getItem('evdebakim_github_token') || ''; }
function _githubTokenYaz(t) { localStorage.setItem('evdebakim_github_token', t); }
const GIST_ACIKLAMA = 'evdebakim-yedek';

const YEDEK_KOLEKSIYON = 'yedekler'; // geriye dönük uyumluluk

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

// Günlük kontrol: bugün yedek alınmadıysa otomatik al
async function yedekGunlukKontrol() {
  try {
    const _token = _githubTokenOku();
    if (!_token) { console.log('[Yedek] GitHub token girilmemiş, atlandı.'); return; }
    const bugun = trBugunTarih();
    const sonYedek = localStorage.getItem('evdebakim_son_gist_yedek');
    if (sonYedek === bugun) {
      console.log(`[Yedek] Bugün (${bugun}) zaten yedek alınmış.`);
      return;
    }
    await yedekAl(`Otomatik — ${bugun}`);
  } catch(e) {
    console.warn('[Yedek] Kontrol hatası:', e.message);
  }
}

// Gist ID'sini localStorage'dan oku/yaz
function _gistIdOku()  { return localStorage.getItem('evdebakim_gist_id') || null; }
function _gistIdYaz(id){ localStorage.setItem('evdebakim_gist_id', id); }

// Yedek tarihlerini sıralı dizi olarak döndür (localStorage'daki gist_dosyalar key'inden)
function _gistDosyalarOku() {
  try { return JSON.parse(localStorage.getItem('evdebakim_gist_dosyalar') || '[]'); }
  catch(e) { return []; }
}
function _gistDosyalarYaz(arr) {
  localStorage.setItem('evdebakim_gist_dosyalar', JSON.stringify(arr));
}

async function yedekAl(){ console.warn("[Yedek] Geçici olarak devre dışı bırakıldı"); return; }
/*
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  if (!allData.length) { showToast('⚠️ Yedeklenecek veri yok'); return; }
  let GITHUB_TOKEN = _githubTokenOku();
  if (!GITHUB_TOKEN) {
    GITHUB_TOKEN = (prompt('GitHub Personal Access Token girin (gist scope):') || '').trim();
    if (!GITHUB_TOKEN) { showToast('⚠️ Token girilmedi'); return; }
    _githubTokenYaz(GITHUB_TOKEN);
  }
  showToast('💾 Gist\'e yedek alınıyor...');
  try {
    const bugun = trBugunTarih();
    const zaman = new Date().toISOString();
    const ozet  = {
      toplamKayit: allData.length,
      aktif: allData.filter(r=>r.DURUM==='AKTİF').length,
      aylar: [...new Set(allData.map(r=>r.AY).filter(Boolean))],
    };
    const temizVeri = allData.map(r => { const {_fbId,...rest}=r; return rest; });
    const icerik = JSON.stringify({
      meta: { tarih: bugun, zaman, aciklama: aciklama || `Manuel — ${bugun}`, ozet, olusturan: currentUser?.ad || 'Sistem' },
      veri: temizVeri
    }, null, 2);

    const yeniDosyaAdi = `evdebakim_yedek_${bugun}.json`;
    const mevcutId = _gistIdOku();
    const dosyaListesi = _gistDosyalarOku(); // ['2026-05-13', '2026-05-14', ...]

    // Patch body: yeni dosyayı ekle
    const patchFiles = { [yeniDosyaAdi]: { content: icerik } };

    // 7 gün sınırı: 8. yedek gelince en eskiyi sil (Gist'te null içerik = silme)
    if (dosyaListesi.length >= 7) {
      const enEski = dosyaListesi[0];
      const enEskiDosya = `evdebakim_yedek_${enEski}.json`;
      patchFiles[enEskiDosya] = null; // Gist API: null = dosyayı sil
      dosyaListesi.shift();
    }

    // Bu tarihi listeye ekle (zaten yoksa)
    if (!dosyaListesi.includes(bugun)) dosyaListesi.push(bugun);

    let url, method, body;
    if (mevcutId) {
      url    = `https://api.github.com/gists/${mevcutId}`;
      method = 'PATCH';
      body   = JSON.stringify({ description: `${GIST_ACIKLAMA} — son yedek: ${bugun}`, files: patchFiles });
    } else {
      url    = 'https://api.github.com/gists';
      method = 'POST';
      body   = JSON.stringify({ description: `${GIST_ACIKLAMA} — son yedek: ${bugun}`, public: false, files: patchFiles });
    }

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
      body
    });
    if (!res.ok) {
      const hata = await res.json().catch(()=>({}));
      throw new Error(`GitHub API ${res.status}: ${hata.message || res.statusText}`);
    }
    const gist = await res.json();
    _gistIdYaz(gist.id);
    _gistDosyalarYaz(dosyaListesi);
    localStorage.setItem('evdebakim_son_gist_yedek', bugun);
    localStorage.setItem('evdebakim_gist_url', gist.html_url);
    showToast(`✅ Yedeklendi — ${ozet.toplamKayit} kayıt (${dosyaListesi.length}/7 gün)`);
    if(document.getElementById('page-yedekler')?.classList.contains('active')) yedekSayfaYukle();
  } catch(e) {
    console.error('[Yedek] Hata:', e);
    showToast('❌ Yedek alınamadı: ' + e.message);
  }
}

function yedekEskilerSil() {
  // Gist tabanlı sistemde eski yedek otomatik üzerine yazılır, ekstra silme gerekmez.
  console.log('[Yedek] Gist sistemi — üzerine yaz aktif.');
}

async function yedekSayfaYukle() {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  const liste = document.getElementById('yedek-liste');
  if(!liste) return;

  const sonYedek    = localStorage.getItem('evdebakim_son_gist_yedek') || '—';
  const gistUrl     = localStorage.getItem('evdebakim_gist_url') || '';
  const gistId      = _gistIdOku() || '';
  const tokenVar    = _githubTokenOku() ? '✅ Tanımlı' : '❌ Girilmemiş';
  const dosyaListesi = _gistDosyalarOku(); // ['2026-05-14', '2026-05-15', ...]
  const allDataOzet = allData.length
    ? `${allData.length} kayıt · ${allData.filter(r=>r.DURUM==='AKTİF').length} aktif`
    : 'Veri yüklenmedi';

  const yedekSatirlar = dosyaListesi.length
    ? [...dosyaListesi].reverse().map(tarih => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
          <span>📄 ${tarih}</span>
          <button onclick="yedekGisttenGeriYukleTarih('${tarih}')"
            style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;color:#c2410c;cursor:pointer">
            Geri Yükle
          </button>
        </div>`).join('')
    : '<div style="font-size:13px;color:#94a3b8">Henüz yedek alınmamış.</div>';

  liste.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-weight:800;color:#15803d;margin-bottom:6px">☁️ GitHub Gist Yedekleme</div>
      <div style="font-size:13px;color:#166534;line-height:1.7">
        Token: <strong>${tokenVar}</strong> <span onclick="localStorage.removeItem('evdebakim_github_token');yedekSayfaYukle();showToast('Token silindi');" style="font-size:11px;color:#dc2626;cursor:pointer;text-decoration:underline">sıfırla</span><br>
        Son yedek: <strong>${sonYedek}</strong> &nbsp;·&nbsp; Saklanan: <strong>${dosyaListesi.length}/7 gün</strong><br>
        Mevcut veri: <strong>${allDataOzet}</strong><br>
        ${gistUrl ? `Gist: <a href="${gistUrl}" target="_blank" style="color:#1A237E">${gistId.substring(0,12)}…</a>` : ''}
      </div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:10px">☁️ Şimdi Yedekle</div>
      <button onclick="yedekAl()" style="background:#1A237E;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;width:100%">
        ☁️ Şimdi Yedek Al (${allData.length} kayıt)
      </button>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:10px">📋 Kayıtlı Yedekler (${dosyaListesi.length}/7)</div>
      ${yedekSatirlar}
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
      <div style="font-weight:700;margin-bottom:10px">📂 JSON Dosyasından Geri Yükle</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:10px">Daha önce indirdiğiniz JSON dosyasını seçin.</div>
      <input type="file" id="yedek-dosya-input" accept=".json" onchange="yedekDosyaSecildi(this)" style="display:none">
      <button onclick="document.getElementById('yedek-dosya-input').click()"
        style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;color:#334155;cursor:pointer;width:100%">
        📂 JSON Dosyası Seç ve Geri Yükle
      </button>
    </div>`;
}

// Belirli bir tarihe ait Gist dosyasını geri yükle
async function yedekGisttenGeriYukleTarih(tarih) {
  if(!currentUser || currentUser.uid !== YEDEK_YETKILI_UID) { showToast('⛔ Yetkiniz yok'); return; }
  const GITHUB_TOKEN = _githubTokenOku();
  if (!GITHUB_TOKEN) { showToast('⚠️ GitHub token girilmemiş'); return; }
  const gistId = _gistIdOku();
  if (!gistId) { showToast('❌ Kayıtlı Gist bulunamadı.'); return; }
  try {
    showToast('⏳ Gist çekiliyor...');
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const gist = await res.json();
    const dosyaAdi = `evdebakim_yedek_${tarih}.json`;
    if (!gist.files[dosyaAdi]) throw new Error(`${tarih} tarihli dosya Gist'te bulunamadı`);
    const icerikRes = await fetch(gist.files[dosyaAdi].raw_url);
    const json = await icerikRes.json();
    const yedekVeri = json.veri || json;
    const kayitSayisi = Array.isArray(yedekVeri) ? yedekVeri.length : '?';
    if (!confirm(
      `⚠️ DİKKAT — GERİ YÜKLEME\n\n"${tarih}" tarihli yedek geri yüklenecek.\n` +
      `${kayitSayisi} kayıt var.\n\nMevcut TÜM veriler silinip yedekteki veriler yüklenecek.\n` +
      `Bu işlem GERİ ALINAMAZ!\n\nDevam etmek istiyor musunuz?`
    )) return;
    const girdi = prompt(`Son onay için "EVET" yazın:`);
    if ((girdi||'').trim().toUpperCase() !== 'EVET') { showToast('İptal edildi'); return; }
    await _yedekGeriYukleVeri(yedekVeri, tarih);
  } catch(e) {
    showToast('❌ Gist geri yükleme hatası: ' + e.message);
  }
}
async function yedekGisttenGeriYukle() {
  await yedekGisttenGeriYukleTarih(localStorage.getItem('evdebakim_son_gist_yedek'));
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
window.yedekGisttenGeriYukle = yedekGisttenGeriYukle;
window.yedekGisttenGeriYukleTarih = yedekGisttenGeriYukleTarih;
window.yedekAl = yedekAl;

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

*/