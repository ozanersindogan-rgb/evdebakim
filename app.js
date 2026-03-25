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
    initApp();
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

  const groups = await Promise.all(
    manifest.map(async item => {
      const res = await fetch(item.file, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Veri dosyası alınamadı: ' + item.file);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Veri dosyası beklenen formatta değil: ' + item.file);
      }
      return data;
    })
  );

  return groups.flat().map(rec => normalizeRecord({ ...rec }));
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
window._saveRetryTimer = null;

async function fbUpdateDoc(idx, changes) {
  const r = allData[idx];
  if (!r || !r._fbId) {
    console.warn('fbUpdateDoc: _fbId yok, idx=', idx);
    showToast('⚠️ Kayit ID eksik, kaydilemedi');
    return;
  }
  // Kuyruğa ekle
  window._saveQueue.push({ type: 'update', fbId: r._fbId, isim: r.ISIM_SOYISIM, changes });
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

  for (const item of pending) {
    try {
      if (item.type === 'update') {
        await firebase.firestore().collection('vatandaslar').doc(item.fbId).update(item.changes);
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
    }
  }

  if (failed.length > 0) {
    window._saveQueue = [...failed, ...window._saveQueue];
    // Hatayı ekranda göster
    const ilkHata = failed[0];
    _saveGostergesi('hata', failed.length);
    // Toast ile hata detayı göster
    if (failed.length > 0 && failed[0]._lastError) {
      showToast('Kayit hatasi: ' + failed[0]._lastError);
    }
    clearTimeout(window._saveRetryTimer);
    window._saveRetryTimer = setTimeout(() => {
      window._flushRunning = false;
      _flushSaveQueue();
    }, 10000);
  } else {
    if (pending.length > 0) { _saveGostergesi('kaydedildi'); refreshAll(); }
    clearTimeout(window._saveRetryTimer);
    window._saveRetryTimer = setTimeout(() => {
      window._flushRunning = false;
      if (window._saveQueue.length > 0) _flushSaveQueue();
    }, 30000);
  }
  window._flushRunning = false;
}

// Sayfa kapanmadan önce uyar
window.addEventListener('beforeunload', function(e) {
  if (window._saveQueue && window._saveQueue.length > 0) {
    e.preventDefault();
    e.returnValue = 'Kaydedilmemiş değişiklikler var!';
    return e.returnValue;
  }
});

// Online olunca kuyruğu boşalt
window.addEventListener('online', function() {
  if (window._saveQueue && window._saveQueue.length > 0) {
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
// KUAFOR_BILGI data.js dosyasında tanımlı

const HIZMET_KEYS = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];
const HIZMET_COLORS = {'KADIN BANYO':'kadin','ERKEK BANYO':'erkek','KUAFÖR':'kuafor','TEMİZLİK':'temizlik'};
const HIZMET_ICONS = {'KADIN BANYO':'🛁','ERKEK BANYO':'🚿','KUAFÖR':'✂️','TEMİZLİK':'🧹'};
// ── AY SİSTEMİ (tek merkezi tanım) ──
const AY_LISTESI  = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
const AY_LABELS   = {OCAK:'Ocak',ŞUBAT:'Şubat',MART:'Mart',NİSAN:'Nisan',MAYIS:'Mayıs',HAZİRAN:'Haziran',TEMMUZ:'Temmuz',AĞUSTOS:'Ağustos',EYLÜL:'Eylül',EKİM:'Ekim',KASIM:'Kasım',ARALIK:'Aralık'};
const AY_KISALT   = {OCAK:'Oca',ŞUBAT:'Şub',MART:'Mar',NİSAN:'Nis',MAYIS:'May',HAZİRAN:'Haz',TEMMUZ:'Tem',AĞUSTOS:'Ağu',EYLÜL:'Eyl',EKİM:'Eki',KASIM:'Kas',ARALIK:'Ara'};
const AYLAR       = AY_LISTESI; // alias

// allData'dan sıralı mevcut ayları döndürür
function getMevcutAylar() {
  return [...new Set(allData.map(r=>r.AY).filter(Boolean))]
    .sort((a,b)=>AY_LISTESI.indexOf(a)-AY_LISTESI.indexOf(b));
}
// allData'dan en son (en büyük) ayı döndürür
function getSonAy() {
  const aylar = getMevcutAylar();
  return aylar[aylar.length - 1] || '';
}
// Bir sonraki ayı döndürür (yıl geçişi dahil)
function getSonrakiAy(ay) {
  const i = AY_LISTESI.indexOf(ay);
  return i === -1 ? '' : AY_LISTESI[(i + 1) % 12];
}
// select elementini tüm 12 ay ile doldurur, seçili olanı işaretler
function aySelectDoldur(elId, secilenAy, bosSecenek) {
  const el = document.getElementById(elId);
  if(!el) return;
  const secilen = secilenAy || getSonAy();
  el.innerHTML = (bosSecenek ? `<option value="">— Seçin —</option>` : '') +
    AY_LISTESI.map(a=>`<option value="${a}"${a===secilen?' selected':''}>${AY_LABELS[a]}</option>`).join('');
}
// select elementini sadece verida olan aylarla doldurur
function mevcutAySelectDoldur(elId, secilenAy, bosSecenek) {
  const el = document.getElementById(elId);
  if(!el) return;
  const aylar = getMevcutAylar();
  const secilen = secilenAy || aylar[aylar.length-1] || '';
  el.innerHTML = (bosSecenek ? `<option value="">— Seçin —</option>` : '') +
    aylar.map(a=>`<option value="${a}"${a===secilen?' selected':''}>${AY_LABELS[a]}</option>`).join('');
}

let allData = [];

let newRecs = [];

// ============ STATE ============
let vatPage = 1;
const PER = 30;
let vatFiltered = [];
let vatHizmet = '';
let vatAy = '';
let dashSrch = '';

// ============ INIT ============
function initApp() {
  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('gun-date').value = now.toISOString().split('T')[0];
  fbLoadData().then(()=>{ yedekGunlukKontrol(); });
  kanbanYukle();
}



// ============ SIDEBAR ============
function buildSidebar() {
  const AY_SIRA = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  const sonAy = [...new Set(allData.map(r=>r.AY).filter(Boolean))].sort((a,b)=>AY_SIRA.indexOf(b)-AY_SIRA.indexOf(a))[0];
  const sonAyAktif = allData.filter(r=>r.AY===sonAy && r.DURUM==='AKTİF');
  const byH = {};
  HIZMET_KEYS.forEach(h => byH[h] = sonAyAktif.filter(r=>r['HİZMET']===h).length);
  document.getElementById('sidebar-mini').innerHTML = `
    <div class="mini-stat"><div class="v">${new Set(allData.filter(r=>r.DURUM==='AKTİF'&&r.AY===([...new Set(allData.map(r=>r.AY).filter(Boolean))].sort((a,b)=>['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'].indexOf(b)-['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'].indexOf(a))[0])).map(r=>r['HİZMET']+'|'+r.ISIM_SOYISIM)).size}</div><div class="l">Aktif</div></div>
    <div class="mini-stat"><div class="v">${allData.length}</div><div class="l">Toplam</div></div>
    <div class="mini-stat"><div class="v">${byH['KADIN BANYO']||0}</div><div class="l">Kad. Banyo</div></div>
    <div class="mini-stat"><div class="v">${byH['ERKEK BANYO']||0}</div><div class="l">Erk. Banyo</div></div>
    <div class="mini-stat"><div class="v">${byH['KUAFÖR']||0}</div><div class="l">Kuaför</div></div>
    <div class="mini-stat"><div class="v">${byH['TEMİZLİK']||0}</div><div class="l">Temizlik</div></div>
  `;
}


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
async function yedekGunlukKontrol() {
  try {
    const bugun = new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).split('.').reverse().join('-');
    const saatStr = new Date().toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',hour12:false});
    const [saat,dakika] = saatStr.split(':').map(Number);
    const toplamDakika = saat*60 + dakika;
    if (toplamDakika < 17*60+20) {
      console.log(`[Yedek] Saat ${saatStr} — yedek saati henüz gelmedi (17:20 bekleniyor)`);
      return;
    }
    // Sadece Ozan kontrol eder
    if (!currentUser || currentUser.uid !== 'SBIyovehB5RAkSkhc05bIm88PJs2') return;
    const mevcutSnap = await firebase.firestore().collection('yedekler').where('tarih','==',bugun).limit(1).get();
    if (!mevcutSnap.empty) { console.log(`[Yedek] Bugün (${bugun}) zaten yedek alınmış.`); return; }
    await _yedekAlInternal(`Otomatik — ${bugun}`);
  } catch(e) { console.warn('[Yedek] Kontrol hatası:', e.message); }
}

async function yedekAl(aciklama) {
  if (!currentUser || currentUser.uid !== 'SBIyovehB5RAkSkhc05bIm88PJs2') { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  await _yedekAlInternal(aciklama || 'Manuel — ' + new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'}));
}

async function _yedekAlInternal(aciklama) {
  if (!allData.length) { showToast('⚠️ Yedeklenecek veri yok'); return; }
  showToast('💾 Yedek alınıyor...');
  try {
    const bugun = new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).split('.').reverse().join('-');
    const ozet = { toplamKayit:allData.length, aktif:allData.filter(r=>r.DURUM==='AKTİF').length, aylar:[...new Set(allData.map(r=>r.AY).filter(Boolean))] };
    const temizVeri = allData.map(r => { const {_fbId,...rest}=r; return rest; });
    await firebase.firestore().collection('yedekler').add({
      tarih: bugun, zaman: new Date().toISOString(),
      aciklama, ozet, veri: JSON.stringify(temizVeri),
      olusturan: currentUser?.ad || 'Sistem',
    });
    showToast(`✅ Yedek alındı — ${ozet.toplamKayit} kayıt`);
    // 30'dan fazla olunca eskisini sil
    const snap = await firebase.firestore().collection('yedekler').orderBy('zaman','desc').get();
    if (snap.size > 30) await Promise.all(snap.docs.slice(30).map(d=>d.ref.delete()));
    if (document.getElementById('page-yedekler')?.classList.contains('active')) yedekSayfaYukle();
  } catch(e) { showToast('❌ Yedek alınamadı: ' + e.message); }
}

async function yedekSayfaYukle() {
  if (!currentUser || currentUser.uid !== 'SBIyovehB5RAkSkhc05bIm88PJs2') { showToast('⛔ Yetkiniz yok'); return; }
  const liste = document.getElementById('yedek-liste');
  if (!liste) return;
  liste.innerHTML = '<div style="text-align:center;padding:32px;color:#94a3b8">⏳ Yükleniyor...</div>';
  try {
    const snap = await firebase.firestore().collection('yedekler').orderBy('zaman','desc').limit(30).get();
    if (snap.empty) {
      liste.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8"><div style="font-size:32px;margin-bottom:12px">💾</div><div style="font-weight:700">Henüz yedek alınmamış</div><div style="font-size:12px;margin-top:4px">Şimdi Yedek Al butonuna basın</div></div>';
      return;
    }
    liste.innerHTML = snap.docs.map(d => {
      const v = d.data();
      const tarihStr = new Date(v.zaman).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const etiket = (v.aciklama||'').startsWith('Otomatik')
        ? '<span style="background:#dbeafe;color:#1d4ed8;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700">OTO</span>'
        : '<span style="background:#dcfce7;color:#15803d;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700">MANUEL</span>';
      return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-weight:800;font-size:14px;color:#1A237E">${v.tarih}</span>${etiket}
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:4px">🕐 ${tarihStr}</div>
            <div style="font-size:12px;color:#475569">📦 <strong>${v.ozet?.toplamKayit||0}</strong> kayıt &nbsp;·&nbsp; ✅ <strong>${v.ozet?.aktif||0}</strong> aktif &nbsp;·&nbsp; 👤 ${v.olusturan||''}</div>
            ${v.ozet?.aylar?.length ? `<div style="font-size:11px;color:#94a3b8;margin-top:3px">📅 ${v.ozet.aylar.join(', ')}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button onclick="yedekIndir('${d.id}')" style="flex:1;min-width:80px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:#15803d;cursor:pointer">⬇️ İndir</button>
          <button onclick="yedekGeriYukle('${d.id}','${v.tarih}',${v.ozet?.toplamKayit||0})" style="flex:1;min-width:80px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:#c2410c;cursor:pointer">🔄 Geri Yükle</button>
          <button onclick="yedekSil('${d.id}','${v.tarih}')" style="flex:1;min-width:80px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:#dc2626;cursor:pointer">🗑️ Sil</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) { liste.innerHTML = `<div style="padding:20px;color:#B71C1C;text-align:center">❌ Hata: ${e.message}</div>`; }
}

async function yedekIndir(yedekId) {
  if (!currentUser || currentUser.uid !== 'SBIyovehB5RAkSkhc05bIm88PJs2') { showToast('⛔ Yetkiniz yok'); return; }
  try {
    showToast('⏳ Hazırlanıyor...');
    const doc = await firebase.firestore().collection('yedekler').doc(yedekId).get();
    if (!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    const v = doc.data();
    const icerik = JSON.stringify({ meta:{tarih:v.tarih,zaman:v.zaman,aciklama:v.aciklama,ozet:v.ozet,olusturan:v.olusturan}, veri:JSON.parse(v.veri) }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([icerik],{type:'application/json'}));
    a.download = `evdebaki_yedek_${v.tarih}.json`;
    a.click();
    showToast(`✅ ${v.tarih} yedeği indirildi`);
  } catch(e) { showToast('❌ Hata: '+e.message); }
}

async function yedekSil(yedekId, tarih) {
  if (!currentUser || currentUser.uid !== 'SBIyovehB5RAkSkhc05bIm88PJs2') { showToast('⛔ Yetkiniz yok'); return; }
  if (!confirm(`"${tarih}" tarihli yedeği silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) return;
  try {
    await firebase.firestore().collection('yedekler').doc(yedekId).delete();
    showToast('🗑️ Yedek silindi');
    yedekSayfaYukle();
  } catch(e) { showToast('❌ Hata: '+e.message); }
}

async function yedekGeriYukle(yedekId, tarih, kayitSayisi) {
  if (!currentUser || currentUser.uid !== 'SBIyovehB5RAkSkhc05bIm88PJs2') { showToast('⛔ Yetkiniz yok'); return; }
  if (!confirm(
    `⚠️ DİKKAT — GERİ YÜKLEME\n\n` +
    `"${tarih}" tarihli yedek geri yüklenecek.\n` +
    `Bu yedekte ${kayitSayisi} kayıt var.\n\n` +
    `Mevcut TÜM veriler silinip yedekteki veriler yüklenecek.\n` +
    `Bu işlem GERİ ALINAMAZ!\n\nDevam etmek istiyor musunuz?`
  )) return;
  const girdi = prompt(`Son onay için "EVET" yazın:\n(Mevcut veriler silinecek, ${tarih} yedeği yüklenecek)`);
  if ((girdi||'').trim().toUpperCase() !== 'EVET') { showToast('İptal edildi'); return; }
  try {
    showToast('⏳ Geri yükleniyor...');
    const doc = await firebase.firestore().collection('yedekler').doc(yedekId).get();
    if (!doc.exists) { showToast('❌ Yedek bulunamadı'); return; }
    const yedekVeri = JSON.parse(doc.data().veri);
    const mevcutSnap = await firebase.firestore().collection('vatandaslar').get();
    for (let i=0; i<mevcutSnap.docs.length; i+=400)
      await Promise.all(mevcutSnap.docs.slice(i,i+400).map(d=>d.ref.delete()));
    for (let i=0; i<yedekVeri.length; i+=400) {
      await Promise.all(yedekVeri.slice(i,i+400).map(r=>firebase.firestore().collection('vatandaslar').add(normalizeRecord({...r}))));
      showToast(`⏳ ${Math.min(i+400,yedekVeri.length)}/${yedekVeri.length}`);
    }
    showToast('✅ Geri yükleme tamamlandı! Sayfa yenileniyor...');
    setTimeout(()=>location.reload(), 1800);
  } catch(e) { showToast('❌ Hata: '+e.message); }
}

