// ── TAKVİM + AKILLI PLANLAMA + KANBAN ──
// ═══════════════════════════════════════════════════════════
// ZİYARET TAKVİMİ
// ═══════════════════════════════════════════════════════════
let _takvimYil = new Date().getFullYear();
let _takvimAy  = new Date().getMonth(); // 0-11

const HIZMET_RENK_MAP = {
  'KADIN BANYO': '#ec4899',
  'ERKEK BANYO': '#3b82f6',
  'KUAFÖR':      '#f59e0b',
  'TEMİZLİK':   '#22c55e'
};
const TR_AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const TR_GUNLER = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

function takvimAyDegistir(delta) {
  _takvimAy += delta;
  if (_takvimAy > 11) { _takvimAy = 0; _takvimYil++; }
  if (_takvimAy < 0)  { _takvimAy = 11; _takvimYil--; }
  renderTakvim();
}

function renderTakvim() {
  const baslik = document.getElementById('takvim-baslik');
  const grid   = document.getElementById('takvim-grid');
  if (!baslik || !grid) return;

  baslik.textContent = TR_AYLAR[_takvimAy] + ' ' + _takvimYil;

  const bugun = new Date();
  bugun.setHours(0,0,0,0);

  // Ayın ilk günü ve gün sayısı
  const ilkGun = new Date(_takvimYil, _takvimAy, 1);
  const sonGun = new Date(_takvimYil, _takvimAy + 1, 0);
  // Pazartesi = 0 olacak şekilde başlangıç offset
  let startOffset = ilkGun.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  // Tüm ziyaret tarihlerini topla (BANYO1-5, SAC1-2, TIRNAK1-2, SAKAL1-2)
  const gunZiyaretler = {}; // 'YYYY-MM-DD' -> [{r, hizmet}]
  allData.forEach(r => {
    const tarihler = [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,
                      r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2].filter(Boolean);
    tarihler.forEach(t => {
      if (!t) return;
      const d = parseDate(t);
      if (!d) return;
      if (d.getFullYear() !== _takvimYil || d.getMonth() !== _takvimAy) return;
      // Her zaman YYYY-MM-DD key kullan
      const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if (!gunZiyaretler[key]) gunZiyaretler[key] = [];
      gunZiyaretler[key].push({ r, hizmet: r['HİZMET'] || '' });
    });
  });

  let html = '<table style="width:100%;border-collapse:collapse">';
  // Gün başlıkları
  html += '<thead><tr>' + TR_GUNLER.map(g =>
    `<th style="padding:10px 4px;text-align:center;font-size:11px;font-weight:800;color:#64748b;border-bottom:1px solid #e2e8f0;background:#f8fafc">${g}</th>`
  ).join('') + '</tr></thead><tbody>';

  let gunSayac = 1;
  const toplamGun = sonGun.getDate();
  let haftaSayisi = Math.ceil((startOffset + toplamGun) / 7);

  for (let hafta = 0; hafta < haftaSayisi; hafta++) {
    html += '<tr>';
    for (let gun = 0; gun < 7; gun++) {
      const hucreNo = hafta * 7 + gun;
      if (hucreNo < startOffset || gunSayac > toplamGun) {
        html += '<td style="padding:8px 4px;border:1px solid #f1f5f9;background:#fafafa;min-height:70px"></td>';
        if (hucreNo >= startOffset) gunSayac++;
        continue;
      }

      const tarihStr = `${_takvimYil}-${String(_takvimAy+1).padStart(2,'0')}-${String(gunSayac).padStart(2,'0')}`;
      const buGunDate = new Date(_takvimYil, _takvimAy, gunSayac);
      const gecmis = buGunDate < bugun;
      const bugunMu = buGunDate.getTime() === bugun.getTime();
      const ziyaretler = gunZiyaretler[tarihStr] || [];

      // Hizmet renklerine göre rozet sayıları
      const hizmetSayilari = {};
      ziyaretler.forEach(z => {
        hizmetSayilari[z.hizmet] = (hizmetSayilari[z.hizmet] || 0) + 1;
      });

      const bg = bugunMu ? '#eef2ff' : gecmis ? '#fafafa' : '#fff';
      const gunRenk = bugunMu ? '#1A237E' : gecmis ? '#94a3b8' : '#0f172a';
      const border = bugunMu ? '2px solid #1A237E' : '1px solid #f1f5f9';

      const rozetler = Object.entries(hizmetSayilari).map(([h, s]) => {
        const renk = HIZMET_RENK_MAP[h] || '#64748b';
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${renk};color:#fff;font-size:9px;font-weight:900;margin:1px">${s}</span>`;
      }).join('');

      const gerceklesti = gecmis && ziyaretler.length > 0;
      const checkmark = gerceklesti ? '<span style="position:absolute;top:3px;right:4px;font-size:9px;color:#16a34a">✓</span>' : '';

      html += `<td onclick="takvimGunTikla('${tarihStr}')"
        style="padding:6px 4px;border:${border};background:${bg};vertical-align:top;cursor:pointer;
               min-height:72px;position:relative;transition:background .1s"
        onmouseover="this.style.background='${bugunMu?'#e0e7ff':'#f0f4ff'}'"
        onmouseout="this.style.background='${bg}'">
        ${checkmark}
        <div style="font-size:12px;font-weight:${bugunMu?'900':'700'};color:${gunRenk};margin-bottom:4px;text-align:center">${gunSayac}</div>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1px">${rozetler}</div>
        ${ziyaretler.length > 0 ? `<div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:2px">${ziyaretler.length} kişi</div>` : ''}
      </td>`;
      gunSayac++;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  grid.innerHTML = html;
}



function takvimGunTikla(tarihStr) {
  const detayDiv = document.getElementById('takvim-detay');
  const baslikEl = document.getElementById('takvim-detay-baslik');
  const icerikEl = document.getElementById('takvim-detay-icerik');
  if (!detayDiv || !icerikEl) return;

  const d = new Date(tarihStr);
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const gecmis = d < bugun;
  const fmtTarih = d.toLocaleDateString('tr-TR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  // O güne ait ziyaretler
  const ziyaretler = allData.filter(r =>
    [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,
     r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2]
     .some(t=>{if(!t)return false;const d=parseDate(t);if(!d)return false;
       const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
       return iso===tarihStr;})
  );

  baslikEl.innerHTML = `📅 ${fmtTarih} — <span style="color:#64748b;font-weight:600;font-size:12px">${ziyaretler.length} ziyaret${gecmis?' (geçmiş)':''}</span>`;

  if (!ziyaretler.length) {
    icerikEl.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:24px;font-size:13px">Bu gün için kayıtlı ziyaret yok</div>`;
  } else {
    const gruplar = {};
    ziyaretler.forEach(r => {
      const h = r['HİZMET'] || 'DİĞER';
      if (!gruplar[h]) gruplar[h] = [];
      gruplar[h].push(r);
    });

    icerikEl.innerHTML = Object.entries(gruplar).map(([hizmet, kayitlar]) => {
      const renk = HIZMET_RENK_MAP[hizmet] || '#64748b';
      return `<div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:${renk};margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;background:${renk};border-radius:50%;display:inline-block"></span>
          ${HIZMET_ICONS[hizmet]||''} ${hizmet} (${kayitlar.length} kişi)
        </div>
        ${kayitlar.map(r => {
          // Günlük hizmet kaydında "VERİLEMEDİ" olarak kaydedilmiş mi kontrol et
          // Format: "GG.MM.YYYY BANYO VERİLEMEDİ: ..." veya "GG.MM.YYYY KUAFOR VERİLEMEDİ: ..."
          const [_y,_m,_g] = tarihStr.split('-');
          const _tarihTR = _g+'.'+_m+'.'+_y;
          const _not1 = r.NOT1 || ''; const _not2 = r.NOT2 || ''; const _not3 = r.NOT3 || '';
          const _tumNotlar = _not1 + ' ' + _not2 + ' ' + _not3;
          // GK kaydındaki format: "GG.MM.YYYY BANYO VERİLEMEDİ:" veya "KUAFOR VERİLEMEDİ:" veya "TEMİZLİK VERİLEMEDİ:"
          const _isHV = _tumNotlar.includes(_tarihTR + ' BANYO VERİLEMEDİ') ||
                        _tumNotlar.includes(_tarihTR + ' KUAFOR VERİLEMEDİ') ||
                        _tumNotlar.includes(_tarihTR + ' TEMİZLİK VERİLEMEDİ') ||
                        _tumNotlar.includes(_tarihTR + ' HİZMET VERİLEMEDİ');
          const _kartBg = _isHV ? '#fff7ed' : '#f8fafc';
          const _kartOp = _isHV ? '0.75' : '1';
          const _alan = typeof _gunlukAlanBul === 'function' ? _gunlukAlanBul(r, r['HİZMET']||'', tarihStr) : '';
          return `
          <div style="background:${_kartBg};border-radius:8px;margin-bottom:6px;opacity:${_kartOp}">
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer"
              onclick="showDetail('${r.ISIM_SOYISIM.replace(/'/g,"\'")}','${r['HİZMET']}','${r.AY}')">
              <div style="flex:1">
                <div style="font-weight:800;font-size:13px;color:#0f172a">
                  ${r.ISIM_SOYISIM}
                  ${_isHV ? '<span style="font-size:10px;font-weight:800;color:#b45309;background:#fed7aa;padding:1px 7px;border-radius:10px;margin-left:6px">⚠ Hizmet Verilemedi</span>' : ''}
                </div>
                <div style="font-size:11px;color:#64748b">📍 ${r.MAHALLE} ${gecmis && !_isHV ? '<span style="color:#16a34a;font-weight:700">✓ Gerçekleşti</span>' : ''}</div>
              </div>
              <span style="font-size:11px;color:#94a3b8">›</span>
            </div>
            <div style="display:flex;justify-content:flex-end;padding:0 12px 10px 12px">
              <button onclick="event.stopPropagation(); takvimKayitSil('${r._fbId||''}','${tarihStr}','${r['HİZMET']||''}','${r.ISIM_SOYISIM.replace(/'/g,"\'")}','${_alan}')"
                style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">🗑️ Sil</button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  // WhatsApp butonu
  const wpBtn = document.getElementById('takvim-wp-btn');
  if (wpBtn && ziyaretler.length) {
    wpBtn.style.display = 'block';
    wpBtn.onclick = () => takvimWpPaylasGun(tarihStr);
  } else if (wpBtn) {
    wpBtn.style.display = 'none';
  }

  detayDiv.style.display = 'block';
  detayDiv.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// ═══════════════════════════════════════════════════════════
// AKILLI PLANLAMA
// ═══════════════════════════════════════════════════════════
function renderPlan() {
  const ozet = document.getElementById('plan-ozet-grid');
  const liste = document.getElementById('plan-liste');
  if (!ozet || !liste) return;

  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const haftaSonu = new Date(bugun); haftaSonu.setDate(bugun.getDate() + 7);
  const ikiHaftaSonu = new Date(bugun); ikiHaftaSonu.setDate(bugun.getDate() + 14);

  const hizFiltre = document.getElementById('plan-hizmet-fil')?.value || '';
  const onFiltre = document.getElementById('plan-oncelik-fil')?.value || '';

  // Her aktif vatandaş için son ziyaret tarihini ve ortalama periyodu hesapla
  const vatandas = {};
  allData.forEach(r => {
    if (r.DURUM !== 'AKTİF') return;
    if (r['HİZMET'] === 'TEMİZLİK') return;
    const key = r.ISIM_SOYISIM + '|' + r['HİZMET'];
    const tarihler = [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,
                      r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2]
      .filter(Boolean)
      .map(t => parseDate(t))
      .filter(d => d !== null)
      .sort((a,b) => a-b);

    if (!tarihler.length) return;
    const sonZiyaret = tarihler[tarihler.length - 1];

    // Ortalama periyot hesapla (tarihler arası fark ortalaması)
    let periyot = 14; // varsayılan 2 hafta
    if (tarihler.length >= 2) {
      const farklari = [];
      for (let i = 1; i < tarihler.length; i++) {
        farklari.push((tarihler[i] - tarihler[i-1]) / (1000*60*60*24));
      }
      const ort = farklari.reduce((a,b) => a+b, 0) / farklari.length;
      periyot = Math.round(ort);
    } else if (tarihler.length === 1) {
      // Tek ziyaret varsa hizmet tipine göre tahmin
      const h = r['HİZMET'] || '';
      if (h === 'KADIN BANYO' || h === 'ERKEK BANYO') periyot = 7;
      else if (h === 'KUAFÖR') periyot = 21;
      else if (h === 'TEMİZLİK') periyot = 14;
    }

    // Bir sonraki tahmini ziyaret tarihi
    const sonrakiTarih = new Date(sonZiyaret);
    sonrakiTarih.setDate(sonrakiTarih.getDate() + periyot);

    if (!vatandas[key]) {
      vatandas[key] = { r, sonZiyaret, sonrakiTarih, periyot, tarihSayisi: tarihler.length };
    }
  });

  const tumPlanlar = Object.values(vatandas);
  const acil    = tumPlanlar.filter(p => p.sonrakiTarih <= bugun);
  const buHafta = tumPlanlar.filter(p => p.sonrakiTarih > bugun && p.sonrakiTarih <= haftaSonu);
  const gelecek = tumPlanlar.filter(p => p.sonrakiTarih > haftaSonu && p.sonrakiTarih <= ikiHaftaSonu);

  // Özet kartlar
  ozet.innerHTML = `
    <div style="background:linear-gradient(135deg,#fff5f5,#fee2e2);border:1.5px solid #fecaca;border-radius:14px;padding:18px;text-align:center">
      <div style="font-size:32px;font-weight:900;color:#dc2626">${acil.length}</div>
      <div style="font-size:12px;font-weight:700;color:#991b1b;margin-top:4px">🔴 Gecikmiş</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Ziyaret zamanı geçti</div>
    </div>
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:14px;padding:18px;text-align:center">
      <div style="font-size:32px;font-weight:900;color:#d97706">${buHafta.length}</div>
      <div style="font-size:12px;font-weight:700;color:#92400e;margin-top:4px">🟡 Bu Hafta</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">7 gün içinde</div>
    </div>
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #bbf7d0;border-radius:14px;padding:18px;text-align:center">
      <div style="font-size:32px;font-weight:900;color:#16a34a">${gelecek.length}</div>
      <div style="font-size:12px;font-weight:700;color:#14532d;margin-top:4px">🟢 Gelecek Hafta</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">8-14 gün içinde</div>
    </div>`;

  // Liste filtrele
  let gosteRilecek = [...acil, ...buHafta, ...gelecek];
  if (hizFiltre) gosteRilecek = gosteRilecek.filter(p => p.r['HİZMET'] === hizFiltre);
  if (onFiltre === 'acil') gosteRilecek = acil.filter(p => !hizFiltre || p.r['HİZMET'] === hizFiltre);
  else if (onFiltre === 'bu-hafta') gosteRilecek = buHafta.filter(p => !hizFiltre || p.r['HİZMET'] === hizFiltre);
  else if (onFiltre === 'gelecek') gosteRilecek = gelecek.filter(p => !hizFiltre || p.r['HİZMET'] === hizFiltre);

  gosteRilecek.sort((a,b) => a.sonrakiTarih - b.sonrakiTarih);

  if (!gosteRilecek.length) {
    liste.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:40px;font-size:13px">Bu kriterlere uygun öneri bulunamadı</div>`;
    return;
  }

  liste.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:800;border-bottom:1px solid #e2e8f0">VAT ANDAŞ</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:800;border-bottom:1px solid #e2e8f0">HİZMET</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:800;border-bottom:1px solid #e2e8f0">SON ZİYARET</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:800;border-bottom:1px solid #e2e8f0">PERİYOT</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:800;border-bottom:1px solid #e2e8f0">TAHMİNİ TARİH</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;color:#64748b;font-weight:800;border-bottom:1px solid #e2e8f0">DURUM</th>
        </tr>
      </thead>
      <tbody>
        ${gosteRilecek.map((p, i) => {
          const hRenk = HIZMET_RENK_MAP[p.r['HİZMET']] || '#64748b';
          const gecikme = Math.floor((bugun - p.sonrakiTarih) / (1000*60*60*24));
          const kalan   = Math.floor((p.sonrakiTarih - bugun) / (1000*60*60*24));
          const isAcil  = acil.includes(p);
          const isBuHafta = buHafta.includes(p);
          const rowBg = isAcil ? '#fff5f5' : isBuHafta ? '#fffbeb' : '#fff';
          const durumHtml = isAcil
            ? `<span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${gecikme} gün gecikti</span>`
            : isBuHafta
            ? `<span style="background:#fef3c7;color:#d97706;font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${kalan} gün kaldı</span>`
            : `<span style="background:#dcfce7;color:#16a34a;font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${kalan} gün kaldı</span>`;

          return `<tr style="background:${i%2===0?rowBg:'#fafafa'};cursor:pointer" onclick="showDetail('${p.r.ISIM_SOYISIM.replace(/'/g,"\'")}','${p.r['HİZMET']}','${p.r.AY}')">
            <td style="padding:10px 14px;font-weight:800;color:#0f172a;border-bottom:1px solid #f1f5f9">${p.r.ISIM_SOYISIM}<br><span style="font-size:10px;color:#94a3b8;font-weight:400">📍 ${p.r.MAHALLE}</span></td>
            <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9"><span style="background:${hRenk}18;color:${hRenk};font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px">${HIZMET_ICONS[p.r['HİZMET']]||''} ${p.r['HİZMET']}</span></td>
            <td style="padding:10px 14px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9">${p.sonZiyaret.toLocaleDateString('tr-TR')}</td>
            <td style="padding:10px 14px;font-size:12px;color:#7c3aed;font-weight:700;border-bottom:1px solid #f1f5f9">~${p.periyot} günde bir<br><span style="font-size:10px;color:#94a3b8;font-weight:400">${p.tarihSayisi} ziyaret verisi</span></td>
            <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9">${p.sonrakiTarih.toLocaleDateString('tr-TR')}</td>
            <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9">${durumHtml}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}


function renderUzunSure() {
  const el = document.getElementById('ch-uzunsure');
  const elHic  = document.getElementById('ch-hic-gidenler');
  const elUzun = document.getElementById('ch-uzun-gidenler');
  if (!el && !elHic && !elUzun) return;

  const bugun = new Date();
  bugun.setHours(0,0,0,0);

  // Ay siralaması
  const AY_SIRA = window.AY_SIRA;
  const mevcutAylar = [...new Set(allData.map(r => r.AY).filter(Boolean))]
    .sort((a, b) => AY_SIRA.indexOf(b) - AY_SIRA.indexOf(a));
  const sonAy = mevcutAylar[0];

  if (!sonAy) {
    if (el) el.innerHTML = '';
    return;
  }

  // En son ayin AKTİF kayitlari — aktif kisi listesini belirler
  const aktifKayitlar = allData.filter(r =>
    r.AY === sonAy && (r.DURUM || '').toUpperCase() === 'AKTİF'
  );

  const sonZiyaret = {};

  // Yardimci: kisinin bu hizmetteki en son ziyaret tarihini bul
  // En yeni aydan eskiye giderek tarih bulunan ilk kaydi dondurur
  function enSonTarihBul(isim, hizmet) {
    const alanlar = hizmet === 'KUAFÖR'
      ? ['SAC1','SAC2','TIRNAK1','TIRNAK2','TIRNAK3','SAKAL1','SAKAL2']
      : ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'];
    const kayitlar = allData
      .filter(x =>
        x['HİZMET'] === hizmet &&
        x.ISIM_SOYISIM && isim &&
        x.ISIM_SOYISIM.trim().toUpperCase() === isim.trim().toUpperCase() &&
        x.AY
      )
      .sort((a, b) => AY_SIRA.indexOf(b.AY) - AY_SIRA.indexOf(a.AY));
    for (const kayit of kayitlar) {
      let enSon = null;
      alanlar.filter(f => kayit[f]).forEach(f => {
        const d = parseDate(kayit[f]);
        if (d && (!enSon || d > enSon)) enSon = d;
      });
      if (enSon) return enSon;
    }
    return null;
  }

  // Banyo ve Kuafor
  aktifKayitlar.forEach(r => {
    if (r['HİZMET'] === 'TEMİZLİK') return;
    const isimKey = r.ISIM_SOYISIM + '|' + r['HİZMET'];
    if (sonZiyaret[isimKey]) return;
    const enSon = enSonTarihBul(r.ISIM_SOYISIM, r['HİZMET']);
    sonZiyaret[isimKey] = { tarih: enSon, r };
  });

  // Temizlik: TP_DATA once (sonGidilme en guvenilir), sonra allData fallback
  aktifKayitlar.filter(r => r['HİZMET'] === 'TEMİZLİK').forEach(r => {
    const isimKey = r.ISIM_SOYISIM + '|TEMİZLİK';
    if (sonZiyaret[isimKey]) return;
    let enSon = null;
    if (typeof TP_DATA !== 'undefined') {
      const tp = TP_DATA.find(t =>
        t.isim && r.ISIM_SOYISIM &&
        t.isim.trim().toUpperCase() === r.ISIM_SOYISIM.trim().toUpperCase()
      );
      if (tp && tp.sonGidilme) enSon = parseDate(tp.sonGidilme);
    }
    if (!enSon) enSon = enSonTarihBul(r.ISIM_SOYISIM, 'TEMİZLİK');
    sonZiyaret[isimKey] = { tarih: enSon, r };
  });


  const tumListe = Object.values(sonZiyaret).map(({ tarih, r }) => {
    const gun = tarih ? Math.floor((bugun - tarih) / (1000*60*60*24)) : 9999;
    const tarihStr = tarih ? tarih.toLocaleDateString('tr-TR') : '—';
    return { r, gun, tarihStr };
  }).filter(x => x.gun >= 30).sort((a, b) => b.gun - a.gun);

  const hicGidenler  = tumListe.filter(x => x.gun >= 9999);
  const uzunSuredir  = tumListe.filter(x => x.gun < 9999);

  if (!tumListe.length) {
    const msg = '<div style="text-align:center;color:#94a3b8;padding:24px 0;font-size:13px">✅ Tüm vatandaşlar son 30 gün içinde ziyaret edildi</div>';
    if (el) el.innerHTML = msg;
    if (elHic) elHic.innerHTML = msg;
    if (elUzun) elUzun.innerHTML = msg;
    return;
  }

  const HIZMET_RENK = {'KADIN BANYO':'#ec4899','ERKEK BANYO':'#3b82f6','KUAFÖR':'#f59e0b','TEMİZLİK':'#22c55e'};

  function satirOlustur(x, i) {
    const renk = x.gun>=9999?'#7c3aed':x.gun>=90?'#dc2626':x.gun>=60?'#d97706':'#ca8a04';
    const bg   = x.gun>=9999?'#f5f3ff':x.gun>=90?'#fff5f5':x.gun>=60?'#fffbeb':'#fefce8';
    const gunLabel = x.gun >= 9999 ? 'Hiç gidilmedi' : x.gun + ' gün';
    const hRenk = HIZMET_RENK[x.r['HİZMET']] || '#64748b';
    const isimEsc = (x.r.ISIM_SOYISIM || '').replace(/'/g, "\\'");
    const hizEsc  = (x.r['HİZMET'] || '').replace(/'/g, "\\'");
    // Son ziyaret için ay bilgisi de göster
    const tarihDetay = x.gun < 9999 ? x.tarihStr : '—';
    return '<tr style="background:' + (i%2===0?'#fff':'#f8fafc') + ';cursor:pointer"'
      + ' onclick="showDetail(\'' + isimEsc + '\',\'' + hizEsc + '\',\'' + (x.r.AY||'') + '\')">'
      + '<td style="padding:9px 12px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9">' + (x.r.ISIM_SOYISIM||'') + '</td>'
      + '<td style="padding:9px 12px;border-bottom:1px solid #f1f5f9"><span style="background:' + hRenk + '18;color:' + hRenk + ';font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px">' + (x.r['HİZMET']||'') + '</span></td>'
      + '<td style="padding:9px 12px;color:#475569;border-bottom:1px solid #f1f5f9">📍 ' + (x.r.MAHALLE||'') + '</td>'
      + '<td style="padding:9px 12px;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9">' + tarihDetay + '</td>'
      + '<td style="padding:9px 12px;text-align:center;border-bottom:1px solid #f1f5f9"><span style="background:' + bg + ';color:' + renk + ';font-weight:800;font-size:12px;padding:3px 10px;border-radius:8px;border:1px solid ' + renk + '30">' + gunLabel + '</span></td>'
      + '</tr>';
  }

  const thead = '<thead><tr style="background:#f8fafc">'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">İSİM</th>'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">HİZMET</th>'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">MAHALLE</th>'
    + '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">SON ZİYARET</th>'
    + '<th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">GEÇEN SÜRE</th>'
    + '</tr></thead>';

  // ─── İKİ PANEL: Hiç Gidilmeyenler + Uzun Süredir ───
  // Panel 1: Hiç Gidilmeyenler
  if (elHic) {
    if (!hicGidenler.length) {
      elHic.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">Tümü ziyaret edildi ✅</div>';
    } else {
      elHic.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px">' + thead + '<tbody>'
        + hicGidenler.map((x,i) => satirOlustur(x,i)).join('')
        + '</tbody></table>';
    }
    const sayEl = document.getElementById('ch-hic-sayi');
    if (sayEl) sayEl.textContent = hicGidenler.length + ' kişi';
  }

  // Panel 2: 30+ Gün Ziyaret Edilmeyenler
  if (elUzun) {
    if (!uzunSuredir.length) {
      elUzun.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">30 günden uzun süre yok ✅</div>';
    } else {
      elUzun.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px">' + thead + '<tbody>'
        + uzunSuredir.map((x,i) => satirOlustur(x,i)).join('')
        + '</tbody></table>';
    }
    const sayEl2 = document.getElementById('ch-uzun-sayi');
    if (sayEl2) sayEl2.textContent = uzunSuredir.length + ' kişi';
  }

  // Geriye uyumluluk: eski tek element varsa oraya da yaz
  let html = '';
  if (hicGidenler.length) {
    html += '<div style="margin-bottom:6px;padding:8px 12px;background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:0 8px 8px 0;font-size:13px;font-weight:800;color:#6d28d9">'
      + '⚠️ Hiç Gidilmeyenler (' + hicGidenler.length + ' kişi)</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">' + thead + '<tbody>'
      + hicGidenler.map((x,i) => satirOlustur(x,i)).join('')
      + '</tbody></table>';
  }
  if (uzunSuredir.length) {
    html += '<div style="margin-bottom:6px;padding:8px 12px;background:#fff5f5;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;font-size:13px;font-weight:800;color:#dc2626">'
      + '⏱ 30+ Gün Ziyaret Edilmeyenler (' + uzunSuredir.length + ' kişi)</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px">' + thead + '<tbody>'
      + uzunSuredir.map((x,i) => satirOlustur(x,i)).join('')
      + '</tbody></table>';
  }
  el.innerHTML = html;
}

// ── EKİP MESAJLAŞMA ──
let _chatMesajlar = [];
let _chatReplyId = null;
let _chatReplyMetin = null;
let _chatUnsubscribe = null;

// Kullanıcı renk paleti (uid'ye göre sabit renk)
const CHAT_RENKLER = ['#1A237E','#C2185B','#2E7D32','#E65100','#7c3aed','#0891b2','#b45309'];
function chatRenk(yazan) {
  let hash = 0;
  for (let i = 0; i < (yazan||'').length; i++) hash = yazan.charCodeAt(i) + ((hash << 5) - hash);
  return CHAT_RENKLER[Math.abs(hash) % CHAT_RENKLER.length];
}

// 1 ay öncesinin timestamp'i
function birAyOnce() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
}

function kanbanYukle() { chatYukle(); } // geriye dönük uyumluluk
function renderKanban() { chatRender(); }

async function chatYukle() {
  const el = document.getElementById('chat-mesajlar');
  if (!el) return;

  // Realtime listener — 1 aylık pencere
  if (_chatUnsubscribe) _chatUnsubscribe();

  _chatUnsubscribe = firebase.firestore()
    .collection('ekip_notlari')
    .where('olusturma', '>=', firebase.firestore.Timestamp.fromDate(birAyOnce()))
    .orderBy('olusturma', 'asc')
    .onSnapshot(snap => {
      _chatMesajlar = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      chatRender();
    }, err => {
      // index henüz oluşmamışsa fallback: get() ile çek
      firebase.firestore().collection('ekip_notlari').limit(200).get().then(snap2 => {
        const sinir = birAyOnce();
        _chatMesajlar = snap2.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => {
            const t = m.olusturma?.toDate ? m.olusturma.toDate() : new Date(m.olusturma || 0);
            return t >= sinir;
          })
          .sort((a,b) => {
            const ta = a.olusturma?.toDate ? a.olusturma.toDate() : new Date(a.olusturma||0);
            const tb = b.olusturma?.toDate ? b.olusturma.toDate() : new Date(b.olusturma||0);
            return ta - tb;
          });
        chatRender();
      });
    });
}

function chatRender() {
  const el = document.getElementById('chat-mesajlar');
  const cnt = document.getElementById('chat-mesaj-count');
  if (!el) return;

  if (cnt) cnt.textContent = `Son 1 ay · ${_chatMesajlar.length} mesaj`;

  if (!_chatMesajlar.length) {
    el.innerHTML = `<div style="text-align:center;color:#94a3b8;font-size:13px;padding:60px 0">
      Henüz mesaj yok. İlk mesajı sen gönder! 👋</div>`;
    return;
  }

  const benUid = currentUser?.uid;
  const fmtZaman = ts => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const bugun = new Date();
    const dun = new Date(); dun.setDate(dun.getDate()-1);
    const gunStr = d.toDateString() === bugun.toDateString() ? 'Bugün'
                 : d.toDateString() === dun.toDateString()   ? 'Dün'
                 : d.toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit'});
    return gunStr + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
  };

  // Tarih ayraçları için
  const fmtGun = ts => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const bugun = new Date();
    const dun = new Date(); dun.setDate(dun.getDate()-1);
    if (d.toDateString() === bugun.toDateString()) return 'Bugün';
    if (d.toDateString() === dun.toDateString())   return 'Dün';
    return d.toLocaleDateString('tr-TR', {weekday:'long', day:'numeric', month:'long'});
  };

  const oncelikIkon = { normal:'', acil:'🔴 ', bilgi:'📌 ' };

  let html = '';
  let sonGun = '';

  _chatMesajlar.forEach(m => {
    const ts = m.olusturma;
    const gunLabel = fmtGun(ts);
    if (gunLabel !== sonGun) {
      html += `<div style="text-align:center;margin:12px 0 8px">
        <span style="background:#f1f5f9;color:#94a3b8;font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px">${gunLabel}</span>
      </div>`;
      sonGun = gunLabel;
    }

    const benim = m.uid === benUid;
    const renk  = chatRenk(m.yazan);
    const isacil = m.oncelik === 'acil';
    const isbilgi = m.oncelik === 'bilgi';

    // Yanıtlanan mesajı bul
    let replyHTML = '';
    if (m.replyId) {
      const ref = _chatMesajlar.find(x => x.id === m.replyId);
      const replyMetin = ref ? ref.metin : (m.replyMetin || '…');
      const replyYazan = ref ? ref.yazan : '';
      replyHTML = `<div style="background:rgba(0,0,0,0.06);border-left:3px solid ${renk};border-radius:6px;
                               padding:4px 8px;margin-bottom:6px;font-size:11px;color:#475569;cursor:pointer"
                       onclick="chatScrollTo('${m.replyId}')">
        <span style="font-weight:800;color:${renk}">${replyYazan || ''}</span>
        <span style="margin-left:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical">${replyMetin}</span>
      </div>`;
    }

    const baloncukBg = benim
      ? (isacil ? '#fee2e2' : isbilgi ? '#eff6ff' : '#EEF2FF')
      : (isacil ? '#fff5f5' : isbilgi ? '#f0f9ff' : '#f8fafc');
    const baloncukBorder = benim
      ? (isacil ? '#fca5a5' : isbilgi ? '#bfdbfe' : '#c7d2fe')
      : (isacil ? '#fecaca' : isbilgi ? '#bae6fd' : '#e2e8f0');

    const idSafe = m.id.replace(/[^a-zA-Z0-9_-]/g,'');

    html += `<div id="cmsg-${idSafe}" style="display:flex;flex-direction:column;align-items:${benim?'flex-end':'flex-start'};margin-bottom:6px">
      ${!benim ? `<div style="font-size:11px;font-weight:800;color:${renk};margin-bottom:3px;padding-left:4px">${m.yazan||'?'}</div>` : ''}
      <div style="max-width:78%;background:${baloncukBg};border:1.5px solid ${baloncukBorder};
                  border-radius:${benim?'14px 4px 14px 14px':'4px 14px 14px 14px'};
                  padding:8px 12px;position:relative">
        ${replyHTML}
        <div style="font-size:13px;color:#0f172a;line-height:1.5;white-space:pre-wrap;word-break:break-word">
          ${oncelikIkon[m.oncelik]||''}${m.metin||''}
        </div>
        <div style="display:flex;align-items:center;justify-content:${benim?'flex-end':'space-between'};gap:8px;margin-top:5px">
          <span style="font-size:10px;color:#94a3b8">${fmtZaman(ts)}</span>
          <div style="display:flex;gap:4px">
            <button onclick="chatReplyBaslat('${m.id}','${(m.yazan||'').replace(/'/g,"\\'")}')"
              style="background:none;border:none;color:#94a3b8;font-size:11px;cursor:pointer;padding:1px 5px;border-radius:5px"
              title="Yanıtla">↩</button>
            ${benim || currentUser?.uid === 'SBIyovehB5RAkSkhc05bIm88PJs2' ? `<button onclick="chatSil('${m.id}')"
              style="background:none;border:none;color:#fca5a5;font-size:11px;cursor:pointer;padding:1px 5px;border-radius:5px"
              title="Sil">🗑</button>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  });

  const scrollBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
  el.innerHTML = html;
  if (scrollBottom) el.scrollTop = el.scrollHeight;
}

function chatScrollTo(msgId) {
  const idSafe = msgId.replace(/[^a-zA-Z0-9_-]/g,'');
  const el = document.getElementById('cmsg-' + idSafe);
  if (el) {
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.style.transition = 'background .3s';
    el.style.background = '#fef9c3';
    setTimeout(() => { el.style.background = ''; }, 1200);
  }
}

function chatReplyBaslat(id, yazan) {
  _chatReplyId = id;
  const m = _chatMesajlar.find(x => x.id === id);
  _chatReplyMetin = m ? m.metin : '…';
  const bar = document.getElementById('chat-reply-bar');
  const txt = document.getElementById('chat-reply-text');
  if (bar) { bar.style.display = 'flex'; }
  if (txt) txt.textContent = (yazan ? yazan + ': ' : '') + (_chatReplyMetin||'').slice(0,80);
  document.getElementById('chat-input')?.focus();
}
window.chatReplyBaslat = chatReplyBaslat;
window.chatScrollTo = chatScrollTo;

function chatReplyIptal() {
  _chatReplyId = null; _chatReplyMetin = null;
  const bar = document.getElementById('chat-reply-bar');
  if (bar) bar.style.display = 'none';
}
window.chatReplyIptal = chatReplyIptal;

function chatInputAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
window.chatInputAutoResize = chatInputAutoResize;

async function chatGonder() {
  const inp = document.getElementById('chat-input');
  const oncelikEl = document.getElementById('chat-oncelik');
  if (!inp) return;
  const metin = inp.value.trim();
  if (!metin) return;
  const oncelik = oncelikEl?.value || 'normal';
  const yazan = currentUser?.ad || 'Bilinmiyor';
  const uid   = currentUser?.uid || '';

  const veri = {
    metin, oncelik, yazan, uid,
    olusturma: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (_chatReplyId) {
    veri.replyId = _chatReplyId;
    veri.replyMetin = (_chatReplyMetin||'').slice(0,120);
  }

  try {
    await firebase.firestore().collection('ekip_notlari').add(veri);
    inp.value = '';
    inp.style.height = 'auto';
    chatReplyIptal();
    // Scroll to bottom
    const el = document.getElementById('chat-mesajlar');
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 200);
  } catch(e) { showToast('❌ Gönderilemedi: ' + e.message); }
}
window.chatGonder = chatGonder;

async function chatSil(id) {
  if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
  try {
    await firebase.firestore().collection('ekip_notlari').doc(id).delete();
    showToast('🗑️ Mesaj silindi');
  } catch(e) { showToast('❌ Hata: ' + e.message); }
}
window.chatSil = chatSil;


// ── MOBİL MENÜ ──
function mobMenuAc() {
  document.querySelector('.sidebar')?.classList.add('mob-open');
  document.getElementById('mob-overlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function mobMenuKapat() {
  document.querySelector('.sidebar')?.classList.remove('mob-open');
  document.getElementById('mob-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}
function mobSetActive(id) {
  document.querySelectorAll('.mbn-item').forEach(el => el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  mobMenuKapat();
}

// Navto'ya mobil menü kapatmayı entegre et — mevcut navTo'yu wrap et
const _origNavTo = typeof navTo === 'function' ? navTo : null;

// ── GLOBAL ARAMA ──
let _gsIdx = -1;

function globalSearchRun(q) {
  const box = document.getElementById('global-search-results');
  if (!box) return;
  q = (q || '').trim();
  if (q.length < 2) { box.style.display = 'none'; _gsIdx = -1; return; }

  const ql = q.toLocaleLowerCase('tr');

  // Tekil vatandaşları bul (isim+hizmet unique)
  const seen = new Set();
  const results = [];
  allData.forEach(r => {
    const key = r.ISIM_SOYISIM + '|' + r['HİZMET'];
    if (seen.has(key)) return;
    const isim = (r.ISIM_SOYISIM || '').toLocaleLowerCase('tr');
    const tc   = (r.TC || '').toString();
    const mah  = (r.MAHALLE || '').toLocaleLowerCase('tr');
    const tel  = (r.TELEFON || '').toString();
    if (isim.includes(ql) || tc.includes(q) || mah.includes(ql) || tel.includes(q)) {
      seen.add(key);
      results.push(r);
    }
  });

  if (!results.length) {
    box.style.display = 'block';
    box.innerHTML = `<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">Sonuç bulunamadı</div>`;
    _gsIdx = -1;
    return;
  }

  // Highlight helper
  const hl = (text, q) => {
    if (!text) return '';
    const idx = text.toLocaleLowerCase('tr').indexOf(q.toLocaleLowerCase('tr'));
    if (idx === -1) return text;
    return text.slice(0,idx) + `<mark style="background:#fef9c3;border-radius:2px;padding:0 1px">${text.slice(idx, idx+q.length)}</mark>` + text.slice(idx+q.length);
  };

  const HIZMET_RENK = {'KADIN BANYO':'#ec4899','ERKEK BANYO':'#3b82f6','KUAFÖR':'#f59e0b','TEMİZLİK':'#22c55e'};
  const DUR_RENK = {'AKTİF':'#16a34a','İPTAL':'#dc2626','VEFAT':'#64748b','BEKLEME':'#d97706','PASİF':'#94a3b8'};

  box.innerHTML = results.slice(0, 12).map((r, i) => {
    const hizmet = r['HİZMET'] || '';
    const hRenk  = HIZMET_RENK[hizmet] || '#64748b';
    const dRenk  = DUR_RENK[r.DURUM]   || '#64748b';
    return `<div class="gs-item" data-idx="${i}"
      onmouseenter="gsHighlight(${i})"
      onclick="gsSelect(${i})"
      style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s">
      <div style="width:36px;height:36px;border-radius:10px;background:${hRenk}20;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
        ${HIZMET_ICONS[hizmet] || '👤'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:13px;color:#0f172a">${hl(r.ISIM_SOYISIM, q)}</div>
        <div style="font-size:11px;color:#64748b;margin-top:1px;display:flex;gap:8px;flex-wrap:wrap">
          <span style="color:${hRenk};font-weight:700">${hizmet}</span>
          <span>📍 ${hl(r.MAHALLE, q)}</span>
          ${r.AY ? `<span style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-weight:700">${r.AY}</span>` : ''}
          ${r.TELEFON ? `<span>📞 ${hl(r.TELEFON, q)}</span>` : ''}
          ${r.TC ? `<span style="font-family:monospace;font-size:10px">TC: ${hl(r.TC.toString(), q)}</span>` : ''}
        </div>
      </div>
      <div style="font-size:10px;font-weight:700;color:${dRenk};background:${dRenk}18;padding:2px 7px;border-radius:6px;flex-shrink:0">${r.DURUM}</div>
    </div>`;
  }).join('') +
  (results.length > 12 ? `<div style="padding:10px;text-align:center;font-size:11px;color:#94a3b8">+${results.length-12} daha fazla sonuç — aramayı daraltın</div>` : '');

  // Tıklama için sonuçları sakla
  box._results = results;
  box.style.display = 'block';
  _gsIdx = -1;
}

function gsHighlight(i) {
  _gsIdx = i;
  document.querySelectorAll('.gs-item').forEach((el, j) => {
    el.style.background = j === i ? '#f0f4ff' : '';
  });
}

function globalSearchKey(e) {
  const box = document.getElementById('global-search-results');
  if (!box || box.style.display === 'none') return;
  const items = box.querySelectorAll('.gs-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _gsIdx = Math.min(_gsIdx + 1, items.length - 1);
    items.forEach((el, j) => el.style.background = j === _gsIdx ? '#f0f4ff' : '');
    items[_gsIdx]?.scrollIntoView({block:'nearest'});
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _gsIdx = Math.max(_gsIdx - 1, 0);
    items.forEach((el, j) => el.style.background = j === _gsIdx ? '#f0f4ff' : '');
    items[_gsIdx]?.scrollIntoView({block:'nearest'});
  } else if (e.key === 'Enter' && _gsIdx >= 0) {
    gsSelect(_gsIdx);
  } else if (e.key === 'Escape') {
    globalSearchHide();
    document.getElementById('global-search-input').blur();
  }
}

function gsSelect(i) {
  const box = document.getElementById('global-search-results');
  const r = box._results && box._results[i];
  if (!r) return;
  // Arama kutusunu temizle ve kapat
  const inp = document.getElementById('global-search-input');
  if (inp) inp.value = '';
  globalSearchHide();
  // Detay modalını aç
  showDetail(r.ISIM_SOYISIM, r['HİZMET']);
}

function globalSearchHide() {
  const box = document.getElementById('global-search-results');
  if (box) box.style.display = 'none';
  _gsIdx = -1;
}



async function takvimKayitSil(fbId, tarihStr, hizmet, isim, alan) {
  const rec = allData.find(x => x._fbId===fbId) || allData.find(x => x.ISIM_SOYISIM===isim && x['HİZMET']===hizmet);
  if (!rec) { showToast('Kayıt bulunamadı'); return; }
  if (!confirm(`${isim} - ${tarihStr} tarihli kaydı silmek istiyor musunuz?\nSadece bu tarihe ait kayıt ve açıklama temizlenecek.`)) return;

  const silFn =
    (typeof window !== 'undefined' && typeof window._gunlukKaydiSil === 'function' && window._gunlukKaydiSil) ||
    (typeof globalThis !== 'undefined' && typeof globalThis._gunlukKaydiSil === 'function' && globalThis._gunlukKaydiSil) ||
    (typeof _gunlukKaydiSil === 'function' ? _gunlukKaydiSil : null);

  if (!silFn) { showToast('Silme modülü yüklenemedi'); return; }

  const ok = await silFn(rec, tarihStr, alan, { removeSingleUndatedNote:true });
  if (ok) takvimGunTikla(tarihStr);
}
window.takvimKayitSil = takvimKayitSil;
