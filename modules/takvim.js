function renderUzunSure() {
  const el = document.getElementById('ch-uzunsure');
  if (!el) return;

  const bugun = new Date();
  bugun.setHours(0,0,0,0);

  const AY_SIRA = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  const sonAy = [...new Set(allData.map(r => r.AY).filter(Boolean))]
    .sort((a, b) => AY_SIRA.indexOf(b) - AY_SIRA.indexOf(a))[0];

  const aktifKayitlar = allData.filter(r =>
    r.AY === sonAy && (r.DURUM || '').toUpperCase() === 'AKTİF'
  );

  const sonZiyaret = {};

  // Banyo ve Kuaför
  aktifKayitlar.forEach(r => {
    if (r['HİZMET'] === 'TEMİZLİK') return;
    const isimKey = r.ISIM_SOYISIM + '|' + r['HİZMET'];
    const tarihler = [r.BANYO1, r.BANYO2, r.BANYO3, r.BANYO4, r.BANYO5,
                      r.SAC1, r.SAC2, r.TIRNAK1, r.TIRNAK2, r.SAKAL1, r.SAKAL2].filter(Boolean);
    let enSon = null;
    tarihler.forEach(t => {
      const d = parseDate(t);
      if (d && (!enSon || d > enSon)) enSon = d;
    });
    sonZiyaret[isimKey] = { tarih: enSon, r };
  });

  // Temizlik: önce TP_DATA, bulamazsa allData'dan
  aktifKayitlar.filter(r => r['HİZMET'] === 'TEMİZLİK').forEach(r => {
    const isimKey = r.ISIM_SOYISIM + '|TEMİZLİK';
    let enSon = null;

    // 1) TP_DATA
    if (typeof TP_DATA !== 'undefined' && TP_DATA.length) {
      const tp = TP_DATA.find(t =>
        t.isim && r.ISIM_SOYISIM &&
        t.isim.trim().toUpperCase() === r.ISIM_SOYISIM.trim().toUpperCase()
      );
      if (tp && tp.sonGidilme) enSon = parseDate(tp.sonGidilme);
    }

    // 2) TP_DATA'da yoksa tüm aylardaki BANYO alanlarına bak
    if (!enSon) {
      allData.filter(x =>
        x['HİZMET'] === 'TEMİZLİK' &&
        x.ISIM_SOYISIM && x.ISIM_SOYISIM.trim().toUpperCase() === r.ISIM_SOYISIM.trim().toUpperCase()
      ).forEach(x => {
        [x.BANYO1, x.BANYO2, x.BANYO3, x.BANYO4, x.BANYO5].filter(Boolean).forEach(t => {
          const d = parseDate(t);
          if (d && (!enSon || d > enSon)) enSon = d;
        });
      });
    }

    sonZiyaret[isimKey] = { tarih: enSon, r };
  });

  const liste = Object.values(sonZiyaret).map(({ tarih, r }) => {
    const gun = tarih ? Math.floor((bugun - tarih) / (1000*60*60*24)) : 9999;
    const tarihStr = tarih ? tarih.toLocaleDateString('tr-TR') : '—';
    return { r, gun, tarihStr };
  }).filter(x => x.gun >= 30)
    .sort((a, b) => b.gun - a.gun);

  if (!liste.length) {
    el.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:24px 0;font-size:13px">✅ Tüm vatandaşlar son 30 gün içinde ziyaret edildi</div>';
    return;
  }

  const HIZMET_RENK = {'KADIN BANYO':'#ec4899','ERKEK BANYO':'#3b82f6','KUAFÖR':'#f59e0b','TEMİZLİK':'#22c55e'};

  const satirlar = liste.map((x, i) => {
    const renk = x.gun >= 9999 ? '#7c3aed' : x.gun >= 90 ? '#dc2626' : x.gun >= 60 ? '#d97706' : '#ca8a04';
    const bg   = x.gun >= 9999 ? '#f5f3ff' : x.gun >= 90 ? '#fff5f5' : x.gun >= 60 ? '#fffbeb' : '#fefce8';
    const gunLabel = x.gun >= 9999 ? 'Hiç gidilmedi' : x.gun + ' gün';
    const hRenk = HIZMET_RENK[x.r['HİZMET']] || '#64748b';
    const isimEsc = x.r.ISIM_SOYISIM.replace(/'/g, "\\'");
    const hizmetEsc = (x.r['HİZMET'] || '').replace(/'/g, "\\'");
    return '<tr style="background:' + (i%2===0?'#fff':'#f8fafc') + ';cursor:pointer"'
      + ' onclick="showDetail(\'' + isimEsc + '\',\'' + hizmetEsc + '\',\'' + (x.r.AY||'') + '\')">'
      + '<td style="padding:9px 12px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9">' + x.r.ISIM_SOYISIM + '</td>'
      + '<td style="padding:9px 12px;border-bottom:1px solid #f1f5f9">'
      + '<span style="background:' + hRenk + '18;color:' + hRenk + ';font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px">' + (x.r['HİZMET']||'') + '</span></td>'
      + '<td style="padding:9px 12px;color:#475569;border-bottom:1px solid #f1f5f9">📍 ' + (x.r.MAHALLE||'') + '</td>'
      + '<td style="padding:9px 12px;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9">' + x.tarihStr + '</td>'
      + '<td style="padding:9px 12px;text-align:center;border-bottom:1px solid #f1f5f9">'
      + '<span style="background:' + bg + ';color:' + renk + ';font-weight:800;font-size:12px;padding:3px 10px;border-radius:8px;border:1px solid ' + renk + '30">' + gunLabel + '</span></td>'
      + '</tr>';
  }).join('');

  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px">'
    + '<thead><tr style="background:#f8fafc">'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">İSİM</th>'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">HİZMET</th>'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">MAHALLE</th>'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">SON ZİYARET</th>'
    + '<th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">GEÇEN SÜRE</th>'
    + '</tr></thead><tbody>' + satirlar + '</tbody></table>';
}
