// ══════════════════════════════════════════════════════════════
// PERSONEL ATAMA MODÜLÜ
// Firestore koleksiyonu: "personel_atama"
// Her doküman ID'si: vatandaşın ISIM_SOYISIM'i (normalize edilmiş)
// Her doküman: { isim, KADIN_BANYO_1, KADIN_BANYO_2, KADIN_BANYO_3,
//                ERKEK_BANYO_1, ERKEK_BANYO_2, ERKEK_BANYO_3,
//                KUAFOR_1, KUAFOR_2, KUAFOR_3,
//                TEMIZLIK_1, TEMIZLIK_2, TEMIZLIK_3 }
// ══════════════════════════════════════════════════════════════

window.ATAMA_DATA = window.ATAMA_DATA || {}; // { isimKey: { ... } }

// ─── İsim normalize (Firestore ID için) ───
function atamaIsimKey(isim) {
  return (isim || '').trim().toUpperCase().replace(/\s+/g, '_');
}

// ─── Firestore'dan tüm atamaları yükle ───
async function atamaYukle() {
  try {
    const snap = await firebase.firestore().collection('personel_atama').get();
    window.ATAMA_DATA = {};
    snap.forEach(d => {
      window.ATAMA_DATA[d.id] = { _fbId: d.id, ...d.data() };
    });
    // allData'ya uygula
    atamaAllDataUygula();
  } catch(e) {
    console.warn('[Atama] Yükleme hatası:', e.message);
  }
}
window.atamaYukle = atamaYukle;

// ─── allData kayıtlarına atama verilerini uygula (yeni ay gelince de) ───
function atamaAllDataUygula() {
  if (!allData) return;
  allData.forEach(r => {
    const key = atamaIsimKey(r.ISIM_SOYISIM);
    const a = window.ATAMA_DATA[key];
    if (!a) return;
    if (r['HİZMET'] === 'KADIN BANYO') {
      r.PERSONEL1 = r.PERSONEL1 || a.KADIN_BANYO_1 || '';
      r.PERSONEL2 = r.PERSONEL2 || a.KADIN_BANYO_2 || '';
      r.PERSONEL3 = r.PERSONEL3 || a.KADIN_BANYO_3 || '';
    } else if (r['HİZMET'] === 'ERKEK BANYO') {
      r.EB_PERSONEL1 = r.EB_PERSONEL1 || a.ERKEK_BANYO_1 || '';
      r.EB_PERSONEL2 = r.EB_PERSONEL2 || a.ERKEK_BANYO_2 || '';
      r.EB_PERSONEL3 = r.EB_PERSONEL3 || a.ERKEK_BANYO_3 || '';
    } else if (r['HİZMET'] === 'KUAFÖR') {
      r.KF_PERSONEL1 = r.KF_PERSONEL1 || a.KUAFOR_1 || '';
      r.KF_PERSONEL2 = r.KF_PERSONEL2 || a.KUAFOR_2 || '';
      r.KF_PERSONEL3 = r.KF_PERSONEL3 || a.KUAFOR_3 || '';
    }
  });
  // Temizlik planı için
  (window.TP_DATA || []).forEach(r => {
    const key = atamaIsimKey(r.isim);
    const a = window.ATAMA_DATA[key];
    if (!a) return;
    r.PERSONEL1 = r.PERSONEL1 || a.TEMIZLIK_1 || '';
    r.PERSONEL2 = r.PERSONEL2 || a.TEMIZLIK_2 || '';
    r.PERSONEL3 = r.PERSONEL3 || a.TEMIZLIK_3 || '';
    r.ekip = r.ekip || r.PERSONEL1 || '';
  });
}
window.atamaAllDataUygula = atamaAllDataUygula;

// ─── Tek vatandaş için atama kaydet (tüm aylar + personel_atama koleksiyonu) ───
async function atamaKaydet(isimSoyisim, hizmet, personeller) {
  const key = atamaIsimKey(isimSoyisim);
  const p1 = personeller[0] || '';
  const p2 = personeller[1] || '';
  const p3 = personeller[2] || '';

  // 1. personel_atama koleksiyonunu güncelle
  const atamaRef = firebase.firestore().collection('personel_atama').doc(key);
  const atamaObj = { isim: isimSoyisim };

  if (hizmet === 'KADIN BANYO') {
    atamaObj.KADIN_BANYO_1 = p1; atamaObj.KADIN_BANYO_2 = p2; atamaObj.KADIN_BANYO_3 = p3;
  } else if (hizmet === 'ERKEK BANYO') {
    atamaObj.ERKEK_BANYO_1 = p1; atamaObj.ERKEK_BANYO_2 = p2; atamaObj.ERKEK_BANYO_3 = p3;
  } else if (hizmet === 'KUAFÖR') {
    atamaObj.KUAFOR_1 = p1; atamaObj.KUAFOR_2 = p2; atamaObj.KUAFOR_3 = p3;
  } else if (hizmet === 'TEMİZLİK') {
    atamaObj.TEMIZLIK_1 = p1; atamaObj.TEMIZLIK_2 = p2; atamaObj.TEMIZLIK_3 = p3;
  }

  await atamaRef.set(atamaObj, { merge: true });

  // Cache güncelle
  if (!window.ATAMA_DATA[key]) window.ATAMA_DATA[key] = { _fbId: key };
  Object.assign(window.ATAMA_DATA[key], atamaObj);

  // 2. allData'daki tüm ay kayıtlarını güncelle (batch)
  const eslesler = (allData || []).filter(r =>
    r['HİZMET'] === hizmet && r.ISIM_SOYISIM &&
    r.ISIM_SOYISIM.toUpperCase() === isimSoyisim.toUpperCase()
  );

  if (eslesler.length > 0) {
    const batch = firebase.firestore().batch();
    eslesler.forEach(r => {
      if (hizmet === 'KADIN BANYO') {
        r.PERSONEL1 = p1; r.PERSONEL2 = p2; r.PERSONEL3 = p3;
        if (r._fbId) batch.update(
          firebase.firestore().collection('vatandaslar').doc(r._fbId),
          { PERSONEL1: p1, PERSONEL2: p2, PERSONEL3: p3 }
        );
      } else if (hizmet === 'ERKEK BANYO') {
        r.EB_PERSONEL1 = p1; r.EB_PERSONEL2 = p2; r.EB_PERSONEL3 = p3;
        if (r._fbId) batch.update(
          firebase.firestore().collection('vatandaslar').doc(r._fbId),
          { EB_PERSONEL1: p1, EB_PERSONEL2: p2, EB_PERSONEL3: p3 }
        );
      } else if (hizmet === 'KUAFÖR') {
        r.KF_PERSONEL1 = p1; r.KF_PERSONEL2 = p2; r.KF_PERSONEL3 = p3;
        if (r._fbId) batch.update(
          firebase.firestore().collection('vatandaslar').doc(r._fbId),
          { KF_PERSONEL1: p1, KF_PERSONEL2: p2, KF_PERSONEL3: p3 }
        );
      }
    });
    await batch.commit();
  }

  // 3. Temizlik planı için
  if (hizmet === 'TEMİZLİK') {
    const tpEslesler = (window.TP_DATA || []).filter(t =>
      t.isim && t.isim.toUpperCase() === isimSoyisim.toUpperCase()
    );
    for (const t of tpEslesler) {
      t.PERSONEL1 = p1; t.PERSONEL2 = p2; t.PERSONEL3 = p3; t.ekip = p1;
      if (t._fbId) {
        await firebase.firestore().collection('temizlik_plan').doc(t._fbId).update({
          PERSONEL1: p1, PERSONEL2: p2, PERSONEL3: p3, ekip: p1
        });
      }
    }
  }
}
window.atamaKaydet = atamaKaydet;

// ─── Mevcut atamaları personel_atama koleksiyonuna taşı (tek seferlik migrasyon) ───
async function atamaMigrasyonYap() {
  const btn = document.getElementById('atama-migrasyon-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Taşınıyor...'; }

  try {
    const kayitlar = {};

    // allData'dan KB, EB, KF atamaları
    (allData || []).forEach(r => {
      const key = atamaIsimKey(r.ISIM_SOYISIM);
      if (!kayitlar[key]) kayitlar[key] = { isim: r.ISIM_SOYISIM };

      if (r['HİZMET'] === 'KADIN BANYO' && (r.PERSONEL1 || r.PERSONEL2 || r.PERSONEL3)) {
        kayitlar[key].KADIN_BANYO_1 = r.PERSONEL1 || '';
        kayitlar[key].KADIN_BANYO_2 = r.PERSONEL2 || '';
        kayitlar[key].KADIN_BANYO_3 = r.PERSONEL3 || '';
      }
      if (r['HİZMET'] === 'ERKEK BANYO' && (r.EB_PERSONEL1 || r.EB_PERSONEL2 || r.EB_PERSONEL3)) {
        kayitlar[key].ERKEK_BANYO_1 = r.EB_PERSONEL1 || '';
        kayitlar[key].ERKEK_BANYO_2 = r.EB_PERSONEL2 || '';
        kayitlar[key].ERKEK_BANYO_3 = r.EB_PERSONEL3 || '';
      }
      if (r['HİZMET'] === 'KUAFÖR' && (r.KF_PERSONEL1 || r.KF_PERSONEL2 || r.KF_PERSONEL3)) {
        kayitlar[key].KUAFOR_1 = r.KF_PERSONEL1 || '';
        kayitlar[key].KUAFOR_2 = r.KF_PERSONEL2 || '';
        kayitlar[key].KUAFOR_3 = r.KF_PERSONEL3 || '';
      }
    });

    // TP_DATA'dan temizlik atamaları
    (window.TP_DATA || []).forEach(t => {
      const key = atamaIsimKey(t.isim);
      if (!kayitlar[key]) kayitlar[key] = { isim: t.isim };
      const p1 = t.PERSONEL1 || t.ekip || '';
      const p2 = t.PERSONEL2 || '';
      const p3 = t.PERSONEL3 || '';
      if (p1 || p2 || p3) {
        kayitlar[key].TEMIZLIK_1 = p1;
        kayitlar[key].TEMIZLIK_2 = p2;
        kayitlar[key].TEMIZLIK_3 = p3;
      }
    });

    // Firestore'a yaz
    let sayi = 0;
    const entries = Object.entries(kayitlar).filter(([, v]) =>
      v.KADIN_BANYO_1 || v.ERKEK_BANYO_1 || v.KUAFOR_1 || v.TEMIZLIK_1
    );

    for (let i = 0; i < entries.length; i += 400) {
      const batch = firebase.firestore().batch();
      entries.slice(i, i + 400).forEach(([key, val]) => {
        const ref = firebase.firestore().collection('personel_atama').doc(key);
        batch.set(ref, val, { merge: true });
        sayi++;
      });
      await batch.commit();
    }

    await atamaYukle();
    if (typeof showToast === 'function') showToast(`✅ ${sayi} vatandaş ataması taşındı`);
    if (btn) { btn.textContent = `✅ ${sayi} kayıt taşındı`; }
    atamaRenderSayfa();
  } catch(e) {
    console.error(e);
    if (typeof showToast === 'function') showToast('⚠️ Hata: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Mevcut Atamaları Taşı'; }
  }
}
window.atamaMigrasyonYap = atamaMigrasyonYap;

// ══════════════════════════════════════════════════════════════
// ATAMA SAYFASI
// ══════════════════════════════════════════════════════════════

let _atamaHizmet = 'KADIN BANYO';
let _atamaAra = '';
window._atamaSecili = new Set(); // seçili vatandaş isimleri

async function atamaRenderSayfa() {
  const container = document.getElementById('atama-liste');
  if (!container) return;

  // Personel listesi boşsa yükle
  if (!window.PERSONEL_DATA || window.PERSONEL_DATA.length === 0) {
    if (typeof personelYukle === 'function') await personelYukle();
  }
  // Atama verisi boşsa yükle
  if (!window.ATAMA_DATA || Object.keys(window.ATAMA_DATA).length === 0) {
    if (typeof atamaYukle === 'function') await atamaYukle();
  }

  container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">⏳ Yükleniyor...</div>';

  const hizmetMap = {
    'KADIN BANYO':  { alan1: 'KADIN_BANYO_1', alan2: 'KADIN_BANYO_2', alan3: 'KADIN_BANYO_3', renk: '#C2185B', bg: '#fdf2f8' },
    'ERKEK BANYO':  { alan1: 'ERKEK_BANYO_1', alan2: 'ERKEK_BANYO_2', alan3: 'ERKEK_BANYO_3', renk: '#1565C0', bg: '#eff6ff' },
    'KUAFÖR':       { alan1: 'KUAFOR_1',       alan2: 'KUAFOR_2',       alan3: 'KUAFOR_3',       renk: '#2E7D32', bg: '#f0fdf4' },
    'TEMİZLİK':     { alan1: 'TEMIZLIK_1',     alan2: 'TEMIZLIK_2',     alan3: 'TEMIZLIK_3',     renk: '#E65100', bg: '#fff7ed' },
  };
  const hm = hizmetMap[_atamaHizmet];
  const personeller = personelListesi(_atamaHizmet);

  // Stats
  const sayar = {};
  personeller.forEach(p => { sayar[p.ad] = 0; });
  sayar['Atanmamış'] = 0;
  const goruldu = new Set();

  Object.values(window.ATAMA_DATA || {}).forEach(a => {
    const p1 = a[hm.alan1] || '';
    const p2 = a[hm.alan2] || '';
    const p3 = a[hm.alan3] || '';
    // Sadece bu hizmet için kaydı olanlar
    if (!p1 && !p2 && !p3) return;
    if (goruldu.has(a.isim)) return;
    goruldu.add(a.isim);
    [p1, p2, p3].filter(Boolean).forEach(p => { if (p in sayar) sayar[p] = (sayar[p] || 0) + 1; });
  });

  // allData'dan atanmamışları say
  const gorulduIsimler = new Set(Object.values(window.ATAMA_DATA || {})
    .filter(a => a[hm.alan1] || a[hm.alan2] || a[hm.alan3])
    .map(a => a.isim ? a.isim.toUpperCase() : ''));

  const gorulduAtanmamis = new Set();
  (allData || []).filter(r => r['HİZMET'] === _atamaHizmet && r.DURUM === 'AKTİF').forEach(r => {
    if (gorulduAtanmamis.has(r.ISIM_SOYISIM)) return;
    gorulduAtanmamis.add(r.ISIM_SOYISIM);
    if (!gorulduIsimler.has((r.ISIM_SOYISIM || '').toUpperCase())) sayar['Atanmamış']++;
  });
  if (_atamaHizmet === 'TEMİZLİK') {
    const gorulduTp = new Set();
    (window.TP_DATA || []).filter(t => t.durum === 'AKTİF').forEach(t => {
      if (gorulduTp.has(t.isim)) return;
      gorulduTp.add(t.isim);
      if (!gorulduIsimler.has((t.isim || '').toUpperCase())) sayar['Atanmamış']++;
    });
  }

  const statsHtml = Object.entries(sayar).map(([ad, sayi], i) => {
    const renkler = ['#C2185B','#1565C0','#2E7D32','#E65100','#7c3aed','#0891b2','#64748b'];
    const renk = ad === 'Atanmamış' ? '#94a3b8' : renkler[i % renkler.length];
    return `<div style="display:flex;align-items:center;gap:8px;background:#fff;border:2px solid ${renk}44;
                        border-radius:12px;padding:8px 14px;min-width:100px">
      <div style="width:30px;height:30px;border-radius:50%;background:${renk};display:flex;align-items:center;
                  justify-content:center;color:#fff;font-weight:900;font-size:12px;flex-shrink:0">
        ${ad === 'Atanmamış' ? '?' : ad.charAt(0)}
      </div>
      <div>
        <div style="font-weight:800;font-size:11px;color:#1e293b">${ad}</div>
        <div style="font-size:18px;font-weight:900;color:${renk}">${sayi} <span style="font-size:10px;color:#64748b">ev</span></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('atama-stats').innerHTML = statsHtml;

  // Vatandaş listesi
  let vatList = [];
  if (_atamaHizmet === 'TEMİZLİK') {
    const gorulduTp2 = new Set();
    (window.TP_DATA || TP_DATA || []).filter(t => t.durum === 'AKTİF').forEach(t => {
      if (gorulduTp2.has(t.isim)) return;
      gorulduTp2.add(t.isim);
      vatList.push({ isim: t.isim, mahalle: t.mahalle || '' });
    });
  } else {
    const gorulduVat = new Set();
    const kayitlar = (typeof allData !== 'undefined' ? allData : []);
    kayitlar.filter(r => r['HİZMET'] === _atamaHizmet && r.DURUM === 'AKTİF').forEach(r => {
      if (gorulduVat.has(r.ISIM_SOYISIM)) return;
      gorulduVat.add(r.ISIM_SOYISIM);
      vatList.push({ isim: r.ISIM_SOYISIM, mahalle: r.MAHALLE || '' });
    });

    // allData boşsa Firestore'dan çek
    if (vatList.length === 0 && kayitlar.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:30px">
        <div style="color:#94a3b8;margin-bottom:12px">Veriler yükleniyor, lütfen bekleyin...</div>
        <button onclick="atamaRenderSayfa()" style="background:#1A237E;color:#fff;border:none;
          border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer">
          🔄 Yenile
        </button>
      </div>`;
      return;
    }
  }

  // Arama filtresi
  if (_atamaAra) {
    vatList = vatList.filter(v => v.isim.toUpperCase().includes(_atamaAra.toUpperCase()));
  }

  vatList.sort((a, b) => a.isim.localeCompare(b.isim, 'tr'));

  document.getElementById('atama-count').textContent = vatList.length + ' kişi';

  container.innerHTML = vatList.map(v => {
    const key = atamaIsimKey(v.isim);
    const a = window.ATAMA_DATA[key] || {};
    const p1 = a[hm.alan1] || '';
    const p2 = a[hm.alan2] || '';
    const p3 = a[hm.alan3] || '';
    const atananlar = [p1, p2, p3].filter(Boolean);

    const badgeler = atananlar.length
      ? atananlar.map(p => `<span style="background:${hm.bg};color:${hm.renk};border:1px solid ${hm.renk}44;
          border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">${p.split(' ')[0]}</span>`).join(' ')
      : `<span style="color:#94a3b8;font-size:11px">Atanmamış</span>`;

    const secili = window._atamaSecili.has(v.isim);
    const isimEsc = v.isim.replace(/'/g, "\\'");
    return `<div onclick="atamaVatandasSec('${isimEsc}')"
                 style="display:flex;align-items:center;gap:10px;padding:12px 14px;
                        border-bottom:1px solid #f1f5f9;cursor:pointer;
                        background:${secili ? hm.renk+'11' : '#fff'};
                        border-left:4px solid ${secili ? hm.renk : 'transparent'}">
      <div style="width:24px;height:24px;border-radius:6px;
                  border:2px solid ${secili ? hm.renk : '#cbd5e1'};
                  background:${secili ? hm.renk : '#fff'};
                  display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${secili ? '<svg width="13" height="13" viewBox="0 0 13 13"><polyline points="2,7 5,10 11,3" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.isim}</div>
        <div style="font-size:11px;color:#94a3b8">${v.mahalle}</div>
        <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${badgeler}</div>
      </div>
    </div>`;
  }).join('') || `<div style="text-align:center;padding:40px;color:#94a3b8">Kayıt bulunamadı</div>`;
}
window.atamaRenderSayfa = atamaRenderSayfa;

function atamaVatandasSec(isim) {
  if (window._atamaSecili.has(isim)) {
    window._atamaSecili.delete(isim);
  } else {
    window._atamaSecili.add(isim);
  }
  _atamaSeciliGuncelle();
  atamaRenderSayfa();
}
window.atamaVatandasSec = atamaVatandasSec;

function _atamaSeciliGuncelle() {
  const sayi = window._atamaSecili ? window._atamaSecili.size : 0;
  const bar = document.getElementById('atama-secili-bar');
  if (!bar) return;
  if (sayi > 0) {
    bar.style.display = 'flex';
    document.getElementById('atama-secili-sayi').textContent = sayi + ' vatandaş seçildi';
  } else {
    bar.style.display = 'none';
  }
}

function atamaTumunuSec() {
  // Mevcut hizmet için aktif vatandaşları seç
  if (_atamaHizmet === 'TEMİZLİK') {
    (window.TP_DATA || []).filter(t => t.durum === 'AKTİF').forEach(t => window._atamaSecili.add(t.isim));
  } else {
    (typeof allData !== 'undefined' ? allData : [])
      .filter(r => r['HİZMET'] === _atamaHizmet && r.DURUM === 'AKTİF')
      .forEach(r => window._atamaSecili.add(r.ISIM_SOYISIM));
  }
  atamaRenderSayfa();
}
window.atamaTumunuSec = atamaTumunuSec;

function atamaSecimTemizle() {
  window._atamaSecili.clear();
  _atamaSeciliGuncelle();
  atamaRenderSayfa();
}
window.atamaSecimTemizle = atamaSecimTemizle;

function atamaHizmetSec(hizmet, el) {
  _atamaHizmet = hizmet;
  document.querySelectorAll('.atama-hizmet-btn').forEach(b => {
    b.style.background = '#f1f5f9';
    b.style.color = '#475569';
    b.style.fontWeight = '700';
  });
  if (el) { el.style.background = '#1A237E'; el.style.color = '#fff'; }
  atamaRenderSayfa();
}
window.atamaHizmetSec = atamaHizmetSec;

// ─── Atama modal ───
function atamaModalAc(isim, hizmet) {
  const modal = document.getElementById('atama-modal');
  if (!modal) return;
  const personeller = personelListesi(hizmet);

  // Çoklu seçim modunda mevcut atamaları gösterme
  const coklu = isim === '__COKLU__' || (window._atamaSecili && window._atamaSecili.size > 1);
  const gosterIsim = coklu
    ? `${window._atamaSecili.size} vatandaş seçildi`
    : isim;

  const key = atamaIsimKey(isim);
  const a = (!coklu && window.ATAMA_DATA[key]) ? window.ATAMA_DATA[key] : {};

  const hizmetMap = {
    'KADIN BANYO':  ['KADIN_BANYO_1','KADIN_BANYO_2','KADIN_BANYO_3'],
    'ERKEK BANYO':  ['ERKEK_BANYO_1','ERKEK_BANYO_2','ERKEK_BANYO_3'],
    'KUAFÖR':       ['KUAFOR_1','KUAFOR_2','KUAFOR_3'],
    'TEMİZLİK':     ['TEMIZLIK_1','TEMIZLIK_2','TEMIZLIK_3'],
  };
  const renkMap = { 'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100' };
  const alanlar = hizmetMap[hizmet];
  const mevcut = alanlar.map(al => a[al] || '').filter(Boolean);
  const renk = renkMap[hizmet] || '#1A237E';

  document.getElementById('atama-modal-isim').textContent = gosterIsim;
  document.getElementById('atama-modal-hizmet').textContent = hizmet;
  document.getElementById('atama-modal-baslik').style.background = `linear-gradient(135deg,${renk},${renk}cc)`;

  const body = document.getElementById('atama-modal-body');
  body.innerHTML = personeller.map(p => {
    const secili = mevcut.includes(p.ad);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili ? renk : '#e2e8f0'};
                          background:${secili ? renk+'11' : '#fff'};cursor:pointer;margin-bottom:8px">
      <input type="checkbox" value="${p.ad}" ${secili ? 'checked' : ''}
             style="width:16px;height:16px;accent-color:${renk}"
             onchange="atamaModalChipGuncelle()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('');

  modal.dataset.isim = isim === '__COKLU__' ? '' : isim;
  modal.dataset.hizmet = hizmet;
  modal.dataset.renk = renk;
  modal.style.display = 'flex';
  atamaModalChipGuncelle();
}
window.atamaModalAc = atamaModalAc;

function atamaModalChipGuncelle() {
  const secili = [...document.querySelectorAll('#atama-modal-body input:checked')].map(c => c.value);
  const uyari = document.getElementById('atama-modal-uyari');
  const chips = document.getElementById('atama-modal-chips');
  const renk = document.getElementById('atama-modal').dataset.renk || '#1A237E';
  if (uyari) uyari.textContent = secili.length > 3 ? '⚠️ Maksimum 3 personel' : '';
  if (chips) {
    chips.innerHTML = secili.length
      ? secili.map(s => `<span style="background:${renk}11;border:1px solid ${renk};color:${renk};
                                      border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${s}</span>`).join(' ')
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.atamaModalChipGuncelle = atamaModalChipGuncelle;

async function atamaModalKaydet() {
  const modal = document.getElementById('atama-modal');
  const hizmet = modal.dataset.hizmet;
  const secili = [...document.querySelectorAll('#atama-modal-body input:checked')].map(c => c.value);
  if (secili.length > 3) { showToast('⚠️ Maksimum 3 personel seçilebilir'); return; }

  const btn = document.getElementById('atama-modal-kaydet-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...'; }

  try {
    // Seçili vatandaşlar varsa hepsine ata, yoksa sadece modal'daki tek kişiye
    const hedefler = window._atamaSecili && window._atamaSecili.size > 0
      ? [...window._atamaSecili]
      : [modal.dataset.isim];

    for (const isim of hedefler) {
      await atamaKaydet(isim, hizmet, secili);
    }

    modal.style.display = 'none';
    window._atamaSecili.clear();
    atamaRenderSayfa();
    if (typeof filterVat === 'function') filterVat();
    if (typeof tpRender === 'function') tpRender();
    if (typeof kbRenderPersonelStats === 'function') kbRenderPersonelStats(window._kbPersonelFiltre||'');
    showToast(`✅ ${hedefler.length} vatandaş güncellendi`);
  } catch(e) {
    showToast('⚠️ Hata: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Kaydet'; }
  }
}
window.atamaModalKaydet = atamaModalKaydet;

function atamaModalKapat() {
  const modal = document.getElementById('atama-modal');
  if (modal) modal.style.display = 'none';
}
window.atamaModalKapat = atamaModalKapat;
