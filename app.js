
// 🔥 reload sonrası sayfa yönlendirme
document.addEventListener("DOMContentLoaded", () => {
  // Önce postReloadPage (eski mekanizma), yoksa sonSayfa (kalıcı)
  const page = localStorage.getItem("postReloadPage") || localStorage.getItem("evdebakim_sonSayfa");
  if (localStorage.getItem("postReloadPage")) localStorage.removeItem("postReloadPage");

  if (page) {
    // initApp tamamlanana kadar bekle, sonra navTo çağır
    const _bekleVeGit = () => {
      const navEl = document.getElementById('nav-' + page);
      if (typeof navTo === 'function' && document.getElementById('page-' + page)) {
        navTo(page, navEl || null);
      } else {
        setTimeout(_bekleVeGit, 150);
      }
    };
    setTimeout(_bekleVeGit, 500); // veriler yüklendikten sonra
  }
});

console.log("APP JS ÇALIŞTI");
const USERS_MAP = {"SBIyovehB5RAkSkhc05bIm88PJs2": {"ad": "Ozan Ersin DOĞAN", "rol": "Birim Sorumlusu"}, "Fpk3BcokNFU4NM1XL0JQsMP9ygM2": {"ad": "Şafak SAYAR", "rol": "Temizlik - Banyo"}, "wksJ9Tf3djhgp4of4DxC29rEdiL2": {"ad": "Sezgin TAŞ", "rol": "Kuaför"}, "LBntADGnP2MHVecmn4jAnFRPW222": {"ad": "Ayşegül TULĞAN", "rol": "Hemşire"}};
let currentUser = null;
let _docsMap = {}; // Firestore doc id -> allData index map
let _initStarted = false;

function waitForModulesAndInit() {
  if (_initStarted) return;
  let tries = 0;
  const maxTry = 120; // ~12 sn
  const t = setInterval(() => {
    const ready =
      typeof initApp === 'function' &&
      typeof refreshAll === 'function' &&
      typeof allData !== 'undefined' &&
      typeof buildSidebar === 'function';
    if (ready) {
      clearInterval(t);
      _initStarted = true;
      try {
        initApp();
      } catch (e) {
        console.error('initApp çalıştırma hatası:', e);
      }
    } else if (++tries >= maxTry) {
      clearInterval(t);
      console.error('Modüller zamanında yüklenmedi');
    }
  }, 100);
}

// ── AUTH ──
var liEmail = '';
function liSelectUser(email, cardId) {
  liEmail = email;
  document.querySelectorAll('[id^="li-u-"]').forEach(el => {
    el.style.border = '2px solid #e2e8f0';
    el.style.background = '#fff';
    el.classList.remove('selected');
  });
  const card = document.getElementById(cardId);
  if(card) { card.classList.add('selected'); }
  const btn = document.getElementById('li-btn');
  if(btn) { btn.disabled = false; btn.style.opacity = '1'; }
  const pass = document.getElementById('li-pass');
  if(pass) pass.focus();
}
function doLogin() {
  const email = liEmail;
  const pass  = document.getElementById('li-pass').value;
  const btn   = document.getElementById('li-btn');
  const err   = document.getElementById('li-err');
  if(!email){ if(err) err.textContent='Lütfen bir kullanıcı seçin'; return; }
  if(!pass){ if(err) err.textContent='Şifre zorunlu'; return; }
  if(btn) { btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true; }
  if(err) err.textContent='';
  _auth.signInWithEmailAndPassword(email, pass)
    .catch(e => {
      if(err) err.textContent = e.code==='auth/invalid-credential'?'Şifre hatalı':'Giriş hatası: '+e.message;
      if(btn) { btn.textContent='Giriş Yap'; btn.disabled=false; btn.style.opacity='1'; }
    });
}

function doLogout() {
  if(confirm('Çıkış yapmak istiyor musunuz?')) firebase.auth().signOut();
}

firebase.auth().onAuthStateChanged( user => {
  if(user) {
    currentUser = { uid: user.uid, ...USERS_MAP[user.uid] };
    const ls = document.getElementById('login-screen');
    const ar = document.getElementById('app-root');
    const ub = document.getElementById('user-badge');
    if(ls) ls.style.display = 'none';
    if(ar) ar.style.display = '';
    if(ub) { ub.style.display = 'flex'; }
    const ubAd = document.getElementById('ub-ad');
    const ubRol = document.getElementById('ub-rol');
    const ubAv = document.getElementById('ub-avatar');
    if(ubAd) ubAd.textContent = currentUser.ad;
    if(ubRol) ubRol.textContent = currentUser.rol;
    if(ubAv) ubAv.textContent = currentUser.ad.charAt(0);
    // Yedekler menüsünü hemen göster (refreshAll beklemeden)
    const _nv = document.getElementById('nav-yedekler');
    if(_nv) _nv.style.display = (user.uid === 'SBIyovehB5RAkSkhc05bIm88PJs2') ? '' : 'none';
    const _na = document.getElementById('nav-ayarlar');
    if(_na) _na.style.display = (user.uid === 'SBIyovehB5RAkSkhc05bIm88PJs2') ? '' : 'none';
    waitForModulesAndInit();
    // Hemşire ziyaretlerini arka planda yükle (kişi kartları için)
    setTimeout(() => { if(typeof hmZiyaretlerYukle==='function') hmZiyaretlerYukle(); }, 3000);
  } else {
    currentUser = null;
    _initStarted = false;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-root').style.display = 'none';
    document.getElementById('user-badge').style.display = 'none';
  }
});

// ── FIRESTORE HELPERS ──


const DATA_MANIFEST_URL = './manifest.json';

function normalizeRecord(r) {
  if (!r || typeof r !== 'object') return r;
  if(!r.MAHALLE) r.MAHALLE = '';
  r.MAHALLE = r.MAHALLE.toString().trim().toUpperCase().replace('SOGUCAK','SOĞUCAK');
  r.DURUM = (r.DURUM||'').toString().trim();
  r.AY = (r.AY||'').toString().trim().toUpperCase();
  r['HİZMET'] = (r['HİZMET']||'').toString().trim();
  // İsim her zaman büyük harf
  if (r.ISIM_SOYISIM) r.ISIM_SOYISIM = r.ISIM_SOYISIM.toString().trim().toLocaleUpperCase('tr-TR');
  return r;
}

function hesaplaYas(dogumTarihi) {
  if (!dogumTarihi) return null;
  let d;
  if (dogumTarihi.includes('-')) { d = new Date(dogumTarihi); }
  else if (dogumTarihi.includes('.')) { const [g,m,y]=dogumTarihi.split('.'); d=new Date(`${y}-${m}-${g}`); }
  else { return null; }
  if (isNaN(d)) return null;
  const bugun = new Date();
  let yas = bugun.getFullYear() - d.getFullYear();
  const m = bugun.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && bugun.getDate() < d.getDate())) yas--;
  return (yas >= 0 && yas < 130) ? yas : null;
}

async function loadInitialData() {
  const manifestRes = await fetch(DATA_MANIFEST_URL, { cache: 'no-store' });
  if (!manifestRes.ok) {
    throw new Error('Veri manifesti alınamadı: ' + manifestRes.status);
  }
  const manifest = await manifestRes.json();
  if (!Array.isArray(manifest)) {
    throw new Error('Veri manifesti beklenen formatta değil');
  }

  const normalizeFilePath = (file) => String(file || '')
    .replace(/temi̇zli̇k/gi, 'temizlik')
    .replace(/ı̇/gi, 'i')
    .replace(/i̇/gi, 'i');

  const errors = [];
  const groups = await Promise.all(
    manifest.map(async item => {
      const candidates = [...new Set([item.file, normalizeFilePath(item.file)].filter(Boolean))];
      let lastError = null;

      for (const file of candidates) {
        try {
          const res = await fetch(file, { cache: 'no-store' });
          if (!res.ok) {
            lastError = new Error('Veri dosyası alınamadı: ' + file + ' (' + res.status + ')');
            continue;
          }
          const data = await res.json();
          if (!Array.isArray(data)) {
            lastError = new Error('Veri dosyası beklenen formatta değil: ' + file);
            continue;
          }
          return data;
        } catch (err) {
          lastError = err;
        }
      }

      errors.push({ item, error: lastError || new Error('Bilinmeyen veri yükleme hatası') });
      return [];
    })
  );

  if (errors.length) {
    console.warn('[loadInitialData] Yüklenemeyen veri dosyaları:', errors);
  }

  const records = groups.flat().map(rec => normalizeRecord({ ...rec }));
  if (!records.length) {
    const detay = errors.map(({ item, error }) => `${item?.file || 'dosya'} → ${error?.message || error}`).join(' | ');
    throw new Error('Başlangıç verileri yüklenemedi. ' + detay);
  }

  return records;
}

// Hangi aylar yüklendi takibi
window._yuklenenAylar = new Set();

// allDataOptimize: Tüm ay verileri bellekte korunur, hiçbir ziyaret tarihi silinmez.
function allDataOptimize() {
  // Devre dışı — eski ayların ziyaret tarihleri bellekten ve Firebase'den asla silinmez.
}

async function fbLoadData() {
  showToast('🔄 Veriler yükleniyor...');
  try {
    const snap = await firebase.firestore()
      .collection('vatandaslar')
      .get();

    allData = [];
    _docsMap = {};
    window._yuklenenAylar = new Set();

    snap.forEach(d => {
      const idx = allData.length;
      const rec = {...normalizeRecord({ ...d.data() }), _fbId: d.id};
      allData.push(rec);
      _docsMap[d.id] = idx;
      if(rec.AY) window._yuklenenAylar.add(rec.AY);
    });

    if(allData.length === 0) {
      const initialData = await loadInitialData();
      showToast('⏳ İlk kurulum: ' + initialData.length + ' kayıt yükleniyor...');
      await fbSeedData(initialData);
      return;
    }

    await adresBilgiYukle();
    allData.forEach(r => {
      const bilgi = window._adresBilgi[r.ISIM_SOYISIM] || {};
      if (!r.TELEFON && bilgi.tel) r.TELEFON = bilgi.tel;
      if (!r.ADRES && bilgi.adres) r.ADRES = bilgi.adres;
      if (!r.DOGUM_TARIHI && bilgi.dogum) r.DOGUM_TARIHI = bilgi.dogum;
    });
    // Personel atama verilerini yükle ve allData'ya uygula
    if (typeof atamaYukle === 'function') await atamaYukle();
    allDataOptimize();
    refreshAll();
    showToast('✅ ' + allData.length + ' kayıt yüklendi');
  } catch (e) {
    console.error('fbLoadData hatası:', e);
    showToast('❌ Veriler yüklenemedi: ' + (e.message || e));
  }
}

async function fbSeedData(initialData) {
  const batch_size = 400;
  let count = 0;
  for(let i=0; i<initialData.length; i+=batch_size) {
    const chunk = initialData.slice(i, i+batch_size);
    await Promise.all(chunk.map(async rec => {
      const docRef = await firebase.firestore().collection('vatandaslar').add(rec);
      const idx = allData.length;
      allData.push({...normalizeRecord({ ...rec }), _fbId: docRef.id});
      _docsMap[docRef.id] = idx;
    }));
    count += chunk.length;
    showToast(`⏳ Yükleniyor: ${count} / ${initialData.length}`);
  }
  showToast('✅ Kurulum tamamlandı!');
  refreshAll();
}

// Bekleyen kayıtlar kuyruğu — internet kesilirse burada bekler
window._saveRetryTimer = null;

// Offline kuyruk: localStorage'dan bekleyen kayıtları yükle
function _loadQueueFromStorage() {
  try {
    const stored = localStorage.getItem('evdebakim_saveQueue');
    return stored ? JSON.parse(stored) : [];
  } catch(e) { return []; }
}
function _saveQueueToStorage(queue) {
  try {
    if (queue && queue.length > 0) {
      localStorage.setItem('evdebakim_saveQueue', JSON.stringify(queue));
    } else {
      localStorage.removeItem('evdebakim_saveQueue');
    }
  } catch(e) {}
}

// Kuyruk başlangıcı: bellekte yoksa localStorage'dan al
if (!window._saveQueue || window._saveQueue.length === 0) {
  window._saveQueue = _loadQueueFromStorage();
}

async function fbUpdateDoc(idx, changes) {
  const r = allData[idx];
  if (!r || !r._fbId) {
    console.warn('fbUpdateDoc: _fbId yok, idx=', idx);
    showToast('⚠️ Kayit ID eksik, kaydilemedi');
    return;
  }
  // Kuyruğa ekle
  window._saveQueue.push({ type: 'update', fbId: r._fbId, isim: r.ISIM_SOYISIM, changes });
  _saveQueueToStorage(window._saveQueue);
  await _flushSaveQueue();
}

function _saveGostergesi(durum, sayi) {
  let el = document.getElementById('save-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'save-indicator';
    el.style.cssText = 'position:fixed;bottom:70px;right:16px;z-index:9998;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.15);transition:all .3s;cursor:default';
    document.body.appendChild(el);
  }
  if (durum === 'kaydediliyor') {
    el.style.background = '#eff6ff';
    el.style.color = '#1d4ed8';
    el.style.border = '1.5px solid #bfdbfe';
    el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3b82f6;animation:pulse-save 1s infinite"></span> Kaydediliyor...';
    el.style.display = 'flex';
  } else if (durum === 'kaydedildi') {
    el.style.background = '#f0fdf4';
    el.style.color = '#15803d';
    el.style.border = '1.5px solid #bbf7d0';
    el.innerHTML = '✓ Kaydedildi';
    el.style.display = 'flex';
    setTimeout(() => { if(el) el.style.display='none'; }, 3000);
  } else if (durum === 'hata') {
    el.style.background = '#fff7ed';
    el.style.color = '#b45309';
    el.style.border = '1.5px solid #fed7aa';
    el.innerHTML = '⚠️ ' + sayi + ' kayıt bekliyor';
    el.style.display = 'flex';
  } else if (durum === 'gizle') {
    el.style.display = 'none';
  }
}

// Animasyon CSS
if (!document.getElementById('save-indicator-css')) {
  const s = document.createElement('style');
  s.id = 'save-indicator-css';
  s.textContent = '@keyframes pulse-save { 0%,100%{opacity:1} 50%{opacity:.3} }';
  document.head.appendChild(s);
}

async function _flushSaveQueue() {
  if (window._flushRunning) return;
  window._flushRunning = true;
  const pending = [...window._saveQueue];
  window._saveQueue = [];
  const failed = [];

  if (pending.length > 0) _saveGostergesi('kaydediliyor');

  try {
    for (const item of pending) {
      try {
        if (item.type === 'update') {
          await firebase.firestore().collection('vatandaslar').doc(item.fbId).update(item.changes);
          if (currentUser) {
            firebase.firestore().collection('islem_log').add({
              yapan: currentUser.ad,
              uid: currentUser.uid,
              zaman: firebase.firestore.FieldValue.serverTimestamp(),
              isim: item.isim || '',
              hizmet: item.hizmet || '',
              degisiklik: 'VATANDAŞ GÜNCELLENDİ',
              detay: JSON.stringify(item.changes)
            }).catch(()=>{});
          }
        }
      } catch(e) {
        console.error('Kayit hatasi [' + item.fbId + ']:', e.code, e.message);
        item._lastError = (e.code || '') + ' ' + e.message;
        failed.push(item);
      }
    }

    if (failed.length > 0) {
      window._saveQueue = [...failed, ...window._saveQueue];
      _saveQueueToStorage(window._saveQueue);
      _saveGostergesi('hata', failed.length);
      if (failed[0]._lastError) showToast('Kayit hatasi: ' + failed[0]._lastError);
      clearTimeout(window._saveRetryTimer);
      window._saveRetryTimer = setTimeout(() => {
        window._flushRunning = false;
        _flushSaveQueue();
      }, 10000);
    } else {
      _saveQueueToStorage([]);
      if (pending.length > 0) { _saveGostergesi('kaydedildi'); refreshAll(); }
      clearTimeout(window._saveRetryTimer);
      window._saveRetryTimer = setTimeout(() => {
        window._flushRunning = false;
        if (window._saveQueue.length > 0) _flushSaveQueue();
      }, 30000);
    }
  } catch(e) {
    // Beklenmedik JS hatası — kuyruğu geri koy, bayrağı sıfırla
    console.error('[flushSaveQueue] Beklenmedik hata:', e);
    window._saveQueue = [...pending, ...window._saveQueue];
    _saveQueueToStorage(window._saveQueue);
    _saveGostergesi('hata', window._saveQueue.length);
  } finally {
    window._flushRunning = false;
  }
}

async function fbAddDoc(rec) {
  const logEntry = {
    yapan: currentUser.ad,
    uid: currentUser.uid,
    zaman: firebase.firestore.FieldValue.serverTimestamp(),
    isim: rec.ISIM_SOYISIM,
    degisiklik: 'YENİ KAYIT'
  };
  const docRef = await firebase.firestore().collection('vatandaslar').add(rec);
  await firebase.firestore().collection('islem_log').add(logEntry);
  return docRef.id;
}

function refreshAll() {
  const safe = (fn, name) => {
    if (typeof fn !== 'function') return;
    try { fn(); } catch (e) { console.warn(name + ' hatası:', e); }
  };

  safe(buildSidebar, 'buildSidebar');
  safe(renderDashboard, 'renderDashboard');
  safe(buildHizmetTabs, 'buildHizmetTabs');
  safe(buildAyTabs, 'buildAyTabs');
  safe(buildMahFilter, 'buildMahFilter');
  safe(buildFormMah, 'buildFormMah');
  safe(gkUpdateIsimler, 'gkUpdateIsimler');
  safe(duUpdateIsimler, 'duUpdateIsimler');
  safe(filterVat, 'filterVat');
  safe(renderGunluk, 'renderGunluk');
  safe(renderMahalle, 'renderMahalle');
  safe(renderExpStats, 'renderExpStats');
  if (typeof vatHizmet !== 'undefined' && vatHizmet === 'KADIN BANYO' && typeof kbRenderPersonelStats === 'function') kbRenderPersonelStats(window._kbPersonelFiltre||'');

  const expMahSel = document.getElementById('exp-mah-sel');
  if(expMahSel) {
    expMahSel.innerHTML = '<option value="">Tümü</option>';
    [...new Set(allData.map(r=>r.MAHALLE).filter(Boolean))].sort().forEach(m=>{
      const o=document.createElement('option');o.value=o.textContent=m;expMahSel.appendChild(o);
    });
  }
  const navYedek = document.getElementById('nav-yedekler');
  if(navYedek) navYedek.style.display = (currentUser?.uid === 'SBIyovehB5RAkSkhc05bIm88PJs2') ? '' : 'none';
}

// ── İŞLEM LOGU SAYFASI ──
async function renderIslemLog() {
  const el = document.getElementById('log-table');
  if(!el) return;
  el.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">Yükleniyor...</td></tr>';
  try {
    const snap = await firebase.firestore().collection('islem_log')
      .orderBy('zaman','desc').limit(300).get();
    const rows = [];
    snap.forEach(d => { const v = d.data(); if(v && v.yapan) rows.push(v); });
    const renk = {
      'GÜNLÜK HİZMET KAYDI': '#16a34a',
      'HİZMET VERİLEMEDİ':   '#b45309',
      'ZİYARET SİLİNDİ':     '#dc2626',
      'YENİ KAYIT':           '#2563eb',
      'JSON GERİ YÜKLEME':   '#7c3aed',
      'VATANDAŞ GÜNCELLENDİ':'#0891b2',
    };
    if(rows.length===0) {
      el.innerHTML = '<tr><td colspan="6" class="no-data">Henüz işlem yok</td></tr>';
      return;
    }
    const thead = `<thead><tr>
      <th>Yapan</th><th>Vatandaş</th><th>Hizmet</th>
      <th>Değişiklik</th><th>Detay</th><th>Tarih/Saat</th>
    </tr></thead>`;
    const tbody = '<tbody>' + rows.map(r => {
      // Eski format: degisiklik alanı yok, ham JSON string olarak kaydedilmiş
      let degisiklik = r.degisiklik || '';
      let detay = r.detay || '';
      let isim = r.isim || '';
      let hizmet = r.hizmet || '';

      // Eski kayıt formatı: degisiklik alanı yok ama JSON string var
      if (!degisiklik && !detay && !isim) {
        // Ham JSON olan eski kayıtlar — degisiklik alanının kendisi JSON ise
        try {
          const parsed = JSON.parse(r.degisiklik || '{}');
          isim = parsed.ISIM_SOYISIM || isim;
          hizmet = parsed['HİZMET'] || hizmet;
          degisiklik = 'VATANDAŞ GÜNCELLENDİ';
          detay = Object.entries(parsed)
            .filter(([k]) => !k.startsWith('_') && k !== 'ISIM_SOYISIM' && k !== 'HİZMET')
            .map(([k,v]) => k+': '+v).join(' | ');
        } catch(e) { degisiklik = degisiklik || '—'; }
      }

      // degisiklik alanı kendisi JSON string ise (eski _flushSaveQueue formatı)
      if (degisiklik && degisiklik.startsWith('{')) {
        try {
          const parsed = JSON.parse(degisiklik);
          detay = Object.entries(parsed)
            .filter(([k]) => !k.startsWith('_'))
            .map(([k,v]) => {
              if (typeof v === 'string' && v.length > 60) return k + ': [uzun metin]';
              return k + ': ' + v;
            }).join(' | ');
          degisiklik = 'VATANDAŞ GÜNCELLENDİ';
        } catch(e) {}
      }

      const renkKod = renk[degisiklik] || 'var(--text-soft)';
      let zamanStr = '—';
      try { zamanStr = r.zaman?.toDate?.()?.toLocaleString('tr-TR') || '—'; } catch(e){}
      return `<tr>
        <td style="font-weight:700;color:var(--primary)">${r.yapan||'—'}</td>
        <td>${isim||'—'}</td>
        <td style="font-size:11px;color:var(--text-soft)">${hizmet||'—'}</td>
        <td style="font-size:11px;font-weight:700;color:${renkKod}">${degisiklik||'—'}</td>
        <td style="font-size:11px;color:var(--text-soft);max-width:260px;word-break:break-all">${detay||'—'}</td>
        <td style="font-size:11px;color:var(--text-soft);white-space:nowrap">${zamanStr}</td>
      </tr>`;
    }).join('') + '</tbody>';
    el.innerHTML = thead + tbody;
  } catch(e) {
    el.innerHTML = '<tr><td colspan="6" style="color:red;padding:12px">Yüklenemedi: ' + e.message + '</td></tr>';
    console.error('[renderIslemLog]', e);
  }
}


// ============ SEED DATA (İlk kurulum) ============


// ============ DATA ============
// Ortak sabitler ve veri yardımcıları modules/data.js içine taşındı.



// ============ STATE ============

// Ortak başlangıç ve sidebar yardımcıları modules/data.js içine taşındı.

// ═══════════════════════════════════════════════════════════════════════════
// DÜZELTME 1: openEditModal + saveEdit — app.js içinde tanımlı, doğru çalışır
// ═══════════════════════════════════════════════════════════════════════════
let editIdx = null;

function openEditModal(idx) {
  editIdx = idx;
  const r = allData[idx];
  if (!r) return;
  const isKuafor = r['HİZMET'] === 'KUAFÖR';

  // Tarih dönüştürücü: her formatı YYYY-MM-DD'ye çevirir
  const toD = (val) => {
    if (!val) return '';
    val = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) { const [d,m,y]=val.split('.'); return `${y}-${m}-${d}`; }
    return val;
  };

  const esc = (s) => String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  document.getElementById('edit-title').innerHTML =
    `✏️ <span style="color:var(--primary)">${r.ISIM_SOYISIM}</span> <span style="font-size:12px;color:var(--text-soft)">${r['HİZMET']} — ${r.AY}</span>`;

  const mahOptions = [...new Set(allData.map(x=>x.MAHALLE).filter(Boolean))].sort()
    .map(m=>`<option value="${m}"${m===r.MAHALLE?' selected':''}>${m}</option>`).join('');

  const durOptions = ['AKTİF','İPTAL','BEKLEME','VEFAT','PASİF']
    .map(d=>`<option value="${d}"${d===r.DURUM?' selected':''}>${d}</option>`).join('');

  const hizmetAdi = r['HİZMET'] || '';
  const tarihFields = isKuafor ? `
    <div class="form-group"><label>✂️ Saç 1</label><input class="form-input" id="ed-sac1" type="date" value="${toD(r.SAC1)}"></div>
    <div class="form-group"><label>✂️ Saç 2</label><input class="form-input" id="ed-sac2" type="date" value="${toD(r.SAC2)}"></div>
    <div class="form-group"><label>💅 Tırnak 1</label><input class="form-input" id="ed-tirnak1" type="date" value="${toD(r.TIRNAK1)}"></div>
    <div class="form-group"><label>💅 Tırnak 2</label><input class="form-input" id="ed-tirnak2" type="date" value="${toD(r.TIRNAK2)}"></div>
    <div class="form-group"><label>🪒 Sakal 1</label><input class="form-input" id="ed-sakal1" type="date" value="${toD(r.SAKAL1)}"></div>
    <div class="form-group"><label>🪒 Sakal 2</label><input class="form-input" id="ed-sakal2" type="date" value="${toD(r.SAKAL2)}"></div>
  ` : `
    <div class="form-group"><label>${hizmetAdi} — 1. Ziyaret</label><input class="form-input" id="ed-b1" type="date" value="${toD(r.BANYO1)}"></div>
    <div class="form-group"><label>${hizmetAdi} — 2. Ziyaret</label><input class="form-input" id="ed-b2" type="date" value="${toD(r.BANYO2)}"></div>
    <div class="form-group"><label>${hizmetAdi} — 3. Ziyaret</label><input class="form-input" id="ed-b3" type="date" value="${toD(r.BANYO3)}"></div>
    <div class="form-group"><label>${hizmetAdi} — 4. Ziyaret</label><input class="form-input" id="ed-b4" type="date" value="${toD(r.BANYO4)}"></div>
    <div class="form-group"><label>${hizmetAdi} — 5. Ziyaret</label><input class="form-input" id="ed-b5" type="date" value="${toD(r.BANYO5)}"></div>
  `;

  document.getElementById('edit-body').innerHTML = `
    <div class="form-group"><label>İsim Soyisim</label><input class="form-input" id="ed-isim" type="text" value="${esc(r.ISIM_SOYISIM)}" oninput="this.value=this.value.toLocaleUpperCase('tr-TR')" style="text-transform:uppercase"></div>
    <div class="form-group"><label>Mahalle</label><select class="form-select" id="ed-mah">${mahOptions}</select></div>
    <div class="form-group"><label>Durum</label><select class="form-select" id="ed-durum">${durOptions}</select></div>
    <div class="form-group"><label>Onay Tarihi</label><input class="form-input" id="ed-onay" type="date" value="${toD(r.ONAY_TARIHI)}"></div>
    <div class="form-group"><label>Doğum Tarihi</label><input class="form-input" id="ed-dogum" type="date" value="${toD(r.DOGUM_TARIHI)}"></div>
    <div class="form-group"><label>İptal Tarihi</label><input class="form-input" id="ed-iptal" type="date" value="${toD(r.IPTAL_TARIHI)}"></div>
    <div class="form-group"><label>İptal Nedeni</label><input class="form-input" id="ed-neden" type="text" value="${esc(r.IPTAL_NEDEN)}"></div>
    ${tarihFields}
    <div class="form-group"><label>1. Telefon</label><input class="form-input" id="ed-tel" type="tel" value="${esc(r.TELEFON)}"></div>
    <div class="form-group"><label>2. Telefon</label><input class="form-input" id="ed-tel2" type="tel" value="${esc(r.TELEFON2)}"></div>
    <div class="form-group"><label>Aktif Telefon</label>
      <select class="form-select" id="ed-tel-aktif">
        <option value="1"${(r.TELEFON_AKTIF||'1')==='1'?' selected':''}>1. Telefon</option>
        <option value="2"${r.TELEFON_AKTIF==='2'?' selected':''}>2. Telefon</option>
      </select>
    </div>
    <div class="form-group full"><label>🏠 Adres</label><input class="form-input" id="ed-adres" type="text" value="${esc(r.ADRES)}"></div>
    <div class="form-group full"><label>Not 1</label><input class="form-input" id="ed-not1" type="text" value="${esc(r.NOT1)}"></div>
    <div class="form-group full"><label>Not 2</label><input class="form-input" id="ed-not2" type="text" value="${esc(r.NOT2)}"></div>
    ${r['HİZMET']==='KADIN BANYO' ? (() => {
      const pList = typeof personelListesi === 'function' ? personelListesi('KADIN BANYO') : [];
      const pOpts = p => `<option value=""${!p?' selected':''}>— Seçilmedi —</option>` + pList.map(x=>`<option value="${x.ad}"${x.ad===p?' selected':''}>${x.ad}</option>`).join('');
      return `
        <div class="form-group"><label>👩 Personel 1</label><select class="form-select" id="ed-personel1">${pOpts(r.PERSONEL1||'')}</select></div>
        <div class="form-group"><label>👩 Personel 2</label><select class="form-select" id="ed-personel2">${pOpts(r.PERSONEL2||'')}</select></div>
        <div class="form-group"><label>👩 Personel 3</label><select class="form-select" id="ed-personel3">${pOpts(r.PERSONEL3||'')}</select></div>
      `;
    })() : ''}
  `;

  document.getElementById('edit-modal').classList.add('open');

  // Mobil Chrome'da type=date value bazen okunmaz — setTimeout ile tekrar set et
  setTimeout(() => {
    const setD = (id, val) => { const el=document.getElementById(id); if(el) el.value = toD(val)||''; };
    setD('ed-onay', r.ONAY_TARIHI); setD('ed-dogum', r.DOGUM_TARIHI); setD('ed-iptal', r.IPTAL_TARIHI);
    if (isKuafor) {
      setD('ed-sac1', r.SAC1); setD('ed-sac2', r.SAC2);
      setD('ed-tirnak1', r.TIRNAK1); setD('ed-tirnak2', r.TIRNAK2);
      setD('ed-sakal1', r.SAKAL1); setD('ed-sakal2', r.SAKAL2);
    } else {
      setD('ed-b1', r.BANYO1); setD('ed-b2', r.BANYO2); setD('ed-b3', r.BANYO3);
      setD('ed-b4', r.BANYO4); setD('ed-b5', r.BANYO5);
    }
  }, 80);
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editIdx = null;
}

async function saveEdit() {
  if (editIdx === null) return;
  const r = allData[editIdx];
  if (!r) return;
  if (!r._fbId) { showToast('⚠️ Firebase ID eksik, kayıt yapılamadı'); closeEditModal(); return; }
  // _fbId ile çapraz doğrula — index kayma koruması
  const hedefFbId = r._fbId;

  const isKuafor = r['HİZMET'] === 'KUAFÖR';
  const getV = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

  r.ISIM_SOYISIM  = getV('ed-isim').trim().toUpperCase();
  r.MAHALLE       = getV('ed-mah');
  r.DURUM         = getV('ed-durum');
  r.ONAY_TARIHI   = getV('ed-onay');
  r.DOGUM_TARIHI  = getV('ed-dogum');
  r.IPTAL_TARIHI  = getV('ed-iptal');
  r.IPTAL_NEDEN   = getV('ed-neden');
  r.TELEFON       = getV('ed-tel').trim();
  r.TELEFON2      = getV('ed-tel2').trim();
  r.TELEFON_AKTIF = getV('ed-tel-aktif');
  r.ADRES         = getV('ed-adres').trim();
  r.NOT1          = getV('ed-not1');
  r.NOT2          = getV('ed-not2');
  if (r['HİZMET'] === 'KADIN BANYO') {
    r.PERSONEL1 = getV('ed-personel1');
    r.PERSONEL2 = getV('ed-personel2');
    r.PERSONEL3 = getV('ed-personel3');
  }

  if (isKuafor) {
    r.SAC1    = getV('ed-sac1');
    r.SAC2    = getV('ed-sac2');
    r.TIRNAK1 = getV('ed-tirnak1');
    r.TIRNAK2 = getV('ed-tirnak2');
    r.SAKAL1  = getV('ed-sakal1');
    r.SAKAL2  = getV('ed-sakal2');
  } else {
    r.BANYO1 = getV('ed-b1');
    r.BANYO2 = getV('ed-b2');
    r.BANYO3 = getV('ed-b3');
    r.BANYO4 = getV('ed-b4');
    r.BANYO5 = getV('ed-b5');
  }

  // Sadece değişen alanları gönder — tam payload race condition yaratır
  // ve editIdx kayma ihtimaline karşı _fbId ile teyit et
  const guncelIdx = allData.findIndex(x => x._fbId === hedefFbId);
  if (guncelIdx === -1) { showToast('⚠️ Kayıt bulunamadı, sayfa yenileniyor'); refreshAll(); closeEditModal(); return; }
  const changes = Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')));
  try {
    await fbUpdateDoc(guncelIdx, changes);
    closeEditModal();
    showToast('✅ Kaydedildi');
  } catch(e) {
    showToast('⚠️ Kaydedilemedi: ' + (e.message || e));
  }
}
if (typeof buildHizmetTabs !== 'function') {
  function buildHizmetTabs() {
    console.warn('buildHizmetTabs yok, skip edildi');
  }
}
if (typeof buildAyTabs !== 'function') {
  function buildAyTabs() {
    console.warn('buildAyTabs yok, skip edildi');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DÜZELTME 3: Yedek saati 17:20 olarak güncelle
// ═══════════════════════════════════════════════════════════════════════════
// Yedekleme yardımcıları modules/helpers.js içine taşındı.


document.addEventListener('DOMContentLoaded', () => console.log('DOM hazır'));

async function tumKayitlaraIDVer() {
  try {
    if (!_db) throw new Error('Firestore yok');

    showToast('🔄 ID atanıyor...');

    const colRef = collection(_db, 'evdebakim'); // koleksiyon adı farklıysa değiştir
    const snap = await getDocs(colRef);

    let guncellenen = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();

      if (!data.KISI_ID) {
        const yeniID = 'KISI_' + Date.now() + '_' + Math.floor(Math.random()*1000);

        await updateDoc(doc(_db, 'evdebakim', docSnap.id), {
          KISI_ID: yeniID
        });

        guncellenen++;
      }
    }

    showToast(`✅ ${guncellenen} kayda ID verildi`);
    console.log('ID atama tamamlandı');

  } catch (err) {
    console.error(err);
    showToast('❌ ID atama hatası: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════
//  AKILLI ZİYARET PLANLAMASI
//  allData'daki vatandaş kayıtlarından son ziyaret tarihini
//  okur, periyota göre öncelik belirler ve plan-liste'ye yazar
// ══════════════════════════════════════════════════════════

function renderPlan() {
  const hizmetFil   = document.getElementById('plan-hizmet-fil')?.value   || '';
  const oncelikFil  = document.getElementById('plan-oncelik-fil')?.value  || '';
  const liste       = document.getElementById('plan-liste');
  const ozetGrid    = document.getElementById('plan-ozet-grid');
  if (!liste) return;

  // allData henüz yüklenmediyse bekle
  if (typeof allData === 'undefined' || !allData.length) {
    liste.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-soft)">⏳ Veriler yükleniyor...</div>`;
    return;
  }

  const bugun = new Date();
  bugun.setHours(0,0,0,0);

  // Tarih parse — YYYY-MM-DD veya DD.MM.YYYY
  function parseDate(val) {
    if (!val) return null;
    val = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val);
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
      const [d,m,y] = val.split('.');
      return new Date(`${y}-${m}-${d}`);
    }
    return null;
  }

  // Kuaför için son tarih: SAC1,SAC2,TIRNAK1,TIRNAK2,SAKAL1,SAKAL2 arasında en büyük
  function sonZiyaretTarihi(r) {
    const hizmet = r['HİZMET'];
    let tarihler = [];
    if (hizmet === 'KUAFÖR') {
      ['SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'].forEach(k => {
        const d = parseDate(r[k]);
        if (d) tarihler.push(d);
      });
    } else {
      ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'].forEach(k => {
        const d = parseDate(r[k]);
        if (d) tarihler.push(d);
      });
    }
    if (!tarihler.length) return null;
    return new Date(Math.max(...tarihler.map(d => d.getTime())));
  }

  // Hizmet başına periyot (gün)
  const PERIYOT = {
    'KUAFÖR':     30,
    'KADIN BANYO': 15,
    'ERKEK BANYO': 15,
  };

  // Sadece AKTİF vatandaşları al, hizmet filtresi uygula
  const hizmetler = hizmetFil
    ? [hizmetFil]
    : ['KUAFÖR','KADIN BANYO','ERKEK BANYO'];

  // Her vatandaşın en güncel ayını bul (aynı kişi birden fazla ayda olabilir)
  const kisiMap = {};
  allData.forEach(r => {
    if (!hizmetler.includes(r['HİZMET'])) return;
    if (r.DURUM && r.DURUM !== 'AKTİF') return;
    const key = r._fbId || r.ISIM_SOYISIM;
    const son = sonZiyaretTarihi(r);
    if (!kisiMap[key] || (son && (!kisiMap[key].sonTarih || son > kisiMap[key].sonTarih))) {
      kisiMap[key] = { ...r, sonTarih: son };
    }
  });

  // Öncelik hesapla
  const sonuclar = Object.values(kisiMap).map(r => {
    const periyot = PERIYOT[r['HİZMET']] || 30;
    const son = r.sonTarih;
    let gecenGun = null;
    let sonrakiTarih = null;
    if (son) {
      gecenGun = Math.floor((bugun - son) / 86400000);
      sonrakiTarih = new Date(son.getTime() + periyot * 86400000);
    }
    const fark = sonrakiTarih ? Math.floor((sonrakiTarih - bugun) / 86400000) : null;

    let oncelik;
    if (!son) {
      oncelik = 'acil'; // Hiç gidilmemiş
    } else if (fark === null || fark < 0) {
      oncelik = 'acil';      // Gecikmiş
    } else if (fark <= 7) {
      oncelik = 'bu-hafta';  // Bu hafta
    } else {
      oncelik = 'gelecek';   // Gelecek hafta+
    }

    return { ...r, gecenGun, sonrakiTarih, fark, oncelik };
  });

  // Öncelik filtresi
  const filtrelendi = oncelikFil
    ? sonuclar.filter(r => r.oncelik === oncelikFil)
    : sonuclar;

  // Sırala: önce gecikmiş, sonra bu hafta, sonra diğer; içinde gecen gün azalan
  const oncelikSira = { acil: 0, 'bu-hafta': 1, gelecek: 2 };
  filtrelendi.sort((a, b) => {
    const os = oncelikSira[a.oncelik] - oncelikSira[b.oncelik];
    if (os !== 0) return os;
    return (b.gecenGun || 0) - (a.gecenGun || 0);
  });

  // Özet kartlar
  const acilSayisi    = sonuclar.filter(r => r.oncelik === 'acil').length;
  const buHaftaSayisi = sonuclar.filter(r => r.oncelik === 'bu-hafta').length;
  const gelecekSayisi = sonuclar.filter(r => r.oncelik === 'gelecek').length;

  if (ozetGrid) {
    ozetGrid.innerHTML = `
      <div class="table-card" style="padding:16px;text-align:center;border-color:#fca5a5;cursor:pointer"
           onclick="document.getElementById('plan-oncelik-fil').value='acil';renderPlan()">
        <div style="font-size:28px;font-weight:900;color:#dc2626">${acilSayisi}</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:4px">🔴 Gecikmiş</div>
      </div>
      <div class="table-card" style="padding:16px;text-align:center;border-color:#fde68a;cursor:pointer"
           onclick="document.getElementById('plan-oncelik-fil').value='bu-hafta';renderPlan()">
        <div style="font-size:28px;font-weight:900;color:#d97706">${buHaftaSayisi}</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:4px">🟡 Bu Hafta</div>
      </div>
      <div class="table-card" style="padding:16px;text-align:center;border-color:#bbf7d0;cursor:pointer"
           onclick="document.getElementById('plan-oncelik-fil').value='gelecek';renderPlan()">
        <div style="font-size:28px;font-weight:900;color:#16a34a">${gelecekSayisi}</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:4px">🟢 Gelecek Hafta+</div>
      </div>`;
  }

  // Tablo
  if (!filtrelendi.length) {
    liste.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-soft)">Bu kriterde vatandaş bulunamadı</div>`;
    return;
  }

  const fmt = d => d ? d.toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';

  const satirlar = filtrelendi.map((r, i) => {
    const bg = i % 2 === 0 ? '' : 'rgba(0,0,0,0.02)';
    const { oncelik, gecenGun, sonrakiTarih, sonTarih } = r;

    const badge = oncelik === 'acil'
      ? `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:800">🔴 ${sonTarih ? 'Gecikmiş' : 'Hiç Gidilmedi'}</span>`
      : oncelik === 'bu-hafta'
      ? `<span style="background:#fffbeb;color:#d97706;border:1px solid #fde68a;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:800">🟡 Bu Hafta</span>`
      : `<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:800">🟢 ${r.fark} gün sonra</span>`;

    const hizmetTag = r['HİZMET'] === 'KUAFÖR'
      ? `<span class="hizmet-tag tag-kuafor">KF</span>`
      : r['HİZMET'] === 'KADIN BANYO'
      ? `<span class="hizmet-tag tag-kadin">KB</span>`
      : `<span class="hizmet-tag tag-erkek">EB</span>`;

    const gecenGunYazi = gecenGun !== null
      ? `<span style="font-size:11px;color:${gecenGun>30?'#dc2626':gecenGun>15?'#d97706':'#64748b'};font-weight:700">${gecenGun} gün önce</span>`
      : `<span style="font-size:11px;color:#94a3b8">—</span>`;

    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:10px 12px;font-weight:700">${r.ISIM_SOYISIM || '—'} ${hizmetTag}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--text-soft)">${r.MAHALLE || '—'}</td>
      <td style="padding:10px 8px;text-align:center;font-size:12px">${fmt(sonTarih)}</td>
      <td style="padding:10px 8px;text-align:center">${gecenGunYazi}</td>
      <td style="padding:10px 8px;text-align:center;font-size:12px">${fmt(sonrakiTarih)}</td>
      <td style="padding:10px 10px;text-align:center">${badge}</td>
    </tr>`;
  }).join('');

  liste.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
      <button onclick="document.getElementById('plan-oncelik-fil').value='';renderPlan()"
        style="font-size:11px;padding:5px 12px;border:1px solid var(--border);border-radius:8px;
               background:var(--bg-soft);cursor:pointer;color:var(--text-soft);font-weight:700">
        Filtreyi Temizle
      </button>
    </div>
    <div class="scroll-table">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff">
            <th style="padding:10px 12px;text-align:left">Ad Soyad</th>
            <th style="padding:10px 8px;text-align:left">Mahalle</th>
            <th style="padding:10px 8px;text-align:center;white-space:nowrap">Son Ziyaret</th>
            <th style="padding:10px 8px;text-align:center;white-space:nowrap">Geçen Süre</th>
            <th style="padding:10px 8px;text-align:center;white-space:nowrap">Sonraki Tarih</th>
            <th style="padding:10px 10px;text-align:center">Öncelik</th>
          </tr>
        </thead>
        <tbody>${satirlar}</tbody>
      </table>
    </div>
    <div style="padding:10px 12px;font-size:11px;color:var(--text-soft);text-align:right">
      ${filtrelendi.length} vatandaş · Kuaför 30 gün, Banyo 15 gün periyot
    </div>`;
}

window.renderPlan = renderPlan;
