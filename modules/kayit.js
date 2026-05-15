// ── KAYIT (Günlük + Yeni Vatandaş + Durum) ──

// Eşzamanlı kayıt koruması
let _gkIslemDevam = false;

// Tarih formatı: YYYY-MM-DD → DD.MM.YYYY (allData ile uyumlu)
function _isoToDDMMYYYY(d) {
  if (!d) return d;
  if (d.includes('.')) return d; // zaten DD.MM.YYYY
  const [y, m, g] = d.split('-');
  return `${g}.${m}.${y}`;
}

// ============ GÜNLÜK ============
function _gunlukDateTR(iso) {
  if (!iso || !iso.includes('-')) return '';
  const [y,m,d]=iso.split('-');
  return `${d}.${m}.${y}`;
}
function _gunlukDateMatch(val, iso, tr) {
  if (!val) return false;
  const s=String(val).trim();
  return s===iso || s===tr || s.startsWith(iso) || s.startsWith(tr);
}
function _gunlukAlanBul(rec, hizmet, iso) {
  if (!rec) return '';
  const tr=_gunlukDateTR(iso);
  const alanlar=hizmet==='KUAFÖR'
    ? ['SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
    : ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'];
  return alanlar.find(f=>_gunlukDateMatch(rec[f], iso, tr)) || '';
}
function _gunlukNotTemizle(metin, iso) {
  if (!metin) return '';
  const tr=_gunlukDateTR(iso);
  return String(metin)
    .split(' | ')
    .map(x=>x.trim())
    .filter(Boolean)
    .filter(parca=>!(parca===tr || parca.startsWith(tr+' ') || parca.includes(tr+' YAPTIRILAMADI') || parca.includes(tr+' VERİLEMEDİ')))
    .join(' | ');
}
async function _gunlukKaydiSil(rec, iso, alan, opts={}) {
  if (!rec || !iso) return false;
  const hizmet=rec['HİZMET']||'';
  const hedefAlan=alan || _gunlukAlanBul(rec, hizmet, iso);
  if (!hedefAlan) {
    if (!opts.silent) showToast('Silinecek kayıt alanı bulunamadı');
    return false;
  }
  rec[hedefAlan]='';
  rec.NOT1=_gunlukNotTemizle(rec.NOT1, iso);
  rec.NOT2=_gunlukNotTemizle(rec.NOT2, iso);
  rec.NOT3=_gunlukNotTemizle(rec.NOT3, iso);

  try {
    if (rec._tpRef && rec._tpFbId) {
      const tp=TP_DATA.find(t=>t._fbId===rec._tpFbId);
      if (tp && _gunlukDateMatch(tp.sonGidilme, iso, _gunlukDateTR(iso))) tp.sonGidilme='';
      await firebase.firestore().collection('temizlik_plan').doc(rec._tpFbId).update({ sonGidilme: '' });
      tpRender();
    }
    if (rec._fbId) {
      // Sadece değişen alanları gönder — tam payload ile yarış koşulundan kaçın
      const degisen = { [hedefAlan]: '', NOT1: rec.NOT1, NOT2: rec.NOT2, NOT3: rec.NOT3 };
      await firebase.firestore().collection('vatandaslar').doc(rec._fbId).update(degisen);
      // Silme işlemini logla
      if (typeof currentUser !== 'undefined' && currentUser) {
        firebase.firestore().collection('islem_log').add({
          yapan: currentUser.ad,
          uid: currentUser.uid,
          zaman: firebase.firestore.FieldValue.serverTimestamp(),
          isim: rec.ISIM_SOYISIM || '',
          hizmet: rec['HİZMET'] || '',
          degisiklik: 'ZİYARET SİLİNDİ',
          detay: 'Alan: ' + (hedefAlan || '') + ' | Tarih: ' + iso
        }).catch(() => {});
      }
    }
    refreshAll();
    if (!opts.silent) showToast('Silindi');
    return true;
  } catch (e) {
    console.warn('Günlük kayıt silme hatası:', e);
    if (!opts.silent) showToast('Silinemedi: ' + (e.message || e));
    return false;
  }
}
function renderGunluk() {
  const date = document.getElementById('gun-date').value;
  const hizFil = document.getElementById('gun-hizmet').value;
  if(!date) return;

  // date input YYYY-MM-DD, veri DD.MM.YYYY - her ikisini de destekle
  const dateISO = date; // YYYY-MM-DD
  const dateTR = date ? (d=>{const[y,m,g]=d.split('-');return `${g}.${m}.${y}`;})(date) : '';
  let visits = allData.filter(r=>[r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2]
    .some(t=>t&&(t===dateISO||t===dateTR||t.startsWith(dateTR)||t.startsWith(dateISO))));
  if(hizFil) visits = visits.filter(r=>r['HİZMET']===hizFil);

  document.getElementById('gun-total').textContent = `${visits.length} ziyaret`;

  const byH = {};
  HIZMET_KEYS.forEach(h=>{ const c=visits.filter(r=>r['HİZMET']===h).length; if(c) byH[h]=c; });
  document.getElementById('gun-chips').innerHTML = Object.entries(byH).map(([h,c])=>
    `<span class="hizmet-count hc-${HIZMET_COLORS[h]}">${HIZMET_ICONS[h]} ${h}: ${c}</span>`
  ).join('');

  const _dI=dateISO,_dT=dateTR;
  document.getElementById('gun-table').innerHTML = `
    <thead><tr><th>#</th><th>Hizmet</th><th>İsim Soyisim</th><th>Mahalle</th><th>Durum</th><th>Notlar</th><th style="text-align:center">İşlem</th></tr></thead>
    <tbody>${visits.map((r,i)=>{
      const aI=allData.indexOf(r),hz=r['HİZMET'];
      const al=_gunlukAlanBul(r,hz,_dI);
      const dateStr2=(d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(_dI);
      const notJoin=[r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join('|'); const isYaptirilamadi = notJoin.includes(dateStr2+' YAPTIRILAMADI')||notJoin.includes(dateStr2+' TEMİZLİK VERİLEMEDİ')||notJoin.includes(dateStr2+' BANYO VERİLEMEDİ')||notJoin.includes(dateStr2+' KUAFOR VERİLEMEDİ');
      return `<tr style="${isYaptirilamadi?'background:#fff7ed':''}">
        <td style="font-weight:900;color:var(--primary)">${i+1}</td>
        <td><span class="hizmet-dot dot-${HIZMET_COLORS[hz]}"></span>${hz}</td>
        <td class="name-cell">${r.ISIM_SOYISIM}</td>
        <td class="mahalle-cell">${r.MAHALLE}</td>
        <td>${durBadge(r.DURUM)}</td>
        <td style="font-size:11px;color:var(--text-soft)">${(()=>{
          const notlar=[r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join(' | ')||'—';
          const dateStr=(d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(_dI);
          if (notlar.includes(dateStr+' YAPTIRILAMADI')||notlar.includes('VERİLEMEDİ')) return '<span style="color:#b45309;font-weight:700">⚠️ '+notlar+'</span>';
          return notlar;
        })()}</td>
        <td style="text-align:center;white-space:nowrap">
          <button onclick="gunlukDuzenle(${aI},'${al}','${_dI}')" style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;margin-right:3px">✏️</button>
          <button onclick="gunlukSil(${aI},'${al}','${_dI}')" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">🗑️</button>
        </td>
      </tr>`;
    }).join('')}
    ${visits.length===0?'<tr><td colspan="7" class="no-data">Bu tarihte kayit bulunamadi</td></tr>':''}
    </tbody>`;
}
async function gunlukSil(aI,al,dI) {
  const r=allData[aI]; if(!r) return;
  if (!confirm(r.ISIM_SOYISIM+' - '+dI+' tarihli kaydı silmek istiyor musunuz?\nSadece bu tarihe ait kayıt ve açıklama temizlenecek.')) return;
  await _gunlukKaydiSil(r, dI, al);
}
window.gunlukSil = gunlukSil;
window._gunlukKaydiSil = _gunlukKaydiSil;
function gunlukDuzenle(aI,al,dI) {
  const r=allData[aI]; if(!r) return;
  const modal = document.getElementById('gun-duzenle-modal');
  if (!modal) return;
  window._gunDuzenle = { aI, al, dI };
  document.getElementById('gd-baslik').textContent = r.ISIM_SOYISIM + ' — ' + r['HİZMET'];
  document.getElementById('gd-tarih').value = dI;
  document.getElementById('gd-not1').value = r.NOT1||'';
  document.getElementById('gd-not2').value = r.NOT2||'';
  // Yaptırılamadı kutusunu kontrol et — bu tarihe ait not var mı?
  const tarihTR = (d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(dI);
  const mevcutNot = r.NOT1||'';
  const yaptirilamadiMatch = mevcutNot.includes(tarihTR + ' YAPTIRILAMADI:');
  const cb = document.getElementById('gd-yaptirilamadi');
  const nedenWrap = document.getElementById('gd-yaptirilamadi-neden-wrap');
  const nedenInput = document.getElementById('gd-yaptirilamadi-neden');
  cb.checked = yaptirilamadiMatch;
  nedenWrap.style.display = yaptirilamadiMatch ? 'block' : 'none';
  if (yaptirilamadiMatch) {
    const idx = mevcutNot.indexOf(tarihTR + ' YAPTIRILAMADI: ');
    const after = mevcutNot.slice(idx + (tarihTR + ' YAPTIRILAMADI: ').length);
    nedenInput.value = after.split(' | ')[0];
  } else {
    nedenInput.value = '';
  }
  modal.style.display = 'flex';
}

function gunlukDuzenleKapat() {
  const modal = document.getElementById('gun-duzenle-modal');
  if (modal) modal.style.display = 'none';
  window._gunDuzenle = null;
}

async function gunlukDuzenleKaydet() {
  if (!window._gunDuzenle) return;
  if (window._gunDuzenleDevam) { showToast('⏳ Kaydediliyor...'); return; }
  window._gunDuzenleDevam = true;
  const { aI, al, dI } = window._gunDuzenle;
  const r = allData[aI]; if (!r) { window._gunDuzenleDevam = false; return; }

  const yeniTarih = document.getElementById('gd-tarih').value;
  const yeniNot1  = document.getElementById('gd-not1').value.trim();
  const yeniNot2  = document.getElementById('gd-not2').value.trim();
  const yaptirilamadi = document.getElementById('gd-yaptirilamadi').checked;
  const neden = document.getElementById('gd-yaptirilamadi-neden').value.trim();

  if (!yeniTarih) { showToast('Tarih zorunlu'); return; }
  if (yaptirilamadi && !neden) { showToast('Yaptirilamama nedeni zorunlu'); return; }

  // Tarih alanını güncelle
  if (al && r[al] !== undefined) r[al] = yeniTarih;

  // NOT1 güncelle — önce eski tarihe ait YAPTIRILAMADI notunu temizle
  const tarihTR = (d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(dI);
  let not1 = yeniNot1;
  // Eski yaptırılamadı notunu temizle
  not1 = not1.split(' | ').filter(p=>!p.startsWith(tarihTR + ' YAPTIRILAMADI')).join(' | ');
  // Yeni yaptırılamadı notu ekle
  if (yaptirilamadi) {
    const yeniTarihTR = (d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(yeniTarih);
    const yaptNote = yeniTarihTR + ' YAPTIRILAMADI: ' + neden.toUpperCase();
    not1 = not1 ? not1 + ' | ' + yaptNote : yaptNote;
  }
  r.NOT1 = not1;
  r.NOT2 = yeniNot2;

  // Sadece değişen alanları Firestore'a yaz — yarış koşulundan kaçın
  try {
    if (r._fbId) {
      const degisen = { NOT1: r.NOT1, NOT2: r.NOT2 };
      if (al && r[al] !== undefined) degisen[al] = r[al];
      await firebase.firestore().collection('vatandaslar').doc(r._fbId).update(degisen);
    }
    // Temizlik planını da güncelle
    if (r._tpRef && r._tpFbId) {
      const tp = TP_DATA.find(t=>t._fbId===r._tpFbId);
      if (tp) { tp.sonGidilme = yeniTarih; tp.not_ = not1; }
      await firebase.firestore().collection('temizlik_plan').doc(r._tpFbId)
        .update({ sonGidilme: yeniTarih, not_: not1 });
      tpRender();
    }
    gunlukDuzenleKapat();
    refreshAll();
    showToast('✅ Kayıt güncellendi');
  } catch(e) {
    console.error('Düzenleme kayıt hatası:', e);
    showToast('⚠️ Kaydedilemedi: ' + (e.message || e));
  } finally {
    window._gunDuzenleDevam = false;
  }
}
async function exportGunluk(){
  const date=document.getElementById('gun-date').value;
  const hizFil=document.getElementById('gun-hizmet').value;
  const _dateISO2 = date;
  const _dateTR2 = date ? (d=>{const[y,m,g]=d.split('-');return `${g}.${m}.${y}`;})(date) : '';
  let v=allData.filter(r=>[r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2]
    .some(t=>t&&(t===_dateISO2||t===_dateTR2||t.startsWith(_dateTR2)||t.startsWith(_dateISO2))));
  if(hizFil) v=v.filter(r=>r['HİZMET']===hizFil);
  if(!v.length){showToast('Bu tarihte kayıt yok');return;}

  showToast('⏳ Excel hazırlanıyor...');

  // Hizmet sırasına göre sırala
  const HIZMET_SIRA = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];
  v.sort((a,b)=>HIZMET_SIRA.indexOf(a['HİZMET'])-HIZMET_SIRA.indexOf(b['HİZMET'])||a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM,'tr'));

  const colorDefs = [
    {bg:'1A237E', fg:'FFFFFF', bold:true,  sz:11, align:'center'}, // 1: Header
    {bg:'F8BBD0', fg:'C2185B', bold:false, align:'center'},         // 2: sıra no
    {bg:'FCE4EC', fg:'C2185B', bold:true,  align:'left'},           // 3: KB isim
    {bg:'E3F2FD', fg:'1565C0', bold:false, align:'center'},         // 4: EB sıra
    {bg:'BBDEFB', fg:'1565C0', bold:true,  align:'left'},           // 5: EB isim
    {bg:'E8F5E9', fg:'2E7D32', bold:false, align:'center'},         // 6: KF sıra
    {bg:'C8E6C9', fg:'2E7D32', bold:true,  align:'left'},           // 7: KF isim
    {bg:'FFF3E0', fg:'E65100', bold:false, align:'center'},         // 8: TZ sıra
    {bg:'FFE0B2', fg:'E65100', bold:true,  align:'left'},           // 9: TZ isim
    {bg:'FFFFFF', fg:'546E7A', bold:false, align:'left'},           // 10: mahalle
    {bg:'E8EAF6', fg:'1565C0', bold:false, align:'center'},         // 11: tarih
    {bg:'C8E6C9', fg:'1B5E20', bold:true,  align:'center'},         // 12: AKTİF
    {bg:'FFCDD2', fg:'B71C1C', bold:true,  align:'center'},         // 13: İPTAL
    {bg:'CFD8DC', fg:'263238', bold:true,  align:'center'},         // 14: VEFAT
    {bg:'FFF9C4', fg:'F57F17', bold:true,  align:'center'},         // 15: BEKLEME
    {bg:'ECEFF1', fg:'546E7A', bold:true,  align:'center'},         // 16: PASİF
    {bg:'FFFDE7', fg:'795548', bold:false, align:'left',  sz:9},    // 17: not
    {bg:'F1F5F9', fg:'1A237E', bold:true,  align:'center'},         // 18: hizmet başlık satırı
  ];

  const SI = {
    HDR:1,
    KB_NO:2, KB_ISIM:3,
    EB_NO:4, EB_ISIM:5,
    KF_NO:6, KF_ISIM:7,
    TZ_NO:8, TZ_ISIM:9,
    MAH:10, TARIH:11,
    AKTIF:12, IPTAL:13, VEFAT:14, BEKLEME:15, PASIF:16,
    NOT:17, HIZ_BASLIK:18
  };

  const HIZMET_SI = {
    'KADIN BANYO': {no: SI.KB_NO, isim: SI.KB_ISIM},
    'ERKEK BANYO': {no: SI.EB_NO, isim: SI.EB_ISIM},
    'KUAFÖR':      {no: SI.KF_NO, isim: SI.KF_ISIM},
    'TEMİZLİK':   {no: SI.TZ_NO, isim: SI.TZ_ISIM},
  };
  const DUR_SI = {'AKTİF':SI.AKTIF,'İPTAL':SI.IPTAL,'VEFAT':SI.VEFAT,'BEKLEME':SI.BEKLEME,'PASİF':SI.PASIF};

  // Tarih formatı: GG.AA.YYYY
  const fmtDate = d => {
    if(!d) return '';
    const p = d.split('-');
    return p.length===3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
  };

  const HEADERS = ['#', 'Hizmet', 'İsim Soyisim', 'Mahalle', 'Telefon', 'Ziyaret Tarihi', 'Durum', 'Not'];
  const WIDTHS  = [5, 16, 28, 18, 14, 16, 12, 32];

  const rows = [{ cells: HEADERS.map(h=>({v:h, s:SI.HDR})) }];

  // Hizmet grupları arasına başlık satırı ekle
  let sirano = 0;
  let sonHizmet = null;
  v.forEach((r, i) => {
    const hizmet = r['HİZMET'];
    if(hizmet !== sonHizmet) {
      // Grup başlığı satırı
      rows.push({ cells: HEADERS.map((_,ci) => ({
        v: ci===1 ? `${HIZMET_ICONS[hizmet]} ${hizmet}` : '',
        s: SI.HIZ_BASLIK
      }))});
      sonHizmet = hizmet;
      sirano = 0;
    }
    sirano++;
    const hs = HIZMET_SI[hizmet] || {no: SI.KB_NO, isim: SI.KB_ISIM};
    const dsi = DUR_SI[r.DURUM] || SI.PASIF;
    const not = [r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join(' | ');
    rows.push({ cells: [
      {v: sirano,            s: hs.no},
      {v: hizmet,            s: hs.isim},
      {v: r.ISIM_SOYISIM||'', s: hs.isim},
      {v: r.MAHALLE||'',      s: SI.MAH},
      {v: r.TELEFON||'',      s: SI.MAH},
      {v: fmtDate(date),      s: SI.TARIH},
      {v: r.DURUM||'',        s: dsi},
      {v: not,                s: SI.NOT},
    ]});
  });

  const enc = s => new TextEncoder().encode(s);
  const stylesXml = buildStyles(colorDefs);
  const sheetXml  = buildSheet(rows, HEADERS.map((_,i)=>i), WIDTHS);

  const zip = await buildZip([
    ['[Content_Types].xml',        enc(CONTENT_TYPES), true],
    ['_rels/.rels',                enc(RELS),          true],
    ['xl/workbook.xml',            enc(WORKBOOK),      false],
    ['xl/_rels/workbook.xml.rels', enc(WB_RELS),       true],
    ['xl/worksheets/sheet1.xml',   enc(sheetXml),      false],
    ['xl/styles.xml',              enc(stylesXml),     false],
  ]);

  const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `gunluk_${date}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ ${v.length} kayıt Excel olarak indirildi`);
}
function expGunBugün(){document.getElementById('gun-date').value=new Date().toISOString().split('T')[0];renderGunluk();exportGunluk();}

// ============ VATANDAŞLAR ============
function buildHizmetTabs() {
  const tabs = [['','Tümü','all'],...HIZMET_KEYS.map(h=>[h,`${HIZMET_ICONS[h]} ${h}`,HIZMET_COLORS[h]])];
  document.getElementById('hizmet-tabs-vat').innerHTML = tabs.map(([h,l,c])=>
    `<button class="htab${h===vatHizmet?' active-'+(h?c:'all'):''}" data-hizmet="${h}" onclick="setVatHizmet('${h}',this)">${l}</button>`
  ).join('');
}
function setVatHizmet(h,el) {
  vatHizmet=h; vatPage=1;
  document.querySelectorAll('#hizmet-tabs-vat .htab').forEach(t=>{t.className='htab';});
  const c=h?HIZMET_COLORS[h]:'all';
  el.classList.add('active-'+c);
  filterVat();
}

// ── Durum filtre butonları — çoklu seçim ──
let _vatSeciliDurumlar = new Set(['AKTİF']); // varsayılan: sadece AKTİF

function _durumBtnGuncelle() {
  const hepsi = ['AKTİF','PASİF','İPTAL','VEFAT','BEKLEME'];
  const tumSeçili = hepsi.every(d => _vatSeciliDurumlar.has(d));
  document.querySelectorAll('#durum-filtre-bar .durum-btn').forEach(b => {
    const oc = b.getAttribute('onclick') || '';
    const match = oc.match(/toggleVatDurum\('([^']+)'/);
    if (match) {
      b.classList.toggle('aktif-sec', _vatSeciliDurumlar.has(match[1]));
    } else if (oc.includes('toggleVatDurumTumu')) {
      b.classList.toggle('aktif-sec', tumSeçili || _vatSeciliDurumlar.size === 0);
    }
  });
}

function toggleVatDurum(durum, el) {
  if (_vatSeciliDurumlar.has(durum)) {
    _vatSeciliDurumlar.delete(durum);
    if (_vatSeciliDurumlar.size === 0) _vatSeciliDurumlar.add(durum); // en az 1 seçili kalsın
  } else {
    _vatSeciliDurumlar.add(durum);
  }
  _durumBtnGuncelle();
  vatPage = 1;
  filterVat();
}

function toggleVatDurumTumu(el) {
  const hepsi = ['AKTİF','PASİF','İPTAL','VEFAT','BEKLEME'];
  const tumSeçili = hepsi.every(d => _vatSeciliDurumlar.has(d));
  if (tumSeçili) {
    _vatSeciliDurumlar = new Set(['AKTİF']); // tümü seçiliyse AKTİF'e dön
  } else {
    _vatSeciliDurumlar = new Set(hepsi); // hepsini seç
  }
  _durumBtnGuncelle();
  vatPage = 1;
  filterVat();
}

// eski fonksiyon — geriye dönük uyumluluk
function setVatDurum(durum, el) {
  _vatSeciliDurumlar = new Set(durum ? [durum] : ['AKTİF','PASİF','İPTAL','VEFAT','BEKLEME']);
  _durumBtnGuncelle();
  vatPage = 1;
  filterVat();
}

function buildAyTabs() {
  const bugun = new Date();
  const bugunAyIdx = bugun.getMonth();
  const mevcutAylar = new Set(getMevcutAylar());

  // Tümü seçeneği ekle — vatAy='' ise tüm vatandaşlar görünür
  const tumBtn = `<button class="ay-btn${vatAy===''?' active':''}" onclick="setAy('',this)">Tümü</button>`;

  const ayBtnler = AY_LISTESI.map((a, idx) => {
    const varMi = mevcutAylar.has(a);
    const gelecekAy = idx > bugunAyIdx;
    const kapali = gelecekAy && !varMi;
    const aktif = a === vatAy;
    return `<button class="ay-btn${aktif ? ' active' : ''}${kapali ? ' ay-kapali' : ''}"
      data-ay="${a}"
      ${kapali ? 'disabled title="Bu ay henüz başlamadı"' : `onclick="setAy('${a}',this)"`}
    >${AY_LABELS[a]}</button>`;
  }).join('');

  document.getElementById('ay-tab-vat').innerHTML = tumBtn + ayBtnler;
}
function setAy(a, el) {
  vatAy = a;
  vatPage = 1;
  document.querySelectorAll('#ay-tab-vat .ay-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterVat();
}

function buildMahFilter() {
  const kaynak = (typeof kbData !== 'undefined' && kbData && kbData.length > 0) ? kbData.map(r=>r.MAHALLE) : allData.map(r=>r.MAHALLE);
  const mahs = [...new Set(kaynak.filter(Boolean))].sort();
  const sel = document.getElementById('vat-mah');
  if (!sel) return;
  const mevcut = sel.value;
  sel.innerHTML = '<option value="">Tümü</option>';
  mahs.forEach(m=>{const o=document.createElement('option');o.value=o.textContent=m;sel.appendChild(o);});
  if (mevcut) sel.value = mevcut;
}
function updateFormForHizmet() {} // legacy stub — not used
function gkUpdateIsimler() {
  const hizmet = document.getElementById('gk-hizmet').value;
  window._gkIsimler = [...new Set(allData.filter(r=>r['HİZMET']===hizmet && r.DURUM==='AKTİF').map(r=>r.ISIM_SOYISIM).filter(Boolean))].sort();
  const searchEl = document.getElementById('gk-isim-search');
  if(searchEl) searchEl.value='';
  document.getElementById('gk-isim').value='';
  document.getElementById('gk-mah').value='';
  document.getElementById('gk-durum-mevcut').value='';
  gkIsimFiltrele('');
  if (typeof gkVerilemediLabelGuncelle === 'function') gkVerilemediLabelGuncelle();
  const isKuafor = hizmet==='KUAFÖR';
  const tipWrap = document.getElementById('gk-tip-wrap'); if(tipWrap) tipWrap.style.display = isKuafor ? '' : 'none';
}
function gkIsimFiltrele(q) {
  const sel = document.getElementById('gk-isim');
  if(!sel) return;
  const liste = (window._gkIsimler||[]).filter(i=>i.toUpperCase().includes(q.toUpperCase()));
  sel.innerHTML = liste.map(i=>`<option value="${i}">${i}</option>`).join('');
  sel.style.display = liste.length ? 'block' : 'none';
}
function _gkAySkoru(ay) {
  const i = Array.isArray(window.AY_LISTESI) ? window.AY_LISTESI.indexOf(ay) : -1;
  return i >= 0 ? i : -1;
}
function _gkKayitAdaylari(hizmet, isim, tarihISO) {
  const hedef = (isim || '').trim().toUpperCase();

  const adaylar = allData
    .filter(r => r['HİZMET'] === hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase() === hedef);

  // Girilen tarihin ayını hesapla (YYYY-MM-DD formatından)
  // Örn: 2026-03-26 → ay indeksi 2 → AY_LISTESI[2] = 'MART'
  if (tarihISO && window.AY_LISTESI) {
    const ayNo = parseInt(tarihISO.split('-')[1], 10) - 1; // 0 tabanlı
    const tarihAyi = window.AY_LISTESI[ayNo]; // örn: 'MART'
    if (tarihAyi) {
      // Tarihin ait olduğu ayda AKTİF kaydı varsa onu döndür
      const tarihAyiKaydi = adaylar.filter(r => r.AY === tarihAyi && (r.DURUM || '').toUpperCase() === 'AKTİF');
      if (tarihAyiKaydi.length > 0) return tarihAyiKaydi;
      // AKTİF yoksa o aydaki herhangi bir kaydı döndür
      const tarihAyiHerhangi = adaylar.filter(r => r.AY === tarihAyi);
      if (tarihAyiHerhangi.length > 0) return tarihAyiHerhangi;
    }
  }

  // Tarih bilinmiyorsa: aktif ay sekmesine bak, yoksa en son aya göre sırala
  const domAktifBtn = document.querySelector('#ay-tab-vat .ay-btn.active');
  const domAy = domAktifBtn ? (domAktifBtn.dataset?.ay || '') : '';
  const aktifAy = domAy
    || (typeof selectedAy !== 'undefined' && selectedAy)
    || (typeof vatAy !== 'undefined' && vatAy)
    || (typeof getSonAy === 'function' ? getSonAy() : '');

  return adaylar.sort((a, b) => {
    const aAktif = a.AY === aktifAy ? 1 : 0;
    const bAktif = b.AY === aktifAy ? 1 : 0;
    if (aAktif !== bAktif) return bAktif - aAktif;
    const aDurum = (a.DURUM || '').toUpperCase() === 'AKTİF' ? 1 : 0;
    const bDurum = (b.DURUM || '').toUpperCase() === 'AKTİF' ? 1 : 0;
    if (aDurum !== bDurum) return bDurum - aDurum;
    return _gkAySkoru(b.AY) - _gkAySkoru(a.AY);
  });
}
function _gkKayitBul(hizmet, isim, tarihISO) {
  return _gkKayitAdaylari(hizmet, isim, tarihISO)[0] || null;
}
function gkIsimSecildi() {
  const hizmet = document.getElementById('gk-hizmet').value;
  const sel = document.getElementById('gk-isim');
  const searchEl = document.getElementById('gk-isim-search');
  if(searchEl && sel.value) searchEl.value = sel.value;
  const val = sel.value.trim().toUpperCase();
  const rec = _gkKayitBul(hizmet, val);
  if (rec) {
    document.getElementById('gk-mah').value = rec.MAHALLE||'';
    document.getElementById('gk-durum-mevcut').value = rec.DURUM||'';

    // TC otomatik doldur — allData içindeki herhangi bir kayıtta TC varsa al
    const tcEl = document.getElementById('gk-tc');
    if (tcEl) {
      const mevcutTC = (rec.TC||'').trim();
      if (mevcutTC) {
        tcEl.value = mevcutTC;
        tcEl.readOnly = true;
        tcEl.style.background = '#f0fdf4';
        tcEl.style.color = '#166534';
        tcEl.style.border = '1.5px solid #86efac';
      } else {
        // Aynı ismin diğer kayıtlarında veya kbData'da TC var mı?
        const digerTC = allData.find(r => (r.ISIM_SOYISIM||'').toUpperCase() === val && r.TC)?.TC
          || (typeof kbData !== 'undefined' ? kbData : []).find(k => (k.AD_SOYAD||'').toUpperCase() === val)?.TC || '';
        tcEl.value = digerTC;
        tcEl.readOnly = !!digerTC;
        tcEl.style.background = digerTC ? '#f0fdf4' : '';
        tcEl.style.color = digerTC ? '#166534' : '';
        tcEl.style.border = digerTC ? '1.5px solid #86efac' : '';
      }
    }

    // Engel durumu otomatik doldur
    const engelEl = document.getElementById('gk-engel');
    const engelAcEl = document.getElementById('gk-engel-aciklama');
    const engelWrap = document.getElementById('gk-engel-extra-wrap');
    if (engelEl) {
      const engelVal = rec.ENGEL || '';
      engelEl.value = engelVal;
      if (engelWrap) engelWrap.classList.toggle('hidden', engelVal !== 'Var');
      if (engelAcEl) engelAcEl.value = rec.ENGEL_ACIKLAMA || '';
    }

    // Son ziyaret tarihini göster
    const tarihler = hizmet === 'KUAFÖR'
      ? [rec.SAC1,rec.SAC2,rec.TIRNAK1,rec.TIRNAK2,rec.SAKAL1,rec.SAKAL2]
      : [rec.BANYO1,rec.BANYO2,rec.BANYO3,rec.BANYO4,rec.BANYO5];
    const dolu = tarihler.filter(Boolean);
    const el = document.getElementById('gk-son-ziyaret');
    if (el) {
      if (dolu.length) {
        const enSon = dolu.sort((a, b) => {
          const parse = t => t.includes('-')
            ? new Date(t)
            : new Date(t.split('.').reverse().join('-'));
          return parse(b) - parse(a);
        })[0];
        el.textContent = '📅 Son ziyaret: ' + enSon;
        el.style.color = '#15803d';
      } else {
        el.textContent = '📅 Henüz ziyaret yok';
        el.style.color = '#6b7280';
      }
    }
  }
  gkUyariGuncelle();
}

function gkUyariGuncelle() {
  // ── AKTİF DURUM KORUMASI (görsel) ──
  const durumEl = document.getElementById('gk-durum-mevcut');
  const durumUyari = document.getElementById('gk-durum-uyari');
  const kaydetBtn = _gkKaydetBtn();
  const mevcutDurum = durumEl ? (durumEl.value || '').trim() : '';
  const aktifDisi = mevcutDurum && mevcutDurum !== 'AKTİF';

  if (durumUyari) {
    if (aktifDisi) {
      const durumRenk = {'İPTAL':'#dc2626','VEFAT':'#374151','BEKLEME':'#d97706','PASİF':'#6366f1'}[mevcutDurum] || '#374151';
      durumUyari.innerHTML = `
        <div style="background:${durumRenk};color:#fff;padding:10px 14px;border-radius:8px;font-weight:600;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">⛔</span>
          <span>Bu vatandaş <strong>${mevcutDurum}</strong> durumunda — kayıt eklenemez!</span>
          <button onclick="(function(){document.querySelector('[onclick*=\\'durum-guncelle\\']')?.click()||document.querySelector('[data-tab=\\'durum-guncelle\\']')?.click();})()" 
            style="margin-left:auto;background:#fff;color:${durumRenk};border:none;border-radius:6px;padding:4px 10px;font-weight:700;cursor:pointer;font-size:12px">
            Durum Güncelle →
          </button>
        </div>`;
      durumUyari.style.display = 'block';
    } else {
      durumUyari.innerHTML = '';
      durumUyari.style.display = 'none';
    }
  }
  if (kaydetBtn) {
    kaydetBtn.disabled = aktifDisi;
    kaydetBtn.style.opacity = aktifDisi ? '0.4' : '';
    kaydetBtn.style.cursor = aktifDisi ? 'not-allowed' : '';
    kaydetBtn.title = aktifDisi ? `Vatandaş ${mevcutDurum} durumunda — önce Durum Güncelle yapın` : '';
  }

  // TC uyarısı
  const tcEl = document.getElementById('gk-tc');
  const tcUyari = document.getElementById('gk-tc-uyari');
  if (tcUyari && tcEl) {
    if (!tcEl.value.trim()) {
      tcUyari.textContent = '⚠️ DAHA SONRA DOLDURUN';
      tcUyari.style.display = 'block';
    } else {
      tcUyari.style.display = 'none';
    }
  }
  // Engel uyarısı
  const engelEl = document.getElementById('gk-engel');
  const engelUyari = document.getElementById('gk-engel-uyari');
  if (engelUyari && engelEl) {
    if (!engelEl.value) {
      engelUyari.textContent = '⚠️ DAHA SONRA DOLDURUN';
      engelUyari.style.display = 'block';
    } else {
      engelUyari.style.display = 'none';
    }
  }
}
window.gkUyariGuncelle = gkUyariGuncelle;

function gkEngelDegisti() {
  const v = document.getElementById('gk-engel')?.value;
  const w = document.getElementById('gk-engel-extra-wrap');
  if (w) w.classList.toggle('hidden', v !== 'Var');
}
window.gkEngelDegisti = gkEngelDegisti;

function _gkKaydetBtn() {
  return document.querySelector('[onclick="gkKaydet()"]');
}
function _gkSetBusy(isBusy, text) {
  const btn = _gkKaydetBtn();
  if (!btn) return;
  if (isBusy) {
    btn.disabled = true;
    btn.dataset.prevText = btn.textContent;
    btn.textContent = text || 'Kaydediliyor...';
    btn.style.opacity = '0.75';
    btn.style.cursor = 'wait';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.prevText || '💾 Hizmet Tarihi Ekle';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}
async function _gkVatandasKaydet(rec) {
  if (!rec || !rec._fbId) throw new Error('Kayıt kimliği bulunamadı');
  const payload = Object.fromEntries(Object.entries(rec).filter(([k]) => !k.startsWith('_')));
  await firebase.firestore().collection('vatandaslar').doc(rec._fbId).update(payload);
  return payload;
}
async function _gkTemizlikPlanKaydet(rec, data) {
  if (!rec || !rec._tpRef || !rec._tpFbId) return;
  await firebase.firestore().collection('temizlik_plan').doc(rec._tpFbId).update(data);
  const tp = (window.TP_DATA || []).find(t => t._fbId === rec._tpFbId);
  if (tp) Object.assign(tp, data);
  if (typeof tpRender === 'function') tpRender();
}
function _gkGunlukListeyiTazele(tarih) {
  const gunDate = document.getElementById('gun-date');
  if (gunDate && tarih) gunDate.value = tarih;
  try { if (typeof renderGunluk === 'function') renderGunluk(); } catch (e) { console.warn('Günlük liste tazeleme hatası:', e); }
}

async function gkKaydet() {
  if (_gkIslemDevam) { showToast('⏳ Önceki kayıt devam ediyor, lütfen bekleyin...'); return; }
  _gkIslemDevam = true;

  const isim = (document.getElementById('gk-isim').value||document.getElementById('gk-isim-search')?.value||'').trim().toUpperCase();
  const tarih = document.getElementById('gk-tarih').value;
  const tc = (document.getElementById('gk-tc')?.value||'').trim();
  const engel = document.getElementById('gk-engel')?.value||'';
  const engelAciklama = document.getElementById('gk-engel-aciklama')?.value.trim()||'';

  if (!isim) { _gkIslemDevam = false; showToast('Vatandas adi zorunlu'); return; }
  if (!tarih) { _gkIslemDevam = false; showToast('Tarih zorunlu'); return; }

  // İleri tarih kontrolü
  const bugunStr = new Date().toISOString().split('T')[0];
  if (tarih > bugunStr) { _gkIslemDevam = false; showToast('❌ İleri tarihli kayıt girilemiyor'); return; }

  const tarihDB = _isoToDDMMYYYY(tarih); // allData ile uyumlu DD.MM.YYYY

  const hizmet = document.getElementById('gk-hizmet').value;
  const seciliTipler = ['SAC','TIRNAK','SAKAL'].filter(t=>document.getElementById('gk-tip-'+t.toLowerCase())?.checked);
  const not = document.getElementById('gk-not').value;
  // tarihi geçirerek doğru ayın kaydını bul
  const adaylar = _gkKayitAdaylari(hizmet, isim, tarih);
  const rec = adaylar[0];

  if (!rec) { _gkIslemDevam = false; showToast('Vatandas bulunamadi'); return; }

  // ── AKTİF DURUM KORUMASI ──
  if (!rec.DURUM || rec.DURUM !== 'AKTİF') {
    _gkIslemDevam = false;
    const durumLabel = rec.DURUM || 'BELİRSİZ';
    showToast(`⛔ ${isim} — ${durumLabel} durumunda kayıt eklenemez. Önce Durum Güncelle yapın.`);
    document.querySelector('[onclick*="durum-guncelle"]')?.click()
      || document.querySelector('[data-tab="durum-guncelle"]')?.click();
    return;
  }

  const snapshot = JSON.parse(JSON.stringify(rec));
  _gkSetBusy(true, 'Kaydediliyor...');

  try {
    if (hizmet==='KUAFÖR') {
      if (seciliTipler.length === 0) { _gkIslemDevam = false; _gkSetBusy(false); showToast('Lutfen en az bir hizmet tipi secin'); return; }

      // Girilen tarihin hangi aya ait olduğunu hesapla
      const tarihAyNo = tarih ? parseInt(tarih.split('-')[1], 10) - 1 : -1;
      const tarihAyi = tarihAyNo >= 0 && window.AY_LISTESI ? window.AY_LISTESI[tarihAyNo] : '';

      // Eğer rec'in AY'ı girilen tarihin ayından farklıysa → yanlış kayda yazılıyor demek
      if (tarihAyi && rec.AY && rec.AY !== tarihAyi) {
        _gkIslemDevam = false;
        _gkSetBusy(false);
        showToast(`⚠️ ${tarihAyi} tarihli kayıt, ${rec.AY} kaydına yazılamaz. Önce ${tarihAyi} ayı için kayıt oluşturun.`);
        return;
      }

      seciliTipler.forEach(t => {
        const fields = t==='SAC'?['SAC1','SAC2']:t==='TIRNAK'?['TIRNAK1','TIRNAK2']:['SAKAL1','SAKAL2'];
        // Alan doluysa ve aynı tarih değilse ikinciye yaz, ikincisi de doluysa uyar
        if (!rec[fields[0]]) {
          rec[fields[0]] = tarihDB;
        } else if (rec[fields[0]] === tarihDB) {
          // Zaten aynı tarih var, tekrar yazma
          showToast(`ℹ️ Bu tarih zaten kayıtlı (${t})`);
        } else if (!rec[fields[1]]) {
          rec[fields[1]] = tarihDB;
        } else {
          // Her iki alan da dolu — ilkinin üzerine yaz (en eski mantığı)
          showToast(`⚠️ ${t} alanları dolu — ilk tarih güncellendi`);
          rec[fields[0]] = tarihDB;
        }
      });
    } else {
      const fields=['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'];
      const empty=fields.find(f=>!rec[f]);
      if (empty) {
        rec[empty]=tarihDB;
      } else {
        // Tüm alanlar dolu — en eski tarihi bulup üzerine yaz, kullanıcıya bildir
        const enEski = fields.reduce((prev, f) => {
          const parseT = t => t && t.includes('-') ? new Date(t) : t ? new Date(t.split('.').reverse().join('-')) : new Date(0);
          return parseT(rec[f]) < parseT(rec[prev]) ? f : prev;
        }, fields[0]);
        console.warn('[gkKaydet] Tüm BANYO alanları dolu, en eski tarih eziliyor:', rec[enEski], '→', tarihDB);
        showToast('⚠️ 5 ziyaret alanı dolu — en eski kayıt güncellendi');
        rec[enEski]=tarihDB;
      }
    }

    if (not) rec.NOT1 = rec.NOT1 ? rec.NOT1+' | '+not : not;

    // TC ve Engel durumunu bu kayda işle
    rec.TC = tc;
    rec.ENGEL = engel;
    if (engel === 'Var') rec.ENGEL_ACIKLAMA = engelAciklama;

    if (rec._fbId) {
      await _gkVatandasKaydet(rec);
    } else if (!rec._tpRef) {
      throw new Error('Bu kayıt Firebase’de bulunamadı');
    }

    // TC'yi tüm sisteme yay (vatandaslar + vatandaslar_bilgi) — Sync Engine
    const isimUpper = isim.trim().toLocaleUpperCase('tr-TR');
    if (tc && tc.replace(/\D/g,'').length === 11) {
      if (typeof syncTCYay === 'function') {
        syncTCYay(isimUpper, tc).catch(e => console.warn('syncTCYay hatası:', e));
      } else {
        // Fallback: sadece vatandaslar
        const tcGuncellenecek = allData.filter(r =>
          (r.ISIM_SOYISIM||'').toUpperCase() === isimUpper &&
          r._fbId && r._fbId !== rec._fbId &&
          (r.TC||'').trim() !== tc
        );
        if (tcGuncellenecek.length > 0) {
          try {
            const BATCH_SIZE = 400;
            for (let i = 0; i < tcGuncellenecek.length; i += BATCH_SIZE) {
              const batch = firebase.firestore().batch();
              tcGuncellenecek.slice(i, i + BATCH_SIZE).forEach(r => {
                r.TC = tc;
                batch.update(firebase.firestore().collection('vatandaslar').doc(r._fbId), { TC: tc });
              });
              await batch.commit();
            }
            showToast(`✅ TC, ${isimUpper} adına ait ${tcGuncellenecek.length + 1} kayda işlendi`);
          } catch(e) { console.warn('TC toplu yazma hatası:', e); }
        }
      }
    }

    if (rec._tpRef && rec._tpFbId) {
      const sd = { sonGidilme: tarihDB };
      if (not) sd.not_ = rec.NOT1;
      await _gkTemizlikPlanKaydet(rec, sd);
    }

    if (!window.gkRecs) window.gkRecs=[];
    window.gkRecs.push({
      isim,hizmet,tarih,
      tip:hizmet==='KUAFÖR'
        ? (seciliTipler.length ? seciliTipler.map(t=>t==='SAC'?'✂️Saç':t==='TIRNAK'?'💅Tırnak':'🪒Sakal').join(' + ') : '—')
        : '—',
      not
    });

    renderGkTable();
    gkTemizle();
    refreshAll();
    _gkGunlukListeyiTazele(tarih);
    if (typeof navTo === 'function') {
      const navEl = document.querySelector('.nav-item[onclick*="gunluk-kayit"]');
      navTo('gunluk-kayit', navEl || null);
    }
    showToast(`✅ Kayıt başarılı: ${rec.ISIM_SOYISIM} · ${tarih}`);
    // İşlemi logla
    if (typeof currentUser !== 'undefined' && currentUser) {
      const tipBilgi = hizmet === 'KUAFÖR' && seciliTipler.length
        ? seciliTipler.map(t => t === 'SAC' ? 'Saç' : t === 'TIRNAK' ? 'Tırnak' : 'Sakal').join('+')
        : '';
      firebase.firestore().collection('islem_log').add({
        yapan: currentUser.ad,
        uid: currentUser.uid,
        zaman: firebase.firestore.FieldValue.serverTimestamp(),
        isim: rec.ISIM_SOYISIM || '',
        hizmet: hizmet || '',
        degisiklik: 'GÜNLÜK HİZMET KAYDI',
        detay: 'Tarih: ' + tarihDB + (tipBilgi ? ' | Tip: ' + tipBilgi : '') + (not ? ' | Not: ' + not : '')
      }).catch(() => {});
    }
  } catch (e) {
    const meta = {};
    Object.keys(rec).forEach(k => { if (k.startsWith('_')) meta[k] = rec[k]; });
    Object.keys(rec).forEach(k => delete rec[k]);
    Object.assign(rec, snapshot, meta);
    console.error('Günlük hizmet kaydı hatası:', e);
    showToast('Kayıt tamamlanamadı, tekrar dene');
  } finally {
    _gkSetBusy(false);
    _gkIslemDevam = false;
  }
}

// ── HİZMET VERİLEMEDİ ──
function gkVerilemediToggle() {
  const cb = document.getElementById('gk-verilemedi-cb');
  const form = document.getElementById('gk-verilemedi-form');
  if (!form) return;

  const acik = cb.checked;
  form.style.display = acik ? 'block' : 'none';

  // Hizmet Tarihi, Kuaför Tip, Not, Kaydet butonunu gizle/göster
  const kilitliIdler = ['gk-tarih', 'gk-not'];
  kilitliIdler.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const wrap = el.closest('.form-group');
    if (wrap) wrap.style.display = acik ? 'none' : '';
    el.disabled = acik;
  });
  const kaydetBtn = document.querySelector('[onclick="gkKaydet()"]');
  if (kaydetBtn) { kaydetBtn.disabled = acik; kaydetBtn.style.display = acik ? 'none' : ''; }

  if (acik) {
    const tarih = document.getElementById('gk-tarih')?.value || new Date().toISOString().split('T')[0];
    const tarihEl = document.getElementById('gk-verilemedi-tarih');
    if (tarihEl) tarihEl.value = tarih;
    document.getElementById('gk-verilemedi-aciklama')?.focus();
    gkVerilemediLabelGuncelle();
  }
}

function gkVerilemediLabelGuncelle() {
  const hizmet = document.getElementById('gk-hizmet')?.value || '';
  const label = document.getElementById('gk-verilemedi-label');
  if (!label) return;
  const etiket = hizmet === 'TEMİZLİK' ? 'Temizlik Hizmeti Verilemedi'
    : hizmet === 'KUAFÖR' ? 'Kuaför Hizmeti Verilemedi'
    : hizmet === 'ERKEK BANYO' ? 'Erkek Banyo Hizmeti Verilemedi'
    : 'Banyo Hizmeti Verilemedi';
  label.textContent = '⚠️ ' + etiket;
}

function gkVerilemediKaydet() {
  // Çift tık koruması
  if (window._gkVerilemediDevam) { showToast('⏳ İşlem devam ediyor...'); return; }
  window._gkVerilemediDevam = true;

  const isim = (document.getElementById('gk-isim')?.value || document.getElementById('gk-isim-search')?.value || '').trim().toUpperCase();
  const tarih = document.getElementById('gk-verilemedi-tarih')?.value;
  const aciklama = document.getElementById('gk-verilemedi-aciklama')?.value.trim();
  const hizmet = document.getElementById('gk-hizmet')?.value || '';

  if (!isim) { window._gkVerilemediDevam = false; showToast('Lutfen once vatandas secin'); return; }
  if (!tarih) { window._gkVerilemediDevam = false; showToast('Tarih zorunlu'); return; }
  if (!aciklama) { window._gkVerilemediDevam = false; showToast('Aciklama zorunlu'); return; }

  // İleri tarih kontrolü
  const _bugunStr = new Date().toISOString().split('T')[0];
  if (tarih > _bugunStr) { window._gkVerilemediDevam = false; showToast('❌ İleri tarihli kayıt girilemiyor'); return; }

  const tarihTR = (d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(tarih);
  const tarihDB = tarihTR; // DD.MM.YYYY — allData ile tutarlı format
  const hizmetEtiket = hizmet === 'TEMİZLİK' ? 'TEMİZLİK' : hizmet === 'KUAFÖR' ? 'KUAFOR' : 'BANYO';
  const notMetin = tarihTR + ' ' + hizmetEtiket + ' VERİLEMEDİ: ' + aciklama.toUpperCase();

  // #6 düzeltme: find() yerine _gkKayitAdaylari — aktif ay + en güncel kaydı seç
  const adaylar = _gkKayitAdaylari(hizmet, isim);
  const rec = adaylar[0];

  if (!rec) { window._gkVerilemediDevam = false; showToast('⚠️ Vatandaş kaydı bulunamadı: ' + isim); return; }

  try {
    if (rec) {
      rec.NOT1 = rec.NOT1 ? rec.NOT1 + ' | ' + notMetin : notMetin;
      // Temizlik planını güncelle (sadece not, tarih değil)
      if (rec._tpRef && rec._tpFbId) {
        const tp = TP_DATA.find(t=>t._fbId===rec._tpFbId);
        if (tp) { tp.not_ = rec.NOT1; }
        firebase.firestore().collection('temizlik_plan').doc(rec._tpFbId)
          .update({ not_: rec.NOT1 }).catch(e=>console.warn(e));
        tpRender();
      }
      // Sadece NOT1 alanını Firestore'a yaz — tarih alanı değişmez
      if (rec._fbId) {
        fbUpdateDoc(allData.indexOf(rec), { NOT1: rec.NOT1 });
      }
    }
  } finally {
    window._gkVerilemediDevam = false;
  }

  // Formu sıfırla
  const cb = document.getElementById('gk-verilemedi-cb');
  if (cb) cb.checked = false;
  document.getElementById('gk-verilemedi-form').style.display = 'none';
  document.getElementById('gk-verilemedi-aciklama').value = '';
  // Gizlenen alanları geri göster
  ['gk-tarih','gk-tip','gk-not'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const wrap=el.closest('.form-group');
    if(wrap) wrap.style.display='';
    el.disabled=false;
  });
  const kaydetBtn=document.querySelector('[onclick="gkKaydet()"]');
  if(kaydetBtn){kaydetBtn.disabled=false;kaydetBtn.style.display='';}
  refreshAll();
  if (typeof _verilemediiBadgeGuncelle === 'function') _verilemediiBadgeGuncelle();
  showToast(isim + ' - hizmet verilemedi notu eklendi ✓');
  // İşlemi logla
  if (typeof currentUser !== 'undefined' && currentUser) {
    firebase.firestore().collection('islem_log').add({
      yapan: currentUser.ad,
      uid: currentUser.uid,
      zaman: firebase.firestore.FieldValue.serverTimestamp(),
      isim: isim,
      hizmet: hizmet || '',
      degisiklik: 'HİZMET VERİLEMEDİ',
      detay: 'Tarih: ' + tarihTR + ' | Açıklama: ' + aciklama.toUpperCase()
    }).catch(() => {});
  }
}
function gkTemizle() {
  ['gk-isim','gk-isim-search','gk-tarih','gk-not','gk-tc','gk-engel-aciklama'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.readOnly=false;el.style.background='';el.style.color='';el.style.border='';}});
  const sel=document.getElementById('gk-isim');if(sel)sel.style.display='none';
  document.getElementById('gk-mah').value='';
  document.getElementById('gk-durum-mevcut').value='';
  ['gk-tip-sac','gk-tip-tirnak','gk-tip-sakal'].forEach(id=>{const cb=document.getElementById(id);if(cb)cb.checked=false;});
  const sonEl=document.getElementById('gk-son-ziyaret');if(sonEl)sonEl.textContent='';
  const ge=document.getElementById('gk-engel');if(ge)ge.value='';
  const gew=document.getElementById('gk-engel-extra-wrap');if(gew)gew.classList.add('hidden');
}
function renderGkTable() {
  if (!window.gkRecs) window.gkRecs=[];
  document.getElementById('gk-count').textContent=window.gkRecs.length+' kayit';
  if (!window.gkRecs.length) { document.getElementById('gk-table').innerHTML='<tr><td class="no-data">Henuz islem yapilmadi</td></tr>'; return; }
  let h='<thead><tr><th>Hizmet</th><th>Isim</th><th>Tarih</th><th>Tip</th><th>Not</th><th>Sil</th></tr></thead><tbody>';
  window.gkRecs.forEach((r,i)=>{
    const rowBg = (r.tip==='YAPTIRILAMADI'||r.tip==='VERİLEMEDİ') ? 'background:#fff7ed' : '';
    const tipCell = (r.tip==='YAPTIRILAMADI'||r.tip==='VERİLEMEDİ')
      ? '<span style="color:#b45309;font-weight:800;font-size:11px">⚠️ VERİLEMEDİ</span>'
      : r.tip;
    h+=`<tr style="${rowBg}"><td>${HIZMET_ICONS[r.hizmet]} ${r.hizmet}</td><td class="name-cell">${r.isim}</td><td><span class="date-chip">${r.tarih}</span></td><td style="font-size:11px">${tipCell}</td><td style="font-size:11px;color:var(--text-soft)">${r.not||'—'}</td><td style="text-align:center"><button onclick="gkRecSil(${i})" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">🗑️</button></td></tr>`;
  });
  h+='</tbody>';
  document.getElementById('gk-table').innerHTML=h;
}
async function gkRecSil(i) {
  if (!confirm('Bu kaydi silmek istiyor musunuz?')) return;
  const r=window.gkRecs[i];
  let silindi=false;
  if (r.tip !== 'YAPTIRILAMADI' && r.tip !== 'VERİLEMEDİ') {
    const rec=allData.find(x=>x['HİZMET']===r.hizmet&&x.ISIM_SOYISIM&&x.ISIM_SOYISIM.toUpperCase()===r.isim);
    if (rec) silindi = await _gunlukKaydiSil(rec, r.tarih, '', { silent:true });
  }
  if (silindi || r.tip === 'YAPTIRILAMADI' || r.tip === 'VERİLEMEDİ') {
    window.gkRecs.splice(i,1);
    renderGkTable(); refreshAll();
    showToast('Silindi');
  }
}

// ============ YENİ VATANDAŞ ============
function buildFormMah() {
  const mahs=[...new Set(allData.map(r=>r.MAHALLE).filter(Boolean))].sort();
  const sel=document.getElementById('f-mah');
  sel.innerHTML='<option value="">Seçin...</option>';
  mahs.forEach(m=>{const o=document.createElement('option');o.value=o.textContent=m;sel.appendChild(o);});
  // f-ay'ı dinamik doldur: mevcut aylar + tüm 12 ay (yeni ay eklenebilsin)
  const fAy = document.getElementById('f-ay');
  if(fAy) {
    // Şu anki gerçek takvim ayını seç; ileriki ayları gösterme
    const bugunAyIdx = new Date().getMonth(); // 0=OCAK, 11=ARALIK
    const bugunAy = AY_LISTESI[bugunAyIdx];
    fAy.innerHTML = AY_LISTESI.slice(0, bugunAyIdx + 1).map(a=>
      `<option value="${a}"${a===bugunAy?' selected':''}>${AY_LABELS[a]}</option>`
    ).join('');
  }
  fvCopyReset();
}

function _findVatandasKayitlari(isim) {
  const hedef=(isim||'').trim().toUpperCase();
  return allData.filter(r=>r.ISIM_SOYISIM&&r.ISIM_SOYISIM.toUpperCase()===hedef);
}
function _findVatandasOzetKayit(isim, tercihHizmet='') {
  return _findVatandasKayitlari(isim).sort((a,b)=>{
    const aTer = tercihHizmet && a['HİZMET']===tercihHizmet ? 1 : 0;
    const bTer = tercihHizmet && b['HİZMET']===tercihHizmet ? 1 : 0;
    if (aTer!==bTer) return bTer-aTer;
    const aAktif=(a.DURUM||'').toUpperCase()==='AKTİF'?1:0;
    const bAktif=(b.DURUM||'').toUpperCase()==='AKTİF'?1:0;
    if (aAktif!==bAktif) return bAktif-aAktif;
    return _gkAySkoru(b.AY)-_gkAySkoru(a.AY);
  })[0] || null;
}
function fvCopyUpdateIsimler() {
  const hizmet = document.getElementById('f-copy-hizmet')?.value || '';
  const isimler = hizmet
    ? [...new Set(allData.filter(r=>r['HİZMET']===hizmet && (r.DURUM||'').toUpperCase()==='AKTİF').map(r=>r.ISIM_SOYISIM).filter(Boolean))].sort()
    : [];
  window._fvCopyIsimler = isimler;
  const searchEl = document.getElementById('f-copy-search');
  const sel = document.getElementById('f-copy-isim');
  if(searchEl) searchEl.value='';
  if(sel) sel.value='';
  fvCopyFilter('');
  const info=document.getElementById('f-copy-info');
  if(info) info.textContent = hizmet ? 'Vatandaş seçin; bilgiler forma doldurulacak.' : 'Önce mevcut hizmeti seçin.';
}
function fvCopyFilter(q='') {
  const sel = document.getElementById('f-copy-isim');
  if(!sel) return;
  const liste = (window._fvCopyIsimler||[]).filter(i=>i.toUpperCase().includes((q||'').trim().toUpperCase()));
  sel.innerHTML = liste.length
    ? liste.map(i=>`<option value="${i}">${i}</option>`).join('')
    : '<option value="">Kayıt bulunamadı</option>';
}
function fvCopyApplyExistingServices(hizmetler=[]) {
  const map = {
    'KADIN BANYO':'fh-kadin',
    'ERKEK BANYO':'fh-erkek',
    'KUAFÖR':'fh-kuafor',
    'TEMİZLİK':'fh-temizlik'
  };
  Object.values(map).forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.disabled=false;
    el.checked=false;
    const label = el.closest('label');
    if(label) {
      label.style.opacity='1';
      label.title='';
    }
  });
  hizmetler.forEach(h=>{
    const id=map[h];
    const el=id?document.getElementById(id):null;
    if(!el) return;
    el.checked=false;
    el.disabled=true;
    const label = el.closest('label');
    if(label) {
      label.style.opacity='0.55';
      label.title='Bu hizmet zaten kayıtlı';
    }
  });
}
function fvCopySelect() {
  const isim = (document.getElementById('f-copy-isim')?.value || '').trim().toUpperCase();
  const hizmet = document.getElementById('f-copy-hizmet')?.value || '';
  if(!isim) return;
  const rec = _findVatandasOzetKayit(isim, hizmet);
  if(!rec) {
    showToast('⚠️ Kopyalanacak kayıt bulunamadı');
    return;
  }
  const bilgi = (window._adresBilgi && window._adresBilgi[isim]) || {};
  document.getElementById('f-isim').value = rec.ISIM_SOYISIM || '';
  document.getElementById('f-mah').value = rec.MAHALLE || '';
  document.getElementById('f-cins').value = rec.CİNSİYET || '';
  document.getElementById('f-onay').value = rec.ONAY_TARIHI || '';
  document.getElementById('f-dogum').value = _toDateInputValue(bilgi.dogum || rec.DOGUM_TARIHI || '');
  document.getElementById('f-tel').value = bilgi.tel || rec.TELEFON || '';
  document.getElementById('f-tel2').value = bilgi.tel2 || rec.TELEFON2 || '';
  document.getElementById('f-tel-aktif').value = bilgi.telAktif || rec.TELEFON_AKTIF || '1';
  document.getElementById('f-adres').value = bilgi.adres || rec.ADRES || '';
  document.getElementById('f-not1').value = rec.NOT1 || '';
  document.getElementById('f-not2').value = rec.NOT2 || '';

  // TC ve Engel otomatik doldur
  const tcEl = document.getElementById('f-tc');
  if (tcEl) tcEl.value = rec.TC || '';
  const engelEl = document.getElementById('f-engel');
  if (engelEl) {
    engelEl.value = rec.ENGEL || '';
    const ew = document.getElementById('f-engel-extra-wrap');
    if (ew) ew.classList.toggle('hidden', rec.ENGEL !== 'Var');
  }
  const engelAcEl = document.getElementById('f-engel-aciklama');
  if (engelAcEl) engelAcEl.value = rec.ENGEL_ACIKLAMA || '';

  const mevcutHizmetler = [...new Set(_findVatandasKayitlari(isim).filter(r=>(r.DURUM||'').toUpperCase()==='AKTİF').map(r=>r['HİZMET']).filter(Boolean))];
  fvCopyApplyExistingServices(mevcutHizmetler);
  const info=document.getElementById('f-copy-info');
  if(info) info.innerHTML = `<strong>${rec.ISIM_SOYISIM}</strong> kopyalandı. Mevcut hizmetler: ${mevcutHizmetler.length ? mevcutHizmetler.join(', ') : 'yok'}. Sadece eklenecek yeni hizmeti işaretleyin.`;
  showToast('✅ Vatandaş bilgileri forma kopyalandı');
}
function fEngelDegisti() {
  const v = document.getElementById('f-engel')?.value;
  const w = document.getElementById('f-engel-extra-wrap');
  if (w) w.classList.toggle('hidden', v !== 'Var');
}
window.fEngelDegisti = fEngelDegisti;
window.gkEngelDegisti = gkEngelDegisti;

function fvCopyReset() {
  window._fvCopyIsimler = [];
  const hizmetEl=document.getElementById('f-copy-hizmet'); if(hizmetEl) hizmetEl.value='';
  const searchEl=document.getElementById('f-copy-search'); if(searchEl) searchEl.value='';
  const isimEl=document.getElementById('f-copy-isim'); if(isimEl) isimEl.innerHTML='';
  const info=document.getElementById('f-copy-info'); if(info) info.textContent='Önce mevcut hizmeti seçin.';
  fvCopyApplyExistingServices([]);
}
function _toDateInputValue(val) {
  const s=(val||'').trim();
  if(!s) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if(/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [d,m,y]=s.split('.');
    return `${y}-${m}-${d}`;
  }
  return '';
}

async function saveRec(){
  const isim=document.getElementById('f-isim').value.trim().toUpperCase();
  const mah=document.getElementById('f-mah').value;
  const seciliHizmetler = ['fh-kadin','fh-erkek','fh-kuafor','fh-temizlik']
    .map(id=>document.getElementById(id))
    .filter(cb=>cb&&cb.checked).map(cb=>cb.value);
  const tc = (document.getElementById('f-tc')?.value||'').trim();
  const engel = document.getElementById('f-engel')?.value||'';
  const engelAciklama = (document.getElementById('f-engel-aciklama')?.value||'').trim();

  if(!isim||!mah){showToast('⚠️ İsim ve mahalle zorunlu');return;}
  if(!seciliHizmetler.length){showToast('⚠️ En az bir hizmet seçin');return;}
  const zatenOlanlar = seciliHizmetler.filter(h=>allData.some(r=>r.ISIM_SOYISIM&&r.ISIM_SOYISIM.toUpperCase()===isim&&r['HİZMET']===h&&(r.DURUM||'').toUpperCase()==='AKTİF'));
  if(zatenOlanlar.length){showToast(`⚠️ Zaten kayıtlı hizmet var: ${zatenOlanlar.join(', ')}`);return;}
  const ay=document.getElementById('f-ay').value;
  const cins=document.getElementById('f-cins').value;
  const onay=document.getElementById('f-onay').value||new Date().toISOString().split('T')[0];
  const not1=document.getElementById('f-not1').value;
  const not2=document.getElementById('f-not2').value;
  const tel=(document.getElementById('f-tel')?.value||'').trim();
  const tel2=(document.getElementById('f-tel2')?.value||'').trim();
  const telAktif=document.getElementById('f-tel-aktif')?.value||'1';
  const adres=(document.getElementById('f-adres')?.value||'').trim();
  const dogumRaw=(document.getElementById('f-dogum')?.value||'').trim();
  let dogum=dogumRaw;
  if(/^\d{4}-\d{2}-\d{2}$/.test(dogumRaw)){const[y,m,d]=dogumRaw.split('-');dogum=`${d}.${m}.${y}`;}

  const eklenenKayitlar = seciliHizmetler.map(hizmet => {
    const rec={
      ONAY_TARIHI:onay, IPTAL_NEDEN:'',
      ISIM_SOYISIM:isim, MAHALLE:mah, AY:ay,
      'HİZMET':hizmet, CİNSİYET:cins, DURUM:'AKTİF',
      DOGUM_TARIHI:dogum,
      BANYO1:'',BANYO2:'',BANYO3:'',BANYO4:'',BANYO5:'',
      SAC1:'',SAC2:'',TIRNAK1:'',TIRNAK2:'',SAKAL1:'',SAKAL2:'',
      NOT1:not1, NOT2:not2, NOT3:'',
      TELEFON:tel, TELEFON2:tel2, TELEFON_AKTIF:telAktif, ADRES:adres,
      TC:tc, ENGEL:engel, ENGEL_ACIKLAMA: engel==='Var' ? engelAciklama : '',
    };
    allData.push(rec);
    newRecs.push(rec);
    return rec;
  });
  try {
    await Promise.all(eklenenKayitlar.map(async rec => {
      const fbId = await fbAddDoc(rec);
      rec._fbId = fbId;
    }));

    // adres_bilgi koleksiyonuna da kaydet
    if(tel||adres||dogum){
      const bilgi={tel,tel2,telAktif,adres,dogum};
      await firebase.firestore().collection('adres_bilgi').doc(isim).set(bilgi);
      if(!window._adresBilgi)window._adresBilgi={};
      window._adresBilgi[isim]=bilgi;
    }

    refreshAll();
    renderNewTable();
    clearForm();
    showToast(`✅ ${isim} — ${seciliHizmetler.length} hizmet kaydedildi`);
  } catch (e) {
    console.error('Yeni vatandaş kayıt hatası:', e);
    eklenenKayitlar.forEach(rec => {
      const iAll = allData.indexOf(rec);
      if (iAll >= 0) allData.splice(iAll, 1);
      const iNew = newRecs.indexOf(rec);
      if (iNew >= 0) newRecs.splice(iNew, 1);
    });
    renderNewTable();
    refreshAll();
    showToast('❌ Kayıt tamamlanamadı, tekrar deneyin');
  }
}
function clearForm(){
  ['f-isim','f-onay','f-dogum','f-tel','f-tel2','f-adres','f-not1','f-not2','f-tc','f-engel-aciklama'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['fh-kadin','fh-erkek','fh-kuafor','fh-temizlik'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
  const ta=document.getElementById('f-tel-aktif');if(ta)ta.value='1';
  const fe=document.getElementById('f-engel');if(fe)fe.value='';
  const few=document.getElementById('f-engel-extra-wrap');if(few)few.classList.add('hidden');
  fvCopyReset();
}
function renderNewTable(){
  document.getElementById('new-count').textContent=newRecs.length+' kayıt';
  document.getElementById('new-table').innerHTML=newRecs.length===0
    ?'<tr><td class="no-data">Henüz kayıt eklenmedi</td></tr>'
    :`<thead><tr><th>Hizmet</th><th>İsim</th><th>Mahalle</th><th>Ay</th><th>Onay</th></tr></thead>
     <tbody>${newRecs.map(r=>`<tr>
       <td>${HIZMET_ICONS[r['HİZMET']]} ${r['HİZMET']}</td>
       <td class="name-cell">${r.ISIM_SOYISIM}</td>
       <td class="mahalle-cell">${r.MAHALLE}</td>
       <td>${r.AY}</td><td style="font-size:11px">${r.ONAY_TARIHI}</td>
     </tr>`).join('')}</tbody>`;
}

// ============ DURUM GÜNCELLE ============
window.duRecs=[];
function duUpdateIsimler() {
  const hizmet = document.getElementById('du-hizmet').value;
  window._duIsimler = [...new Set(allData.filter(r=>r['HİZMET']===hizmet).map(r=>r.ISIM_SOYISIM).filter(Boolean))].sort();
  const searchEl = document.getElementById('du-isim-search');
  if(searchEl) searchEl.value='';
  document.getElementById('du-isim').value='';
  document.getElementById('du-mah').value='';
  document.getElementById('du-mevcut').value='';
  duIsimFiltrele('');
}
function duIsimFiltrele(q) {
  const sel = document.getElementById('du-isim');
  if(!sel) return;
  const liste = (window._duIsimler||[]).filter(i=>i.toUpperCase().includes(q.toUpperCase()));
  sel.innerHTML = liste.map(i=>`<option value="${i}">${i}</option>`).join('');
  sel.style.display = liste.length ? 'block' : 'none';
  if(liste.length===1) { sel.value=liste[0]; duIsimSecildi(); }
}
function duIsimSecildi() {
  const hizmet = document.getElementById('du-hizmet').value;
  const sel = document.getElementById('du-isim');
  const searchEl = document.getElementById('du-isim-search');
  if(searchEl && sel.value) searchEl.value = sel.value;
  const val = sel.value.trim().toUpperCase();
  const rec = allData.find(r=>r['HİZMET']===hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===val);
  if (rec) {
    document.getElementById('du-mah').value = rec.MAHALLE||'';
    document.getElementById('du-mevcut').value = rec.DURUM||'';
  }
}
function duKaydet() {
  const isim = (document.getElementById('du-isim')?.value || document.getElementById('du-isim-search')?.value || '').trim().toUpperCase();
  const yeniDurum = document.getElementById('du-yeni-durum').value;
  const tarih = document.getElementById('du-tarih').value;
  const neden = document.getElementById('du-neden').value;
  if (!isim) { showToast('⚠️ Vatandaş adı zorunlu'); return; }
  if (!tarih) { showToast('⚠️ Tarih zorunlu'); return; }
  const hizmet = document.getElementById('du-hizmet').value;
  const eskiDurum = document.getElementById('du-mevcut').value;
  // Büyük/küçük harf farkı gözetmeksizin eşleştir
  const hedefler = allData.filter(r=>r['HİZMET']===hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===isim);
  if (hedefler.length === 0) { showToast('Vatandas bulunamadi: ' + isim); return; }
  hedefler.forEach(r=>{
    r.DURUM = yeniDurum;
    r.IPTAL_TARIHI = tarih;
    r.IPTAL_NEDEN = neden;
    if (neden) r.NOT1 = r.NOT1 ? r.NOT1 + ' | ' + neden : neden;
    const idx = allData.indexOf(r);
    const changes = { DURUM: yeniDurum, IPTAL_TARIHI: tarih, IPTAL_NEDEN: neden };
    if (neden) changes.NOT1 = r.NOT1;
    fbUpdateDoc(idx, changes);
  });
  // ── vatandaslar_bilgi'ye de DURUM yaz ──
  if (typeof kbData !== 'undefined' && kbData) {
    const isimUp = isim.toLocaleUpperCase('tr-TR');
    const kart = kbData.find(k => (k.AD_SOYAD||'').toLocaleUpperCase('tr-TR') === isimUp);
    if (kart) {
      kart.DURUM = yeniDurum;
      firebase.firestore().collection('vatandaslar_bilgi').doc(kart._fbId)
        .update({ DURUM: yeniDurum }).catch(e => console.warn('kb durum sync:', e));
    }
  }
  duRecs.push({isim,hizmet,eskiDurum,yeniDurum,tarih,neden});
  renderDuTable(); duTemizle();
  refreshAll();
  if (typeof filterVat === 'function') filterVat();
  showToast(`✅ ${isim} durumu → ${yeniDurum}`);
}
function duTemizle() {
  ['du-isim','du-isim-search','du-tarih','du-neden'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sel=document.getElementById('du-isim');if(sel)sel.style.display='none';
  document.getElementById('du-mah').value='';
  document.getElementById('du-mevcut').value='';
}
function renderDuTable() {
  document.getElementById('du-count').textContent=duRecs.length+' kayıt';
  document.getElementById('du-table').innerHTML = duRecs.length===0
    ? '<tr><td class="no-data">Henüz güncelleme yapılmadı</td></tr>'
    : `<thead><tr><th>Hizmet</th><th>İsim</th><th>Eski Durum</th><th>Yeni Durum</th><th>Tarih</th><th>Neden</th></tr></thead>
       <tbody>${duRecs.map(r=>`<tr>
         <td>${HIZMET_ICONS[r.hizmet]} ${r.hizmet}</td>
         <td class="name-cell">${r.isim}</td>
         <td>${durBadge(r.eskiDurum)}</td>
         <td>${durBadge(r.yeniDurum)}</td>
         <td><span class="date-chip">${r.tarih}</span></td>
         <td style="font-size:11px;color:var(--text-soft)">${r.neden||'—'}</td>
       </tr>`).join('')}</tbody>`;
}

// ── Vatandaşlar kolon sıralama ve ek filtreler ────────────
let vatSortCol = '';
let vatSortDir = 'asc';
const _vatKolFiltre = { ay: '', durum: '' };

function vatSortBy(col) {
  if (vatSortCol === col) vatSortDir = vatSortDir === 'asc' ? 'desc' : 'asc';
  else { vatSortCol = col; vatSortDir = 'asc'; }
  renderVat();
}

function filterVat() {
  // ── YENİ MODEL: kbData (vatandaslar_bilgi) kaynak ──
  // Her vatandaş her ayda görünür. Seçili ay varsa o aya ait allData kaydı zenginleştirme için eklenir.
  const srch = document.getElementById('vat-search').value.toLocaleLowerCase('tr-TR');
  const mah  = document.getElementById('vat-mah').value;
  const hepsiDurum = ['AKTİF','PASİF','İPTAL','VEFAT','BEKLEME'];
  const tumSeçili  = hepsiDurum.every(d => _vatSeciliDurumlar.has(d));

  // kbData yoksa (henüz yüklenmedi) eski allData modeline fallback
  const kaynak = (typeof kbData !== 'undefined' && kbData && kbData.length > 0) ? 'kb' : 'all';

  if (kaynak === 'kb') {
    // allData üzerinde hızlı arama haritası: isim+hizmet → ay kaydı listesi
    const _adMap = {};
    allData.forEach(r => {
      const key = (r.ISIM_SOYISIM||'').toLocaleUpperCase('tr-TR') + '|' + (r['HİZMET']||'');
      if (!_adMap[key]) _adMap[key] = [];
      _adMap[key].push(r);
    });

    // kbData'yı genişlet: her kişi x hizmet kombinasyonu için bir satır
    const genisletilmis = [];
    kbData.forEach(kb => {
      const hizmetler = Array.isArray(kb.HIZMETLER) && kb.HIZMETLER.length
        ? kb.HIZMETLER
        : (kb.HIZMET ? [kb.HIZMET] : []);
      if (!hizmetler.length) {
        // Hiç hizmet yoksa yine de tek satır göster
        genisletilmis.push({ _kb: kb, _hz: '', _ayKayit: null });
      } else {
        hizmetler.forEach(hz => {
          genisletilmis.push({ _kb: kb, _hz: hz, _ayKayit: null });
        });
      }
    });

    // Seçili ay varsa allData'dan eşleştir
    genisletilmis.forEach(row => {
      if (!vatAy) { row._ayKayit = null; return; }
      const key = (row._kb.AD_SOYAD||'').toLocaleUpperCase('tr-TR') + '|' + row._hz;
      const ayKayitlar = _adMap[key] || [];
      row._ayKayit = ayKayitlar.find(r => r.AY === vatAy) || null;
    });

    // Filtrele
    vatFiltered = genisletilmis.filter(row => {
      const kb = row._kb;
      const hz = row._hz;
      const hizmetler = Array.isArray(kb.HIZMETLER) && kb.HIZMETLER.length ? kb.HIZMETLER : (kb.HIZMET ? [kb.HIZMET] : []);
      const hOk = !vatHizmet || hz === vatHizmet || hizmetler.includes(vatHizmet);
      // Ay filtresi: seçili ay varsa sadece o ayda kaydı olanları göster
      const aOk = vatAy ? (row._ayKayit !== null) : true;
      const isim = (kb.AD_SOYAD||'').toLocaleLowerCase('tr-TR');
      const mahlc = (kb.MAHALLE||'').toLocaleLowerCase('tr-TR');
      const sOk = !srch || isim.includes(srch) || mahlc.includes(srch);
      const mOk = !mah || kb.MAHALLE === mah;
      const durum = kb.DURUM || 'AKTİF';
      const dOk = tumSeçili || _vatSeciliDurumlar.has(durum);
      return hOk && aOk && sOk && mOk && dOk;
    });

    // _vatFiltered artık genişletilmiş nesneler — renderVat bunu bilmeli
    window._vatKaynak = 'kb';
  } else {
    // Eski allData modeli (fallback)
    window._vatKaynak = 'all';
    vatFiltered = allData.filter(r => {
      const hOk = !vatHizmet || r['HİZMET'] === vatHizmet;
      const aOk = vatAy ? r.AY === vatAy : true;
      const sOk = !srch || (r.ISIM_SOYISIM||'').toLocaleLowerCase('tr-TR').includes(srch) || (r.MAHALLE||'').toLocaleLowerCase('tr-TR').includes(srch);
      const mOk = !mah || r.MAHALLE === mah;
      const dOk = tumSeçili || _vatSeciliDurumlar.has(r.DURUM||'');
      return hOk && aOk && sOk && mOk && dOk;
    });
  }
  vatPage = 1; renderVat();
}

function renderVat() {
  const isKB = window._vatKaynak === 'kb';
  const total = vatFiltered.length;
  const tp    = Math.ceil(total / PER);

  // Sıralama önce uygula (slice öncesi)
  if (vatSortCol) {
    const _getVal = (row, col) => {
      if (isKB) {
        const kb = row._kb; const ak = row._ayKayit;
        if (col === 'isim')    return (kb.AD_SOYAD||'').toLocaleUpperCase('tr-TR');
        if (col === 'mahalle') return (kb.MAHALLE||'').toLocaleUpperCase('tr-TR');
        if (col === 'durum')   return (kb.DURUM||'').toLocaleUpperCase('tr-TR');
        if (col === 'hizmet')  return (row._hz||'').toLocaleUpperCase('tr-TR');
        if (col === 'ay')      return (ak?.AY||'');
      } else {
        const colMap = { isim:'ISIM_SOYISIM', mahalle:'MAHALLE', ay:'AY', durum:'DURUM', hizmet:'HİZMET' };
        return ((row[colMap[col]||col])||'').toString().toLocaleUpperCase('tr-TR');
      }
    };
    vatFiltered.sort((a,b)=>{
      const va = _getVal(a, vatSortCol);
      const vb = _getVal(b, vatSortCol);
      return vatSortDir==='asc' ? va.localeCompare(vb,'tr') : vb.localeCompare(va,'tr');
    });
  }

  const slice = vatFiltered.slice((vatPage-1)*PER, vatPage*PER);
  document.getElementById('vat-count').textContent = `${total} kayıt`;

  const isKuafor   = vatHizmet==='KUAFÖR';
  const _th = 'padding:7px 6px;text-align:left;white-space:nowrap;position:relative;font-size:12px';
  const _sor = (col) => vatSortCol===col?(vatSortDir==='asc'?'↑':'↓'):'⇅';

  const thead = `<thead><tr style="background:var(--primary);color:#fff">
    <th style="${_th}"><div onclick="vatSortBy('hizmet')" style="cursor:pointer">HİZMET ${_sor('hizmet')}</div></th>
    <th style="${_th}"><div onclick="vatSortBy('isim')" style="cursor:pointer">İSİM SOYİSİM ${_sor('isim')}</div></th>
    <th style="${_th}"><div onclick="vatSortBy('mahalle')" style="cursor:pointer">MAHALLE ${_sor('mahalle')}</div></th>
    <th style="${_th}"><div onclick="vatSortBy('ay')" style="cursor:pointer">AY ${_sor('ay')}</div></th>
    ${isKuafor
      ? `<th style="${_th}">Saç</th><th style="${_th}">Tırnak</th><th style="${_th}">Sakal</th>`
      : `<th style="${_th}">TARİHLER</th>`}
    <th style="${_th}">YAŞ</th>
    <th style="${_th}">NOTLAR</th>
    <th style="${_th}">TELEFON</th>
    <th style="${_th}"><div onclick="vatSortBy('durum')" style="cursor:pointer">DURUM ${_sor('durum')}</div></th>
    <th style="width:36px"></th>
  </tr></thead>`;

  const tbody = slice.map(row => {
    if (isKB) {
      // ── kbData modeli ──
      const kb  = row._kb;
      const ak  = row._ayKayit; // seçili aya ait allData kaydı (null olabilir)
      const hz  = row._hz;
      const isim = kb.AD_SOYAD || '—';
      const durum = kb.DURUM || 'AKTİF';
      const yas = hesaplaYas(kb.DOGUM_TARIHI || '');
      const tel = kb.TELEFON || (ak?.TELEFON) || '—';
      const ayGoster = ak ? `<span style="font-size:11px;font-weight:700;color:var(--purple)">${ak.AY}</span>` : `<span style="font-size:10px;color:#94a3b8">—</span>`;
      // Tarihler: seçili ay kaydından
      let tarihHucre = '—';
      if (ak) {
        if (isKuafor) {
          tarihHucre = `
            <td style="white-space:nowrap">${ak.SAC1?`<span class="date-chip">${fmt(ak.SAC1)}</span>`:''}${ak.SAC2?`<span class="date-chip">${fmt(ak.SAC2)}</span>`:''}</td>
            <td style="white-space:nowrap">${ak.TIRNAK1?`<span class="date-chip">${fmt(ak.TIRNAK1)}</span>`:''}${ak.TIRNAK2?`<span class="date-chip">${fmt(ak.TIRNAK2)}</span>`:''}</td>
            <td style="white-space:nowrap">${ak.SAKAL1?`<span class="date-chip">${fmt(ak.SAKAL1)}</span>`:''}${ak.SAKAL2?`<span class="date-chip">${fmt(ak.SAKAL2)}</span>`:''}</td>`;
        } else {
          tarihHucre = `<td>${getBanyolar(ak)}</td>`;
        }
      } else {
        tarihHucre = isKuafor ? '<td>—</td><td>—</td><td>—</td>' : '<td style="color:#94a3b8;font-size:11px">—</td>';
      }
      const notlar = ak ? [ak.NOT1,ak.NOT2,ak.NOT3].filter(Boolean).join(' • ') : (kb.NOT||'');
      // Edit: allData index varsa onu kullan, yoksa kbData üzerinden
      const globalIdx = ak ? allData.indexOf(ak) : -1;
      const editBtn = globalIdx >= 0
        ? `<button class="btn" onclick="openEditModal(${globalIdx})" style="padding:3px 8px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:6px;cursor:pointer" title="Düzenle">✏️</button>`
        : `<button class="btn" onclick="kbDuzenle('${kb._fbId}')" style="padding:3px 8px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:6px;cursor:pointer" title="Profil Düzenle">✏️</button>`;
      const silBtn = globalIdx >= 0
        ? `<button class="btn" onclick="silVatandas(${globalIdx})" style="padding:3px 8px;font-size:11px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;cursor:pointer;margin-left:3px" title="Sil">🗑️</button>`
        : '';
      const showAy = ak?.AY || vatAy || '';
      return `<tr onclick="showDetail('${esc(isim)}','${esc(hz)}','${esc(showAy)}')" style="cursor:pointer">
        <td><span class="hizmet-dot dot-${HIZMET_COLORS[hz]||'pasif'}"></span><span style="font-size:11px;font-weight:700">${hz||'—'}</span></td>
        <td class="name-cell">${isim}</td>
        <td class="mahalle-cell">${kb.MAHALLE||'—'}</td>
        <td>${ayGoster}</td>
        ${tarihHucre}
        <td style="text-align:center;font-weight:800;font-size:13px;color:${yas&&yas>=75?'#b45309':yas&&yas>=60?'#0369a1':'#374151'}">${yas!==null?yas:'—'}</td>
        <td style="font-size:11px;color:var(--text-soft);max-width:160px">${notlar||'—'}</td>
        <td style="font-size:11px;white-space:nowrap;color:#0369a1">${tel && tel!=='—'?`<a href="tel:${tel.replace(/\s/g,'')}" onclick="event.stopPropagation()" style="color:#0369a1;text-decoration:none">📞 ${tel}</a>`:'—'}</td>
        <td>${durBadge(durum)}</td>
        <td onclick="event.stopPropagation()" style="text-align:center;padding:4px;white-space:nowrap">${editBtn}${silBtn}</td>
      </tr>`;
    } else {
      // ── Eski allData modeli (fallback) ──
      const r = row;
      const globalIdx = allData.indexOf(r);
      const _isimKey = r.ISIM_SOYISIM;
      const _adresBilgiObj = window._adresBilgi || {};
      const kbilgi = _adresBilgiObj[_isimKey]
        || _adresBilgiObj[(_isimKey||'').toLowerCase()]
        || _adresBilgiObj[(_isimKey||'').toUpperCase()]
        || (() => { const k = Object.keys(_adresBilgiObj).find(k => k.toLowerCase() === (_isimKey||'').toLowerCase()); return k ? _adresBilgiObj[k] : null; })()
        || KUAFOR_BILGI[_isimKey] || {};
      const yas = hesaplaYas(r.DOGUM_TARIHI || kbilgi.dogum || '');
      return `<tr onclick="showDetail('${esc(r.ISIM_SOYISIM)}','${esc(r['HİZMET'])}','${esc(r.AY)}')" style="cursor:pointer">
        <td><span class="hizmet-dot dot-${HIZMET_COLORS[r['HİZMET']]}"></span><span style="font-size:11px;font-weight:700">${r['HİZMET']}</span></td>
        <td class="name-cell">${r.ISIM_SOYISIM}</td>
        <td class="mahalle-cell">${r.MAHALLE}</td>
        <td style="font-size:11px;font-weight:700;color:var(--purple)">${r.AY}</td>
        ${isKuafor?`
          <td style="white-space:nowrap">${r.SAC1?`<span class="date-chip">${fmt(r.SAC1)}</span>`:''}${r.SAC2?`<span class="date-chip">${fmt(r.SAC2)}</span>`:''}</td>
          <td style="white-space:nowrap">${r.TIRNAK1?`<span class="date-chip">${fmt(r.TIRNAK1)}</span>`:''}${r.TIRNAK2?`<span class="date-chip">${fmt(r.TIRNAK2)}</span>`:''}</td>
          <td style="white-space:nowrap">${r.SAKAL1?`<span class="date-chip">${fmt(r.SAKAL1)}</span>`:''}${r.SAKAL2?`<span class="date-chip">${fmt(r.SAKAL2)}</span>`:''}</td>
        `:`<td>${getBanyolar(r)}</td>`}
        <td style="text-align:center;font-weight:800;font-size:13px;color:${yas&&yas>=75?'#b45309':yas&&yas>=60?'#0369a1':'#374151'}">${yas!==null?yas:'—'}</td>
        <td style="font-size:11px;color:var(--text-soft);max-width:160px">${[r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join(' • ')||'—'}</td>
        <td style="font-size:11px;white-space:nowrap;color:#0369a1">${(()=>{const aktTel=(r.TELEFON_AKTIF==='2'&&r.TELEFON2)?r.TELEFON2:(r.TELEFON||kbilgi.tel||'');return aktTel?`<a href="tel:${aktTel.replace(/\s/g,'')}" onclick="event.stopPropagation()" style="color:#0369a1;text-decoration:none">📞 ${aktTel}</a>`:'—';})()}</td>
        <td>${durBadge(r.DURUM)}</td>
        <td onclick="event.stopPropagation()" style="text-align:center;padding:4px;white-space:nowrap">
          <button class="btn" onclick="openEditModal(${globalIdx})" style="padding:3px 8px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:6px;cursor:pointer" title="Düzenle">✏️</button>
          <button class="btn" onclick="silVatandas(${globalIdx})" style="padding:3px 8px;font-size:11px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;cursor:pointer;margin-left:3px" title="Sil">🗑️</button>
        </td>
      </tr>`;
    }
  }).join('');

  document.getElementById('vat-table').innerHTML = `
    ${thead}
    <tbody>${tbody}
    ${slice.length===0?`<tr><td colspan="10" class="no-data">Kayıt bulunamadı</td></tr>`:''}
    </tbody>`;

  let pags='';
  for(let i=1;i<=tp;i++){
    if(i===1||i===tp||Math.abs(i-vatPage)<=2) pags+=`<button class="page-btn${i===vatPage?' current':''}" onclick="goPage(${i})">${i}</button>`;
    else if(Math.abs(i-vatPage)===3) pags+=`<span>...</span>`;
  }
  document.getElementById('vat-pag').innerHTML=`
    <span class="page-info">${(vatPage-1)*PER+1}-${Math.min(vatPage*PER,total)} / ${total}</span>
    <button class="page-btn" onclick="goPage(${vatPage-1})" ${vatPage===1?'disabled':''}>‹</button>
    ${pags}
    <button class="page-btn" onclick="goPage(${vatPage+1})" ${vatPage===tp?'disabled':''}>›</button>`;
}
function goPage(p){const tp=Math.ceil(vatFiltered.length/PER);if(p<1||p>tp)return;vatPage=p;renderVat();}

// ── VATANDAŞLAR EXCEL İNDİR ──
async function vatExcelIndir() {
  if (!vatFiltered || !vatFiltered.length) { showToast('⚠️ İndirilecek kayıt yok'); return; }
  showToast('⏳ Excel hazırlanıyor...');

  const isKuafor   = vatHizmet === 'KUAFÖR';
  const isBanyo    = vatHizmet === 'KADIN BANYO' || vatHizmet === 'ERKEK BANYO';
  const isTemizlik = vatHizmet === 'TEMİZLİK';

  const colorDefs = [
    { bg: '1A237E', fg: 'FFFFFF', bold: true, sz: 11, align: 'center' },  // 1: header
    { bg: 'E3F2FD', fg: '1565C0', bold: false, align: 'left' },            // 2: bant1
    { bg: 'FFFFFF', fg: '212121', bold: false, align: 'left' },             // 3: bant2
    { bg: 'FFF9C4', fg: '795548', bold: true,  align: 'center' },           // 4: ay
    { bg: 'C8E6C9', fg: '1B5E20', bold: true,  align: 'center' },           // 5: aktif
    { bg: 'FFCDD2', fg: 'B71C1C', bold: true,  align: 'center' },           // 6: iptal/vefat
    { bg: 'E8F5E9', fg: '2E7D32', bold: false, align: 'center' },           // 7: tarih hücresi
  ];
  const SI = { HDR: 1, B1: 2, B2: 3, AY: 4, AKT: 5, PAS: 6, TAR: 7 };

  // Tarih sütunları hizmet türüne göre
  let tarihHeaders = [];
  let tarihWidths  = [];
  if (isKuafor) {
    tarihHeaders = ['Saç 1','Saç 2','Tırnak 1','Tırnak 2','Sakal 1','Sakal 2'];
    tarihWidths  = [13,13,13,13,13,13];
  } else if (isBanyo) {
    tarihHeaders = ['Banyo 1','Banyo 2','Banyo 3','Banyo 4','Banyo 5'];
    tarihWidths  = [13,13,13,13,13];
  } else if (isTemizlik) {
    tarihHeaders = ['Temizlik 1','Temizlik 2','Temizlik 3','Temizlik 4','Temizlik 5'];
    tarihWidths  = [14,14,14,14,14];
  } else {
    // Tümü seçili — genel tarih sütunu
    tarihHeaders = ['Tarih 1','Tarih 2','Tarih 3','Tarih 4','Tarih 5'];
    tarihWidths  = [13,13,13,13,13];
  }

  const fmt = t => {
    if (!t) return '';
    const s = String(t).trim();
    if (s.includes('.')) return s; // zaten GG.MM.YYYY
    if (s.includes('-')) { const [y,m,d]=s.split('-'); return `${d}.${m}.${y}`; }
    return s;
  };

  const HEADERS = ['Hizmet','İsim Soyisim','Mahalle','Ay','Durum','1. Telefon','2. Telefon','Adres','Notlar',...tarihHeaders];
  const WIDTHS  = [18,28,18,12,12,16,16,36,30,...tarihWidths];

  const rows = [{ cells: HEADERS.map(h => ({ v: h, s: SI.HDR })) }];

  vatFiltered.forEach((r, i) => {
    const bs  = i % 2 === 0 ? SI.B1 : SI.B2;
    const dur = (r.DURUM || '').toUpperCase();
    const durS = dur === 'AKTİF' ? SI.AKT : (dur === 'İPTAL' || dur === 'VEFAT' ? SI.PAS : bs);

    let tarihCells = [];
    if (isKuafor) {
      tarihCells = [r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2].map(t=>({ v: fmt(t), s: t ? SI.TAR : bs }));
    } else if (isBanyo || isTemizlik) {
      tarihCells = [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5].map(t=>({ v: fmt(t), s: t ? SI.TAR : bs }));
    } else {
      // Karışık — kuafor mu banyo mu olduğuna bak
      const hz = r['HİZMET'] || '';
      let ts;
      if (hz === 'KUAFÖR') ts = [r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1].map(t=>fmt(t));
      else ts = [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5].map(t=>fmt(t));
      tarihCells = ts.map(t=>({ v: t, s: t ? SI.TAR : bs }));
    }

    rows.push({ cells: [
      { v: r['HİZMET']       || '', s: bs },
      { v: r.ISIM_SOYISIM    || '', s: bs },
      { v: r.MAHALLE         || '', s: bs },
      { v: r.AY              || '', s: SI.AY },
      { v: r.DURUM           || '', s: durS },
      { v: r['1. TELEFON']   || r.TELEFON || '', s: bs },
      { v: r['2. TELEFON']   || '', s: bs },
      { v: r.ADRES           || '', s: bs },
      { v: r.NOT || r.NOTLAR || [r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join(' | ') || '', s: bs },
      ...tarihCells,
    ]});
  });

  const enc = s => new TextEncoder().encode(s);
  const stylesXml = buildStyles(colorDefs);
  const sheetXml  = buildSheet(rows, HEADERS.map((_, i) => i), WIDTHS);

  const zip = await buildZip([
    ['[Content_Types].xml',        enc(CONTENT_TYPES), true],
    ['_rels/.rels',                enc(RELS),          true],
    ['xl/workbook.xml',            enc(WORKBOOK),      false],
    ['xl/_rels/workbook.xml.rels', enc(WB_RELS),       true],
    ['xl/worksheets/sheet1.xml',   enc(sheetXml),      false],
    ['xl/styles.xml',              enc(stylesXml),     false],
  ]);

  const blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `vatandaslar_${vatHizmet.replace(/ /g,'_') || 'tum'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ ${vatFiltered.length} kayıt Excel olarak indirildi`);
}
window.vatExcelIndir = vatExcelIndir;
