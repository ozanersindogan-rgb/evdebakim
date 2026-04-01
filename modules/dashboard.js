// ── DASHBOARD ──
// ============ DASHBOARD ============
function renderDashboard() {
  const AY_SIRA = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  const mevcutAylar = [...new Set(allData.map(r=>r.AY).filter(Boolean))];
  const siraliAylar = [...mevcutAylar].sort((a,b)=>AY_SIRA.indexOf(a)-AY_SIRA.indexOf(b));
  const sonAy = siraliAylar[siraliAylar.length - 1];
  const sonAyData = allData.filter(r=>r.AY===sonAy);
  const aktif = sonAyData.filter(r=>r.DURUM==='AKTİF');

  // Tekil sayılar
  const aktifTekil = new Set(aktif.map(r=>r['HİZMET']+'|'+r.ISIM_SOYISIM)).size;
  const toplamTekil = new Set(allData.filter(r=>r.ISIM_SOYISIM).map(r=>r.ISIM_SOYISIM.trim().toUpperCase())).size;

  // Bu yılki vefat
  const buYil = new Date().getFullYear();
  const vefatBuYil = new Set(
    allData.filter(r => {
      if (r.DURUM !== 'VEFAT') return false;
      if (r.VEFAT_TARIHI) return new Date(r.VEFAT_TARIHI).getFullYear() === buYil;
      return true;
    }).map(r => r.ISIM_SOYISIM)
  ).size;

  // Hizmet bazlı aktif
  const kb = aktif.filter(r=>r['HİZMET']==='KADIN BANYO').length;
  const eb = aktif.filter(r=>r['HİZMET']==='ERKEK BANYO').length;
  const kf = aktif.filter(r=>r['HİZMET']==='KUAFÖR').length;
  const tz = aktif.filter(r=>r['HİZMET']==='TEMİZLİK').length;

  // Önceki ay karşılaştırması
  const oncekiAy = siraliAylar[siraliAylar.length - 2];
  const oncekiAktif = oncekiAy
    ? new Set(allData.filter(r=>r.AY===oncekiAy&&r.DURUM==='AKTİF').map(r=>r['HİZMET']+'|'+r.ISIM_SOYISIM)).size
    : null;
  const degisim = oncekiAktif !== null ? aktifTekil - oncekiAktif : null;
  const degisimHtml = degisim !== null
    ? `<div style="font-size:11px;margin-top:4px;color:${degisim>=0?'#16a34a':'#dc2626'};font-weight:700">${degisim>=0?'▲':'▼'} ${Math.abs(degisim)} geçen aya göre</div>`
    : '';

  // Bu ay henüz kaydı girilmemiş aktif vatandaşlar
  const buAyAktifIsimler = new Set(aktif.map(r=>r.ISIM_SOYISIM+'|'+r['HİZMET']));
  const tumAktifTekil = new Set(allData.filter(r=>r.DURUM==='AKTİF').map(r=>r.ISIM_SOYISIM+'|'+r['HİZMET']));
  const buAyGirilmemis = [...tumAktifTekil].filter(k=>!buAyAktifIsimler.has(k)).length;

  // ── KPI Grid ──
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card sc-all" style="position:relative;overflow:hidden">
      <div class="si">👥</div><div class="sv">${toplamTekil}</div>
      <div class="sl">Toplam Kayıtlı Vatandaş</div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#1A237E,#1565C0)"></div>
    </div>
    <div class="stat-card sc-all" style="position:relative;overflow:hidden">
      <div class="si">✅</div><div class="sv">${aktifTekil}</div>
      <div class="sl">Aktif Vatandaş <span style="font-size:10px;opacity:.7">(${sonAy})</span></div>
      ${degisimHtml}
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#16a34a,#22c55e)"></div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,#fef2f2,#fff5f5);border:1.5px solid #fecaca;position:relative;overflow:hidden">
      <div class="si">🕊️</div><div class="sv" style="color:#dc2626">${vefatBuYil}</div>
      <div class="sl" style="color:#991b1b">Vefat (${buYil})</div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ef4444,#f87171)"></div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,#fffbeb,#fef9c3);border:1.5px solid #fde68a;position:relative;overflow:hidden;cursor:pointer" onclick="navTo('vatandaslar',null)">
      <div class="si">📋</div><div class="sv" style="color:#d97706">${buAyGirilmemis}</div>
      <div class="sl" style="color:#92400e">${sonAy} — Bekleyenler</div>
      <div style="font-size:10px;color:#b45309;margin-top:2px">Henüz kayıt girilmemiş</div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div>
    </div>
    <div class="stat-card sc-kadin"><div class="si">🛁</div><div class="sv">${kb}</div><div class="sl">Kadın Banyo <span style="font-size:10px;opacity:.7">(${sonAy})</span></div></div>
    <div class="stat-card sc-erkek"><div class="si">🚿</div><div class="sv">${eb}</div><div class="sl">Erkek Banyo <span style="font-size:10px;opacity:.7">(${sonAy})</span></div></div>
    <div class="stat-card sc-kuafor"><div class="si">✂️</div><div class="sv">${kf}</div><div class="sl">Kuaför <span style="font-size:10px;opacity:.7">(${sonAy})</span></div></div>
    <div class="stat-card sc-temizlik"><div class="si">🧹</div><div class="sv">${tz}</div><div class="sl">Temizlik <span style="font-size:10px;opacity:.7">(${sonAy})</span></div></div>
  `;

  // ── TREND GRAFİĞİ (son 6 ay) ──
  const son6Ay = siraliAylar.slice(-6);
  const trendData = son6Ay.map(ay => ({
    ay,
    toplam: new Set(allData.filter(r=>r.AY===ay&&r.DURUM==='AKTİF').map(r=>r['HİZMET']+'|'+r.ISIM_SOYISIM)).size,
    kb: allData.filter(r=>r.AY===ay&&r.DURUM==='AKTİF'&&r['HİZMET']==='KADIN BANYO').length,
    eb: allData.filter(r=>r.AY===ay&&r.DURUM==='AKTİF'&&r['HİZMET']==='ERKEK BANYO').length,
    kf: allData.filter(r=>r.AY===ay&&r.DURUM==='AKTİF'&&r['HİZMET']==='KUAFÖR').length,
    tz: allData.filter(r=>r.AY===ay&&r.DURUM==='AKTİF'&&r['HİZMET']==='TEMİZLİK').length,
  }));
  const trendMax = Math.max(...trendData.map(d=>d.toplam), 1);
  const chartH = 120;

  const trendEl = document.getElementById('ch-trend');
  if(trendEl) {
    if(trendData.length < 2) {
      trendEl.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:40px 0;font-size:13px">Trend için en az 2 aylık veri gerekli</div>`;
    } else {
      const W = 500, H = chartH;
      const pad = { l:30, r:10, t:10, b:28 };
      const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
      const pts = (key, color) => {
        const coords = trendData.map((d,i)=>{
          const x = pad.l + (i/(trendData.length-1))*iW;
          const y = pad.t + iH - (d[key]/trendMax)*iH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        return `<polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${trendData.map((d,i)=>{
            const x = pad.l + (i/(trendData.length-1))*iW;
            const y = pad.t + iH - (d[key]/trendMax)*iH;
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${d.ay}: ${d[key]}</title></circle>`;
          }).join('')}`;
      };
      const yLines = [0,0.25,0.5,0.75,1].map(f=>{
        const y = pad.t + iH - f*iH;
        const v = Math.round(f*trendMax);
        return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W-pad.r}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>
          <text x="${pad.l-4}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;
      }).join('');
      const xLabels = trendData.map((d,i)=>{
        const x = pad.l + (i/(trendData.length-1))*iW;
        return `<text x="${x.toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="#64748b">${d.ay.substring(0,3)}</text>`;
      }).join('');
      trendEl.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${chartH}px;overflow:visible">
          ${yLines}${pts('toplam','#1A237E')}${pts('kb','#ec4899')}${pts('eb','#3b82f6')}${pts('kf','#f59e0b')}${pts('tz','#22c55e')}${xLabels}
        </svg>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;justify-content:center">
          ${[['#1A237E','Toplam Aktif'],['#ec4899','Kadın Banyo'],['#3b82f6','Erkek Banyo'],['#f59e0b','Kuaför'],['#22c55e','Temizlik']].map(([c,l])=>
            `<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#475569">
              <span style="width:14px;height:3px;background:${c};border-radius:2px;display:inline-block"></span>${l}
            </span>`).join('')}
        </div>`;
    }
  }

  // ── HİZMET CHART ──
  const toplamAktif = aktif.length || 1;
  const hc = {};
  HIZMET_KEYS.forEach(h => hc[h] = aktif.filter(r=>r['HİZMET']===h).length);
  const hmx = Math.max(...Object.values(hc))||1;
  document.getElementById('ch-hizmet').innerHTML = HIZMET_KEYS.map(h=>{
    const yuzde = ((hc[h]/toplamAktif)*100).toFixed(1);
    return `<div class="bar-row">
      <div class="bar-label">${HIZMET_ICONS[h]} ${h}</div>
      <div class="bar-wrap"><div class="bar-fill bar-fill-${HIZMET_COLORS[h]}" style="width:${(hc[h]/hmx*100).toFixed(0)}%"></div></div>
      <div class="bar-num">${hc[h]} <span style="font-size:10px;color:#94a3b8">${yuzde}%</span></div>
    </div>`;
  }).join('');

  // ── UZUN SÜREDİR ZİYARET EDİLMEYENLER ──
  renderUzunSure();
  renderTarihPanels();
  renderKanban();
}


// ── TARİH PANELLERİ ──
// Sol: Hiç tarih girilmemiş (son 50 aktif kişi)
// Sağ: 30+ gün hizmet verilemeyen aktif kişiler
function renderTarihPanels() {
  const elHic  = document.getElementById('tp-hic-liste');
  const elUzun = document.getElementById('tp-uzun-liste');
  if (!elHic && !elUzun) return;

  const AY_SIRA = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

  const TARIH_ALANLARI = {
    'KADIN BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'ERKEK BANYO': ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
    'KUAFÖR':      ['SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'],
    'TEMİZLİK':    ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'],
  };

  const HIZMET_RENK = {
    'KADIN BANYO': '#ec4899',
    'ERKEK BANYO': '#3b82f6',
    'KUAFÖR':      '#f59e0b',
    'TEMİZLİK':    '#22c55e',
  };

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  // Aktif kişi listesini belirle:
  // Her (isim + hizmet) kombinasyonu için en son AY kaydının DURUM='AKTİF' olması yeterli
  const aktifMap = {}; // key: "isim|hizmet" => en son AY kaydı
  allData.forEach(r => {
    if (!r.ISIM_SOYISIM || !r['HİZMET'] || !r.AY) return;
    const key = r.ISIM_SOYISIM.trim().toUpperCase() + '|' + r['HİZMET'];
    const mevcut = aktifMap[key];
    if (!mevcut || AY_SIRA.indexOf(r.AY) > AY_SIRA.indexOf(mevcut.AY)) {
      aktifMap[key] = r;
    }
  });

  // Sadece son kaydı AKTİF olanları al
  const aktifler = Object.values(aktifMap).filter(r =>
    (r.DURUM || '').toUpperCase() === 'AKTİF'
  );

  // Her aktif vatandaş için en son tarihi hesapla (tüm aylar taranır)
  function enSonTarih(isim, hizmet) {
    const alanlar = TARIH_ALANLARI[hizmet] || ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'];
    const isimN = isim.trim().toUpperCase();
    let enSon = null;
    allData.forEach(r => {
      if (!r.ISIM_SOYISIM || r.ISIM_SOYISIM.trim().toUpperCase() !== isimN) return;
      if (r['HİZMET'] !== hizmet) return;
      alanlar.forEach(f => {
        if (!r[f]) return;
        const d = parseDate(r[f]);
        if (d && (!enSon || d > enSon)) enSon = d;
      });
    });
    return enSon;
  }

  // Liste oluştur
  const liste = aktifler.map(r => {
    const tarih = enSonTarih(r.ISIM_SOYISIM, r['HİZMET']);
    const gun = tarih ? Math.floor((bugun - tarih) / 86400000) : null;
    return { r, tarih, gun };
  });

  // Panel A: Hiç tarih girilmemiş — son kaydı olan aya göre sıralı, ilk 50
  const hicTarihYok = liste
    .filter(x => x.tarih === null)
    .sort((a, b) => AY_SIRA.indexOf(b.r.AY) - AY_SIRA.indexOf(a.r.AY))
    .slice(0, 50);

  // Panel B: 30+ gün hizmet verilemeyen, en eskiden yeniye
  const otuzGunFazla = liste
    .filter(x => x.tarih !== null && x.gun >= 30)
    .sort((a, b) => b.gun - a.gun);

  function satir(x, i, showGun) {
    const hRenk = HIZMET_RENK[x.r['HİZMET']] || '#64748b';
    const isimEsc = (x.r.ISIM_SOYISIM || '').replace(/'/g, "\'");
    const hizEsc  = (x.r['HİZMET'] || '').replace(/'/g, "\'");
    const tarihStr = x.tarih
      ? x.tarih.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })
      : '—';
    let gunBadge = '';
    if (showGun && x.gun !== null) {
      const renk = x.gun >= 90 ? '#dc2626' : x.gun >= 60 ? '#d97706' : '#ca8a04';
      const bg   = x.gun >= 90 ? '#fff5f5' : x.gun >= 60 ? '#fffbeb' : '#fefce8';
      gunBadge = '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9"><span style="background:' + bg + ';color:' + renk + ';font-weight:800;font-size:11px;padding:2px 8px;border-radius:7px;border:1px solid ' + renk + '30">' + x.gun + ' gün</span></td>';
    }
    return '<tr style="background:' + (i%2===0?'#fff':'#f8fafc') + ';cursor:pointer"'
      + ' onclick="showDetail('' + isimEsc + '','' + hizEsc + '','' + (x.r.AY||'') + '')">'
      + '<td style="padding:8px 10px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;font-size:12px">' + (x.r.ISIM_SOYISIM||'') + '</td>'
      + '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9"><span style="background:' + hRenk + '18;color:' + hRenk + ';font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px">' + (x.r['HİZMET']||'') + '</span></td>'
      + '<td style="padding:8px 10px;color:#64748b;font-size:11px;border-bottom:1px solid #f1f5f9">' + tarihStr + '</td>'
      + (showGun ? gunBadge : '')
      + '</tr>';
  }

  function thead(showGun) {
    return '<thead><tr style="background:#f8fafc">'
      + '<th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">İSİM</th>'
      + '<th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">HİZMET</th>'
      + '<th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">SON TARİH</th>'
      + (showGun ? '<th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">GEÇİLEN</th>' : '')
      + '</tr></thead>';
  }

  const bosMsg = msg => '<div style="text-align:center;color:#94a3b8;padding:28px 0;font-size:13px">' + msg + '</div>';

  if (elHic) {
    elHic.innerHTML = hicTarihYok.length
      ? '<table style="width:100%;border-collapse:collapse;font-size:13px">' + thead(false) + '<tbody>' + hicTarihYok.map((x,i)=>satir(x,i,false)).join('') + '</tbody></table>'
      : bosMsg('✅ Tüm kayıtlarda tarih mevcut');
    const sayEl = document.getElementById('tp-hic-sayi');
    if (sayEl) sayEl.textContent = hicTarihYok.length + ' kişi';
  }

  if (elUzun) {
    elUzun.innerHTML = otuzGunFazla.length
      ? '<table style="width:100%;border-collapse:collapse;font-size:13px">' + thead(true) + '<tbody>' + otuzGunFazla.map((x,i)=>satir(x,i,true)).join('') + '</tbody></table>'
      : bosMsg('✅ 30 günden uzun hizmet edilmeyen yok');
    const sayEl2 = document.getElementById('tp-uzun-sayi');
    if (sayEl2) sayEl2.textContent = otuzGunFazla.length + ' kişi';
  }
}
