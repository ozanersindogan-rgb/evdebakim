// ══════════════════════════════════════════════════════════════
// BANYO TAKVIM TABLOSU
// Mahalleye göre, Sabah / Öğleden Sonra periyod gösterimi
// Sadece BANYO hizmetleri — personel ataması YOKTUR
// ══════════════════════════════════════════════════════════════

function _periyodTip(val) {
  if (!val) return 'diger';
  const v = val.toUpperCase();
  if (v.includes('SABAH')) return 'sabah';
  if (v.includes('ÖĞLEDEN') || v.includes('OGLEDEN')) return 'ogleden';
  return 'diger';
}

function _periyodLabel(val) {
  if (!val) return '—';
  return (val + '')
    .replace(/^\d+\)/, '').trim()
    .replace('PAZARTESİ SABAH',           'Pazartesi Sabah')
    .replace('PAZARTESİ ÖĞLEDEN SONRA',   'Pazartesi Öğleden S.')
    .replace('SALI SABAH',                'Salı Sabah')
    .replace('SALI ÖĞLEDEN SONRA',        'Salı Öğleden S.')
    .replace('ÇARŞAMBA SABAH',            'Çarşamba Sabah')
    .replace('ÇARŞAMBA ÖĞLEDEN SONRA',    'Çarşamba Öğleden S.')
    .replace('PERŞEMBE SABAH',            'Perşembe Sabah')
    .replace('PERŞEMBE ÖĞLEDEN SONRA',    'Perşembe Öğleden S.')
    .replace('CUMA SABAH',                'Cuma Sabah')
    .replace('CUMA ÖĞLEDEN SONRA',        'Cuma Öğleden S.');
}

const PERIYOD_SIRASI = [
  '1)PAZARTESİ SABAH','2)PAZARTESİ ÖĞLEDEN SONRA',
  '3)SALI SABAH','4)SALI ÖĞLEDEN SONRA',
  '5)ÇARŞAMBA SABAH','6)ÇARŞAMBA ÖĞLEDEN SONRA',
  '7)PERŞEMBE SABAH','8)PERŞEMBE ÖĞLEDEN SONRA',
  '9)CUMA SABAH','91)CUMA ÖĞLEDEN SONRA',
];

const GUN_ETIKET = {
  '1)PAZARTESİ SABAH':'Pzt',         '2)PAZARTESİ ÖĞLEDEN SONRA':'Pzt',
  '3)SALI SABAH':'Sal',              '4)SALI ÖĞLEDEN SONRA':'Sal',
  '5)ÇARŞAMBA SABAH':'Çrş',          '6)ÇARŞAMBA ÖĞLEDEN SONRA':'Çrş',
  '7)PERŞEMBE SABAH':'Prş',          '8)PERŞEMBE ÖĞLEDEN SONRA':'Prş',
  '9)CUMA SABAH':'Cum',              '91)CUMA ÖĞLEDEN SONRA':'Cum',
};

let _banyoTur = 'KADIN BANYO';
let _banyoAra = '';

function _banyoVeriTopla(hizmet) {
  // Aktif vatandaşları allData'dan al
  const aktifler = new Map();
  (typeof allData !== 'undefined' ? allData : [])
    .filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF')
    .forEach(r => {
      if (!aktifler.has(r.ISIM_SOYISIM)) {
        aktifler.set(r.ISIM_SOYISIM, { isim: r.ISIM_SOYISIM || '', mahalle: r.MAHALLE || '', periyod: '' });
      }
    });

  // Periyot atamasını _periyotData'dan eşleştir
  const pd = window._periyotData || [];
  pd.filter(p => p.hizmet === hizmet).forEach(p => {
    if (aktifler.has(p.isim)) {
      // gun + dilim → periyod string'e çevir (PERIYOD_SIRASI formatına uygun)
      const gun    = p.gun    || '';
      const dilim  = p.dilim  || '';
      let periyodStr = '';
      if (gun && dilim) {
        // Örnek: "Pazartesi" + "Sabah" → "1)PAZARTESİ SABAH"
        const gunBuyuk   = gun.toUpperCase().replace('İ','İ').replace('Ş','Ş');
        const dilimBuyuk = dilim.toUpperCase().replace('Ö','Ö').replace('İ','İ');
        // PERIYOD_SIRASI içinde bul
        periyodStr = PERIYOD_SIRASI.find(s => {
          const temiz = s.replace(/^\d+\)/, '');
          return temiz === gunBuyuk + ' ' + dilimBuyuk;
        }) || gun + ' ' + dilim;
      }
      aktifler.get(p.isim).periyod = periyodStr;
    }
  });

  return [...aktifler.values()];
}

async function banyoTabloRender() {
  const container = document.getElementById('banyo-tablo-container');
  if (!container) return;

  if (!allData || allData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Veriler yükleniyor...</div>';
    return;
  }

  // periyot verisi yoksa veya boşsa yükle
  if (!window._periyotData || window._periyotData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Periyot verileri yükleniyor...</div>';
    if (typeof periyotYukle === 'function') {
      try { await periyotYukle(); } catch(e) {}
    }
  }

  const hizmet = _banyoTur;
  const renk   = hizmet === 'KADIN BANYO' ? '#C2185B' : '#1565C0';
  const bgRenk = hizmet === 'KADIN BANYO' ? '#fdf2f8' : '#eff6ff';
  const araFiltre = _banyoAra.trim().toUpperCase();

  let veri = _banyoVeriTopla(hizmet);
  if (araFiltre) {
    veri = veri.filter(v =>
      v.isim.toUpperCase().includes(araFiltre) ||
      v.mahalle.toUpperCase().includes(araFiltre)
    );
  }

  const mahalleMap = {};
  veri.forEach(v => {
    const mah = v.mahalle || 'Mahalle Bilinmiyor';
    if (!mahalleMap[mah]) mahalleMap[mah] = [];
    mahalleMap[mah].push(v);
  });

  const mahalleler = Object.entries(mahalleMap)
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'));

  const countEl = document.getElementById('banyo-tablo-count');
  if (countEl) countEl.textContent = veri.length + ' kişi';

  if (!mahalleler.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8">
      <div style="font-size:40px;margin-bottom:12px">🛁</div>
      <div style="font-weight:700">Kayıt bulunamadı</div>
    </div>`;
    return;
  }

  function siralaPeriyod(liste) {
    return [...liste].sort((a, b) => {
      const ia = PERIYOD_SIRASI.indexOf(a.periyod);
      const ib = PERIYOD_SIRASI.indexOf(b.periyod);
      if (ia < 0 && ib < 0) return a.isim.localeCompare(b.isim, 'tr');
      if (ia < 0) return 1; if (ib < 0) return -1;
      return ia - ib;
    });
  }

  function kisiBadge(v) {
    if (!v) return '<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;border-left:1px solid #f1f5f9"></td>';
    const gunEt = GUN_ETIKET[v.periyod] || '';
    const pBadge = (v.periyod && PERIYOD_SIRASI.includes(v.periyod))
      ? `<span style="font-size:9px;background:${renk}18;color:${renk};border-radius:4px;padding:1px 5px;font-weight:800;margin-left:4px">${gunEt}</span>`
      : '';
    return `<td style="padding:7px 10px;vertical-align:top;border-bottom:1px solid #f1f5f9;border-left:1px solid #f1f5f9">
      <div style="font-weight:700;font-size:12px;color:#1e293b;line-height:1.4">${v.isim}${pBadge}</div>
      ${v.periyod ? `<div style="font-size:10px;color:#94a3b8;margin-top:1px">${_periyodLabel(v.periyod)}</div>` : ''}
    </td>`;
  }

  const tablolar = mahalleler.map(([mah, kisiler]) => {
    const sabahlar   = siralaPeriyod(kisiler.filter(v => _periyodTip(v.periyod) === 'sabah'));
    const ogledener  = siralaPeriyod(kisiler.filter(v => _periyodTip(v.periyod) === 'ogleden'));
    const periyodsuz = kisiler.filter(v => _periyodTip(v.periyod) === 'diger');
    const satirSayisi = Math.max(sabahlar.length, ogledener.length);

    let satirlar = '';
    for (let i = 0; i < satirSayisi; i++) {
      satirlar += `<tr>${kisiBadge(sabahlar[i])}${kisiBadge(ogledener[i])}</tr>`;
    }

    let periyodsuzHtml = '';
    if (periyodsuz.length > 0) {
      const chips = periyodsuz
        .sort((a, b) => a.isim.localeCompare(b.isim, 'tr'))
        .map(v => `<span style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#64748b">${v.isim}</span>`)
        .join('');
      periyodsuzHtml = `<div style="padding:8px 12px 10px;background:#fafafa;border-top:1px dashed #e2e8f0">
        <span style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px">⬜ Periyod Atanmamış (${periyodsuz.length})</span>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${chips}</div>
      </div>`;
    }

    return `
      <div style="margin-bottom:16px;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid ${renk}28">
        <div style="background:linear-gradient(135deg,${renk},${renk}cc);padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
          <div style="color:#fff;font-weight:900;font-size:14px">📍 ${mah}</div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:800">${kisiler.length} kişi</span>
            ${sabahlar.length  ? `<span style="background:#fff3;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">🌅 ${sabahlar.length}</span>` : ''}
            ${ogledener.length ? `<span style="background:#fff3;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">🌇 ${ogledener.length}</span>` : ''}
            ${periyodsuz.length? `<span style="background:rgba(255,255,255,.15);color:#fffb;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">⬜ ${periyodsuz.length}</span>` : ''}
          </div>
        </div>
        ${satirSayisi > 0 ? `
        <div style="overflow-x:auto;background:#fff">
          <table style="width:100%;border-collapse:collapse;min-width:280px">
            <thead>
              <tr style="background:${bgRenk}">
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:900;color:${renk};border-bottom:2px solid ${renk}33;width:50%">
                  🌅 SABAH <span style="font-weight:600;color:#94a3b8;font-size:10px">(${sabahlar.length})</span>
                </th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:900;color:${renk};border-bottom:2px solid ${renk}33;width:50%;border-left:1px solid ${renk}22">
                  🌇 ÖĞLEDEN SONRA <span style="font-weight:600;color:#94a3b8;font-size:10px">(${ogledener.length})</span>
                </th>
              </tr>
            </thead>
            <tbody>${satirlar}</tbody>
          </table>
        </div>` : ''}
        ${periyodsuzHtml}
      </div>`;
  }).filter(Boolean).join('');

  container.innerHTML = tablolar || `<div style="text-align:center;padding:40px;color:#94a3b8">Kayıt bulunamadı</div>`;
}
window.banyoTabloRender = banyoTabloRender;

function banyoTurSec(tur, el) {
  _banyoTur = tur;
  document.querySelectorAll('.banyo-tur-btn').forEach(b => {
    b.style.background = '#f1f5f9'; b.style.color = '#475569';
  });
  if (el) {
    el.style.background = tur === 'KADIN BANYO' ? '#C2185B' : '#1565C0';
    el.style.color = '#fff';
  }
  banyoTabloRender();
}
window.banyoTurSec = banyoTurSec;

// ══════════════════════════════════════════════════════════════
// HAFTALIK ATAMA GÖRÜNÜMÜ
// periyot koleksiyonu üzerinden gün × dilim grid tablosu
// ══════════════════════════════════════════════════════════════

const BT_GUNLER  = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const BT_DILIMLER = ['Sabah','Öğleden Sonra'];
const BT_GUN_RENK = {
  Pazartesi:'#4f46e5',Salı:'#0369a1',Çarşamba:'#0891b2',Perşembe:'#7c3aed',Cuma:'#b45309'
};
const BT_DILIM_EMOJI = {Sabah:'🌅','Öğleden Sonra':'🌇'};

// Seçili hücre state'i
let _btHucre = null; // {gun, dilim}

// ── Ana render ───────────────────────────────────────────────
function haftalikTabloRender() {
  const wrap = document.getElementById('haftalik-tablo-wrap');
  if (!wrap) return;

  // _periyotData henüz yüklenmemişse veya boşsa yükle
  const pd_all = window._periyotData || [];
  if (pd_all.length === 0 && typeof periyotYukle === 'function') {
    wrap.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Yükleniyor...</div>';
    periyotYukle().then(() => haftalikTabloRender()).catch(e => {
      wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">❌ Yükleme hatası: ${e.message}</div>`;
    });
    return;
  }
  const renk   = hizmet === 'KADIN BANYO' ? '#C2185B' : '#1565C0';

  // periyot verisini al
  const pd = (window._periyotData || []).filter(p => p.hizmet === hizmet);

  // Grid HTML
  const gunBasliklari = BT_GUNLER.map(g => {
    const r = BT_GUN_RENK[g];
    const sayi = pd.filter(p=>p.gun===g).length;
    return `<th style="padding:8px 6px;text-align:center;font-size:11px;font-weight:900;
                        color:${r};border-bottom:2px solid ${r}33;min-width:110px">
      <div>${g}</div>
      ${sayi ? `<span style="font-size:10px;font-weight:700;color:${r}88">${sayi} kişi</span>` : ''}
    </th>`;
  }).join('');

  const satirlar = BT_DILIMLER.map(dilim => {
    const hucre = BT_GUNLER.map(gun => {
      const kisiler = pd.filter(p => p.gun === gun && p.dilim === dilim)
        .sort((a,b) => (a.mahalle||'').localeCompare(b.mahalle||'','tr') || (a.isim||'').localeCompare(b.isim||'','tr'));

      const aktif = _btHucre && _btHucre.gun === gun && _btHucre.dilim === dilim;
      const gr = BT_GUN_RENK[gun];

      const kisiBadgeleri = kisiler.map(k => `
        <div style="display:flex;align-items:center;gap:4px;background:#fff;
                    border:1px solid ${gr}33;border-radius:8px;padding:4px 8px;
                    margin-bottom:4px;cursor:default">
          <div style="flex:1">
            <div style="font-size:11px;font-weight:800;color:#1e293b;line-height:1.3">${k.isim}</div>
            ${k.mahalle ? `<div style="font-size:9px;color:#94a3b8">📍 ${k.mahalle}</div>` : ''}
          </div>
          <button onclick="btHucreSilKisi('${k._fbId}','${(k.isim||'').replace(/'/g,"\\'")}',event)"
            style="background:none;border:none;color:#f87171;cursor:pointer;font-size:13px;
                   padding:0 2px;line-height:1;flex-shrink:0" title="Kaldır">✕</button>
        </div>
      `).join('');

      return `<td style="padding:6px;vertical-align:top;border:1px solid #f1f5f9;
                          background:${aktif ? gr+'0d' : '#fff'};cursor:pointer;
                          transition:background .15s"
                  onclick="btHucreAc('${gun}','${dilim}',this)"
                  title="${gun} ${dilim} — ata/çıkar">
        ${kisiBadgeleri}
        <div style="text-align:center;margin-top:${kisiler.length?'4px':'8px'}">
          <span style="font-size:11px;color:${gr};font-weight:700;opacity:.6">+ Ekle</span>
        </div>
      </td>`;
    }).join('');

    return `<tr>
      <td style="padding:8px 10px;font-weight:900;font-size:11px;color:#475569;
                 background:#f8fafc;border:1px solid #f1f5f9;white-space:nowrap;min-width:90px">
        ${BT_DILIM_EMOJI[dilim]} ${dilim}
      </td>
      ${satirlar}
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;
                box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <table style="width:100%;border-collapse:collapse;min-width:600px">
        <thead>
          <tr>
            <th style="padding:8px 10px;background:#f8fafc;border-bottom:2px solid #e2e8f0;
                       font-size:11px;color:#94a3b8;min-width:90px"></th>
            ${gunBasliklari}
          </tr>
        </thead>
        <tbody>${satirlar}</tbody>
      </table>
    </div>
    <!-- Atama paneli -->
    <div id="bt-atama-panel" style="display:none;margin-top:12px;border-radius:12px;
         border:1.5px solid ${renk}44;background:#fff;overflow:hidden;
         box-shadow:0 2px 8px rgba(0,0,0,.08)">
    </div>
  `;

  // Eğer hücre seçiliyse paneli aç
  if (_btHucre) _btPaneliRender(renk);
}
window.haftalikTabloRender = haftalikTabloRender;

// ── Hücreye tıklama ──────────────────────────────────────────
function btHucreAc(gun, dilim, el) {
  if (_btHucre && _btHucre.gun === gun && _btHucre.dilim === dilim) {
    _btHucre = null;
  } else {
    _btHucre = { gun, dilim };
  }
  haftalikTabloRender();
}
window.btHucreAc = btHucreAc;

// ── Atama paneli render ──────────────────────────────────────
function _btPaneliRender(renk) {
  const panel = document.getElementById('bt-atama-panel');
  if (!panel || !_btHucre) return;

  const { gun, dilim } = _btHucre;
  const hizmet = _banyoTur;
  const pd = (window._periyotData || []).filter(p => p.hizmet === hizmet);
  const hucrePd = pd.filter(p => p.gun === gun && p.dilim === dilim);
  const ekliIsimler = new Set(hucrePd.map(p => p.isim));

  // Atanmamış aktif vatandaşları listele
  const aktifler = [...new Map(
    (allData||[])
      .filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF')
      .map(r => [r.ISIM_SOYISIM, r])
  ).values()].sort((a,b) => (a.MAHALLE||'').localeCompare(b.MAHALLE||'','tr') || a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));

  // Arama filtresi
  const ara = (document.getElementById('bt-ara')?.value || '').toUpperCase();

  const filtreAktifler = aktifler.filter(r =>
    !ara ||
    r.ISIM_SOYISIM.toUpperCase().includes(ara) ||
    (r.MAHALLE||'').toUpperCase().includes(ara)
  );

  const gr = BT_GUN_RENK[gun] || renk;

  const kisiListesi = filtreAktifler.map(r => {
    const ekli = ekliIsimler.has(r.ISIM_SOYISIM);
    const pd_kayit = ekli ? hucrePd.find(p => p.isim === r.ISIM_SOYISIM) : null;
    // Başka slotta atanmış mı?
    const digerSlot = pd.find(p => p.isim === r.ISIM_SOYISIM && !(p.gun===gun && p.dilim===dilim));

    return `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 12px;
                  background:${ekli ? gr+'0d' : '#fff'};
                  border-bottom:1px solid #f1f5f9;cursor:pointer"
           onclick="btKisiToggle('${r.ISIM_SOYISIM.replace(/'/g,"\\'")}','${r.MAHALLE||''}')">
        <div style="width:20px;height:20px;border-radius:6px;border:2px solid ${ekli?gr:'#e2e8f0'};
                    background:${ekli?gr:'#fff'};display:flex;align-items:center;justify-content:center;
                    flex-shrink:0">
          ${ekli ? '<span style="color:#fff;font-size:12px;line-height:1">✓</span>' : ''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:800;color:${ekli?gr:'#1e293b'};
                      overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.ISIM_SOYISIM}</div>
          ${r.MAHALLE ? `<div style="font-size:10px;color:#94a3b8">📍 ${r.MAHALLE}</div>` : ''}
        </div>
        ${digerSlot ? `<span style="font-size:9px;background:#fef3c7;color:#92400e;
                              border-radius:6px;padding:2px 6px;font-weight:700;flex-shrink:0">
            ${digerSlot.gun.slice(0,3)} ${digerSlot.dilim==='Sabah'?'☀':'🌆'}
          </span>` : ''}
      </div>
    `;
  }).join('');

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="background:linear-gradient(135deg,${gr},${gr}cc);padding:10px 14px;
                display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <div style="color:#fff;font-weight:900;font-size:13px">
        ${BT_DILIM_EMOJI[dilim]} ${gun} — ${dilim}
        <span style="font-weight:600;opacity:.8;font-size:11px;margin-left:6px">${ekliIsimler.size} kişi</span>
      </div>
      <button onclick="_btHucre=null;haftalikTabloRender()"
        style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;
               padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">✕ Kapat</button>
    </div>
    <div style="padding:8px 12px">
      <input id="bt-ara" type="text" placeholder="İsim veya mahalle ara..."
        oninput="_btPaneliRender('${renk}')"
        style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #e2e8f0;
               border-radius:8px;font-size:12px;outline:none">
    </div>
    <div style="max-height:280px;overflow-y:auto">
      ${kisiListesi || '<div style="text-align:center;padding:20px;color:#94a3b8">Vatandaş bulunamadı</div>'}
    </div>
  `;
}
window._btPaneliRender = _btPaneliRender;

// ── Kişi ekle / çıkar ────────────────────────────────────────
async function btKisiToggle(isim, mahalle) {
  if (!_btHucre) return;
  const { gun, dilim } = _btHucre;
  const hizmet = _banyoTur;
  const pd = window._periyotData || [];

  const varMi = pd.find(p => p.hizmet===hizmet && p.isim===isim && p.gun===gun && p.dilim===dilim);

  try {
    if (varMi) {
      // Çıkar
      await firebase.firestore().collection('periyot').doc(varMi._fbId).delete();
      window._periyotData = pd.filter(p => p._fbId !== varMi._fbId);
      showToast(`🗑️ ${isim} çıkarıldı`);
    } else {
      // Aynı isim başka slot'taysa güncelle, yoksa ekle
      const eskiSlot = pd.find(p => p.hizmet===hizmet && p.isim===isim);
      if (eskiSlot) {
        await firebase.firestore().collection('periyot').doc(eskiSlot._fbId).update({gun, dilim, mahalle});
        Object.assign(eskiSlot, {gun, dilim, mahalle});
        showToast(`🔄 ${isim} → ${gun} ${dilim}`);
      } else {
        const ref = await firebase.firestore().collection('periyot').add({isim, hizmet, mahalle, gun, dilim});
        window._periyotData.push({_fbId:ref.id, isim, hizmet, mahalle, gun, dilim});
        showToast(`✅ ${isim} → ${gun} ${dilim}`);
      }
    }
  } catch(e) { showToast('❌ ' + e.message); return; }

  haftalikTabloRender();
  // Mahalle tablosunu da güncelle
  if (typeof banyoTabloRender === 'function') banyoTabloRender();
}
window.btKisiToggle = btKisiToggle;

// ── Kişi kaldır (hücredeki ✕ butonu) ────────────────────────
async function btHucreSilKisi(fbId, isim, event) {
  event.stopPropagation();
  if (!confirm(`"${isim}" bu slottan çıkarılsın mı?`)) return;
  try {
    await firebase.firestore().collection('periyot').doc(fbId).delete();
    window._periyotData = (window._periyotData||[]).filter(p=>p._fbId!==fbId);
    showToast(`🗑️ ${isim} çıkarıldı`);
  } catch(e) { showToast('❌ '+e.message); return; }
  haftalikTabloRender();
  if (typeof banyoTabloRender==='function') banyoTabloRender();
}
window.btHucreSilKisi = btHucreSilKisi;

// ══════════════════════════════════════════════════════════════
// SEKME YÖNETİMİ
// ══════════════════════════════════════════════════════════════

let _btAktifSekme = 'haftalik';

function btSekmeSec(sekme) {
  _btAktifSekme = sekme;
  _btHucre = null;

  const haftalikPanel = document.getElementById('bt-panel-haftalik');
  const mahallePanel  = document.getElementById('bt-panel-mahalle');
  const btnHaftalik   = document.getElementById('bt-sekme-haftalik');
  const btnMahalle    = document.getElementById('bt-sekme-mahalle');

  if (sekme === 'haftalik') {
    if (haftalikPanel) haftalikPanel.style.display = '';
    if (mahallePanel)  mahallePanel.style.display  = 'none';
    if (btnHaftalik) { btnHaftalik.style.background='#1e293b'; btnHaftalik.style.color='#fff'; }
    if (btnMahalle)  { btnMahalle.style.background='#f1f5f9';  btnMahalle.style.color='#475569'; }
    // periyot verisi yoksa veya boşsa yükle
    if (!window._periyotData || window._periyotData.length === 0) {
      if (typeof periyotYukle === 'function') {
        periyotYukle().then(() => haftalikTabloRender()).catch(()=>{});
      } else haftalikTabloRender();
    } else {
      haftalikTabloRender();
    }
  } else {
    if (haftalikPanel) haftalikPanel.style.display = 'none';
    if (mahallePanel)  mahallePanel.style.display  = '';
    if (btnMahalle)  { btnMahalle.style.background='#1e293b';  btnMahalle.style.color='#fff'; }
    if (btnHaftalik) { btnHaftalik.style.background='#f1f5f9'; btnHaftalik.style.color='#475569'; }
    banyoTabloRender();
  }
}
window.btSekmeSec = btSekmeSec;

// banyoTurSec'i override et: aktif sekmeye göre doğru tabloyu yenile
const _eskiBanyoTurSec = window.banyoTurSec;
window.banyoTurSec = function(tur, el) {
  _banyoTur = tur;
  _btHucre  = null;
  document.querySelectorAll('.banyo-tur-btn').forEach(b => {
    b.style.background = '#f1f5f9'; b.style.color = '#475569';
  });
  if (el) {
    el.style.background = tur === 'KADIN BANYO' ? '#C2185B' : '#1565C0';
    el.style.color = '#fff';
  }
  if (_btAktifSekme === 'haftalik') haftalikTabloRender();
  else banyoTabloRender();
};
