// ══════════════════════════════════════════════════════════════
// PERSONEL ATAMA MODÜLÜ v2
// Firestore: "personel_atama" koleksiyonu
// Her doküman ID: normalize isim (BÜYÜK_HARF_ALT_ÇİZGİ)
// Alanlar:
//   KADIN_BANYO_1/2/3, KADIN_BANYO_GUN
//   ERKEK_BANYO_1/2/3, ERKEK_BANYO_GUN
//   KUAFOR_1/2/3,      KUAFOR_GUN
//   TEMIZLIK_1/2/3
// ══════════════════════════════════════════════════════════════

// ─── Sabit günler ───
const ATAMA_GUNLER = [
  '1) PAZARTESİ SABAH',
  '2) PAZARTESİ ÖĞ.SONRA',
  '3) SALI SABAH',
  '4) SALI ÖĞ.SONRA',
  '5) ÇARŞAMBA SABAH',
  '6) ÇARŞAMBA ÖĞ.SONRA',
  '7) PERŞEMBE SABAH',
  '8) PERŞEMBE ÖĞ.SONRA',
  '9) CUMA SABAH',
  '10) CUMA ÖĞ.SONRA',
];

window.ATAMA_DATA = window.ATAMA_DATA || {};
window._atamaSecili = window._atamaSecili || new Set();
let _atamaHizmet = 'KADIN BANYO';
let _atamaAra = '';
let _atamaGunFiltre = ''; // '' = tümü

// ─── İsim normalize ───
function atamaIsimKey(isim) {
  return (isim || '').trim().toUpperCase().replace(/\s+/g, '_');
}
window.atamaIsimKey = atamaIsimKey;

// ─── Hizmet → alan adı map ───
function atamaHizmetMap(hizmet) {
  const m = {
    'KADIN BANYO': { p1:'KADIN_BANYO_1', p2:'KADIN_BANYO_2', p3:'KADIN_BANYO_3', gun:'KADIN_BANYO_GUN', renk:'#C2185B', bg:'#fdf2f8' },
    'ERKEK BANYO': { p1:'ERKEK_BANYO_1', p2:'ERKEK_BANYO_2', p3:'ERKEK_BANYO_3', gun:'ERKEK_BANYO_GUN', renk:'#1565C0', bg:'#eff6ff' },
    'KUAFÖR':      { p1:'KUAFOR_1',      p2:'KUAFOR_2',      p3:'KUAFOR_3',      gun:'KUAFOR_GUN',     renk:'#2E7D32', bg:'#f0fdf4' },
    'TEMİZLİK':   { p1:'TEMIZLIK_1',    p2:'TEMIZLIK_2',    p3:'TEMIZLIK_3',    gun:null,             renk:'#E65100', bg:'#fff7ed' },
  };
  return m[hizmet] || m['KADIN BANYO'];
}

// ══════════════════════════════════════════════════════════════
// FIRESTORE İŞLEMLERİ
// ══════════════════════════════════════════════════════════════

async function atamaYukle() {
  try {
    const snap = await firebase.firestore().collection('personel_atama').get();
    window.ATAMA_DATA = {};
    snap.forEach(d => { window.ATAMA_DATA[d.id] = { _fbId: d.id, ...d.data() }; });
    atamaAllDataUygula();
  } catch(e) { console.warn('[Atama] Yükleme hatası:', e.message); }
}
window.atamaYukle = atamaYukle;

function atamaAllDataUygula() {
  if (typeof allData === 'undefined') return;
  allData.forEach(r => {
    const key = atamaIsimKey(r.ISIM_SOYISIM);
    const a = window.ATAMA_DATA[key];
    if (!a) return;
    if (r['HİZMET'] === 'KADIN BANYO') {
      r.PERSONEL1 = r.PERSONEL1 || a.KADIN_BANYO_1 || '';
      r.PERSONEL2 = r.PERSONEL2 || a.KADIN_BANYO_2 || '';
      r.PERSONEL3 = r.PERSONEL3 || a.KADIN_BANYO_3 || '';
      r.BANYO_GUN = a.KADIN_BANYO_GUN || '';
    } else if (r['HİZMET'] === 'ERKEK BANYO') {
      r.EB_PERSONEL1 = r.EB_PERSONEL1 || a.ERKEK_BANYO_1 || '';
      r.EB_PERSONEL2 = r.EB_PERSONEL2 || a.ERKEK_BANYO_2 || '';
      r.EB_PERSONEL3 = r.EB_PERSONEL3 || a.ERKEK_BANYO_3 || '';
      r.BANYO_GUN = a.ERKEK_BANYO_GUN || '';
    } else if (r['HİZMET'] === 'KUAFÖR') {
      r.KF_PERSONEL1 = r.KF_PERSONEL1 || a.KUAFOR_1 || '';
      r.KF_PERSONEL2 = r.KF_PERSONEL2 || a.KUAFOR_2 || '';
      r.KF_PERSONEL3 = r.KF_PERSONEL3 || a.KUAFOR_3 || '';
      r.KF_GUN = a.KUAFOR_GUN || '';
    }
  });
  (window.TP_DATA || []).forEach(t => {
    const key = atamaIsimKey(t.isim);
    const a = window.ATAMA_DATA[key];
    if (!a) return;
    t.PERSONEL1 = t.PERSONEL1 || a.TEMIZLIK_1 || '';
    t.PERSONEL2 = t.PERSONEL2 || a.TEMIZLIK_2 || '';
    t.PERSONEL3 = t.PERSONEL3 || a.TEMIZLIK_3 || '';
    t.ekip = t.ekip || t.PERSONEL1 || '';
  });
}
window.atamaAllDataUygula = atamaAllDataUygula;

// ─── Atama kaydet (tek vatandaş) ───
async function atamaKaydet(isimSoyisim, hizmet, personeller, gun) {
  const key = atamaIsimKey(isimSoyisim);
  const hm = atamaHizmetMap(hizmet);
  const p1 = personeller[0] || '', p2 = personeller[1] || '', p3 = personeller[2] || '';

  const obj = { isim: isimSoyisim };
  obj[hm.p1] = p1; obj[hm.p2] = p2; obj[hm.p3] = p3;
  if (hm.gun && gun !== undefined) obj[hm.gun] = gun || '';

  await firebase.firestore().collection('personel_atama').doc(key).set(obj, { merge: true });
  if (!window.ATAMA_DATA[key]) window.ATAMA_DATA[key] = { _fbId: key };
  Object.assign(window.ATAMA_DATA[key], obj);

  // allData batch güncelle
  const eslesler = (typeof allData !== 'undefined' ? allData : [])
    .filter(r => r['HİZMET'] === hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase() === isimSoyisim.toUpperCase());

  if (eslesler.length > 0) {
    const batch = firebase.firestore().batch();
    eslesler.forEach(r => {
      const upd = {};
      if (hizmet === 'KADIN BANYO') {
        r.PERSONEL1=p1; r.PERSONEL2=p2; r.PERSONEL3=p3; if(gun!==undefined) r.BANYO_GUN=gun;
        upd.PERSONEL1=p1; upd.PERSONEL2=p2; upd.PERSONEL3=p3; if(gun!==undefined) upd.BANYO_GUN=gun;
      } else if (hizmet === 'ERKEK BANYO') {
        r.EB_PERSONEL1=p1; r.EB_PERSONEL2=p2; r.EB_PERSONEL3=p3; if(gun!==undefined) r.BANYO_GUN=gun;
        upd.EB_PERSONEL1=p1; upd.EB_PERSONEL2=p2; upd.EB_PERSONEL3=p3; if(gun!==undefined) upd.BANYO_GUN=gun;
      } else if (hizmet === 'KUAFÖR') {
        r.KF_PERSONEL1=p1; r.KF_PERSONEL2=p2; r.KF_PERSONEL3=p3; if(gun!==undefined) r.KF_GUN=gun;
        upd.KF_PERSONEL1=p1; upd.KF_PERSONEL2=p2; upd.KF_PERSONEL3=p3; if(gun!==undefined) upd.KF_GUN=gun;
      }
      if (r._fbId) batch.update(firebase.firestore().collection('vatandaslar').doc(r._fbId), upd);
    });
    await batch.commit();
  }

  // Temizlik
  if (hizmet === 'TEMİZLİK') {
    const tpEslesler = (window.TP_DATA||[]).filter(t => t.isim && t.isim.toUpperCase()===isimSoyisim.toUpperCase());
    for (const t of tpEslesler) {
      t.PERSONEL1=p1; t.PERSONEL2=p2; t.PERSONEL3=p3; t.ekip=p1;
      if (t._fbId) await firebase.firestore().collection('temizlik_plan').doc(t._fbId).update({ PERSONEL1:p1, PERSONEL2:p2, PERSONEL3:p3, ekip:p1 });
    }
  }
}
window.atamaKaydet = atamaKaydet;

// ─── Migrasyon ───
async function atamaMigrasyonYap() {
  const btn = document.getElementById('atama-migrasyon-btn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Taşınıyor...'; }
  try {
    const kayitlar = {};
    (typeof allData !== 'undefined' ? allData : []).forEach(r => {
      const key = atamaIsimKey(r.ISIM_SOYISIM);
      if (!kayitlar[key]) kayitlar[key] = { isim: r.ISIM_SOYISIM };
      if (r['HİZMET']==='KADIN BANYO' && (r.PERSONEL1||r.PERSONEL2||r.PERSONEL3)) {
        kayitlar[key].KADIN_BANYO_1=r.PERSONEL1||''; kayitlar[key].KADIN_BANYO_2=r.PERSONEL2||''; kayitlar[key].KADIN_BANYO_3=r.PERSONEL3||'';
      }
      if (r['HİZMET']==='ERKEK BANYO' && (r.EB_PERSONEL1||r.EB_PERSONEL2||r.EB_PERSONEL3)) {
        kayitlar[key].ERKEK_BANYO_1=r.EB_PERSONEL1||''; kayitlar[key].ERKEK_BANYO_2=r.EB_PERSONEL2||''; kayitlar[key].ERKEK_BANYO_3=r.EB_PERSONEL3||'';
      }
      if (r['HİZMET']==='KUAFÖR' && (r.KF_PERSONEL1||r.KF_PERSONEL2||r.KF_PERSONEL3)) {
        kayitlar[key].KUAFOR_1=r.KF_PERSONEL1||''; kayitlar[key].KUAFOR_2=r.KF_PERSONEL2||''; kayitlar[key].KUAFOR_3=r.KF_PERSONEL3||'';
      }
    });
    (window.TP_DATA||[]).forEach(t => {
      const key = atamaIsimKey(t.isim);
      if (!kayitlar[key]) kayitlar[key] = { isim: t.isim };
      const p1=t.PERSONEL1||t.ekip||'', p2=t.PERSONEL2||'', p3=t.PERSONEL3||'';
      if (p1||p2||p3) { kayitlar[key].TEMIZLIK_1=p1; kayitlar[key].TEMIZLIK_2=p2; kayitlar[key].TEMIZLIK_3=p3; }
    });
    const entries = Object.entries(kayitlar).filter(([,v]) => v.KADIN_BANYO_1||v.ERKEK_BANYO_1||v.KUAFOR_1||v.TEMIZLIK_1);
    let sayi = 0;
    for (let i=0; i<entries.length; i+=400) {
      const batch = firebase.firestore().batch();
      entries.slice(i, i+400).forEach(([key,val]) => {
        batch.set(firebase.firestore().collection('personel_atama').doc(key), val, { merge:true });
        sayi++;
      });
      await batch.commit();
    }
    await atamaYukle();
    showToast(`✅ ${sayi} vatandaş ataması taşındı`);
    if (btn) btn.textContent=`✅ ${sayi} kayıt taşındı`;
    atamaRenderSayfa();
  } catch(e) {
    showToast('⚠️ Hata: '+e.message);
    if (btn) { btn.disabled=false; btn.textContent='🚀 Mevcut Atamaları Taşı'; }
  }
}
window.atamaMigrasyonYap = atamaMigrasyonYap;

// ══════════════════════════════════════════════════════════════
// SAYFA RENDER
// ══════════════════════════════════════════════════════════════

async function atamaRenderSayfa() {
  const container = document.getElementById('atama-liste');
  if (!container) return;

  if (!window.PERSONEL_DATA || window.PERSONEL_DATA.length===0) {
    container.innerHTML='<div style="text-align:center;padding:20px;color:#94a3b8">⏳ Yükleniyor...</div>';
    if (typeof personelYukle==='function') await personelYukle();
  }
  if (!window.ATAMA_DATA || Object.keys(window.ATAMA_DATA).length===0) {
    if (typeof atamaYukle==='function') await atamaYukle();
  }

  const hm = atamaHizmetMap(_atamaHizmet);
  const personeller = personelListesi(_atamaHizmet);

  // ── Vatandaş listesini oluştur ──
  let vatList = [];
  if (_atamaHizmet==='TEMİZLİK') {
    const g=new Set();
    (window.TP_DATA||[]).filter(t=>t.durum==='AKTİF').forEach(t=>{
      if(g.has(t.isim))return; g.add(t.isim);
      const key=atamaIsimKey(t.isim);
      const a=window.ATAMA_DATA[key]||{};
      vatList.push({ isim:t.isim, mahalle:t.mahalle||'', gun:'', p1:a.TEMIZLIK_1||'', p2:a.TEMIZLIK_2||'', p3:a.TEMIZLIK_3||'' });
    });
  } else {
    const g=new Set();
    (typeof allData!=='undefined'?allData:[]).filter(r=>r['HİZMET']===_atamaHizmet&&r.DURUM==='AKTİF').forEach(r=>{
      if(g.has(r.ISIM_SOYISIM))return; g.add(r.ISIM_SOYISIM);
      const key=atamaIsimKey(r.ISIM_SOYISIM);
      const a=window.ATAMA_DATA[key]||{};
      vatList.push({
        isim: r.ISIM_SOYISIM,
        mahalle: r.MAHALLE||'',
        gun:  a[hm.gun]||'',
        p1:   a[hm.p1]||'',
        p2:   a[hm.p2]||'',
        p3:   a[hm.p3]||'',
      });
    });
  }

  if (vatList.length===0 && (typeof allData==='undefined'||allData.length===0)) {
    container.innerHTML=`<div style="text-align:center;padding:30px">
      <div style="color:#94a3b8;margin-bottom:12px">Veriler yükleniyor...</div>
      <button onclick="atamaRenderSayfa()" style="background:#1A237E;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer">🔄 Yenile</button>
    </div>`;
    return;
  }

  // ── Filtrele ──
  if (_atamaAra) vatList=vatList.filter(v=>v.isim.toUpperCase().includes(_atamaAra.toUpperCase()));
  if (_atamaGunFiltre) vatList=vatList.filter(v=>v.gun===_atamaGunFiltre);

  vatList.sort((a,b)=>a.isim.localeCompare(b.isim,'tr'));

  // ── Stats: personel × gün ──
  atamaRenderStats(vatList, hm, personeller);

  document.getElementById('atama-count').textContent = vatList.length+' kişi';

  // ── Gün bazlı özet kartları ──
  const gunOzet = {};
  ATAMA_GUNLER.forEach(g=>{ gunOzet[g]={ sayi:0, personeller:new Set() }; });
  vatList.forEach(v=>{
    if(v.gun&&gunOzet[v.gun]) {
      gunOzet[v.gun].sayi++;
      [v.p1,v.p2,v.p3].filter(Boolean).forEach(p=>gunOzet[v.gun].personeller.add(p.split(' ')[0]));
    }
  });

  const gunKartlariHtml = `
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 0 12px">
      <button onclick="_atamaGunFiltre='';atamaRenderSayfa()"
        style="background:${!_atamaGunFiltre?'#1A237E':'#f1f5f9'};color:${!_atamaGunFiltre?'#fff':'#475569'};
               border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer">
        Tümü
      </button>
      ${ATAMA_GUNLER.map(g=>{
        const oz=gunOzet[g];
        const aktif=_atamaGunFiltre===g;
        return `<button onclick="_atamaGunFiltre='${g.replace(/'/g,"\\'")}';atamaRenderSayfa()"
          style="background:${aktif?hm.renk:'#f1f5f9'};color:${aktif?'#fff':'#475569'};
                 border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;
                 position:relative">
          ${g.replace(/^\d+\) /,'')}
          ${oz.sayi?`<span style="background:${aktif?'rgba(255,255,255,0.3)':hm.renk};color:${aktif?'#fff':'#fff'};
            border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">${oz.sayi}</span>`:''}
        </button>`;
      }).join('')}
    </div>`;

  // ── Vatandaş listesi ──
  const listeHtml = vatList.map(v=>{
    const secili=window._atamaSecili.has(v.isim);
    const atananlar=[v.p1,v.p2,v.p3].filter(Boolean);
    const isimEsc=v.isim.replace(/'/g,"\\'");

    const personelBadge = atananlar.length
      ? atananlar.map(p=>`<span style="background:${hm.bg};color:${hm.renk};border:1px solid ${hm.renk}44;
          border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">${p.split(' ')[0]}</span>`).join(' ')
      : `<span style="color:#94a3b8;font-size:11px">Personel yok</span>`;

    const gunBadge = v.gun
      ? `<span style="background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;
          padding:1px 7px;font-size:10px;font-weight:700">${v.gun.replace(/^\d+\) /,'')}</span>`
      : `<span style="color:#f59e0b;font-size:10px;font-weight:700">📅 Gün atanmamış</span>`;

    return `<div onclick="atamaVatandasSec('${isimEsc}')"
      style="display:flex;align-items:center;gap:10px;padding:11px 14px;
             border-bottom:1px solid #f1f5f9;cursor:pointer;
             background:${secili?hm.renk+'11':'#fff'};
             border-left:4px solid ${secili?hm.renk:'transparent'}">
      <div style="width:24px;height:24px;border-radius:6px;border:2px solid ${secili?hm.renk:'#cbd5e1'};
                  background:${secili?hm.renk:'#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${secili?'<svg width="13" height="13" viewBox="0 0 13 13"><polyline points="2,7 5,10 11,3" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>':''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px;color:#1e293b">${v.isim}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:3px">${v.mahalle}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
          ${gunBadge}
          ${personelBadge}
        </div>
      </div>
      <button onclick="event.stopPropagation();atamaModalAc('${isimEsc}','${_atamaHizmet}')"
        style="background:${hm.renk};color:#fff;border:none;border-radius:8px;
               padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0">
        ✏️
      </button>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:40px;color:#94a3b8">Kayıt bulunamadı</div>`;

  container.innerHTML = gunKartlariHtml + listeHtml;
  _atamaSeciliGuncelle();
}
window.atamaRenderSayfa = atamaRenderSayfa;

// ── Personel stats ──
function atamaRenderStats(vatList, hm, personeller) {
  const statsEl = document.getElementById('atama-stats');
  if (!statsEl) return;
  const sayar = {};
  personeller.forEach(p=>{ sayar[p.ad]=0; });
  sayar['Atanmamış']=0;
  const g=new Set();
  vatList.forEach(v=>{
    if(g.has(v.isim))return; g.add(v.isim);
    const ps=[v.p1,v.p2,v.p3].filter(Boolean);
    if(!ps.length) sayar['Atanmamış']=(sayar['Atanmamış']||0)+1;
    else ps.forEach(p=>{ if(p in sayar) sayar[p]=(sayar[p]||0)+1; });
  });
  const renkler=['#C2185B','#1565C0','#2E7D32','#E65100','#7c3aed','#0891b2','#64748b'];
  statsEl.innerHTML=Object.entries(sayar).map(([ad,sayi],i)=>{
    const renk=ad==='Atanmamış'?'#94a3b8':renkler[i%renkler.length];
    return `<div style="display:flex;align-items:center;gap:8px;background:#fff;border:2px solid ${renk}44;
                        border-radius:12px;padding:8px 12px;min-width:90px">
      <div style="width:28px;height:28px;border-radius:50%;background:${renk};display:flex;align-items:center;
                  justify-content:center;color:#fff;font-weight:900;font-size:11px;flex-shrink:0">
        ${ad==='Atanmamış'?'?':ad.charAt(0)}
      </div>
      <div>
        <div style="font-weight:800;font-size:11px;color:#1e293b">${ad.split(' ')[0]}</div>
        <div style="font-size:16px;font-weight:900;color:${renk}">${sayi}<span style="font-size:10px;color:#64748b"> ev</span></div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// SEÇİM
// ══════════════════════════════════════════════════════════════

function atamaVatandasSec(isim) {
  if(window._atamaSecili.has(isim)) window._atamaSecili.delete(isim);
  else window._atamaSecili.add(isim);
  _atamaSeciliGuncelle();
  atamaRenderSayfa();
}
window.atamaVatandasSec = atamaVatandasSec;

function _atamaSeciliGuncelle() {
  const sayi = window._atamaSecili ? window._atamaSecili.size : 0;
  const bar = document.getElementById('atama-secili-bar');
  const saziEl = document.getElementById('atama-secili-sayi');
  if (!bar) return;
  bar.style.display = sayi>0 ? 'flex' : 'none';
  if (saziEl) saziEl.textContent = sayi+' vatandaş seçildi';
}

function atamaTumunuSec() {
  if (_atamaHizmet==='TEMİZLİK') {
    (window.TP_DATA||[]).filter(t=>t.durum==='AKTİF').forEach(t=>window._atamaSecili.add(t.isim));
  } else {
    (typeof allData!=='undefined'?allData:[])
      .filter(r=>r['HİZMET']===_atamaHizmet&&r.DURUM==='AKTİF')
      .forEach(r=>window._atamaSecili.add(r.ISIM_SOYISIM));
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
  _atamaGunFiltre = '';
  window._atamaSecili.clear();
  document.querySelectorAll('.atama-hizmet-btn').forEach(b=>{ b.style.background='#f1f5f9'; b.style.color='#475569'; });
  if(el){ el.style.background='#1A237E'; el.style.color='#fff'; }
  atamaRenderSayfa();
}
window.atamaHizmetSec = atamaHizmetSec;

// ══════════════════════════════════════════════════════════════
// MODAL — GÜN + PERSONEL
// ══════════════════════════════════════════════════════════════

function atamaModalAc(isim, hizmet) {
  const modal = document.getElementById('atama-modal');
  if (!modal) return;
  const hm = atamaHizmetMap(hizmet);
  const personeller = personelListesi(hizmet);

  const coklu = isim==='__COKLU__' || (window._atamaSecili&&window._atamaSecili.size>1);
  const gosterIsim = coklu ? `${window._atamaSecili.size} vatandaş seçildi` : isim;

  const key = atamaIsimKey(isim);
  const a = (!coklu && window.ATAMA_DATA[key]) ? window.ATAMA_DATA[key] : {};
  const mevcutP = [a[hm.p1]||'', a[hm.p2]||'', a[hm.p3]||''].filter(Boolean);
  const mevcutGun = a[hm.gun] || '';

  document.getElementById('atama-modal-isim').textContent = gosterIsim;
  document.getElementById('atama-modal-hizmet').textContent = hizmet;
  document.getElementById('atama-modal-baslik').style.background = `linear-gradient(135deg,${hm.renk},${hm.renk}cc)`;

  // Gün seçimi (Temizlik hariç)
  const gunSection = document.getElementById('atama-modal-gun-section');
  if (gunSection) {
    if (hm.gun) {
      gunSection.style.display = '';
      gunSection.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px">📅 GÜN / SEANS</div>
        <select id="atama-gun-select"
          style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;
                 background:#f8fafc;color:#1e293b;margin-bottom:14px">
          <option value="">— Gün seçin —</option>
          ${ATAMA_GUNLER.map(g=>`<option value="${g}" ${mevcutGun===g?'selected':''}>${g}</option>`).join('')}
        </select>`;
    } else {
      gunSection.style.display = 'none';
    }
  }

  // Personel checkboxları
  const body = document.getElementById('atama-modal-body');
  body.innerHTML = personeller.map(p=>{
    const secili = mevcutP.includes(p.ad);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
                          border:1.5px solid ${secili?hm.renk:'#e2e8f0'};
                          background:${secili?hm.renk+'11':'#fff'};cursor:pointer;margin-bottom:8px">
      <input type="checkbox" value="${p.ad}" ${secili?'checked':''}
             style="width:16px;height:16px;accent-color:${hm.renk}"
             onchange="atamaModalChipGuncelle()">
      <span style="font-weight:700;font-size:13px">${p.ad}</span>
    </label>`;
  }).join('');

  modal.dataset.isim = isim==='__COKLU__' ? '' : isim;
  modal.dataset.hizmet = hizmet;
  modal.dataset.renk = hm.renk;
  modal.style.display = 'flex';
  atamaModalChipGuncelle();
}
window.atamaModalAc = atamaModalAc;

function atamaModalChipGuncelle() {
  const secili = [...document.querySelectorAll('#atama-modal-body input:checked')].map(c=>c.value);
  const uyari = document.getElementById('atama-modal-uyari');
  const chips = document.getElementById('atama-modal-chips');
  const renk = document.getElementById('atama-modal')?.dataset.renk || '#1A237E';
  if (uyari) uyari.textContent = secili.length>3?'⚠️ Maksimum 3 personel':'';
  if (chips) {
    chips.innerHTML = secili.length
      ? secili.map(s=>`<span style="background:${renk}11;border:1px solid ${renk};color:${renk};
          border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700">${s.split(' ')[0]}</span>`).join(' ')
      : '<span style="color:#94a3b8;font-size:12px">Henüz seçilmedi</span>';
  }
}
window.atamaModalChipGuncelle = atamaModalChipGuncelle;

async function atamaModalKaydet() {
  const modal = document.getElementById('atama-modal');
  const hizmet = modal.dataset.hizmet;
  const hm = atamaHizmetMap(hizmet);
  const secili = [...document.querySelectorAll('#atama-modal-body input:checked')].map(c=>c.value);
  if (secili.length>3) { showToast('⚠️ Maksimum 3 personel'); return; }

  const gunEl = document.getElementById('atama-gun-select');
  const gun = gunEl ? gunEl.value : undefined;

  const btn = document.getElementById('atama-modal-kaydet-btn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Kaydediliyor...'; }

  try {
    const hedefler = window._atamaSecili&&window._atamaSecili.size>0
      ? [...window._atamaSecili]
      : [modal.dataset.isim];

    for (const isim of hedefler) {
      await atamaKaydet(isim, hizmet, secili, gun);
    }

    modal.style.display = 'none';
    window._atamaSecili.clear();
    atamaRenderSayfa();
    if (typeof filterVat==='function') filterVat();
    if (typeof tpRender==='function') tpRender();
    if (typeof kbRenderPersonelStats==='function') kbRenderPersonelStats(window._kbPersonelFiltre||'');
    showToast(`✅ ${hedefler.length} vatandaş güncellendi`);
  } catch(e) {
    showToast('⚠️ Hata: '+e.message);
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='💾 Kaydet'; }
  }
}
window.atamaModalKaydet = atamaModalKaydet;

function atamaModalKapat() {
  const m = document.getElementById('atama-modal');
  if (m) m.style.display='none';
}
window.atamaModalKapat = atamaModalKapat;

// ── Vatandaşlar sayfasından temizlik atama ──
function vatTpPersonelAta(isimSoyisim) {
  const tp = (window.TP_DATA||[]).find(t=>t.isim&&t.isim.toUpperCase()===isimSoyisim.toUpperCase());
  if (!tp) { if(typeof showToast==='function') showToast('⚠️ Temizlik planında kayıt yok'); return; }
  atamaModalAc(isimSoyisim, 'TEMİZLİK');
}
window.vatTpPersonelAta = vatTpPersonelAta;
