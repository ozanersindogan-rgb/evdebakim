// ══════════════════════════════════════════════════════════════
// GÜNLÜK PERİYOT MODÜLÜ v2
// Firestore koleksiyonu: "periyot"
// Doküman: { isim, mahalle, hizmet, gun, dilim, kapasite }
// ══════════════════════════════════════════════════════════════

const GUNLER  = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const DILIMLER = ['Sabah','Öğleden Sonra'];

const GUN_RENK = {
  Pazartesi:'#4f46e5',Salı:'#0369a1',Çarşamba:'#0891b2',Perşembe:'#7c3aed',Cuma:'#b45309'
};
const DILIM_RENK  = {Sabah:'#f59e0b','Öğleden Sonra':'#6366f1'};
const DILIM_EMOJI = {Sabah:'🌅','Öğleden Sonra':'🌇'};
const HIZMET_RENK = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};
const HIZMET_EMOJI= {'KADIN BANYO':'🛁','ERKEK BANYO':'🚿','KUAFÖR':'✂️','TEMİZLİK':'🧹'};
const HIZMET_LABEL= {'KADIN BANYO':'Kadın Banyo','ERKEK BANYO':'Erkek Banyo','KUAFÖR':'Kuaför','TEMİZLİK':'Temizlik'};

window._periyotData = [];
let _periyotHizmet = 'KADIN BANYO';
let _periyotGun    = '';
let _periyotDilim  = '';
let _periyotAra    = '';

// ── Yükle ────────────────────────────────────────────────────
async function periyotYukle() {
  const c = document.getElementById('periyot-icerik');
  if (c) c.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8">⏳ Yükleniyor...</div>';
  try {
    const snap = await firebase.firestore().collection('periyot').get();
    window._periyotData = [];
    snap.forEach(d => window._periyotData.push({ _fbId: d.id, ...d.data() }));
    periyotRender();
  } catch(e) { showToast('❌ Periyot yüklenemedi: ' + e.message); }
}
window.periyotYukle = periyotYukle;

function periyotRender() {
  _periyotHizmetTabRender();
  _periyotMahalleDoldur();
  _periyotIcerikRender();
}
window.periyotRender = periyotRender;

// ── Hizmet sekmeleri ─────────────────────────────────────────
function _periyotHizmetTabRender() {
  const wrap = document.getElementById('periyot-hizmet-tabs');
  if (!wrap) return;
  wrap.innerHTML = Object.keys(HIZMET_RENK).map(h => {
    const aktif = h === _periyotHizmet;
    const renk  = HIZMET_RENK[h];
    const sayi  = window._periyotData.filter(p => p.hizmet===h).length;
    return `<button onclick="periyotHizmetSec('${h}')" style="
      padding:8px 16px;border-radius:10px;border:2px solid ${aktif?renk:'#e2e8f0'};
      background:${aktif?renk:'#fff'};color:${aktif?'#fff':'#64748b'};
      font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap">
      ${HIZMET_EMOJI[h]} ${HIZMET_LABEL[h]}
      <span style="background:${aktif?'rgba(255,255,255,.3)':'#f1f5f9'};border-radius:10px;padding:1px 8px;font-size:11px">${sayi}</span>
    </button>`;
  }).join('');
}

function _periyotMahalleDoldur() {
  const sel = document.getElementById('periyot-mah-filtre');
  if (!sel) return;
  const mahalleler = [...new Set(
    window._periyotData.filter(p=>p.hizmet===_periyotHizmet).map(p=>p.mahalle).filter(Boolean)
  )].sort((a,b)=>a.localeCompare(b,'tr'));
  const cur = sel.value;
  sel.innerHTML = '<option value="">Tüm Mahalleler</option>' +
    mahalleler.map(m=>`<option value="${m}"${m===cur?' selected':''}>${m}</option>`).join('');
}

// ── İçerik ───────────────────────────────────────────────────
function _periyotIcerikRender() {
  const container = document.getElementById('periyot-icerik');
  if (!container) return;

  const araStr    = (_periyotAra||'').toUpperCase().trim();
  const mahFiltre = document.getElementById('periyot-mah-filtre')?.value||'';
  const hizmetTum = window._periyotData.filter(p=>p.hizmet===_periyotHizmet);

  // Sayaçlar
  const gunSayac = {};
  GUNLER.forEach(g => { gunSayac[g] = hizmetTum.filter(p=>p.gun===g).length; });
  const slotSayac = {};
  GUNLER.forEach(g => DILIMLER.forEach(d => {
    slotSayac[g+'|'+d] = hizmetTum.filter(p=>p.gun===g&&p.dilim===d).length;
  }));

  // ── Gün + dilim filtre butonları ──
  const gunTabsEl = document.getElementById('periyot-gun-tabs');
  if (gunTabsEl) {
    gunTabsEl.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
      <button onclick="periyotGunSec('','')" style="
        padding:5px 14px;border-radius:8px;border:2px solid ${!_periyotGun?'#1A237E':'#e2e8f0'};
        background:${!_periyotGun?'#1A237E':'#fff'};color:${!_periyotGun?'#fff':'#64748b'};
        font-weight:800;font-size:12px;cursor:pointer">
        Tümü <span style="opacity:.7">${hizmetTum.length}</span>
      </button>
      ${GUNLER.map(g=>{
        const aktifGun = _periyotGun===g && !_periyotDilim;
        const renk = GUN_RENK[g];
        return `<div style="display:flex;gap:0;align-items:center">
          <button onclick="periyotGunSec('${g}','')" style="
            padding:5px 11px;border-radius:8px 0 0 8px;
            border:2px solid ${aktifGun?renk:'#e2e8f0'};border-right:none;
            background:${aktifGun?renk:'#fff'};color:${aktifGun?'#fff':'#64748b'};
            font-weight:800;font-size:11px;cursor:pointer;white-space:nowrap">
            ${g} <span style="opacity:.7">${gunSayac[g]||0}</span>
          </button>
          <button onclick="periyotGunSec('${g}','Sabah')" title="Sabah (${slotSayac[g+'|Sabah']||0})" style="
            padding:5px 8px;border:2px solid ${_periyotGun===g&&_periyotDilim==='Sabah'?DILIM_RENK.Sabah:'#e2e8f0'};border-left:none;
            background:${_periyotGun===g&&_periyotDilim==='Sabah'?DILIM_RENK.Sabah:'#fff'};
            color:${_periyotGun===g&&_periyotDilim==='Sabah'?'#fff':'#94a3b8'};
            font-size:13px;cursor:pointer;border-radius:0">
            🌅<span style="font-size:10px;font-weight:800">${slotSayac[g+'|Sabah']||0}</span>
          </button>
          <button onclick="periyotGunSec('${g}','Öğleden Sonra')" title="Öğleden Sonra (${slotSayac[g+'|Öğleden Sonra']||0})" style="
            padding:5px 8px;border:2px solid ${_periyotGun===g&&_periyotDilim==='Öğleden Sonra'?DILIM_RENK['Öğleden Sonra']:'#e2e8f0'};border-left:none;
            background:${_periyotGun===g&&_periyotDilim==='Öğleden Sonra'?DILIM_RENK['Öğleden Sonra']:'#fff'};
            color:${_periyotGun===g&&_periyotDilim==='Öğleden Sonra'?'#fff':'#94a3b8'};
            font-size:13px;cursor:pointer;border-radius:0 8px 8px 0">
            🌇<span style="font-size:10px;font-weight:800">${slotSayac[g+'|Öğleden Sonra']||0}</span>
          </button>
        </div>`;
      }).join('')}
    </div>`;
  }

  // Filtreli veri
  let veri = hizmetTum.filter(p=>{
    if (_periyotGun && p.gun!==_periyotGun) return false;
    if (_periyotDilim && p.dilim!==_periyotDilim) return false;
    if (mahFiltre && p.mahalle!==mahFiltre) return false;
    if (araStr && !(p.isim||'').toUpperCase().includes(araStr)) return false;
    return true;
  });

  // Özet bar
  const ozetEl = document.getElementById('periyot-ozet');
  if (ozetEl) {
    const tekSayi  = veri.filter(p=>p.kapasite!=='cift').length;
    const ciftSayi = veri.filter(p=>p.kapasite==='cift').length;
    ozetEl.innerHTML = veri.length ? `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <span style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:800;color:#15803d">👤 Tek: ${tekSayi}</span>
        <span style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:800;color:#1d4ed8">👥 Çift: ${ciftSayi}</span>
        <span style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:800;color:#475569">Toplam: ${veri.length}</span>
      </div>` : '';
  }

  if (!veri.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;font-size:14px">
      📭 Kayıt bulunamadı
      <div style="margin-top:12px">
        <button onclick="periyotEkleModal()" style="background:#1A237E;color:#fff;border:none;
          border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer">
          ➕ İlk Kaydı Ekle
        </button>
      </div></div>`;
    return;
  }

  // Mahalle → Gün → Dilim grupla
  const mahGruplari = {};
  veri.forEach(p=>{
    const mah  = p.mahalle||'(Mahalle Yok)';
    const gun  = p.gun||'Gün Yok';
    const dilim= p.dilim||'Sabah';
    if (!mahGruplari[mah]) mahGruplari[mah]={};
    if (!mahGruplari[mah][gun]) mahGruplari[mah][gun]={};
    if (!mahGruplari[mah][gun][dilim]) mahGruplari[mah][gun][dilim]=[];
    mahGruplari[mah][gun][dilim].push(p);
  });

  const mahalleler = Object.keys(mahGruplari).sort((a,b)=>a.localeCompare(b,'tr'));

  container.innerHTML = mahalleler.map(mah=>{
    const gunGruplari = mahGruplari[mah];
    const tumKisiler  = Object.values(gunGruplari).flatMap(d=>Object.values(d).flat());
    const mahTek      = tumKisiler.filter(p=>p.kapasite!=='cift').length;
    const mahCift     = tumKisiler.filter(p=>p.kapasite==='cift').length;
    const mahToplam   = tumKisiler.length;
    const gunSirali   = GUNLER.filter(g=>gunGruplari[g]);

    const gunBloklari = gunSirali.map(gun=>{
      const gRenk = GUN_RENK[gun]||'#64748b';
      const dilimGruplari = gunGruplari[gun];
      return DILIMLER.filter(d=>dilimGruplari[d]?.length).map(dilim=>{
        const kisiler  = dilimGruplari[dilim];
        const dRenk    = DILIM_RENK[dilim];
        const dEmoji   = DILIM_EMOJI[dilim];
        const dilimTek = kisiler.filter(p=>p.kapasite!=='cift').length;
        const dilimCift= kisiler.filter(p=>p.kapasite==='cift').length;
        return `<div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap">
            <span style="background:${gRenk};color:#fff;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:900">${gun}</span>
            <span style="background:${dRenk}22;color:${dRenk};border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${dEmoji} ${dilim}</span>
            <span style="font-size:11px;color:#64748b;font-weight:700">
              ${kisiler.length} kişi
              ${dilimTek  ? `<span style="color:#15803d;margin-left:4px">· 👤${dilimTek}</span>`:''}
              ${dilimCift ? `<span style="color:#1d4ed8;margin-left:4px">· 👥${dilimCift}</span>`:''}
            </span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding-left:4px">
            ${kisiler.map(p=>{
              const isCift = p.kapasite==='cift';
              return `<div style="background:#fff;border:1.5px solid ${isCift?'#bfdbfe':'#e2e8f0'};
                border-radius:10px;padding:6px 10px;font-size:12px;
                display:flex;align-items:center;gap:6px">
                <span style="background:${isCift?'#eff6ff':'#f0fdf4'};color:${isCift?'#1d4ed8':'#15803d'};
                  border:1px solid ${isCift?'#bfdbfe':'#bbf7d0'};border-radius:5px;
                  padding:1px 7px;font-size:10px;font-weight:800;white-space:nowrap">
                  ${isCift?'👥 Çift':'👤 Tek'}
                </span>
                <span style="font-weight:700;color:#1e293b">${p.isim}</span>
                <button onclick="periyotKapasiteDegistir('${p._fbId}','${isCift?'tek':'cift'}',event)"
                  style="background:none;border:1px solid #e2e8f0;border-radius:5px;
                    cursor:pointer;color:#94a3b8;font-size:10px;padding:1px 6px;white-space:nowrap"
                  title="${isCift?'Tek kişiliğe çevir':'Çift kişiliğe çevir'}">
                  ${isCift?'👤':'👥'}
                </button>
                <button onclick="periyotSil('${p._fbId}','${p.isim.replace(/'/g,"\\'")}',event)"
                  style="background:none;border:none;cursor:pointer;color:#d1d5db;font-size:14px;padding:0;line-height:1"
                  onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#d1d5db'">✕</button>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('');
    }).join('');

    return `<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;margin-bottom:14px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);padding:12px 16px;
        border-bottom:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="font-weight:900;font-size:14px;color:#1e293b">📍 ${mah}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:700;color:#64748b">${mahToplam} kişi</span>
          ${mahTek  ? `<span style="font-size:11px;font-weight:800;color:#15803d">👤 ${mahTek}</span>`:''}
          ${mahCift ? `<span style="font-size:11px;font-weight:800;color:#1d4ed8">👥 ${mahCift}</span>`:''}
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

// ── Seçiciler ────────────────────────────────────────────────
function periyotHizmetSec(h) { _periyotHizmet=h; _periyotGun=''; _periyotDilim=''; periyotRender(); }
window.periyotHizmetSec = periyotHizmetSec;
function periyotGunSec(g,d) { _periyotGun=g; _periyotDilim=d; _periyotIcerikRender(); }
window.periyotGunSec = periyotGunSec;
function periyotAraFiltrele() { _periyotAra=document.getElementById('periyot-ara')?.value||''; _periyotIcerikRender(); }
window.periyotAraFiltrele = periyotAraFiltrele;
function periyotMahalleFiltrele() { _periyotIcerikRender(); }
window.periyotMahalleFiltrele = periyotMahalleFiltrele;

// ── Kapasite değiştir ────────────────────────────────────────
async function periyotKapasiteDegistir(fbId, yeni, event) {
  event.stopPropagation();
  try {
    await firebase.firestore().collection('periyot').doc(fbId).update({ kapasite: yeni });
    const item = window._periyotData.find(p=>p._fbId===fbId);
    if (item) item.kapasite = yeni;
    _periyotIcerikRender();
  } catch(e) { showToast('❌ '+e.message); }
}
window.periyotKapasiteDegistir = periyotKapasiteDegistir;

// ── Ekle Modal ────────────────────────────────────────────────
function _periyotModalIsimler(aktifler, ekliIsimler) {
  return aktifler.map(r=>{
    const ekli = ekliIsimler.has(r.ISIM_SOYISIM);
    return `<option value="${r.ISIM_SOYISIM}" data-mah="${r.MAHALLE||''}"
      ${ekli?'style="color:#94a3b8"':''}>${r.ISIM_SOYISIM} — ${r.MAHALLE||''}${ekli?' ✓':''}</option>`;
  }).join('');
}

function periyotEkleModal(mahalle, hizmet) {
  const hizmetDefault = hizmet||_periyotHizmet;
  const mahDefault    = mahalle||'';
  const aktifler = [...new Map(
    (allData||[]).filter(r=>r['HİZMET']===hizmetDefault&&r.DURUM==='AKTİF').map(r=>[r.ISIM_SOYISIM,r])
  ).values()].sort((a,b)=>a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));
  const ekliIsimler = new Set(window._periyotData.filter(p=>p.hizmet===hizmetDefault).map(p=>p.isim));
  const mahalleler = [...new Set((allData||[]).map(r=>r.MAHALLE).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));

  document.getElementById('periyot-modal-body').innerHTML = `
    <h3 style="margin:0 0 16px;font-size:16px;color:#1A237E">➕ Periyot Kaydı Ekle</h3>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:4px">HİZMET</label>
        <select id="pm-hizmet" class="form-select" onchange="periyotModalHizmetDegisti()" style="width:100%">
          ${Object.keys(HIZMET_RENK).map(h=>`<option value="${h}"${h===hizmetDefault?' selected':''}>${HIZMET_LABEL[h]}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:4px">VATANDAŞ *</label>
        <input id="pm-ara" class="form-input" placeholder="🔍 İsim ara..." oninput="periyotModalFiltrele()" style="width:100%;margin-bottom:6px">
        <select id="pm-isim" class="form-select" size="5" style="width:100%;height:auto;min-height:110px">
          ${_periyotModalIsimler(aktifler, ekliIsimler)}
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
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:6px">GÜN *</label>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px">
          ${GUNLER.map(g=>`
            <label style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;
              background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 4px;
              font-size:11px;font-weight:700;text-align:center" id="pm-gun-lbl-${g.replace('ş','s').replace('ö','o').replace('ı','i')}">
              <input type="radio" name="pm-gun" value="${g}" style="accent-color:${GUN_RENK[g]}"
                onchange="periyotGunLblGuncelle()">
              ${g.slice(0,3)}
            </label>`).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:6px">DİLİM *</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${DILIMLER.map(d=>`
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
              background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;
              font-size:13px;font-weight:700" id="pm-dilim-lbl-${d.replace(' ','_').replace('ğ','g').replace('ö','o')}">
              <input type="radio" name="pm-dilim" value="${d}" style="accent-color:${DILIM_RENK[d]}"
                onchange="periyotDilimLblGuncelle()">
              ${DILIM_EMOJI[d]} ${d}
            </label>`).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#64748b;display:block;margin-bottom:6px">KAPASİTE</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
            background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:10px 14px;
            font-size:13px;font-weight:700">
            <input type="radio" name="pm-kapasite" value="tek" checked style="accent-color:#15803d">
            👤 Tek Kişilik
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
            background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:10px 14px;
            font-size:13px;font-weight:700">
            <input type="radio" name="pm-kapasite" value="cift" style="accent-color:#1d4ed8">
            👥 Çift Kişilik
          </label>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="periyotEkleKaydet()" style="flex:1;background:#1A237E;color:#fff;border:none;
        border-radius:10px;padding:12px;font-size:14px;font-weight:800;cursor:pointer">💾 Kaydet</button>
      <button onclick="periyotModalKapat()" style="background:#f1f5f9;color:#64748b;
        border:1px solid #e2e8f0;border-radius:10px;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer">İptal</button>
    </div>`;

  document.getElementById('pm-isim').addEventListener('change', function() {
    const mah = this.options[this.selectedIndex]?.dataset?.mah||'';
    const s = document.getElementById('pm-mahalle');
    if (s&&mah) s.value = mah;
  });

  document.getElementById('periyot-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
window.periyotEkleModal = periyotEkleModal;

function periyotGunLblGuncelle() {
  GUNLER.forEach(g=>{
    const id  = 'pm-gun-lbl-'+g.replace('ş','s').replace('ö','o').replace('ı','i');
    const lbl = document.getElementById(id);
    const inp = lbl?.querySelector('input');
    if (!lbl||!inp) return;
    lbl.style.borderColor = inp.checked?GUN_RENK[g]:'#e2e8f0';
    lbl.style.background  = inp.checked?GUN_RENK[g]+'18':'#f8fafc';
    lbl.style.color       = inp.checked?GUN_RENK[g]:'';
  });
}
window.periyotGunLblGuncelle = periyotGunLblGuncelle;

function periyotDilimLblGuncelle() {
  DILIMLER.forEach(d=>{
    const id  = 'pm-dilim-lbl-'+d.replace(' ','_').replace('ğ','g').replace('ö','o');
    const lbl = document.getElementById(id);
    const inp = lbl?.querySelector('input');
    if (!lbl||!inp) return;
    lbl.style.borderColor = inp.checked?DILIM_RENK[d]:'#e2e8f0';
    lbl.style.background  = inp.checked?DILIM_RENK[d]+'18':'#f8fafc';
  });
}
window.periyotDilimLblGuncelle = periyotDilimLblGuncelle;

function periyotModalHizmetDegisti() {
  const h = document.getElementById('pm-hizmet')?.value;
  if (!h) return;
  const aktifler = [...new Map(
    (allData||[]).filter(r=>r['HİZMET']===h&&r.DURUM==='AKTİF').map(r=>[r.ISIM_SOYISIM,r])
  ).values()].sort((a,b)=>a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));
  const ekliIsimler = new Set(window._periyotData.filter(p=>p.hizmet===h).map(p=>p.isim));
  const sel = document.getElementById('pm-isim');
  if (sel) sel.innerHTML = _periyotModalIsimler(aktifler, ekliIsimler);
  document.getElementById('pm-ara').value='';
}
window.periyotModalHizmetDegisti = periyotModalHizmetDegisti;

function periyotModalFiltrele() {
  const ara = (document.getElementById('pm-ara')?.value||'').toUpperCase();
  const h   = document.getElementById('pm-hizmet')?.value||_periyotHizmet;
  const aktifler = [...new Map(
    (allData||[]).filter(r=>r['HİZMET']===h&&r.DURUM==='AKTİF').map(r=>[r.ISIM_SOYISIM,r])
  ).values()].filter(r=>!ara||r.ISIM_SOYISIM.includes(ara)).sort((a,b)=>a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));
  const ekliIsimler = new Set(window._periyotData.filter(p=>p.hizmet===h).map(p=>p.isim));
  const sel = document.getElementById('pm-isim');
  if (sel) sel.innerHTML = _periyotModalIsimler(aktifler, ekliIsimler);
}
window.periyotModalFiltrele = periyotModalFiltrele;

function periyotModalKapat() {
  document.getElementById('periyot-modal').style.display='none';
  document.body.style.overflow='';
}
window.periyotModalKapat = periyotModalKapat;

async function periyotEkleKaydet() {
  const hizmet   = document.getElementById('pm-hizmet')?.value;
  const isimSel  = document.getElementById('pm-isim');
  const isim     = isimSel?.value;
  const opt      = isimSel?.options[isimSel.selectedIndex];
  const mahSel   = document.getElementById('pm-mahalle')?.value;
  const mahalle  = mahSel||opt?.dataset?.mah||'';
  const gun      = document.querySelector('input[name="pm-gun"]:checked')?.value;
  const dilim    = document.querySelector('input[name="pm-dilim"]:checked')?.value;
  const kapasite = document.querySelector('input[name="pm-kapasite"]:checked')?.value||'tek';

  if (!isim)  { showToast('⚠️ Vatandaş seçin'); return; }
  if (!gun)   { showToast('⚠️ Gün seçin'); return; }
  if (!dilim) { showToast('⚠️ Dilim seçin (Sabah / Öğleden Sonra)'); return; }

  const varMi = window._periyotData.find(p=>p.hizmet===hizmet&&p.isim===isim);
  if (varMi) {
    try {
      await firebase.firestore().collection('periyot').doc(varMi._fbId).update({gun,dilim,mahalle,kapasite});
      Object.assign(varMi,{gun,dilim,mahalle,kapasite});
      showToast(`✅ ${isim} güncellendi → ${gun} ${dilim}`);
    } catch(e) { showToast('❌ '+e.message); return; }
  } else {
    try {
      const ref = await firebase.firestore().collection('periyot').add({isim,hizmet,mahalle,gun,dilim,kapasite});
      window._periyotData.push({_fbId:ref.id,isim,hizmet,mahalle,gun,dilim,kapasite});
      showToast(`✅ ${isim} → ${gun} ${dilim} eklendi`);
    } catch(e) { showToast('❌ '+e.message); return; }
  }
  periyotModalKapat();
  periyotRender();
}
window.periyotEkleKaydet = periyotEkleKaydet;

async function periyotSil(fbId, isim, event) {
  event.stopPropagation();
  if (!confirm(`"${isim}" periyot kaydını silmek istiyor musunuz?`)) return;
  try {
    await firebase.firestore().collection('periyot').doc(fbId).delete();
    window._periyotData = window._periyotData.filter(p=>p._fbId!==fbId);
    showToast(`🗑️ ${isim} silindi`);
    periyotRender();
  } catch(e) { showToast('❌ '+e.message); }
}
window.periyotSil = periyotSil;
