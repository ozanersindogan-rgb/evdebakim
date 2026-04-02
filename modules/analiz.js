// ══════════════════════════════════════════════════════════════
//  ANALİZ & GRAFİKLER MODÜLÜ
//  allData'dan canlı hesaplar, sayfa açıldıkça render eder
// ══════════════════════════════════════════════════════════════

const ANALIZ_RENKLER = {
  'KADIN BANYO':  '#db2777',
  'ERKEK BANYO':  '#0284c7',
  'KUAFÖR':       '#7c3aed',
  'TEMİZLİK':     '#059669',
};
const ANALIZ_IKONLAR = {
  'KADIN BANYO':'🛁','ERKEK BANYO':'🚿','KUAFÖR':'✂️','TEMİZLİK':'🧹'
};
const AY_KISA = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const AY_TAM  = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

function afmt(n) { return (n||0).toLocaleString('tr-TR'); }

// ── YILLIK_VERİ'den de veri çek (geçmiş yıllar için) ──
function analizYillikGecmis(hizmet) {
  if (typeof YILLIK_VERI === 'undefined') return {};
  const result = {};
  Object.entries(YILLIK_VERI).forEach(([yil, mahalleler]) => {
    result[yil] = Object.values(mahalleler).reduce((s,m) => s + (m[hizmet]||m['EV TEMİZLİĞİ']&&hizmet==='TEMİZLİK'?m['EV TEMİZLİĞİ']:m[hizmet]||0), 0);
    // düzelt: temizlik = EV TEMİZLİĞİ alanıyla
    if (hizmet === 'TEMİZLİK') {
      result[yil] = Object.values(mahalleler).reduce((s,m) => s + (m['EV TEMİZLİĞİ']||0), 0);
    }
  });
  return result;
}

// ── allData'dan 2026 canlı veri ──
function analizCanlıHizmetAy() {
  // hizmet → ay(1-12) → sayı
  const buYil = new Date().getFullYear();
  const sonuc = {};
  ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'].forEach(hz => {
    sonuc[hz] = {};
    for(let m=1;m<=12;m++) sonuc[hz][m] = 0;
  });

  const tarihAlanlari = {
    'KADIN BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'ERKEK BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'KUAFÖR':      ['SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'],
  };

  (allData||[]).forEach(r => {
    const hz = r['HİZMET'];
    if (!sonuc[hz] || hz === 'TEMİZLİK') return;
    (tarihAlanlari[hz]||[]).forEach(alan => {
      const v = r[alan]; if (!v) return;
      const parsed = svTarihAyYil ? svTarihAyYil(v) : null;
      if (!parsed || parsed.y !== buYil) return;
      sonuc[hz][parsed.m]++;
    });
  });

  // Temizlik: TP_DATA'dan
  if (typeof TP_DATA !== 'undefined') {
    TP_DATA.forEach(tp => {
      if (!tp.sonGidilme) return;
      const parsed = svTarihAyYil ? svTarihAyYil(tp.sonGidilme) : null;
      if (!parsed || parsed.y !== buYil) return;
      sonuc['TEMİZLİK'][parsed.m]++;
    });
  }

  return sonuc;
}

function analizAktifSayilari() {
  const sonAyData = {};
  const sonAy = [...new Set((allData||[]).map(r=>r.AY).filter(Boolean))]
    .sort((a,b) => AY_TAM.indexOf(b) - AY_TAM.indexOf(a))[0];
  ['KADIN BANYO','ERKEK BANYO','KUAFÖR'].forEach(hz => {
    sonAyData[hz] = (allData||[]).filter(r => r['HİZMET']===hz && r.DURUM==='AKTİF' && r.AY===sonAy).length;
  });
  if (typeof TP_DATA !== 'undefined') {
    sonAyData['TEMİZLİK'] = TP_DATA.filter(tp => tp.durum==='AKTİF').length;
  }
  return { sonAy, data: sonAyData };
}

function analizMahalleSayilari(yil) {
  // YILLIK_VERI'den (geçmiş) veya allData'dan (canlı)
  const buYil = new Date().getFullYear().toString();
  if (yil === buYil) {
    const mahSonuc = {};
    (allData||[]).forEach(r => {
      const m = r.MAHALLE || r.MAH || '';
      if (!m) return;
      if (!mahSonuc[m]) mahSonuc[m] = 0;
      // hizmet sayısı: tarih alanlarını say
      ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'].forEach(f => {
        if (r[f]) {
          const p = svTarihAyYil ? svTarihAyYil(r[f]) : null;
          if (p && p.y === parseInt(yil)) mahSonuc[m]++;
        }
      });
    });
    return mahSonuc;
  }
  if (typeof YILLIK_VERI === 'undefined' || !YILLIK_VERI[yil]) return {};
  const sonuc = {};
  Object.entries(YILLIK_VERI[yil]).forEach(([m, hz]) => {
    sonuc[m] = Object.values(hz).reduce((a,b)=>a+b,0);
  });
  return sonuc;
}

// ══════════════════════════════════════════════════════════════
//  SVG HELPERS
// ══════════════════════════════════════════════════════════════

function svgNS(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs||{}).forEach(([k,v]) => el.setAttribute(k,v));
  return el;
}

// Mini donut SVG (200x200, inline)
function buildDonutSVG(vals, colors, total, centerLabel) {
  const R = 72, r = 50, CX = 100, CY = 100;
  let svg = `<svg viewBox="0 0 200 200" style="width:180px;height:180px;flex-shrink:0">`;
  let angle = -Math.PI/2;
  vals.forEach((v, i) => {
    if (!v) return;
    const frac = v / total;
    const a2 = angle + frac * 2 * Math.PI;
    const large = frac > 0.5 ? 1 : 0;
    const x1=CX+Math.cos(angle)*R, y1=CY+Math.sin(angle)*R;
    const x2=CX+Math.cos(a2)*R,   y2=CY+Math.sin(a2)*R;
    const ix1=CX+Math.cos(angle)*r, iy1=CY+Math.sin(angle)*r;
    const ix2=CX+Math.cos(a2)*r,   iy2=CY+Math.sin(a2)*r;
    svg += `<path d="M${ix1},${iy1} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${large},0 ${ix1},${iy1} Z" fill="${colors[i]}" opacity="0.9"/>`;
    angle = a2;
  });
  svg += `<text x="100" y="96" text-anchor="middle" font-family="inherit" font-weight="900" font-size="20" fill="var(--text)">${afmt(total)}</text>`;
  svg += `<text x="100" y="114" text-anchor="middle" font-family="inherit" font-size="10" fill="var(--text-soft)">${centerLabel}</text>`;
  svg += `</svg>`;
  return svg;
}

// Bar chart HTML
function buildBarChart(items, maxVal, colorFn, animClass) {
  return items.map(([label, val]) => {
    const pct = maxVal ? (val/maxVal*100).toFixed(1) : 0;
    const color = colorFn(label, val);
    return `<div style="display:grid;grid-template-columns:140px 1fr 52px;align-items:center;gap:10px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${label}">${label}</div>
      <div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden">
        <div class="${animClass}" style="height:100%;width:${pct}%;background:${color};border-radius:4px;transform-origin:left;transform:scaleX(0);transition:transform 0.7s cubic-bezier(.4,0,.2,1)"></div>
      </div>
      <div style="font-size:12px;font-weight:800;color:var(--text);text-align:right">${afmt(val)}</div>
    </div>`;
  }).join('');
}

// Line/area chart SVG
function buildLineSVG(labels, datasets) {
  // datasets: [{vals, color, label}]
  const W = 560, H = 130, PL = 8, PR = 8, PT = 16, PB = 24;
  const allVals = datasets.flatMap(d=>d.vals);
  const maxV = Math.max(...allVals, 1);
  const n = labels.length;
  const iW = W-PL-PR, iH = H-PT-PB;

  const px = (i) => PL + (i/(n-1||1))*iW;
  const py = (v) => PT + iH - (v/maxV)*iH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;overflow:visible">`;

  // Grid lines
  [0,0.25,0.5,0.75,1].forEach(f => {
    const y = PT + iH*(1-f);
    svg += `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
    if (f > 0) svg += `<text x="${PL}" y="${y-3}" font-size="9" fill="var(--text-soft)">${afmt(Math.round(maxV*f))}</text>`;
  });

  datasets.forEach(({vals, color}) => {
    const pts = vals.map((v,i)=>`${px(i)},${py(v)}`).join(' ');
    const firstX = px(0), lastX = px(n-1);
    // Area
    svg += `<polygon points="${firstX},${H-PB} ${pts} ${lastX},${H-PB}" fill="${color}" opacity="0.12" class="an-area" style="transform-origin:bottom;transform:scaleY(0);transition:transform 0.8s ease"/>`;
    // Line
    svg += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="an-line" style="stroke-dasharray:2000;stroke-dashoffset:2000;transition:stroke-dashoffset 1.1s ease"/>`;
    // Dots
    vals.forEach((v,i) => {
      svg += `<circle cx="${px(i)}" cy="${py(v)}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2" style="opacity:0;transition:opacity 0.3s ease 0.8s" class="an-dot"/>`;
      svg += `<text x="${px(i)}" y="${py(v)-9}" text-anchor="middle" font-size="10" font-weight="700" fill="${color}" style="opacity:0;transition:opacity 0.3s ease 0.9s" class="an-dot">${afmt(v)}</text>`;
    });
  });

  // X labels
  labels.forEach((lbl, i) => {
    svg += `<text x="${px(i)}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--text-soft)">${lbl}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

function anActivate(container) {
  container.querySelectorAll('.an-area').forEach(el => el.style.transform = 'scaleY(1)');
  container.querySelectorAll('.an-line').forEach(el => el.style.strokeDashoffset = '0');
  container.querySelectorAll('.an-dot').forEach(el => el.style.opacity = '1');
  container.querySelectorAll('[class*="an-bar-"]').forEach(el => el.style.transform = 'scaleX(1)');
}

// ══════════════════════════════════════════════════════════════
//  ACCORDION KARTI
// ══════════════════════════════════════════════════════════════

function buildAnalizKart(id, ikon, baslik, altbaslik, badge, icerikHTML) {
  return `
  <div class="table-card" id="an-card-${id}" style="margin-bottom:6px;border-radius:12px;overflow:hidden">
    <div class="table-header" onclick="anToggle('${id}')" style="cursor:pointer;padding:16px 20px;transition:background 0.15s;user-select:none" id="an-hdr-${id}">
      <span style="font-size:20px;margin-right:4px">${ikon}</span>
      <div style="flex:1">
        <div class="table-title" style="font-size:14px">${baslik}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:1px">${altbaslik}</div>
      </div>
      <div style="text-align:right;margin-right:12px">
        ${badge}
      </div>
      <span id="an-arrow-${id}" style="font-size:12px;color:var(--text-soft);transition:transform 0.3s ease;display:inline-block">▼</span>
    </div>
    <div id="an-body-${id}" style="max-height:0;overflow:hidden;transition:max-height 0.5s cubic-bezier(.4,0,.2,1)">
      <div id="an-inner-${id}" style="padding:20px;border-top:1px solid var(--border);background:var(--bg)">
        ${icerikHTML}
      </div>
    </div>
  </div>`;
}

function anToggle(id) {
  const body = document.getElementById(`an-body-${id}`);
  const arrow = document.getElementById(`an-arrow-${id}`);
  const hdr = document.getElementById(`an-hdr-${id}`);
  const isOpen = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';
  if (isOpen) {
    body.style.maxHeight = '0';
    arrow.style.transform = 'rotate(0deg)';
    hdr.style.background = '';
  } else {
    body.style.maxHeight = '1400px';
    arrow.style.transform = 'rotate(180deg)';
    hdr.style.background = 'var(--bg)';
    // Animate charts after open
    setTimeout(() => {
      const inner = document.getElementById(`an-inner-${id}`);
      if (inner) anActivate(inner);
    }, 80);
  }
}

// ══════════════════════════════════════════════════════════════
//  ANA RENDER
// ══════════════════════════════════════════════════════════════

function analizRender() {
  const container = document.getElementById('analiz-kartlar');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-soft);font-size:13px">⏳ Veriler hesaplanıyor...</div>';

  // Biraz bekle - allData yüklenmiş olsun
  setTimeout(() => {
    try {
      _analizRenderIc(container);
    } catch(e) {
      container.innerHTML = `<div style="color:red;padding:20px;font-size:12px">Hata: ${e.message}</div>`;
      console.error(e);
    }
  }, 100);
}

function _analizRenderIc(container) {
  const buYil = new Date().getFullYear();
  const hizmetler = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];

  // ── Canlı ay bazlı veri ──
  const ayBazli = analizCanlıHizmetAy();

  // ── Aktif sayılar ──
  const { sonAy, data: aktifData } = analizAktifSayilari();

  // ── Toplam hizmet (canlı) ──
  const toplamHizmet = hizmetler.reduce((s, hz) => {
    return s + Object.values(ayBazli[hz]||{}).reduce((a,b)=>a+b,0);
  }, 0);

  // ── Toplam aktif ──
  const toplamAktif = Object.values(aktifData).reduce((a,b)=>a+b,0);

  // ── Özet chip'leri ──
  const chips = document.getElementById('analiz-ozet-chips');
  if (chips) {
    chips.innerHTML = hizmetler.map(hz => {
      const aktif = aktifData[hz] || 0;
      const renk = ANALIZ_RENKLER[hz];
      return `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;border:1.5px solid ${renk}20;background:${renk}10;font-size:11px;font-weight:700;color:${renk}">
        ${ANALIZ_IKONLAR[hz]} <span>${aktif} aktif</span>
      </div>`;
    }).join('');
  }

  // ════════════════════════════
  //  KART 1: HİZMET DAĞILIMI (Donut)
  // ════════════════════════════
  const dagVals = hizmetler.map(hz => Object.values(ayBazli[hz]||{}).reduce((a,b)=>a+b,0));
  const dagColors = hizmetler.map(hz => ANALIZ_RENKLER[hz]);
  const dagTotal  = dagVals.reduce((a,b)=>a+b,0);

  const donutHTML = `
    <div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap">
      ${buildDonutSVG(dagVals, dagColors, dagTotal, `${buYil} hizmet`)}
      <div style="flex:1;min-width:200px">
        ${hizmetler.map((hz, i) => {
          const pct = dagTotal ? (dagVals[i]/dagTotal*100).toFixed(1) : 0;
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;background:var(--surface)">
            <div style="width:10px;height:10px;border-radius:50%;background:${ANALIZ_RENKLER[hz]};flex-shrink:0"></div>
            <div style="flex:1;font-size:12px;font-weight:600">${hz}</div>
            <div style="font-size:16px;font-weight:900;color:${ANALIZ_RENKLER[hz]}">${afmt(dagVals[i])}</div>
            <div style="font-size:11px;color:var(--text-soft);width:36px;text-align:right">${pct}%</div>
          </div>`;
        }).join('')}
        <div style="margin-top:10px;padding:8px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:var(--text-soft)">Toplam aktif vatandaş</span>
          <span style="font-size:16px;font-weight:900;color:var(--primary)">${afmt(toplamAktif)}</span>
        </div>
      </div>
    </div>`;

  const dagBadge = `<div style="font-size:20px;font-weight:900;color:var(--primary)">${afmt(dagTotal)}</div><div style="font-size:10px;color:var(--text-soft)">${buYil} toplam hizmet</div>`;

  // ════════════════════════════
  //  KART 2: AYLIK TREND (Line)
  // ════════════════════════════
  const buAy = new Date().getMonth() + 1;
  const ayLabels = AY_KISA.slice(0, buAy);
  const trendDatasets = hizmetler.map(hz => ({
    vals: Array.from({length: buAy}, (_,i) => ayBazli[hz]?.[i+1] || 0),
    color: ANALIZ_RENKLER[hz],
    label: hz
  }));

  const trendHTML = `
    <div style="margin-bottom:16px">
      ${buildLineSVG(ayLabels, trendDatasets)}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
      ${hizmetler.map(hz => `
        <div style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--text-soft)">
          <div style="width:20px;height:3px;background:${ANALIZ_RENKLER[hz]};border-radius:2px"></div>
          ${hz}
        </div>`).join('')}
    </div>`;

  const maxAyToplam = Math.max(...Array.from({length:buAy},(_,i)=>
    hizmetler.reduce((s,hz)=>s+(ayBazli[hz]?.[i+1]||0),0)));
  const maxAyIdx = Array.from({length:buAy},(_,i)=>
    hizmetler.reduce((s,hz)=>s+(ayBazli[hz]?.[i+1]||0),0)).indexOf(maxAyToplam);
  const trendBadge = `<div style="font-size:16px;font-weight:900;color:var(--primary)">${AY_KISA[maxAyIdx] || '—'}</div><div style="font-size:10px;color:var(--text-soft)">en yoğun ay · ${afmt(maxAyToplam)}</div>`;

  // ════════════════════════════
  //  KART 3: MAHALLE SIRALAMALARI
  // ════════════════════════════
  // YILLIK_VERI 2023'ten kullan (en tam veri)
  let mahYil = '2023';
  const mahData = typeof YILLIK_VERI !== 'undefined' ? YILLIK_VERI[mahYil] : {};
  const mahRows = Object.entries(mahData||{})
    .map(([m, hz]) => [m.replace(' MAHALLESİ',''), Object.values(hz).reduce((a,b)=>a+b,0)])
    .filter(([,v])=>v>0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,12);
  const mahMax = mahRows[0]?.[1] || 1;

  const mahHTML = `
    <div style="font-size:11px;color:var(--text-soft);margin-bottom:14px;letter-spacing:0.05em">İlk 12 mahalle · ${mahYil} verisinden (toplam hizmet)</div>
    ${buildBarChart(mahRows, mahMax, (lbl,i) => {
      const idx = mahRows.findIndex(r=>r[0]===lbl);
      return idx===0?'#c8401a':idx<3?'#2a5298':'var(--primary)';
    }, 'an-bar-mah')}`;

  const mahBadge = `<div style="font-size:14px;font-weight:900;color:var(--primary)">${mahRows[0]?.[0]||'—'}</div><div style="font-size:10px;color:var(--text-soft)">lider mahalle · ${afmt(mahRows[0]?.[1]||0)}</div>`;

  // ════════════════════════════
  //  KART 4: HİZMET BAZLI DETAY
  // ════════════════════════════
  // Her hizmet için: aktif, bu ay, toplam yıl
  const detayHTML = hizmetler.map(hz => {
    const ayVals = Array.from({length: buAy}, (_,i) => ayBazli[hz]?.[i+1] || 0);
    const yilToplam = ayVals.reduce((a,b)=>a+b,0);
    const buAyVal = ayVals[buAy-1] || 0;
    const aktif = aktifData[hz] || 0;
    const renk = ANALIZ_RENKLER[hz];
    const maxAy = Math.max(...ayVals, 1);

    return `
    <div style="margin-bottom:20px;padding:16px;border-radius:10px;border:1.5px solid ${renk}20;background:${renk}08">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:18px">${ANALIZ_IKONLAR[hz]}</span>
        <span style="font-size:14px;font-weight:900;color:${renk}">${hz}</span>
        <span style="margin-left:auto;font-size:11px;background:${renk}20;color:${renk};padding:2px 10px;border-radius:12px;font-weight:700">${aktif} aktif</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div style="text-align:center;padding:10px;background:var(--surface);border-radius:8px">
          <div style="font-size:20px;font-weight:900;color:${renk}">${afmt(yilToplam)}</div>
          <div style="font-size:10px;color:var(--text-soft);margin-top:2px">${buYil} toplam</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface);border-radius:8px">
          <div style="font-size:20px;font-weight:900;color:${renk}">${afmt(buAyVal)}</div>
          <div style="font-size:10px;color:var(--text-soft);margin-top:2px">${AY_KISA[buAy-1]} ayı</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface);border-radius:8px">
          <div style="font-size:20px;font-weight:900;color:${renk}">${buAy ? afmt(Math.round(yilToplam/buAy)) : '—'}</div>
          <div style="font-size:10px;color:var(--text-soft);margin-top:2px">aylık ort.</div>
        </div>
      </div>
      <div style="display:flex;gap:4px;align-items:flex-end;height:44px">
        ${ayVals.map((v,i) => {
          const h = maxAy ? Math.max(4, Math.round((v/maxAy)*40)) : 4;
          return `<div style="flex:1;background:${renk};border-radius:2px 2px 0 0;height:${h}px;opacity:${i===buAy-1?1:0.4};transition:height 0.5s ease" title="${AY_KISA[i]}: ${afmt(v)}"></div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:4px;margin-top:3px">
        ${ayVals.map((_,i) => `<div style="flex:1;text-align:center;font-size:8px;color:var(--text-soft)">${AY_KISA[i]}</div>`).join('')}
      </div>
    </div>`;
  }).join('');

  const detayBadge = `<div style="font-size:16px;font-weight:900;color:var(--primary)">${afmt(toplamAktif)}</div><div style="font-size:10px;color:var(--text-soft)">aktif vatandaş · ${sonAy||'—'}</div>`;

  // ════════════════════════════
  //  KART 5: GEÇMİŞ YILLAR KARŞILAŞTIRMASI (YILLIK_VERI)
  // ════════════════════════════
  let karsilHTML = '<div style="font-size:11px;color:var(--text-soft);margin-bottom:4px">Geçmiş yıllara ait istatistiksel veriler (2019–2024)</div>';
  if (typeof YILLIK_VERI !== 'undefined') {
    const yillar = Object.keys(YILLIK_VERI).sort();
    const yilToplam = yillar.map(y =>
      Object.values(YILLIK_VERI[y]).reduce((s,m) => s+Object.values(m).reduce((a,b)=>a+b,0), 0)
    );
    const maxYT = Math.max(...yilToplam, 1);

    karsilHTML += `
      <div style="margin-bottom:20px">
        ${buildBarChart(
          yillar.map((y,i) => [y, yilToplam[i]]),
          maxYT,
          (lbl) => {
            const idx = yillar.indexOf(lbl);
            const colors = ['#6b7280','#9ca3af','#4b9cd3','#2a5298','#c8401a','#db2777'];
            return colors[idx] || 'var(--primary)';
          },
          'an-bar-yil'
        )}
      </div>
      <div style="font-size:11px;color:var(--text-soft);margin-bottom:12px;margin-top:8px">Hizmet türü bazında yıllık kırılım</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:2px solid var(--border)">
              <th style="text-align:left;padding:8px;color:var(--text-soft);font-weight:600">Hizmet</th>
              ${yillar.map(y=>`<th style="text-align:right;padding:8px;color:var(--text-soft);font-weight:600">${y}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${['KADIN BANYO','ERKEK BANYO','EV TEMİZLİĞİ','KUAFÖR'].map(hz => {
              const renk = ANALIZ_RENKLER[hz==='EV TEMİZLİĞİ'?'TEMİZLİK':hz] || 'var(--text)';
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px;font-weight:700;color:${renk}">${hz}</td>
                ${yillar.map(y => {
                  const v = Object.values(YILLIK_VERI[y]).reduce((s,m)=>s+(m[hz]||0),0);
                  return `<td style="text-align:right;padding:8px;font-weight:${v>0?'700':'400'};color:${v>0?'var(--text)':'var(--text-soft)'}">${v>0?afmt(v):'—'}</td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }
  const gecmisBadge = `<div style="font-size:14px;font-weight:900;color:var(--primary)">2019–2024</div><div style="font-size:10px;color:var(--text-soft)">6 yıllık tarihsel veri</div>`;

  // ════════════════════════════
  //  RENDER ALL CARDS
  // ════════════════════════════
  container.innerHTML = [
    buildAnalizKart('dagilim', '🍩', 'Hizmet Dağılımı', `${buYil} yılı · 4 kategori · canlı veri`, dagBadge, donutHTML),
    buildAnalizKart('trend',   '📈', 'Aylık Trend',      `${buYil} · ${AY_KISA[0]}–${AY_KISA[buAy-1]} · hizmet akışı`, trendBadge, trendHTML),
    buildAnalizKart('hizmet',  '📋', 'Hizmet Bazlı Detay', 'Aktif vatandaş · aylık hizmet · çubuk grafikler', detayBadge, detayHTML),
    buildAnalizKart('mahalle', '🏘️', 'Mahalle Sıralaması', `${mahYil} · ilk 12 mahalle · toplam hizmet`, mahBadge, mahHTML),
    buildAnalizKart('gecmis',  '📅', 'Geçmiş Yıllar Karşılaştırması', '2019–2024 · yıllık toplam · hizmet kırılımı', gecmisBadge, karsilHTML),
  ].join('');
}
