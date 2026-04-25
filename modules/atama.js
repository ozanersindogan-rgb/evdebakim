// ══════════════════════════════════════════════════════════════
// BANYO TABLOSU — Mahalleye Göre + Haftalık Atama
// ══════════════════════════════════════════════════════════════

// ─── Sabitler ────────────────────────────────────────────────
const PERIYOD_SIRASI = [
  '1)PAZARTESİ SABAH','2)PAZARTESİ ÖĞLEDEN SONRA',
  '3)SALI SABAH','4)SALI ÖĞLEDEN SONRA',
  '5)ÇARŞAMBA SABAH','6)ÇARŞAMBA ÖĞLEDEN SONRA',
  '7)PERŞEMBE SABAH','8)PERŞEMBE ÖĞLEDEN SONRA',
  '9)CUMA SABAH','91)CUMA ÖĞLEDEN SONRA',
];
const BT_GUNLER   = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const BT_DILIMLER = ['Sabah','Öğleden Sonra'];
const BT_GUN_RENK = {
  Pazartesi:'#4f46e5', Salı:'#0369a1', Çarşamba:'#0891b2',
  Perşembe:'#7c3aed', Cuma:'#b45309'
};

// ─── State ───────────────────────────────────────────────────
let _banyoTur      = 'KADIN BANYO';
let _banyoAra      = '';
let _btAktifSekme  = 'haftalik';
let _btHucre       = null;

// ─── Yardımcılar ─────────────────────────────────────────────
function _periyodTip(val) {
  if (!val) return 'diger';
  const v = val.toUpperCase();
  if (v.includes('SABAH')) return 'sabah';
  if (v.includes('ÖĞLEDEN') || v.includes('OGLEDEN')) return 'ogleden';
  return 'diger';
}
function _periyodLabel(val) {
  if (!val) return '—';
  return (val+'').replace(/^\d+\)/,'').trim();
}
function _gunDilimdenPeriyod(gun, dilim) {
  if (!gun || !dilim) return '';
  const g = gun.toUpperCase();
  const d = dilim.toUpperCase();
  return PERIYOD_SIRASI.find(s => {
    const t = s.replace(/^\d+\)/,'');
    return t === g + ' ' + d;
  }) || gun + ' ' + dilim;
}

// ─── Veri toplama (allData + _periyotData birleştir) ──────────
function _banyoVeriTopla(hizmet) {
  const aktifler = new Map();
  (typeof allData !== 'undefined' ? allData : [])
    .filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF')
    .forEach(r => {
      if (!aktifler.has(r.ISIM_SOYISIM))
        aktifler.set(r.ISIM_SOYISIM, { isim: r.ISIM_SOYISIM||'', mahalle: r.MAHALLE||'', periyod:'' });
    });
  (window._periyotData||[]).filter(p => p.hizmet === hizmet).forEach(p => {
    if (aktifler.has(p.isim))
      aktifler.get(p.isim).periyod = _gunDilimdenPeriyod(p.gun, p.dilim);
  });
  return [...aktifler.values()];
}

// ══════════════════════════════════════════════════════════════
// 1. MAHALLEye GÖRE TABLO
// ══════════════════════════════════════════════════════════════
async function banyoTabloRender() {
  const container = document.getElementById('banyo-tablo-container');
  if (!container) return;

  if (!allData || allData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Veriler yükleniyor...</div>';
    return;
  }
  if ((!window._periyotData || window._periyotData.length === 0) && typeof periyotYukle === 'function') {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Periyot verileri yükleniyor...</div>';
    try { await periyotYukle(); } catch(e) {}
  }

  const hizmet   = _banyoTur;
  const renk     = hizmet === 'KADIN BANYO' ? '#C2185B' : '#1565C0';
  const bgRenk   = hizmet === 'KADIN BANYO' ? '#fdf2f8' : '#eff6ff';
  const araFiltre = _banyoAra.trim().toUpperCase();

  let veri = _banyoVeriTopla(hizmet);
  if (araFiltre) veri = veri.filter(v =>
    v.isim.toUpperCase().includes(araFiltre) || v.mahalle.toUpperCase().includes(araFiltre)
  );

  const mahalleMap = {};
  veri.forEach(v => {
    const m = v.mahalle || 'Mahalle Bilinmiyor';
    if (!mahalleMap[m]) mahalleMap[m] = [];
    mahalleMap[m].push(v);
  });
  const mahalleler = Object.entries(mahalleMap).sort((a,b)=>a[0].localeCompare(b[0],'tr'));

  const countEl = document.getElementById('banyo-tablo-count');
  if (countEl) countEl.textContent = veri.length + ' kişi';

  if (!mahalleler.length) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8"><div style="font-size:40px">🛁</div><div style="font-weight:700;margin-top:8px">Kayıt bulunamadı</div></div>';
    return;
  }

  function sirala(liste) {
    return [...liste].sort((a,b) => {
      const ia = PERIYOD_SIRASI.indexOf(a.periyod), ib = PERIYOD_SIRASI.indexOf(b.periyod);
      if (ia<0&&ib<0) return a.isim.localeCompare(b.isim,'tr');
      if (ia<0) return 1; if (ib<0) return -1; return ia-ib;
    });
  }
  function td(v) {
    if (!v) return `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;border-left:1px solid #f1f5f9"></td>`;
    const label = _periyodLabel(v.periyod);
    return `<td style="padding:7px 10px;vertical-align:top;border-bottom:1px solid #f1f5f9;border-left:1px solid #f1f5f9">
      <div style="font-weight:700;font-size:12px;color:#1e293b">${v.isim}</div>
      ${v.periyod ? `<div style="font-size:10px;color:#94a3b8;margin-top:1px">${label}</div>` : ''}
    </td>`;
  }

  container.innerHTML = mahalleler.map(([mah, kisiler]) => {
    const sab = sirala(kisiler.filter(v=>_periyodTip(v.periyod)==='sabah'));
    const ogl = sirala(kisiler.filter(v=>_periyodTip(v.periyod)==='ogleden'));
    const per = kisiler.filter(v=>_periyodTip(v.periyod)==='diger');
    const rows = Math.max(sab.length, ogl.length);
    let satirlar = '';
    for(let i=0;i<rows;i++) satirlar += `<tr>${td(sab[i])}${td(ogl[i])}</tr>`;
    const chips = per.sort((a,b)=>a.isim.localeCompare(b.isim,'tr'))
      .map(v=>`<span style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#64748b">${v.isim}</span>`).join('');
    return `<div style="margin-bottom:16px;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid ${renk}28">
      <div style="background:linear-gradient(135deg,${renk},${renk}cc);padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
        <div style="color:#fff;font-weight:900;font-size:14px">📍 ${mah}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:800">${kisiler.length} kişi</span>
          ${sab.length?`<span style="background:#fff3;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">🌅 ${sab.length}</span>`:''}
          ${ogl.length?`<span style="background:#fff3;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">🌇 ${ogl.length}</span>`:''}
          ${per.length?`<span style="background:rgba(255,255,255,.15);color:#fffb;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">⬜ ${per.length}</span>`:''}
        </div>
      </div>
      ${rows>0?`<div style="overflow-x:auto;background:#fff"><table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:${bgRenk}">
          <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:900;color:${renk};border-bottom:2px solid ${renk}33;width:50%">🌅 SABAH <span style="font-weight:600;color:#94a3b8;font-size:10px">(${sab.length})</span></th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:900;color:${renk};border-bottom:2px solid ${renk}33;width:50%;border-left:1px solid ${renk}22">🌇 ÖĞLEDEN SONRA <span style="font-weight:600;color:#94a3b8;font-size:10px">(${ogl.length})</span></th>
        </tr></thead>
        <tbody>${satirlar}</tbody>
      </table></div>`:''}
      ${per.length?`<div style="padding:8px 12px 10px;background:#fafafa;border-top:1px dashed #e2e8f0"><span style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase">⬜ Periyod Atanmamış (${per.length})</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${chips}</div></div>`:''}
    </div>`;
  }).join('');
}
window.banyoTabloRender = banyoTabloRender;

// ══════════════════════════════════════════════════════════════
// 2. HAFTALIK ATAMA GRID
// ══════════════════════════════════════════════════════════════
function haftalikTabloRender() {
  const wrap = document.getElementById('haftalik-tablo-wrap');
  if (!wrap) return;

  const pd_all = window._periyotData || [];
  if (pd_all.length === 0 && typeof periyotYukle === 'function') {
    wrap.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Yükleniyor...</div>';
    periyotYukle()
      .then(() => haftalikTabloRender())
      .catch(e => { wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">❌ ${e.message}</div>`; });
    return;
  }

  const hizmet = _banyoTur;
  const renk   = hizmet === 'KADIN BANYO' ? '#C2185B' : '#1565C0';
  const pd     = pd_all.filter(p => p.hizmet === hizmet);

  const basliklar = BT_GUNLER.map(g => {
    const r = BT_GUN_RENK[g];
    const n = pd.filter(p=>p.gun===g).length;
    return `<th style="padding:8px 4px;text-align:center;font-size:11px;font-weight:900;color:${r};border-bottom:2px solid ${r}33;min-width:100px">
      <div>${g}</div>${n?`<span style="font-size:10px;color:${r}88;font-weight:700">${n} kişi</span>`:''}
    </th>`;
  }).join('');

  const satirlar = BT_DILIMLER.map(dilim => {
    const hucreler = BT_GUNLER.map(gun => {
      const kisiler = pd.filter(p=>p.gun===gun&&p.dilim===dilim)
        .sort((a,b)=>(a.mahalle||'').localeCompare(b.mahalle||'','tr')||(a.isim||'').localeCompare(b.isim||'','tr'));
      const aktif = _btHucre && _btHucre.gun===gun && _btHucre.dilim===dilim;
      const gr = BT_GUN_RENK[gun];
      const badgeler = kisiler.map(k=>`
        <div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid ${gr}33;border-radius:8px;padding:4px 6px;margin-bottom:3px">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:800;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.isim}</div>
            ${k.mahalle?`<div style="font-size:9px;color:#94a3b8">📍 ${k.mahalle}</div>`:''}
          </div>
          <button data-fbid="${k._fbId}" data-isim="${encodeURIComponent(k.isim||'')}"
            class="bt-sil-btn"
            style="background:none;border:none;color:#f87171;cursor:pointer;font-size:12px;padding:0;flex-shrink:0">✕</button>
        </div>`).join('');
      return `<td style="padding:5px;vertical-align:top;border:1px solid #f1f5f9;background:${aktif?gr+'12':'#fff'};cursor:pointer"
               onclick="btHucreAc('${gun}','${dilim}')">
        ${badgeler}
        <div style="text-align:center;padding:${kisiler.length?'2':'8'}px 0">
          <span style="font-size:11px;color:${gr};font-weight:700;opacity:.5">+ Ekle</span>
        </div>
      </td>`;
    }).join('');
    return `<tr>
      <td style="padding:8px;font-weight:900;font-size:11px;color:#475569;background:#f8fafc;border:1px solid #f1f5f9;white-space:nowrap">
        ${dilim==='Sabah'?'🌅':'🌇'} ${dilim}
      </td>${hucreler}
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <table style="width:100%;border-collapse:collapse;min-width:560px">
        <thead><tr>
          <th style="padding:8px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-size:11px;color:#94a3b8;min-width:80px"></th>
          ${basliklar}
        </tr></thead>
        <tbody>${satirlar}</tbody>
      </table>
    </div>
    <div id="bt-atama-panel" style="display:none;margin-top:10px;border-radius:12px;border:1.5px solid ${renk}44;background:#fff;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)"></div>
  `;

  // ✕ sil butonları için event delegation
  wrap.addEventListener('click', function(e) {
    const silBtn = e.target.closest('.bt-sil-btn');
    if (silBtn) {
      e.stopPropagation();
      const fbId = silBtn.dataset.fbid;
      const isim = decodeURIComponent(silBtn.dataset.isim || '');
      if (!confirm(`"${isim}" bu slottan çıkarılsın mı?`)) return;
      firebase.firestore().collection('periyot').doc(fbId).delete().then(() => {
        window._periyotData = (window._periyotData||[]).filter(p=>p._fbId!==fbId);
        showToast(`🗑️ ${isim} çıkarıldı`);
        haftalikTabloRender();
      }).catch(e2 => showToast('❌ '+e2.message));
    }
  }, {once: true});
  if (_btHucre) _btPaneliRender();
}
window.haftalikTabloRender = haftalikTabloRender;

function btHucreAc(gun, dilim) {
  _btHucre = (_btHucre && _btHucre.gun===gun && _btHucre.dilim===dilim) ? null : {gun, dilim};
  haftalikTabloRender();
}
window.btHucreAc = btHucreAc;

function _btPaneliRender() {
  const panel = document.getElementById('bt-atama-panel');
  if (!panel || !_btHucre) return;
  const {gun, dilim} = _btHucre;
  const hizmet = _banyoTur;
  const gr = BT_GUN_RENK[gun] || '#1e293b';
  const pd = (window._periyotData||[]).filter(p=>p.hizmet===hizmet);
  const ekliIsimler = new Set(pd.filter(p=>p.gun===gun&&p.dilim===dilim).map(p=>p.isim));
  const ara = (document.getElementById('bt-ara')?.value||'').toUpperCase();

  const aktifler = [...new Map(
    (allData||[]).filter(r=>r['HİZMET']===hizmet&&r.DURUM==='AKTİF').map(r=>[r.ISIM_SOYISIM,r])
  ).values()].sort((a,b)=>(a.MAHALLE||'').localeCompare(b.MAHALLE||'','tr')||a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));

  const liste = aktifler.filter(r=>!ara||r.ISIM_SOYISIM.toUpperCase().includes(ara)||(r.MAHALLE||'').toUpperCase().includes(ara));
  const digerSlotMap = {};
  pd.filter(p=>!(p.gun===gun&&p.dilim===dilim)).forEach(p=>{digerSlotMap[p.isim]=p;});

  const kisiler = liste.map(r => {
    const ekli = ekliIsimler.has(r.ISIM_SOYISIM);
    const diger = digerSlotMap[r.ISIM_SOYISIM];
    const isimEnc = encodeURIComponent(r.ISIM_SOYISIM);
    const mahEnc  = encodeURIComponent(r.MAHALLE||'');
    return `<div data-isim="${isimEnc}" data-mah="${mahEnc}"
         style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${ekli?gr+'10':'#fff'};border-bottom:1px solid #f1f5f9;cursor:pointer"
         class="bt-kisi-row">
      <div style="width:20px;height:20px;border-radius:6px;border:2px solid ${ekli?gr:'#e2e8f0'};background:${ekli?gr:'#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${ekli?'<span style="color:#fff;font-size:11px">✓</span>':''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:800;color:${ekli?gr:'#1e293b'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.ISIM_SOYISIM}</div>
        ${r.MAHALLE?`<div style="font-size:10px;color:#94a3b8">📍 ${r.MAHALLE}</div>`:''}
      </div>
      ${diger?`<span style="font-size:9px;background:#fef3c7;color:#92400e;border-radius:6px;padding:2px 5px;font-weight:700;flex-shrink:0">${diger.gun.slice(0,3)} ${diger.dilim==='Sabah'?'☀':'🌆'}</span>`:''}
    </div>`;
  }).join('');

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="background:linear-gradient(135deg,${gr},${gr}cc);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:6px">
      <div style="color:#fff;font-weight:900;font-size:13px">${dilim==='Sabah'?'🌅':'🌇'} ${gun} — ${dilim} <span style="opacity:.7;font-size:11px">(${ekliIsimler.size} kişi)</span></div>
      <button onclick="_btHucre=null;haftalikTabloRender()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">✕ Kapat</button>
    </div>
    <div style="padding:8px 12px">
      <input id="bt-ara" type="text" placeholder="İsim veya mahalle ara..." oninput="_btPaneliRender()"
        style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none">
    </div>
    <div style="max-height:300px;overflow-y:auto" id="bt-kisi-liste">
      ${kisiler||'<div style="text-align:center;padding:20px;color:#94a3b8">Vatandaş bulunamadı</div>'}
    </div>`;

  // Event delegation — onclick string yerine güvenli yöntem
  panel.querySelector('#bt-kisi-liste').addEventListener('click', function(e) {
    const row = e.target.closest('.bt-kisi-row');
    if (!row) return;
    const isim = decodeURIComponent(row.dataset.isim || '');
    const mah  = decodeURIComponent(row.dataset.mah  || '');
    if (isim) btKisiToggle(isim, mah);
  });
}
window._btPaneliRender = _btPaneliRender;

async function btKisiToggle(isim, mahalle) {
  if (!_btHucre) return;
  const {gun, dilim} = _btHucre;
  const hizmet = _banyoTur;
  if (!window._periyotData) window._periyotData = [];
  const pd = window._periyotData;
  const varMi = pd.find(p=>p.hizmet===hizmet&&p.isim===isim&&p.gun===gun&&p.dilim===dilim);
  try {
    if (varMi) {
      await firebase.firestore().collection('periyot').doc(varMi._fbId).delete();
      window._periyotData = pd.filter(p=>p._fbId!==varMi._fbId);
      showToast(`🗑️ ${isim} çıkarıldı`);
    } else {
      const eskiSlot = pd.find(p=>p.hizmet===hizmet&&p.isim===isim);
      if (eskiSlot) {
        await firebase.firestore().collection('periyot').doc(eskiSlot._fbId).update({gun,dilim,mahalle});
        Object.assign(eskiSlot,{gun,dilim,mahalle});
        showToast(`🔄 ${isim} → ${gun} ${dilim}`);
      } else {
        const ref = await firebase.firestore().collection('periyot').add({isim,hizmet,mahalle,gun,dilim});
        window._periyotData.push({_fbId:ref.id,isim,hizmet,mahalle,gun,dilim});
        showToast(`✅ ${isim} → ${gun} ${dilim}`);
      }
    }
  } catch(e) { showToast('❌ '+e.message); return; }
  haftalikTabloRender();
}
window.btKisiToggle = btKisiToggle;

async function btHucreSilKisi(fbId, isim, event) {
  event.stopPropagation();
  if (!confirm(`"${isim}" bu slottan çıkarılsın mı?`)) return;
  try {
    await firebase.firestore().collection('periyot').doc(fbId).delete();
    window._periyotData = (window._periyotData||[]).filter(p=>p._fbId!==fbId);
    showToast(`🗑️ ${isim} çıkarıldı`);
  } catch(e) { showToast('❌ '+e.message); return; }
  haftalikTabloRender();
}
window.btHucreSilKisi = btHucreSilKisi;

// ══════════════════════════════════════════════════════════════
// 3. SEKME + TÜR SEÇİMİ
// ══════════════════════════════════════════════════════════════
function btSekmeSec(sekme) {
  _btAktifSekme = sekme;
  _btHucre = null;
  const hp = document.getElementById('bt-panel-haftalik');
  const mp = document.getElementById('bt-panel-mahalle');
  const bh = document.getElementById('bt-sekme-haftalik');
  const bm = document.getElementById('bt-sekme-mahalle');
  if (sekme==='haftalik') {
    if(hp) hp.style.display=''; if(mp) mp.style.display='none';
    if(bh){bh.style.background='#1e293b';bh.style.color='#fff';}
    if(bm){bm.style.background='#f1f5f9';bm.style.color='#475569';}
    haftalikTabloRender();
  } else {
    if(hp) hp.style.display='none'; if(mp) mp.style.display='';
    if(bm){bm.style.background='#1e293b';bm.style.color='#fff';}
    if(bh){bh.style.background='#f1f5f9';bh.style.color='#475569';}
    banyoTabloRender();
  }
}
window.btSekmeSec = btSekmeSec;

function banyoTurSec(tur, el) {
  _banyoTur = tur;
  _btHucre  = null;
  document.querySelectorAll('.banyo-tur-btn').forEach(b=>{b.style.background='#f1f5f9';b.style.color='#475569';});
  if(el){el.style.background=tur==='KADIN BANYO'?'#C2185B':'#1565C0';el.style.color='#fff';}
  if(_btAktifSekme==='haftalik') haftalikTabloRender();
  else banyoTabloRender();
}
window.banyoTurSec = banyoTurSec;
