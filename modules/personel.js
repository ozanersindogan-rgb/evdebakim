// ── PERSONEL YÖNETİMİ ──
// Firestore koleksiyonu: "personeller"
// Her doküman: { ad, hizmet, aktif }
// hizmet: "KADIN BANYO" | "ERKEK BANYO" | "KUAFÖR" | "TEMİZLİK"

// ─── Sabit başlangıç verisi (Firestore boşsa seed edilir) ───
const PERSONEL_SEED = [
  // KADIN BANYO
  { ad: 'Perihan Taş',              hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Seher Işık',               hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Emine Abdülkerimoğlu',     hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Yasemin Kapusuz',          hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Sezgin Alkan',             hizmet: 'KADIN BANYO', aktif: true },
  // ERKEK BANYO
  { ad: 'Ecevit Çakır',             hizmet: 'ERKEK BANYO', aktif: true },
  { ad: 'Talat Duman',              hizmet: 'ERKEK BANYO', aktif: true },
  // KUAFÖR
  { ad: 'Sibel Can',                hizmet: 'KUAFÖR',      aktif: true },
  // TEMİZLİK — ekip başları
  { ad: 'Nihal Erkivaç',            hizmet: 'TEMİZLİK',   aktif: true },
  { ad: 'Hava Aybuğa',              hizmet: 'TEMİZLİK',   aktif: true },
  { ad: 'Gülin Çetindağ',           hizmet: 'TEMİZLİK',   aktif: true },
];

// Bellek cache
window.PERSONEL_DATA = window.PERSONEL_DATA || [];

// ─── Yükleme ───
async function personelYukle() {
  try {
    const snap = await firebase.firestore().collection('personeller').orderBy('hizmet').get();
    if (snap.empty) {
      // İlk kurulum: seed yükle
      await Promise.all(PERSONEL_SEED.map(p =>
        firebase.firestore().collection('personeller').add(p)
      ));
      const snap2 = await firebase.firestore().collection('personeller').orderBy('hizmet').get();
      window.PERSONEL_DATA = snap2.docs.map(d => ({ _fbId: d.id, ...d.data() }));
    } else {
      window.PERSONEL_DATA = snap.docs.map(d => ({ _fbId: d.id, ...d.data() }));
    }
  } catch(e) {
    console.warn('[Personel] Yükleme hatası:', e.message);
    window.PERSONEL_DATA = [];
  }
}

// ─── Hizmete göre aktif personel listesi ───
function personelListesi(hizmet) {
  return (window.PERSONEL_DATA || []).filter(p => p.hizmet === hizmet && p.aktif !== false);
}

// ─── Kadın banyo personel istatistikleri ───
function kbPersonelStats() {
  const hizmet = 'KADIN BANYO';
  const personeller = personelListesi(hizmet);
  const ay = (typeof vatAy !== 'undefined' && vatAy) ? vatAy : null;
  const aktifKayitlar = allData.filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF' && (!ay || r.AY === ay));

  const sayar = {};
  personeller.forEach(p => { sayar[p.ad] = 0; });
  sayar['Atanmamış'] = 0;

  aktifKayitlar.forEach(r => {
    const atananlar = [r.PERSONEL1, r.PERSONEL2, r.PERSONEL3].filter(Boolean);
    if (!atananlar.length) {
      sayar['Atanmamış'] = (sayar['Atanmamış'] || 0) + 1;
    } else {
      atananlar.forEach(p => {
        sayar[p] = (sayar[p] || 0) + 1;
      });
    }
  });

  return sayar;
}

// ─── Kadın banyo stats render ───
function kbRenderPersonelStats(filtre) {
  const statsEl = document.getElementById('kb-personel-stats');
  if (!statsEl) return;

  const sayar = kbPersonelStats();
  const renkler = ['#C2185B','#1565C0','#2E7D32','#E65100','#7c3aed','#0891b2','#64748b'];

  statsEl.innerHTML = Object.entries(sayar)
    .filter(([, s]) => s > 0 || !(window._kbPersonelFiltre))
    .map(([ad, sayi], i) => {
      const renk = ad === 'Atanmamış' ? '#94a3b8' : renkler[i % renkler.length];
      const aktif = filtre === ad;
      return `<div onclick="kbPersonelFiltrele('${ad.replace(/'/g,"\\'")}')"
        style="display:flex;align-items:center;gap:10px;background:${aktif ? renk+'22' : '#fff'};
               border:2px solid ${aktif ? renk : renk+'44'};border-radius:12px;padding:10px 16px;
               min-width:110px;cursor:pointer;transition:all .15s">
        <div style="width:34px;height:34px;border-radius:50%;background:${renk};display:flex;align-items:center;
                    justify-content:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0">
          ${ad === 'Atanmamış' ? '?' : ad.charAt(0)}
        </div>
        <div>
          <div style="font-weight:800;font-size:12px;color:#1e293b;white-space:nowrap">${ad}</div>
          <div style="font-size:20px;font-weight:900;color:${renk};line-height:1.1">
            ${sayi} <span style="font-size:11px;font-weight:600;color:#64748b">ev</span>
          </div>
        </div>
      </div>`;
    }).join('');
  // Filtre aktifse "Tümünü Göster" butonu ekle
  if (window._kbPersonelFiltre) {
    statsEl.innerHTML += `<div onclick="kbPersonelFiltrele('')"
      style="display:flex;align-items:center;gap:8px;background:#fff;
             border:2px solid #e2e8f0;border-radius:12px;padding:10px 16px;
             min-width:80px;cursor:pointer;transition:all .15s">
      <div style="width:34px;height:34px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;
                  justify-content:center;color:#64748b;font-weight:900;font-size:16px;flex-shrink:0">✕</div>
      <div>
        <div style="font-weight:800;font-size:12px;color:#64748b;white-space:nowrap">Tümü</div>
        <div style="font-size:11px;color:#94a3b8">filtreyi kaldır</div>
      </div>
    </div>`;
  }
}

window._kbPersonelFiltre = '';
function kbPersonelFiltrele(ad) {
  window._kbPersonelFiltre = (window._kbPersonelFiltre === ad) ? '' : ad;
  kbRenderPersonelStats(window._kbPersonelFiltre);
  if (typeof filterVat === 'function') filterVat();
}
window.kbPersonelFiltrele = kbPersonelFiltrele;

// ─── Personel atama modal ───
function kbPersonelAta(idx) {
  const r = allData[idx];
  if (!r || r['HİZMET'] !== 'KADIN BANYO') return;

  const mevcut = [r.PERSONEL1, r.PERSONEL2, r.PERSONEL3].filter(Boolean);
  const personeller = personelListesi('KADIN BANYO');

  const modal = document.getElementById('personel-modal');
  const body  = document.getElementById('personel-modal-body');
  if (!modal || !body) return;

  document.getElementById('personel-modal-isim').textContent = r.ISIM_SOYISIM;

  body.innerHTML = personeller.map(p => {
    const secili = mevcut.includes(p.ad);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili ? '#C2185B' : '#e2e8f0'};
                          background:${secili ? '#fdf2f8' : '#fff'};cursor:pointer;margin-bottom:8px">
      <input type="checkbox" value="${p.ad}" ${secili ? 'checked' : ''}
             style="width:16px;height:16px;accent-color:#C2185B"
             onchange="kbPersonelSecimGuncelle()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('');

  modal.dataset.idx = idx;
  modal.style.display = 'flex';
  kbPersonelSecimGuncelle();
}
window.kbPersonelAta = kbPersonelAta;

function kbPersonelSecimGuncelle() {
  const secili = [...document.querySelectorAll('#personel-modal-body input:checked')].map(c => c.value);
  const uyari  = document.getElementById('personel-modal-uyari');
  if (uyari) {
    uyari.textContent = secili.length > 3 ? '⚠️ Maksimum 3 personel atanabilir' : '';
    uyari.style.color = '#b45309';
  }
  // Seçili chip'leri göster
  const chips = document.getElementById('personel-modal-chips');
  if (chips) {
    chips.innerHTML = secili.length
      ? secili.map(s => `<span style="background:#fdf2f8;border:1px solid #C2185B;color:#C2185B;
                                      border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${s}</span>`).join(' ')
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.kbPersonelSecimGuncelle = kbPersonelSecimGuncelle;

async function kbPersonelKaydet() {
  const modal = document.getElementById('personel-modal');
  const idx   = parseInt(modal.dataset.idx);
  const r     = allData[idx];
  if (!r) return;

  const secili = [...document.querySelectorAll('#personel-modal-body input:checked')].map(c => c.value);
  if (secili.length > 3) { showToast('⚠️ Maksimum 3 personel seçilebilir'); return; }

  r.PERSONEL1 = secili[0] || '';
  r.PERSONEL2 = secili[1] || '';
  r.PERSONEL3 = secili[2] || '';

  if (r._fbId) {
    await firebase.firestore().collection('vatandaslar').doc(r._fbId).update({
      PERSONEL1: r.PERSONEL1, PERSONEL2: r.PERSONEL2, PERSONEL3: r.PERSONEL3
    });
  }

  modal.style.display = 'none';
  kbRenderPersonelStats(window._kbPersonelFiltre);
  if (typeof filterVat === 'function') filterVat();
  showToast(`✅ ${r.ISIM_SOYISIM} — personel güncellendi`);
}
window.kbPersonelKaydet = kbPersonelKaydet;

function kbPersonelModalKapat() {
  const modal = document.getElementById('personel-modal');
  if (modal) modal.style.display = 'none';
}
window.kbPersonelModalKapat = kbPersonelModalKapat;

// ─── TEMİZLİK personel istatistikleri ───
function tpPersonelStats() {
  const personeller = personelListesi('TEMİZLİK');
  const aktifKayitlar = (window.TP_DATA || []).filter(r => r.durum === 'AKTİF');

  const sayar = {};
  personeller.forEach(p => { sayar[p.ad] = 0; });
  sayar['Atanmamış'] = 0;

  aktifKayitlar.forEach(r => {
    const ekip = (r.ekip || '').trim();
    if (!ekip) {
      sayar['Atanmamış'] = (sayar['Atanmamış'] || 0) + 1;
    } else {
      sayar[ekip] = (sayar[ekip] || 0) + 1;
    }
  });

  return sayar;
}

function tpRenderPersonelStats(filtre) {
  const statsEl = document.getElementById('tp-personel-stats-bar');
  if (!statsEl) return;

  const sayar = tpPersonelStats();
  const EKIP_RENK = { 'Gülin': '#C2185B', 'Hava': '#1565C0', 'Nihal': '#2E7D32', 'Tüm Ekip': '#7c3aed' };

  statsEl.innerHTML = Object.entries(sayar)
    .filter(([, s]) => s > 0 || !window._tpPersonelFiltre)
    .map(([ad, sayi]) => {
      const renk = ad === 'Atanmamış' ? '#94a3b8' : (EKIP_RENK[ad] || '#64748b');
      const aktif = filtre === ad;
      return `<div onclick="tpPersonelFiltrele('${ad.replace(/'/g, "\\'")}')"
        style="display:flex;align-items:center;gap:10px;background:${aktif ? renk + '22' : '#fff'};
               border:2px solid ${aktif ? renk : renk + '44'};border-radius:12px;padding:10px 16px;
               min-width:110px;cursor:pointer;transition:all .15s">
        <div style="width:34px;height:34px;border-radius:50%;background:${renk};display:flex;align-items:center;
                    justify-content:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0">
          ${ad === 'Atanmamış' ? '?' : ad.charAt(0)}
        </div>
        <div>
          <div style="font-weight:800;font-size:12px;color:#1e293b;white-space:nowrap">${ad}</div>
          <div style="font-size:20px;font-weight:900;color:${renk};line-height:1.1">
            ${sayi} <span style="font-size:11px;font-weight:600;color:#64748b">ev</span>
          </div>
        </div>
      </div>`;
    }).join('');
  // Filtre aktifse "Tümünü Göster" butonu ekle
  if (window._tpPersonelFiltre) {
    statsEl.innerHTML += `<div onclick="tpPersonelFiltrele('')"
      style="display:flex;align-items:center;gap:8px;background:#fff;
             border:2px solid #e2e8f0;border-radius:12px;padding:10px 16px;
             min-width:80px;cursor:pointer;transition:all .15s">
      <div style="width:34px;height:34px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;
                  justify-content:center;color:#64748b;font-weight:900;font-size:16px;flex-shrink:0">✕</div>
      <div>
        <div style="font-weight:800;font-size:12px;color:#64748b;white-space:nowrap">Tümü</div>
        <div style="font-size:11px;color:#94a3b8">filtreyi kaldır</div>
      </div>
    </div>`;
  }
}

window._tpPersonelFiltre = '';
function tpPersonelFiltrele(ad) {
  window._tpPersonelFiltre = (window._tpPersonelFiltre === ad) ? '' : ad;
  tpRenderPersonelStats(window._tpPersonelFiltre);
  if (typeof tpRender === 'function') tpRender();
}
window.tpPersonelFiltrele = tpPersonelFiltrele;

// ─── Temizlik personel atama modal ───
function tpPersonelAta(idx) {
  const r = window.TP_DATA[idx];
  if (!r) return;

  const mevcut = (r.ekip || '').trim();
  const personeller = personelListesi('TEMİZLİK');

  const modal = document.getElementById('tp-personel-modal');
  const body  = document.getElementById('tp-personel-modal-body');
  if (!modal || !body) return;

  document.getElementById('tp-personel-modal-isim').textContent = r.isim;

  body.innerHTML = personeller.map(p => {
    const secili = mevcut === p.ad;
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili ? '#E65100' : '#e2e8f0'};
                          background:${secili ? '#fff7ed' : '#fff'};cursor:pointer;margin-bottom:8px">
      <input type="radio" name="tp-personel-radio" value="${p.ad}" ${secili ? 'checked' : ''}
             style="width:16px;height:16px;accent-color:#E65100"
             onchange="tpPersonelSecimGuncelle()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('') + `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
      border:1.5px solid ${!mevcut ? '#E65100' : '#e2e8f0'};
      background:${!mevcut ? '#fff7ed' : '#fff'};cursor:pointer;margin-bottom:8px">
    <input type="radio" name="tp-personel-radio" value="" ${!mevcut ? 'checked' : ''}
           style="width:16px;height:16px;accent-color:#E65100"
           onchange="tpPersonelSecimGuncelle()">
    <span style="font-weight:700;font-size:13px;color:#94a3b8">— Atanmamış</span>
  </label>`;

  modal.dataset.idx = idx;
  modal.style.display = 'flex';
  tpPersonelSecimGuncelle();
}
window.tpPersonelAta = tpPersonelAta;

function tpPersonelSecimGuncelle() {
  const secili = document.querySelector('#tp-personel-modal-body input[name="tp-personel-radio"]:checked');
  const chips = document.getElementById('tp-personel-modal-chips');
  if (chips) {
    const val = secili ? secili.value : '';
    chips.innerHTML = val
      ? `<span style="background:#fff7ed;border:1px solid #E65100;color:#E65100;
                      border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${val}</span>`
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.tpPersonelSecimGuncelle = tpPersonelSecimGuncelle;

async function tpPersonelKaydet() {
  const modal = document.getElementById('tp-personel-modal');
  const idx   = parseInt(modal.dataset.idx);
  const r     = window.TP_DATA[idx];
  if (!r) return;

  const secili = document.querySelector('#tp-personel-modal-body input[name="tp-personel-radio"]:checked');
  r.ekip = secili ? secili.value : '';

  if (r._fbId) {
    await firebase.firestore().collection('temizlik_plan').doc(r._fbId).update({ ekip: r.ekip });
  }

  modal.style.display = 'none';
  tpRenderPersonelStats(window._tpPersonelFiltre);
  if (typeof tpRender === 'function') tpRender();
  showToast(`✅ ${r.isim} — ekip güncellendi`);
}
window.tpPersonelKaydet = tpPersonelKaydet;

function tpPersonelModalKapat() {
  const modal = document.getElementById('tp-personel-modal');
  if (modal) modal.style.display = 'none';
}
window.tpPersonelModalKapat = tpPersonelModalKapat;

// ─── ERKEK BANYO personel istatistikleri ───
function ebPersonelStats() {
  const hizmet = 'ERKEK BANYO';
  const personeller = personelListesi(hizmet);
  const ay = (typeof vatAy !== 'undefined' && vatAy) ? vatAy : null;
  const aktifKayitlar = allData.filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF' && (!ay || r.AY === ay));

  const sayar = {};
  personeller.forEach(p => { sayar[p.ad] = 0; });
  sayar['Atanmamış'] = 0;

  aktifKayitlar.forEach(r => {
    const atananlar = [r.EB_PERSONEL1, r.EB_PERSONEL2, r.EB_PERSONEL3].filter(Boolean);
    if (!atananlar.length) {
      sayar['Atanmamış'] = (sayar['Atanmamış'] || 0) + 1;
    } else {
      atananlar.forEach(p => { sayar[p] = (sayar[p] || 0) + 1; });
    }
  });
  return sayar;
}

function ebRenderPersonelStats(filtre) {
  const statsEl = document.getElementById('eb-personel-stats');
  if (!statsEl) return;
  const sayar = ebPersonelStats();
  const renkler = ['#1565C0','#2E7D32','#C2185B','#E65100','#7c3aed','#0891b2','#64748b'];
  statsEl.innerHTML = Object.entries(sayar)
    .filter(([, s]) => s > 0 || !(window._ebPersonelFiltre))
    .map(([ad, sayi], i) => {
      const renk = ad === 'Atanmamış' ? '#94a3b8' : renkler[i % renkler.length];
      const aktif = filtre === ad;
      return `<div onclick="ebPersonelFiltrele('${ad.replace(/'/g,"\\'")}') "
        style="display:flex;align-items:center;gap:10px;background:${aktif ? renk+'22' : '#fff'};
               border:2px solid ${aktif ? renk : renk+'44'};border-radius:12px;padding:10px 16px;
               min-width:110px;cursor:pointer;transition:all .15s">
        <div style="width:34px;height:34px;border-radius:50%;background:${renk};display:flex;align-items:center;
                    justify-content:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0">
          ${ad === 'Atanmamış' ? '?' : ad.charAt(0)}
        </div>
        <div>
          <div style="font-weight:800;font-size:12px;color:#1e293b;white-space:nowrap">${ad}</div>
          <div style="font-size:20px;font-weight:900;color:${renk};line-height:1.1">
            ${sayi} <span style="font-size:11px;font-weight:600;color:#64748b">ev</span>
          </div>
        </div>
      </div>`;
    }).join('');
  // Filtre aktifse "Tümünü Göster" butonu ekle
  if (window._ebPersonelFiltre) {
    statsEl.innerHTML += `<div onclick="ebPersonelFiltrele('')"
      style="display:flex;align-items:center;gap:8px;background:#fff;
             border:2px solid #e2e8f0;border-radius:12px;padding:10px 16px;
             min-width:80px;cursor:pointer;transition:all .15s">
      <div style="width:34px;height:34px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;
                  justify-content:center;color:#64748b;font-weight:900;font-size:16px;flex-shrink:0">✕</div>
      <div>
        <div style="font-weight:800;font-size:12px;color:#64748b;white-space:nowrap">Tümü</div>
        <div style="font-size:11px;color:#94a3b8">filtreyi kaldır</div>
      </div>
    </div>`;
  }
}

window._ebPersonelFiltre = '';
function ebPersonelFiltrele(ad) {
  window._ebPersonelFiltre = (window._ebPersonelFiltre === ad) ? '' : ad;
  ebRenderPersonelStats(window._ebPersonelFiltre);
  if (typeof filterVat === 'function') filterVat();
}
window.ebPersonelFiltrele = ebPersonelFiltrele;

function ebPersonelAta(idx) {
  const r = allData[idx];
  if (!r || r['HİZMET'] !== 'ERKEK BANYO') return;

  const mevcut = [r.EB_PERSONEL1, r.EB_PERSONEL2, r.EB_PERSONEL3].filter(Boolean);
  const personeller = personelListesi('ERKEK BANYO');

  const modal = document.getElementById('eb-personel-modal');
  const body  = document.getElementById('eb-personel-modal-body');
  if (!modal || !body) return;

  document.getElementById('eb-personel-modal-isim').textContent = r.ISIM_SOYISIM;

  body.innerHTML = personeller.map(p => {
    const secili = mevcut.includes(p.ad);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili ? '#1565C0' : '#e2e8f0'};
                          background:${secili ? '#eff6ff' : '#fff'};cursor:pointer;margin-bottom:8px">
      <input type="checkbox" value="${p.ad}" ${secili ? 'checked' : ''}
             style="width:16px;height:16px;accent-color:#1565C0"
             onchange="ebPersonelSecimGuncelle()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('');

  modal.dataset.idx = idx;
  modal.style.display = 'flex';
  ebPersonelSecimGuncelle();
}
window.ebPersonelAta = ebPersonelAta;

function ebPersonelSecimGuncelle() {
  const secili = [...document.querySelectorAll('#eb-personel-modal-body input:checked')].map(c => c.value);
  const uyari  = document.getElementById('eb-personel-modal-uyari');
  if (uyari) {
    uyari.textContent = secili.length > 3 ? '⚠️ Maksimum 3 personel atanabilir' : '';
    uyari.style.color = '#b45309';
  }
  const chips = document.getElementById('eb-personel-modal-chips');
  if (chips) {
    chips.innerHTML = secili.length
      ? secili.map(s => `<span style="background:#eff6ff;border:1px solid #1565C0;color:#1565C0;
                                      border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${s}</span>`).join(' ')
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.ebPersonelSecimGuncelle = ebPersonelSecimGuncelle;

async function ebPersonelKaydet() {
  const modal = document.getElementById('eb-personel-modal');
  const idx   = parseInt(modal.dataset.idx);
  const r     = allData[idx];
  if (!r) return;

  const secili = [...document.querySelectorAll('#eb-personel-modal-body input:checked')].map(c => c.value);
  if (secili.length > 3) { showToast('⚠️ Maksimum 3 personel seçilebilir'); return; }

  r.EB_PERSONEL1 = secili[0] || '';
  r.EB_PERSONEL2 = secili[1] || '';
  r.EB_PERSONEL3 = secili[2] || '';

  if (r._fbId) {
    await firebase.firestore().collection('vatandaslar').doc(r._fbId).update({
      EB_PERSONEL1: r.EB_PERSONEL1, EB_PERSONEL2: r.EB_PERSONEL2, EB_PERSONEL3: r.EB_PERSONEL3
    });
  }

  modal.style.display = 'none';
  ebRenderPersonelStats(window._ebPersonelFiltre);
  if (typeof filterVat === 'function') filterVat();
  showToast(`✅ ${r.ISIM_SOYISIM} — personel güncellendi`);
}
window.ebPersonelKaydet = ebPersonelKaydet;

function ebPersonelModalKapat() {
  const modal = document.getElementById('eb-personel-modal');
  if (modal) modal.style.display = 'none';
}
window.ebPersonelModalKapat = ebPersonelModalKapat;

// ─── KUAFÖR personel istatistikleri ───
function kfPersonelStats() {
  const hizmet = 'KUAFÖR';
  const personeller = personelListesi(hizmet);
  const ay = (typeof vatAy !== 'undefined' && vatAy) ? vatAy : null;
  const aktifKayitlar = allData.filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF' && (!ay || r.AY === ay));

  const sayar = {};
  personeller.forEach(p => { sayar[p.ad] = 0; });
  sayar['Atanmamış'] = 0;

  aktifKayitlar.forEach(r => {
    const atananlar = [r.KF_PERSONEL1, r.KF_PERSONEL2, r.KF_PERSONEL3].filter(Boolean);
    if (!atananlar.length) {
      sayar['Atanmamış'] = (sayar['Atanmamış'] || 0) + 1;
    } else {
      atananlar.forEach(p => { sayar[p] = (sayar[p] || 0) + 1; });
    }
  });
  return sayar;
}

function kfRenderPersonelStats(filtre) {
  const statsEl = document.getElementById('kf-personel-stats');
  if (!statsEl) return;
  const sayar = kfPersonelStats();
  const renkler = ['#2E7D32','#C2185B','#1565C0','#E65100','#7c3aed','#0891b2','#64748b'];
  statsEl.innerHTML = Object.entries(sayar)
    .filter(([, s]) => s > 0 || !(window._kfPersonelFiltre))
    .map(([ad, sayi], i) => {
      const renk = ad === 'Atanmamış' ? '#94a3b8' : renkler[i % renkler.length];
      const aktif = filtre === ad;
      return `<div onclick="kfPersonelFiltrele('${ad.replace(/'/g,"\\'")}') "
        style="display:flex;align-items:center;gap:10px;background:${aktif ? renk+'22' : '#fff'};
               border:2px solid ${aktif ? renk : renk+'44'};border-radius:12px;padding:10px 16px;
               min-width:110px;cursor:pointer;transition:all .15s">
        <div style="width:34px;height:34px;border-radius:50%;background:${renk};display:flex;align-items:center;
                    justify-content:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0">
          ${ad === 'Atanmamış' ? '?' : ad.charAt(0)}
        </div>
        <div>
          <div style="font-weight:800;font-size:12px;color:#1e293b;white-space:nowrap">${ad}</div>
          <div style="font-size:20px;font-weight:900;color:${renk};line-height:1.1">
            ${sayi} <span style="font-size:11px;font-weight:600;color:#64748b">ev</span>
          </div>
        </div>
      </div>`;
    }).join('');
  // Filtre aktifse "Tümünü Göster" butonu ekle
  if (window._kfPersonelFiltre) {
    statsEl.innerHTML += `<div onclick="kfPersonelFiltrele('')"
      style="display:flex;align-items:center;gap:8px;background:#fff;
             border:2px solid #e2e8f0;border-radius:12px;padding:10px 16px;
             min-width:80px;cursor:pointer;transition:all .15s">
      <div style="width:34px;height:34px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;
                  justify-content:center;color:#64748b;font-weight:900;font-size:16px;flex-shrink:0">✕</div>
      <div>
        <div style="font-weight:800;font-size:12px;color:#64748b;white-space:nowrap">Tümü</div>
        <div style="font-size:11px;color:#94a3b8">filtreyi kaldır</div>
      </div>
    </div>`;
  }
}

window._kfPersonelFiltre = '';
function kfPersonelFiltrele(ad) {
  window._kfPersonelFiltre = (window._kfPersonelFiltre === ad) ? '' : ad;
  kfRenderPersonelStats(window._kfPersonelFiltre);
  if (typeof filterVat === 'function') filterVat();
}
window.kfPersonelFiltrele = kfPersonelFiltrele;

function kfPersonelAta(idx) {
  const r = allData[idx];
  if (!r || r['HİZMET'] !== 'KUAFÖR') return;

  const mevcut = [r.KF_PERSONEL1, r.KF_PERSONEL2, r.KF_PERSONEL3].filter(Boolean);
  const personeller = personelListesi('KUAFÖR');

  const modal = document.getElementById('kf-personel-modal');
  const body  = document.getElementById('kf-personel-modal-body');
  if (!modal || !body) return;

  document.getElementById('kf-personel-modal-isim').textContent = r.ISIM_SOYISIM;

  body.innerHTML = personeller.map(p => {
    const secili = mevcut.includes(p.ad);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili ? '#2E7D32' : '#e2e8f0'};
                          background:${secili ? '#f0fdf4' : '#fff'};cursor:pointer;margin-bottom:8px">
      <input type="checkbox" value="${p.ad}" ${secili ? 'checked' : ''}
             style="width:16px;height:16px;accent-color:#2E7D32"
             onchange="kfPersonelSecimGuncelle()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('');

  modal.dataset.idx = idx;
  modal.style.display = 'flex';
  kfPersonelSecimGuncelle();
}
window.kfPersonelAta = kfPersonelAta;

function kfPersonelSecimGuncelle() {
  const secili = [...document.querySelectorAll('#kf-personel-modal-body input:checked')].map(c => c.value);
  const uyari  = document.getElementById('kf-personel-modal-uyari');
  if (uyari) {
    uyari.textContent = secili.length > 3 ? '⚠️ Maksimum 3 personel atanabilir' : '';
    uyari.style.color = '#b45309';
  }
  const chips = document.getElementById('kf-personel-modal-chips');
  if (chips) {
    chips.innerHTML = secili.length
      ? secili.map(s => `<span style="background:#f0fdf4;border:1px solid #2E7D32;color:#2E7D32;
                                      border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${s}</span>`).join(' ')
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.kfPersonelSecimGuncelle = kfPersonelSecimGuncelle;

async function kfPersonelKaydet() {
  const modal = document.getElementById('kf-personel-modal');
  const idx   = parseInt(modal.dataset.idx);
  const r     = allData[idx];
  if (!r) return;

  const secili = [...document.querySelectorAll('#kf-personel-modal-body input:checked')].map(c => c.value);
  if (secili.length > 3) { showToast('⚠️ Maksimum 3 personel seçilebilir'); return; }

  r.KF_PERSONEL1 = secili[0] || '';
  r.KF_PERSONEL2 = secili[1] || '';
  r.KF_PERSONEL3 = secili[2] || '';

  if (r._fbId) {
    await firebase.firestore().collection('vatandaslar').doc(r._fbId).update({
      KF_PERSONEL1: r.KF_PERSONEL1, KF_PERSONEL2: r.KF_PERSONEL2, KF_PERSONEL3: r.KF_PERSONEL3
    });
  }

  modal.style.display = 'none';
  kfRenderPersonelStats(window._kfPersonelFiltre);
  if (typeof filterVat === 'function') filterVat();
  showToast(`✅ ${r.ISIM_SOYISIM} — personel güncellendi`);
}
window.kfPersonelKaydet = kfPersonelKaydet;

function kfPersonelModalKapat() {
  const modal = document.getElementById('kf-personel-modal');
  if (modal) modal.style.display = 'none';
}
window.kfPersonelModalKapat = kfPersonelModalKapat;

// ─── TEMİZLİK çoklu personel (PERSONEL1/2/3 alanlarına) ───
function tpPersonelAta_Coklu(idx) {
  const r = window.TP_DATA[idx];
  if (!r) return;

  const mevcut = [r.PERSONEL1, r.PERSONEL2, r.PERSONEL3].filter(Boolean);
  const personeller = personelListesi('TEMİZLİK');

  const modal = document.getElementById('tp-personel-modal');
  const body  = document.getElementById('tp-personel-modal-body');
  if (!modal || !body) return;

  document.getElementById('tp-personel-modal-isim').textContent = r.isim;

  body.innerHTML = personeller.map(p => {
    const secili = mevcut.includes(p.ad);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili ? '#E65100' : '#e2e8f0'};
                          background:${secili ? '#fff7ed' : '#fff'};cursor:pointer;margin-bottom:8px">
      <input type="checkbox" value="${p.ad}" ${secili ? 'checked' : ''}
             style="width:16px;height:16px;accent-color:#E65100"
             onchange="tpPersonelSecimGuncelle_Coklu()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('') + `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
    border:1.5px solid ${!mevcut.length ? '#E65100' : '#e2e8f0'};
    background:${!mevcut.length ? '#fff7ed' : '#fff'};cursor:pointer;margin-bottom:8px">
    <input type="checkbox" value="__SIFIRLA__" id="tp-sifirla-cb"
           style="width:16px;height:16px;accent-color:#E65100"
           onchange="tpPersonelSifirla()">
    <span style="font-weight:700;font-size:13px;color:#94a3b8">— Atanmamış (Sıfırla)</span>
  </label>`;

  modal.dataset.idx = idx;
  modal.style.display = 'flex';
  tpPersonelSecimGuncelle_Coklu();
}
window.tpPersonelAta = tpPersonelAta_Coklu;

function tpPersonelSifirla() {
  const cb = document.getElementById('tp-sifirla-cb');
  if (cb && cb.checked) {
    document.querySelectorAll('#tp-personel-modal-body input[type="checkbox"]:not(#tp-sifirla-cb)').forEach(c => c.checked = false);
  }
  tpPersonelSecimGuncelle_Coklu();
}
window.tpPersonelSifirla = tpPersonelSifirla;

function tpPersonelSecimGuncelle_Coklu() {
  const secili = [...document.querySelectorAll('#tp-personel-modal-body input[type="checkbox"]:not(#tp-sifirla-cb):checked')].map(c => c.value);
  const uyari  = document.getElementById('tp-personel-modal-uyari');
  if (uyari) {
    uyari.textContent = secili.length > 3 ? '⚠️ Maksimum 3 personel atanabilir' : '';
    uyari.style.color = '#b45309';
  }
  const chips = document.getElementById('tp-personel-modal-chips');
  if (chips) {
    chips.innerHTML = secili.length
      ? secili.map(s => `<span style="background:#fff7ed;border:1px solid #E65100;color:#E65100;
                                      border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${s}</span>`).join(' ')
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.tpPersonelSecimGuncelle = tpPersonelSecimGuncelle_Coklu;

async function tpPersonelKaydet_Coklu() {
  const modal = document.getElementById('tp-personel-modal');
  const idx   = parseInt(modal.dataset.idx);
  const r     = window.TP_DATA[idx];
  if (!r) return;

  const secili = [...document.querySelectorAll('#tp-personel-modal-body input[type="checkbox"]:not(#tp-sifirla-cb):checked')].map(c => c.value);
  if (secili.length > 3) { showToast('⚠️ Maksimum 3 personel seçilebilir'); return; }

  r.PERSONEL1 = secili[0] || '';
  r.PERSONEL2 = secili[1] || '';
  r.PERSONEL3 = secili[2] || '';
  // ekip alanını da ilk personel ile güncelle (geriye uyumluluk)
  r.ekip = r.PERSONEL1 || '';

  if (r._fbId) {
    await firebase.firestore().collection('temizlik_plan').doc(r._fbId).update({
      PERSONEL1: r.PERSONEL1, PERSONEL2: r.PERSONEL2, PERSONEL3: r.PERSONEL3, ekip: r.ekip
    });
  }

  modal.style.display = 'none';
  tpRenderPersonelStats(window._tpPersonelFiltre);
  if (typeof tpRender === 'function') tpRender();
  showToast(`✅ ${r.isim} — personel güncellendi`);
}
window.tpPersonelKaydet = tpPersonelKaydet_Coklu;

// ─── AYARLAR: Personel CRUD ───
async function ayarlarPersonelRender() {
  const el = document.getElementById('ayarlar-personel-liste');
  if (!el) return;
  await personelYukle();

  const hizmetler = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];
  const renkler   = { 'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100' };

  el.innerHTML = hizmetler.map(h => {
    const liste = (window.PERSONEL_DATA || []).filter(p => p.hizmet === h);
    return `
      <div style="margin-bottom:24px">
        <div style="font-weight:900;font-size:13px;color:${renkler[h]};margin-bottom:10px;
                    text-transform:uppercase;letter-spacing:.06em">
          ${h} <span style="font-weight:600;color:#94a3b8;font-size:11px">(${liste.filter(p=>p.aktif!==false).length} aktif)</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px" id="personel-grup-${h.replace(/ /g,'-')}">
          ${liste.map(p => `
            <div style="display:flex;align-items:center;gap:10px;background:#fff;
                        border:1.5px solid ${p.aktif===false ? '#e2e8f0' : renkler[h]+'44'};
                        border-radius:10px;padding:10px 14px;opacity:${p.aktif===false ? '.55' : '1'}">
              <span style="flex:1;font-weight:700;font-size:13px;color:#1e293b">${p.ad}</span>
              <span style="font-size:11px;font-weight:700;color:${p.aktif===false ? '#94a3b8' : '#16a34a'}">
                ${p.aktif===false ? 'Pasif' : 'Aktif'}
              </span>
              <button onclick="ayarlarPersonelToggle('${p._fbId}',${p.aktif!==false})"
                style="background:${p.aktif===false ? '#f0fdf4' : '#fff7ed'};border:1px solid ${p.aktif===false ? '#bbf7d0' : '#fed7aa'};
                       border-radius:7px;padding:4px 10px;font-size:11px;font-weight:700;
                       color:${p.aktif===false ? '#15803d' : '#c2410c'};cursor:pointer">
                ${p.aktif===false ? '✅ Aktif Et' : '⏸ Pasif'}
              </button>
              <button onclick="ayarlarPersonelSil('${p._fbId}','${p.ad.replace(/'/g,"\\'")}')"
                style="background:#fef2f2;border:1px solid #fecaca;border-radius:7px;
                       padding:4px 10px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer">🗑️</button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <input id="yeni-personel-${h.replace(/ /g,'-')}" type="text" placeholder="Yeni personel adı..."
            style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
          <button onclick="ayarlarPersonelEkle('${h}')"
            style="background:${renkler[h]};color:#fff;border:none;border-radius:8px;
                   padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer">+ Ekle</button>
        </div>
      </div>`;
  }).join('');
}
window.ayarlarPersonelRender = ayarlarPersonelRender;

async function ayarlarPersonelEkle(hizmet) {
  const inputId = 'yeni-personel-' + hizmet.replace(/ /g, '-');
  const input = document.getElementById(inputId);
  if (!input) return;
  const ad = input.value.trim();
  if (!ad) { showToast('⚠️ Ad boş olamaz'); return; }

  const yeni = { ad, hizmet, aktif: true };
  const ref = await firebase.firestore().collection('personeller').add(yeni);
  window.PERSONEL_DATA.push({ _fbId: ref.id, ...yeni });
  input.value = '';
  showToast(`✅ ${ad} eklendi`);
  ayarlarPersonelRender();
}
window.ayarlarPersonelEkle = ayarlarPersonelEkle;

async function ayarlarPersonelToggle(fbId, mevcutAktif) {
  const yeniAktif = !mevcutAktif;
  await firebase.firestore().collection('personeller').doc(fbId).update({ aktif: yeniAktif });
  const p = window.PERSONEL_DATA.find(x => x._fbId === fbId);
  if (p) p.aktif = yeniAktif;
  ayarlarPersonelRender();
  showToast(yeniAktif ? 'Aktif edildi' : 'Pasif edildi');
}
window.ayarlarPersonelToggle = ayarlarPersonelToggle;

async function ayarlarPersonelSil(fbId, ad) {
  if (!confirm(`"${ad}" personelini silmek istiyor musunuz?`)) return;
  await firebase.firestore().collection('personeller').doc(fbId).delete();
  window.PERSONEL_DATA = window.PERSONEL_DATA.filter(p => p._fbId !== fbId);
  showToast(`🗑️ ${ad} silindi`);
  ayarlarPersonelRender();
}
window.ayarlarPersonelSil = ayarlarPersonelSil;
