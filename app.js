console.log("APP JS ÇALIŞTI");
const USERS_MAP = {"SBIyovehB5RAkSkhc05bIm88PJs2": {"ad": "Ozan Ersin DOĞAN", "rol": "Birim Sorumlusu"}, "Fpk3BcokNFU4NM1XL0JQsMP9ygM2": {"ad": "Şafak SAYAR", "rol": "Temizlik - Banyo"}, "wksJ9Tf3djhgp4of4DxC29rEdiL2": {"ad": "Sezgin TAŞ", "rol": "Kuaför"}, "LBntADGnP2MHVecmn4jAnFRPW222": {"ad": "Ayşegül TULĞAN", "rol": "Hemşire"}};
let currentUser = null;
let _docsMap = {}; // Firestore doc id -> allData index map

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
    if (typeof initApp === 'function') initApp(); else console.error('initApp bulunamadı');
  } else {
    currentUser = null;
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

// Eski ayların ziyaret tarihlerini bellekten temizler (hafıza optimizasyonu)
// Sadece son 2 ayın detayları tutulur, eskilerden sadece temel bilgiler kalır
function allDataOptimize() {
  const sirali = getMevcutAylar(); // AY_LISTESI sırası
  if(sirali.length <= 2) return; // 2 veya daha az ay varsa işlem gerekmez
  const aktifAylar = new Set(sirali.slice(-2)); // son 2 ay
  let temizlenen = 0;
  allData.forEach(r => {
    if(r.AY && !aktifAylar.has(r.AY)) {
      // Eski ay: ziyaret tarihlerini temizle (raporlama için temel bilgi kalır)
      r.BANYO1=r.BANYO2=r.BANYO3=r.BANYO4=r.BANYO5='';
      r.SAC1=r.SAC2=r.TIRNAK1=r.TIRNAK2=r.SAKAL1=r.SAKAL2='';
      temizlenen++;
    }
  });
  if(temizlenen > 0) console.log(`[Optimize] ${temizlenen} eski kayıt hafızadan temizlendi`);
}

async function fbLoadData() {
  _saveQueueRestore();
  showToast('🔄 Veriler yükleniyor...');
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
  } else {
    await adresBilgiYukle();
    allData.forEach(r => {
      const bilgi = window._adresBilgi[r.ISIM_SOYISIM] || {};
      if (!r.TELEFON && bilgi.tel) r.TELEFON = bilgi.tel;
      if (!r.ADRES && bilgi.adres) r.ADRES = bilgi.adres;
      if (!r.DOGUM_TARIHI && bilgi.dogum) r.DOGUM_TARIHI = bilgi.dogum;
    });
    // Bellek optimizasyonu: eski ayların detaylarını temizle
    allDataOptimize();
    showToast('✅ ' + allData.length + ' kayıt yüklendi');
    refreshAll();
    if ((window._saveQueue || []).length > 0) {
      showToast('⏳ Bekleyen kayıtlar tamamlanıyor...');
      _flushSaveQueue(true);
    }
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
window._saveQueue = window._saveQueue || [];
window._saveInFlight = window._saveInFlight || [];
window._saveRetryTimer = null;
window._flushRunning = false;
const SAVE_QUEUE_KEY = 'evdebakim_save_queue_v4';

function _saveQueuePersist() {
  try {
    localStorage.setItem(SAVE_QUEUE_KEY, JSON.stringify({
      queue: window._saveQueue || [],
      inFlight: window._saveInFlight || []
    }));
  } catch (e) {
    console.warn('saveQueue persist hatasi:', e);
  }
}

function _saveQueueRestore() {
  try {
    const raw = localStorage.getItem(SAVE_QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const queue = Array.isArray(parsed?.queue) ? parsed.queue : [];
    const inFlight = Array.isArray(parsed?.inFlight) ? parsed.inFlight : [];
    const merged = [...inFlight, ...queue];
    if (!merged.length) return;
    const seen = new Set();
    window._saveQueue = merged.filter(item => {
      const key = item && item._qid ? item._qid : ('q_' + Math.random().toString(36).slice(2));
      item._qid = key;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    window._saveInFlight = [];
    console.log('[saveQueue] geri yuklendi:', window._saveQueue.length);
  } catch (e) {
    console.warn('saveQueue restore hatasi:', e);
  }
}

function _saveQueueClearStorage() {
  try { localStorage.removeItem(SAVE_QUEUE_KEY); } catch (e) {}
}

async function fbUpdateDoc(idx, changes) {
  const r = allData[idx];
  if (!r || !r._fbId) {
    console.warn('fbUpdateDoc: _fbId yok, idx=', idx);
    showToast('⚠️ Kayıt ID eksik, kaydedilemedi');
    return false;
  }

  const item = {
    type: 'update',
    fbId: r._fbId,
    isim: r.ISIM_SOYISIM,
    changes,
    _qid: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
  };

  window._saveQueue.push(item);
  _saveQueuePersist();

  const ok = await _flushSaveQueue(true, item._qid);
  return !!ok;
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

async function _flushSaveQueue(forceImmediate = false, waitForQid = null) {
  if (window._flushRunning) {
    if (waitForQid) {
      return new Promise(resolve => {
        const started = Date.now();
        const t = setInterval(() => {
          const kuyrukta = (window._saveQueue || []).some(x => x._qid === waitForQid);
          const islemde = (window._saveInFlight || []).some(x => x._qid === waitForQid);
          if (!window._flushRunning && !kuyrukta && !islemde) {
            clearInterval(t);
            resolve(true);
          } else if (Date.now() - started > 20000) {
            clearInterval(t);
            resolve(false);
          }
        }, 200);
      });
    }
    return false;
  }

  if (!window._saveQueue) window._saveQueue = [];
  if (!window._saveInFlight) window._saveInFlight = [];
  if (window._saveQueue.length === 0) return true;

  window._flushRunning = true;
  const pending = [...window._saveQueue];
  window._saveInFlight = [...window._saveInFlight, ...pending];
  _saveQueuePersist();

  const failed = [];
  if (pending.length > 0) _saveGostergesi('kaydediliyor');

  for (const item of pending) {
    try {
      if (item.type === 'update') {
        await firebase.firestore().collection('vatandaslar').doc(item.fbId).update(item.changes);

        window._saveQueue = (window._saveQueue || []).filter(x => x._qid !== item._qid);
        window._saveInFlight = (window._saveInFlight || []).filter(x => x._qid !== item._qid);
        _saveQueuePersist();

        if (currentUser) {
          firebase.firestore().collection('islem_log').add({
            yapan: currentUser.ad,
            uid: currentUser.uid,
            zaman: firebase.firestore.FieldValue.serverTimestamp(),
            isim: item.isim,
            degisiklik: JSON.stringify(item.changes)
          }).catch(()=>{});
        }
      }
    } catch(e) {
      console.error('Kayit hatasi [' + item.fbId + ']:', e.code, e.message);
      item._lastError = (e.code || '') + ' ' + e.message;
      failed.push(item);
      window._saveInFlight = (window._saveInFlight || []).filter(x => x._qid !== item._qid);
      _saveQueuePersist();
    }
  }

  let result = true;

  if (failed.length > 0) {
    const byId = new Map();
    for (const it of (window._saveQueue || [])) byId.set(it._qid, it);
    for (const it of failed) byId.set(it._qid, it);
    window._saveQueue = [...byId.values()];
    _saveQueuePersist();

    _saveGostergesi('hata', failed.length);
    if (failed[0] && failed[0]._lastError) {
      showToast('Kayit hatasi: ' + failed[0]._lastError);
    }
    result = false;
  } else {
    if ((window._saveQueue || []).length === 0 && (window._saveInFlight || []).length === 0) {
      _saveQueueClearStorage();
    }
    if (pending.length > 0) {
      _saveGostergesi('kaydedildi');
      refreshAll();
    }
    result = true;
  }

  window._flushRunning = false;

  if ((window._saveQueue || []).length > 0) {
    return await _flushSaveQueue(forceImmediate, waitForQid);
  }

  clearTimeout(window._saveRetryTimer);
  if (!result) {
    window._saveRetryTimer = setTimeout(() => {
      if (!window._flushRunning && (window._saveQueue || []).length > 0) _flushSaveQueue();
    }, forceImmediate ? 3000 : 10000);
  } else {
    window._saveRetryTimer = setTimeout(() => {
      if (!window._flushRunning && (window._saveQueue || []).length > 0) _flushSaveQueue();
    }, 30000);
  }

  return result;
}

// Sayfa kapanmadan önce uyar

// Sayfa kapanmadan önce uyar
window.addEventListener('beforeunload', function(e) {
  _saveQueuePersist();
  const bekleyen = (window._saveQueue && window._saveQueue.length > 0) || (window._saveInFlight && window._saveInFlight.length > 0);
  if (bekleyen) {
    e.preventDefault();
    e.returnValue = 'Kaydedilmemiş değişiklikler var!';
    return e.returnValue;
  }
});

// Online olunca kuyruğu boşalt
window.addEventListener('online', function() {
  if ((window._saveQueue && window._saveQueue.length > 0) || (window._saveInFlight && window._saveInFlight.length > 0)) {
    showToast('🌐 Bağlantı geldi, kayıtlar gönderiliyor...');
    window._flushRunning = false;
    _flushSaveQueue();
  }
});

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
  buildSidebar(); renderDashboard(); buildHizmetTabs(); buildAyTabs();
  buildMahFilter(); buildFormMah(); gkUpdateIsimler(); duUpdateIsimler();
  filterVat(); renderGunluk(); renderMahalle(); renderExpStats();
  const expMahSel = document.getElementById('exp-mah-sel');
  if(expMahSel) {
    expMahSel.innerHTML = '<option value="">Tümü</option>';
    [...new Set(allData.map(r=>r.MAHALLE).filter(Boolean))].sort().forEach(m=>{
      const o=document.createElement('option');o.value=o.textContent=m;expMahSel.appendChild(o);
    });
  }
  // Yedekleme menüsü sadece Ozan'a görünür
  const navYedek = document.getElementById('nav-yedekler');
  if(navYedek) navYedek.style.display = (currentUser?.uid === 'SBIyovehB5RAkSkhc05bIm88PJs2') ? '' : 'none';
}

// ── İŞLEM LOGU SAYFASI ──
async function renderIslemLog() {
  const el = document.getElementById('log-table');
  if(!el) return;
  el.innerHTML = '<tr><td style="text-align:center;padding:20px">Yükleniyor...</td></tr>';
  const snap = await firebase.firestore().collection('islem_log')
    .orderBy('zaman','desc').limit(200).get();
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  el.innerHTML = rows.length===0
    ? '<tr><td class="no-data">Henüz işlem yok</td></tr>'
    : `<thead><tr><th>Yapan</th><th>Vatandaş</th><th>Değişiklik</th><th>Tarih/Saat</th></tr></thead>
       <tbody>${rows.map(r=>`<tr>
         <td style="font-weight:700;color:var(--primary)">${r.yapan||'—'}</td>
         <td>${r.isim||'—'}</td>
         <td style="font-size:11px;color:var(--text-soft);max-width:300px;word-break:break-all">${r.degisiklik||'—'}</td>
         <td style="font-size:11px;color:var(--text-soft)">${r.zaman?.toDate?.()?.toLocaleString('tr-TR')||'—'}</td>
       </tr>`).join('')}</tbody>`;
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
    <div class="form-group"><label>İsim Soyisim</label><input class="form-input" id="ed-isim" type="text" value="${esc(r.ISIM_SOYISIM)}"></div>
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

function saveEdit() {
  if (editIdx === null) return;
  const r = allData[editIdx];
  if (!r) return;
  if (!r._fbId) { showToast('⚠️ Firebase ID eksik, kayıt yapılamadı'); closeEditModal(); return; }

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

  const changes = Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')));
  fbUpdateDoc(editIdx, changes);
  closeEditModal();
  showToast('✅ Kaydedildi');
}


// ═══════════════════════════════════════════════════════════════════════════
// DÜZELTME 3: Yedek saati 17:20 olarak güncelle
// ═══════════════════════════════════════════════════════════════════════════
// Yedekleme yardımcıları modules/helpers.js içine taşındı.
