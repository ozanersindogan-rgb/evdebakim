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
  const goruldu = new Set();
  const sonuc = [];
  (typeof allData !== 'undefined' ? allData : [])
    .filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF')
    .forEach(r => {
      if (goruldu.has(r.ISIM_SOYISIM)) return;
      goruldu.add(r.ISIM_SOYISIM);
      const periyod = r.GUN || r.PERIYOD || r['GÜN'] || r.ZİYARET_GUN || '';
      sonuc.push({ isim: r.ISIM_SOYISIM || '', mahalle: r.MAHALLE || '', periyod });
    });
  return sonuc;
}

async function banyoTabloRender() {
  const container = document.getElementById('banyo-tablo-container');
  if (!container) return;

  if (!allData || allData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">⏳ Veriler yükleniyor...</div>';
    return;
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
