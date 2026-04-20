// ══════════════════════════════════════════════════════════════
// GÜNLÜK PERİYOT MODÜLÜ
// Firestore koleksiyonu: "periyot"
// Her doküman: { isim, mahalle, hizmet, gun }
// ══════════════════════════════════════════════════════════════

const GUNLER = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'
];

const GUN_RENK = {
  'Pazartesi': '#4f46e5',
  'Salı':      '#0369a1',
  'Çarşamba':  '#0891b2',
  'Perşembe':  '#7c3aed',
  'Cuma':      '#b45309',
};

const HIZMET_RENK = {
  'KADIN BANYO': '#C2185B',
  'ERKEK BANYO': '#1565C0',
  'KUAFÖR':      '#2E7D32',
  'TEMİZLİK':    '#E65100',
};

window._periyotData = []; // { _fbId, isim, mahalle, hizmet, gun }
let _periyotYuklendi = false;
let _periyotHizmet = 'KADIN BANYO';
let _periyotGun = '';  // '' = tümü
let _periyotAra = '';
let _periyotMahalle = '';

// ── Yükle ────────────────────────────────────────────────────
async function periyotYukle() {
  try {
    const snap = await firebase.firestore().collection('periyot').get();
    window._periyotData = [];
    snap.forEach(d => window._periyotData.push({ _fbId: d.id, ...d.data() }));
    _periyotYuklendi = true;
    periyotRender();
  } catch(e) {
    showToast('❌ Periyot yüklenemedi: ' + e.message);
  }
}
window.periyotYukle = periyotYukle;

// ── Ana render ───────────────────────────────────────────────
function periyotRender() {
  _periyotMahalleDoldur();
  _periyotHizmetTabRender();
  _periyotIcerikRender();
}
window.periyotRender = periyotRender;

function _periyotMahalleDoldur() {
  const sel = document.getElementById('periyot-mah-filtre');
  if (!sel) return;
  const mahalleler = [...new Set(
    window._periyotData
      .filter(p => p.hizmet === _periyotHizmet)
      .map(p => p.mahalle).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'))
  )];
  const current = sel.value;
  sel.innerHTML = '<option value="">Tüm Mahalleler</option>' +
    mahalleler.map(m => `<option value="${m}"${m===current?' selected':''}>${m}</option>`).join('');
}

function _periyotHizmetTabRender() {
  const wrap = document.getElementById('periyot-hizmet-tabs');
  if (!wrap) return;
  const hizmetler = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];
  wrap.innerHTML = hizmetler.map(h => {
    const renk = HIZMET_RENK[h];
    const aktif = h === _periyotHizmet;
    const sayi = window._periyotData.filter(p => p.hizmet === h).length;
    return `<button onclick="periyotHizmetSec('${h}')" style="
      padding:8px 16px;border-radius:10px;border:2px solid ${aktif ? renk : '#e2e8f0'};
      background:${aktif ? renk : '#fff'};color:${aktif ? '#fff' : '#64748b'};
      font-weight:800;font-size:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px">
      ${h === 'KADIN BANYO' ? '🛁' : h === 'ERKEK BANYO' ? '🚿' : h === 'KUAFÖR' ? '✂️' : '🧹'}
      ${h.replace('KADIN ','Kadın ').replace('ERKEK ','Erkek ').replace('KUAFÖR','Kuaför').replace('TEMİZLİK','Temizlik')}
      <span style="background:${aktif?'rgba(255,255,255,.3)':'#f1f5f9'};border-radius:10px;padding:1px 7px;font-size:11px">${sayi}</span>
    </button>`;
  }).join('');
}

function _periyotIcerikRender() {
  const container = document.getElementById('periyot-icerik');
  if (!container) return;

  const araStr = (_periyotAra || '').toUpperCase().trim();
  const mahFiltre = document.getElementById('periyot-mah-filtre')?.value || '';

  let veri = window._periyotData.filter(p => {
    if (p.hizmet !== _periyotHizmet) return false;
    if (_periyotGun && p.gun !== _periyotGun) return false;
    if (mahFiltre && p.mahalle !== mahFiltre) return false;
    if (araStr && !(p.isim || '').toUpperCase().includes(araStr)) return false;
    return true;
  });

  // Gün sayaçları
  const gunSayac = {};
  GUNLER.forEach(g => {
    gunSayac[g] = window._periyotData.filter(p => p.hizmet === _periyotHizmet && p.gun === g).length;
  });

  // Gün filtre butonları
  const gunTabsEl = document.getElementById('periyot-gun-tabs');
  if (gunTabsEl) {
    gunTabsEl.innerHTML = `
      <button onclick="periyotGunSec('')" style="
        padding:6px 14px;border-radius:8px;border:2px solid ${!_periyotGun?'#1A237E':'#e2e8f0'};
        background:${!_periyotGun?'#1A237E':'#fff'};color:${!_periyotGun?'#fff':'#64748b'};
        font-weight:800;font-size:12px;cursor:pointer">
        Tümü <span style="opacity:.7">${window._periyotData.filter(p=>p.hizmet===_periyotHizmet).length}</span>
      </button>` +
      GUNLER.map(g => {
        const renk = GUN_RENK[g];
        const aktif = _periyotGun === g;
        return `<button onclick="periyotGunSec('${g}')" style="
          padding:6px 14px;border-radius:8px;border:2px solid ${aktif?renk:'#e2e8f0'};
          background:${aktif?renk:'#fff'};color:${aktif?'#fff':'#64748b'};
          font-weight:800;font-size:12px;cursor:pointer">
          ${g} <span style="opacity:.7">${gunSayac[g]||0}</span>
        </button>`;
      }).join('');
  }

  if (!veri.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;font-size:14px">
      📭 Kayıt bulunamadı
      <div style="margin-top:12px">
        <button onclick="periyotEkleModal()" style="background:#1A237E;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer">
          ➕ İlk Kaydı Ekle
        </button>
      </div>
    </div>`;
    return;
  }

  // Mahalle bazlı grupla
  const mahGruplari = {};
  veri.forEach(p => {
    const mah = p.mahalle || '(Mahalle Yok)';
    if (!mahGruplari[mah]) mahGruplari[mah] = {};
    const gun = p.gun || 'Gün Yok';
    if (!mahGruplari[mah][gun]) mahGruplari[mah][gun] = [];
    mahGruplari[mah][gun].push(p);
  });

  const mahalleler = Object.keys(mahGruplari).sort((a,b)=>a.localeCompare(b,'tr'));

  container.innerHTML = mahalleler.map(mah => {
    const gunGruplari = mahGruplari[mah];
    const gunSirali = [...GUNLER.filter(g => gunGruplari[g]), ...Object.keys(gunGruplari).filter(g => !GUNLER.includes(g))];
    const toplamKisi = Object.values(gunGruplari).flat().length;

    const gunBloklari = gunSirali.map(gun => {
      const renk = GUN_RENK[gun] || '#64748b';
      const kisiler = gunGruplari[gun];
      return `
        <div style="margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:${renk};color:#fff;border-radius:6px;padding:2px 10px;
              font-size:11px;font-weight:900">${gun}</span>
            <span style="font-size:11px;color:#94a3b8;font-weight:700">${kisiler.length} kişi</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding-left:4px">
            ${kisiler.map(p => `
              <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;
                padding:7px 12px;font-size:12px;display:flex;align-items:center;gap:8px;
                cursor:pointer;transition:box-shadow .15s"
                onmouseover="this.style.boxShadow='0 2px 10px rgba(0,0,0,.1)'"
                onmouseout="this.style.boxShadow=''">
                <span style="font-weight:700;color:#1e293b">${p.isim}</span>
                <button onclick="periyotSil('${p._fbId}','${p.isim.replace(/'/g,"\\'")}',event)"
                  style="background:none;border:none;cursor:pointer;color:#e2e8f0;font-size:14px;padding:0;margin-left:4px;line-height:1"
                  onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#e2e8f0'"
                  title="Sil">✕</button>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

    return `
      <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;
        margin-bottom:14px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);
          padding:12px 16px;border-bottom:1.5px solid #e2e8f0;
          display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:900;font-size:14px;color:#1e293b">📍 ${mah}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;font-weight:700;color:#64748b">${toplamKisi} kişi</span>
            <button onclick="periyotEkleModal('${mah.replace(/'/g,"\\'")}','${_periyotHizmet}')"
              style="background:#1A237E;color:#fff;border:none;border-radius:8px;
                padding:5px 12px;font-size:11px;font-weight:800;cursor:pointer">
              ➕ Ekle
            </button>
          </div>
        </div>
        <div style="padding:14px 16px">${gunBloklari}</div>
      </div>`;
  }).join('');
}

// ── Hizmet seç ───────────────────────────────────────────────
function periyotHizmetSec(h) {
  _periyotHizmet = h;
  _periyotGun = '';
  periyotRender();
}
window.periyotHizmetSec = periyotHizmetSec;

// ── Gün seç ──────────────────────────────────────────────────
function periyotGunSec(g) {
  _periyotGun = g;
  _periyotIcerikRender();
}
window.periyotGunSec = periyotGunSec;

// ── Filtre ───────────────────────────────────────────────────
function periyotAraFiltrele() {
  _periyotAra = document.getElementById('periyot-ara')?.value || '';
  _periyotIcerikRender();
}
window.periyotAraFiltrele = periyotAraFiltrele;

function periyotMahalleFiltrele() {
  _periyotIcerikRender();
}
window.periyotMahalleFiltrele = periyotMahalleFiltrele;

// ── Ekle Modal ───────────────────────────────────────────────
function periyotEkleModal(mahalle, hizmet) {
  const hizmetDefault = hizmet || _periyotHizmet;
  const mahDefault = mahalle || '';

  // Aktif vatandaşları getir
  const aktifler = [...new Map(
    (allData || [])
      .filter(r => r['HİZMET'] === hizmetDefault && r.DURUM === 'AKTİF')
      .map(r => [r.ISIM_SOYISIM, r])
  ).values()].sort((a,b)=>a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));

  // Zaten eklenmiş olanları işaretle
  const ekliIsimler = new Set(
    window._periyotData
      .filter(p => p.hizmet === hizmetDefault)
      .map(p => p.isim)
  );

  const mahalleler = [...new Set((allData||[]).map(r=>r.MAHALLE).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr')))];

  document.getElementById('periyot-modal-body').innerHTML = `
    <h3 style="margin:0 0 16px;font-size:16px;color:#1A237E">➕ Periyot Kaydı Ekle</h3>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:4px">HİZMET</label>
        <select id="pm-hizmet" class="form-select" onchange="periyotModalHizmetDegisti()" style="width:100%">
          ${['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'].map(h=>
            `<option value="${h}"${h===hizmetDefault?' selected':''}>${h}</option>`
          ).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:4px">VATANDAŞ *</label>
        <input id="pm-ara" class="form-input" placeholder="🔍 İsim ara..." oninput="periyotModalFiltrele()" style="width:100%;margin-bottom:6px">
        <select id="pm-isim" class="form-select" size="6" style="width:100%;height:auto;min-height:120px">
          ${aktifler.map(r => {
            const ekli = ekliIsimler.has(r.ISIM_SOYISIM);
            return `<option value="${r.ISIM_SOYISIM}" data-mah="${r.MAHALLE||''}" ${ekli?'style="color:#94a3b8"':''}>${r.ISIM_SOYISIM} — ${r.MAHALLE||''}${ekli?' ✓':''}</option>`;
          }).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:4px">MAHALLE</label>
        <select id="pm-mahalle" class="form-select" style="width:100%">
          <option value="">— Otomatik (vatandaştan) —</option>
          ${mahalleler.map(m=>`<option value="${m}"${m===mahDefault?' selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:4px">GÜN *</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="pm-gun-group">
          ${GUNLER.map(g => `
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;
              background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 12px;
              font-size:12px;font-weight:700;transition:all .15s"
              onmouseover="this.style.borderColor='${GUN_RENK[g]}'" onmouseout="if(!this.querySelector('input').checked)this.style.borderColor='#e2e8f0'">
              <input type="radio" name="pm-gun" value="${g}" style="accent-color:${GUN_RENK[g]}">
              ${g}
            </label>`).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="periyotEkleKaydet()"
        style="flex:1;background:#1A237E;color:#fff;border:none;border-radius:10px;
          padding:12px;font-size:14px;font-weight:800;cursor:pointer">
        💾 Kaydet
      </button>
      <button onclick="periyotModalKapat()"
        style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:10px;
          padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer">
        İptal
      </button>
    </div>`;

  // İsim seçilince mahalle otomatik dolsun
  document.getElementById('pm-isim').addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    const mah = opt?.dataset?.mah || '';
    const mahSel = document.getElementById('pm-mahalle');
    if (mahSel && mah) mahSel.value = mah;
  });

  document.getElementById('periyot-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
window.periyotEkleModal = periyotEkleModal;

function periyotModalHizmetDegisti() {
  const h = document.getElementById('pm-hizmet')?.value;
  if (!h) return;
  const aktifler = [...new Map(
    (allData||[]).filter(r=>r['HİZMET']===h&&r.DURUM==='AKTİF').map(r=>[r.ISIM_SOYISIM,r])
  ).values()].sort((a,b)=>a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));
  const ekliIsimler = new Set(window._periyotData.filter(p=>p.hizmet===h).map(p=>p.isim));
  const sel = document.getElementById('pm-isim');
  if (sel) sel.innerHTML = aktifler.map(r => {
    const ekli = ekliIsimler.has(r.ISIM_SOYISIM);
    return `<option value="${r.ISIM_SOYISIM}" data-mah="${r.MAHALLE||''}" ${ekli?'style="color:#94a3b8"':''}>${r.ISIM_SOYISIM} — ${r.MAHALLE||''}${ekli?' ✓':''}</option>`;
  }).join('');
}
window.periyotModalHizmetDegisti = periyotModalHizmetDegisti;

function periyotModalFiltrele() {
  const ara = (document.getElementById('pm-ara')?.value || '').toUpperCase();
  const h = document.getElementById('pm-hizmet')?.value || _periyotHizmet;
  const aktifler = [...new Map(
    (allData||[]).filter(r=>r['HİZMET']===h&&r.DURUM==='AKTİF').map(r=>[r.ISIM_SOYISIM,r])
  ).values()].filter(r=>!ara||r.ISIM_SOYISIM.includes(ara))
   .sort((a,b)=>a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));
  const ekliIsimler = new Set(window._periyotData.filter(p=>p.hizmet===h).map(p=>p.isim));
  const sel = document.getElementById('pm-isim');
  if (sel) sel.innerHTML = aktifler.map(r=>{
    const ekli=ekliIsimler.has(r.ISIM_SOYISIM);
    return `<option value="${r.ISIM_SOYISIM}" data-mah="${r.MAHALLE||''}" ${ekli?'style="color:#94a3b8"':''}>${r.ISIM_SOYISIM} — ${r.MAHALLE||''}${ekli?' ✓':''}</option>`;
  }).join('');
}
window.periyotModalFiltrele = periyotModalFiltrele;

function periyotModalKapat() {
  document.getElementById('periyot-modal').style.display = 'none';
  document.body.style.overflow = '';
}
window.periyotModalKapat = periyotModalKapat;

async function periyotEkleKaydet() {
  const hizmet = document.getElementById('pm-hizmet')?.value;
  const isimSel = document.getElementById('pm-isim');
  const isim = isimSel?.value;
  const opt = isimSel?.options[isimSel.selectedIndex];
  const mahalleSel = document.getElementById('pm-mahalle')?.value;
  const mahalle = mahalleSel || opt?.dataset?.mah || '';
  const gun = document.querySelector('input[name="pm-gun"]:checked')?.value;

  if (!isim) { showToast('⚠️ Vatandaş seçin'); return; }
  if (!gun) { showToast('⚠️ Gün seçin'); return; }

  // Aynı isim+hizmet zaten var mı?
  const varMi = window._periyotData.find(p => p.hizmet===hizmet && p.isim===isim);
  if (varMi) {
    // Güncelle
    try {
      await firebase.firestore().collection('periyot').doc(varMi._fbId).update({ gun, mahalle });
      varMi.gun = gun; varMi.mahalle = mahalle;
      showToast(`✅ ${isim} periyotu güncellendi → ${gun}`);
    } catch(e) { showToast('❌ ' + e.message); return; }
  } else {
    // Yeni ekle
    try {
      const ref = await firebase.firestore().collection('periyot').add({ isim, hizmet, mahalle, gun });
      window._periyotData.push({ _fbId: ref.id, isim, hizmet, mahalle, gun });
      showToast(`✅ ${isim} → ${gun} eklendi`);
    } catch(e) { showToast('❌ ' + e.message); return; }
  }

  periyotModalKapat();
  periyotRender();
}
window.periyotEkleKaydet = periyotEkleKaydet;

// ── Sil ──────────────────────────────────────────────────────
async function periyotSil(fbId, isim, event) {
  event.stopPropagation();
  if (!confirm(`"${isim}" periyot kaydını silmek istiyor musunuz?`)) return;
  try {
    await firebase.firestore().collection('periyot').doc(fbId).delete();
    window._periyotData = window._periyotData.filter(p => p._fbId !== fbId);
    showToast(`🗑️ ${isim} silindi`);
    periyotRender();
  } catch(e) {
    showToast('❌ ' + e.message);
  }
}
window.periyotSil = periyotSil;
