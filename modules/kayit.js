// ── KAYIT (Günlük + Yeni Vatandaş + Durum) ──
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
      await firebase.firestore().collection('vatandaslar').doc(rec._fbId).update(
        Object.fromEntries(Object.entries(rec).filter(([k])=>!k.startsWith('_')))
      );
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

function gunlukDuzenleKaydet() {
  if (!window._gunDuzenle) return;
  const { aI, al, dI } = window._gunDuzenle;
  const r = allData[aI]; if (!r) return;

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

  // Her zaman vatandaslar'a yaz
  if (r._fbId) {
    fbUpdateDoc(aI, Object.fromEntries(Object.entries(r).filter(([k])=>!k.startsWith('_'))));
  }
  // Temizlik planını da güncelle
  if (r._tpRef && r._tpFbId) {
    const tp = TP_DATA.find(t=>t._fbId===r._tpFbId);
    if (tp) { tp.sonGidilme = yeniTarih; tp.not_ = not1; }
    firebase.firestore().collection('temizlik_plan').doc(r._tpFbId)
      .update({ sonGidilme: yeniTarih, not_: not1 }).catch(e=>console.warn(e));
    tpRender();
  }

  gunlukDuzenleKapat();
  refreshAll();
  showToast('Kayit guncellendi');
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

function buildAyTabs() {
  const aylar = ['', ...getMevcutAylar()];
  document.getElementById('ay-tab-vat').innerHTML = aylar.map(a=>
    `<button class="ay-btn${a===vatAy?' active':''}" onclick="setAy('${a}',this)">${a?AY_LABELS[a]:'Tümü'}</button>`
  ).join('');
}
function setAy(a,el){vatAy=a;vatPage=1;document.querySelectorAll('#ay-tab-vat .ay-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');filterVat();}

function buildMahFilter() {
  const mahs=[...new Set(allData.map(r=>r.MAHALLE).filter(Boolean))].sort();
  const sel=document.getElementById('vat-mah');
  mahs.forEach(m=>{const o=document.createElement('option');o.value=o.textContent=m;sel.appendChild(o);});
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
function gkIsimSecildi() {
  const hizmet = document.getElementById('gk-hizmet').value;
  const sel = document.getElementById('gk-isim');
  const searchEl = document.getElementById('gk-isim-search');
  if(searchEl && sel.value) searchEl.value = sel.value;
  const val = sel.value.trim().toUpperCase();
  const rec = allData.find(r=>r['HİZMET']===hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===val);
  if (rec) {
    document.getElementById('gk-mah').value = rec.MAHALLE||'';
    document.getElementById('gk-durum-mevcut').value = rec.DURUM||'';
  }
}

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
  const isim = (document.getElementById('gk-isim').value||document.getElementById('gk-isim-search')?.value||'').trim().toUpperCase();
  const tarih = document.getElementById('gk-tarih').value;
  if (!isim) { showToast('Vatandas adi zorunlu'); return; }
  if (!tarih) { showToast('Tarih zorunlu'); return; }

  const hizmet = document.getElementById('gk-hizmet').value;
  const seciliTipler = ['SAC','TIRNAK','SAKAL'].filter(t=>document.getElementById('gk-tip-'+t.toLowerCase())?.checked);
  const not = document.getElementById('gk-not').value;
  const aktifAy = (typeof selectedAy !== 'undefined' && selectedAy) || (typeof vatAy !== 'undefined' && vatAy) || (typeof getSonAy === 'function' ? getSonAy() : '');
  let rec = allData.find(r=>r['HİZMET']===hizmet && r.AY===aktifAy && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===isim);
  if (!rec) {
    rec = allData.find(r=>r['HİZMET']===hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===isim);
  }

  if (!rec) { showToast('Vatandas bulunamadi'); return; }

  const snapshot = JSON.parse(JSON.stringify(rec));
  _gkSetBusy(true, 'Kaydediliyor...');

  try {
    if (hizmet==='KUAFÖR') {
      if (seciliTipler.length === 0) { showToast('Lutfen en az bir hizmet tipi secin'); return; }
      seciliTipler.forEach(t => {
        const fields = t==='SAC'?['SAC1','SAC2']:t==='TIRNAK'?['TIRNAK1','TIRNAK2']:['SAKAL1','SAKAL2'];
        if (!rec[fields[0]]) rec[fields[0]]=tarih; else rec[fields[1]]=tarih;
      });
    } else {
      const fields=['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'];
      const empty=fields.find(f=>!rec[f]);
      if (empty) rec[empty]=tarih; else rec[fields[4]]=tarih;
    }

    if (not) rec.NOT1 = rec.NOT1 ? rec.NOT1+' | '+not : not;

    if (rec._fbId) {
      await _gkVatandasKaydet(rec);
    } else if (!rec._tpRef) {
      throw new Error('Bu kayıt Firebase’de bulunamadı');
    }

    if (rec._tpRef && rec._tpFbId) {
      const sd = { sonGidilme: tarih };
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
    showToast('✅ Kayıt başarılı. Sayfa yenileniyor...');
    localStorage.setItem('postReloadPage', 'gunluk-kayit');
    setTimeout(() => location.reload(), 700);
  } catch (e) {
    const meta = {};
    Object.keys(rec).forEach(k => { if (k.startsWith('_')) meta[k] = rec[k]; });
    Object.keys(rec).forEach(k => delete rec[k]);
    Object.assign(rec, snapshot, meta);
    console.error('Günlük hizmet kaydı hatası:', e);
    showToast('Kayıt tamamlanamadı, tekrar dene');
  } finally {
    _gkSetBusy(false);
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
  const isim = (document.getElementById('gk-isim')?.value || document.getElementById('gk-isim-search')?.value || '').trim().toUpperCase();
  const tarih = document.getElementById('gk-verilemedi-tarih')?.value;
  const aciklama = document.getElementById('gk-verilemedi-aciklama')?.value.trim();
  const hizmet = document.getElementById('gk-hizmet')?.value || '';

  if (!isim) { showToast('Lutfen once vatandas secin'); return; }
  if (!tarih) { showToast('Tarih zorunlu'); return; }
  if (!aciklama) { showToast('Aciklama zorunlu'); return; }

  const tarihTR = (d=>{const[y,m,g]=d.split('-');return g+'.'+m+'.'+y;})(tarih);
  const hizmetEtiket = hizmet === 'TEMİZLİK' ? 'TEMİZLİK' : hizmet === 'KUAFÖR' ? 'KUAFOR' : 'BANYO';
  const notMetin = tarihTR + ' ' + hizmetEtiket + ' VERİLEMEDİ: ' + aciklama.toUpperCase();

  const rec = allData.find(r=>r['HİZMET']===hizmet && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===isim);
  if (rec) {
    rec.NOT1 = rec.NOT1 ? rec.NOT1 + ' | ' + notMetin : notMetin;
    // Tarihi de tarih alanına yaz — günlük listede ve takvimde görünsün
    if (hizmet === 'KUAFÖR') {
      if (!rec.SAC1) rec.SAC1 = tarih; else rec.SAC2 = tarih;
    } else {
      const fields = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'];
      const empty = fields.find(f=>!rec[f]);
      if (empty) rec[empty] = tarih; else rec[fields[4]] = tarih;
    }
    // Temizlik planını güncelle
    if (rec._tpRef && rec._tpFbId) {
      const tp = TP_DATA.find(t=>t._fbId===rec._tpFbId);
      if (tp) { tp.not_ = rec.NOT1; tp.sonGidilme = tarih; }
      firebase.firestore().collection('temizlik_plan').doc(rec._tpFbId)
        .update({ not_: rec.NOT1, sonGidilme: tarih }).catch(e=>console.warn(e));
      tpRender();
    }
    // Her zaman vatandaslar koleksiyonuna da yaz
    if (rec._fbId) {
      fbUpdateDoc(allData.indexOf(rec), Object.fromEntries(Object.entries(rec).filter(([k])=>!k.startsWith('_'))));
    }
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
  showToast(isim + ' - hizmet verilemedi notu eklendi');
}
function gkTemizle() {
  ['gk-isim','gk-isim-search','gk-tarih','gk-not'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sel=document.getElementById('gk-isim');if(sel)sel.style.display='none';
  document.getElementById('gk-mah').value='';
  document.getElementById('gk-durum-mevcut').value='';
  ['gk-tip-sac','gk-tip-tirnak','gk-tip-sakal'].forEach(id=>{const cb=document.getElementById(id);if(cb)cb.checked=false;});
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
    const sonAy = getSonAy();
    const sonrakiAy = sonAy ? getSonrakiAy(sonAy) : AY_LISTESI[0];
    fAy.innerHTML = AY_LISTESI.map(a=>
      `<option value="${a}"${a===sonrakiAy?' selected':''}>${AY_LABELS[a]}</option>`
    ).join('');
  }
}

function saveRec(){
  const isim=document.getElementById('f-isim').value.trim().toUpperCase();
  const mah=document.getElementById('f-mah').value;
  const seciliHizmetler = ['fh-kadin','fh-erkek','fh-kuafor','fh-temizlik']
    .map(id=>document.getElementById(id))
    .filter(cb=>cb&&cb.checked).map(cb=>cb.value);
  if(!isim||!mah){showToast('⚠️ İsim ve mahalle zorunlu');return;}
  if(!seciliHizmetler.length){showToast('⚠️ En az bir hizmet seçin');return;}
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

  seciliHizmetler.forEach(hizmet => {
    const rec={
      ONAY_TARIHI:onay, IPTAL_NEDEN:'',
      ISIM_SOYISIM:isim, MAHALLE:mah, AY:ay,
      'HİZMET':hizmet, CİNSİYET:cins, DURUM:'AKTİF',
      DOGUM_TARIHI:dogum,
      BANYO1:'',BANYO2:'',BANYO3:'',BANYO4:'',BANYO5:'',
      SAC1:'',SAC2:'',TIRNAK1:'',TIRNAK2:'',SAKAL1:'',SAKAL2:'',
      NOT1:not1, NOT2:not2, NOT3:'',
      TELEFON:tel, TELEFON2:tel2, TELEFON_AKTIF:telAktif, ADRES:adres,
    };
    allData.push(rec); newRecs.push(rec);
    fbAddDoc(rec).then(fbId => { rec._fbId = fbId; });
  });
  // adres_bilgi koleksiyonuna da kaydet
  if(tel||adres||dogum){
    const bilgi={tel,tel2,telAktif,adres,dogum};
    firebase.firestore().collection('adres_bilgi').doc(isim).set(bilgi);
    if(!window._adresBilgi)window._adresBilgi={};
    window._adresBilgi[isim]=bilgi;
  }
  buildSidebar(); renderNewTable(); clearForm();
  showToast(`✅ ${isim} — ${seciliHizmetler.length} hizmet kaydedildi`);
}
function clearForm(){
  ['f-isim','f-onay','f-dogum','f-tel','f-tel2','f-adres','f-not1','f-not2'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['fh-kadin','fh-erkek','fh-kuafor','fh-temizlik'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
  const ta=document.getElementById('f-tel-aktif');if(ta)ta.value='1';
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
    // Sadece değişen alanları gönder — daha güvenli ve hızlı
    const changes = { DURUM: yeniDurum, IPTAL_TARIHI: tarih, IPTAL_NEDEN: neden };
    if (neden) changes.NOT1 = r.NOT1;
    fbUpdateDoc(idx, changes);
  });
  duRecs.push({isim,hizmet,eskiDurum,yeniDurum,tarih,neden});
  renderDuTable(); duTemizle();
  refreshAll();
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

function filterVat() {
  const srch=document.getElementById('vat-search').value.toLowerCase();
  const mah=document.getElementById('vat-mah').value;
  const dur=document.getElementById('vat-durum').value;
  vatFiltered=allData.filter(r=>{
    const hOk=!vatHizmet||r['HİZMET']===vatHizmet;
    const aOk=!vatAy||r.AY===vatAy;
    const sOk=!srch||r.ISIM_SOYISIM.toLowerCase().includes(srch)||r.MAHALLE.toLowerCase().includes(srch);
    const mOk=!mah||r.MAHALLE===mah;
    const dOk=!dur||r.DURUM===dur;
    return hOk&&aOk&&sOk&&mOk&&dOk;
  });
  vatPage=1; renderVat();
}

function renderVat() {
  const total=vatFiltered.length;
  const tp=Math.ceil(total/PER);
  const slice=vatFiltered.slice((vatPage-1)*PER,vatPage*PER);
  document.getElementById('vat-count').textContent=`${total} kayıt`;

  const isKuafor = vatHizmet==='KUAFÖR';
  document.getElementById('vat-table').innerHTML=`
    <thead><tr><th>Hizmet</th><th>İsim Soyisim</th><th>Mahalle</th><th>Ay</th>
    ${isKuafor?'<th>Saç</th><th>Tırnak</th><th>Sakal</th>':'<th>Tarihler</th>'}
    <th>Yaş</th><th>Notlar</th><th>Telefon</th><th>Adres</th><th>Durum</th><th style="width:36px"></th></tr></thead>
    <tbody>${slice.map((r,ri)=>{
      const globalIdx=allData.indexOf(r);
      const kbilgi = (window._adresBilgi && window._adresBilgi[r.ISIM_SOYISIM]) || KUAFOR_BILGI[r.ISIM_SOYISIM] || {};
      const yas = hesaplaYas(r.DOGUM_TARIHI);
      return `<tr onclick="showDetail('${esc(r.ISIM_SOYISIM)}','${esc(r['HİZMET'])}','${esc(r.AY)}')" style="cursor:pointer">
      <td><span class="hizmet-dot dot-${HIZMET_COLORS[r['HİZMET']]}"></span><span style="font-size:11px;font-weight:700">${r['HİZMET']}</span></td>
      <td class="name-cell">${r.ISIM_SOYISIM}</td>
      <td class="mahalle-cell">${r.MAHALLE}</td>
      <td style="font-size:11px;font-weight:700;color:var(--purple)">${r.AY}</td>
      ${isKuafor?`
        <td>${r.SAC1?`<span class="date-chip">${fmt(r.SAC1)}</span>`:''}${r.SAC2?`<span class="date-chip">${fmt(r.SAC2)}</span>`:''}</td>
        <td>${r.TIRNAK1?`<span class="date-chip">${fmt(r.TIRNAK1)}</span>`:''}${r.TIRNAK2?`<span class="date-chip">${fmt(r.TIRNAK2)}</span>`:''}</td>
        <td>${r.SAKAL1?`<span class="date-chip">${fmt(r.SAKAL1)}</span>`:''}${r.SAKAL2?`<span class="date-chip">${fmt(r.SAKAL2)}</span>`:''}</td>
      `:`<td>${getBanyolar(r)}</td>`}
      <td style="text-align:center;font-weight:800;font-size:13px;color:${yas&&yas>=75?'#b45309':yas&&yas>=60?'#0369a1':'#374151'}">${yas!==null?yas:'—'}</td>
      <td style="font-size:11px;color:var(--text-soft);max-width:160px">${[r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join(' • ')||'—'}</td>
      <td style="font-size:11px;white-space:nowrap;color:#0369a1">${(()=>{const aktTel=(r.TELEFON_AKTIF==='2'&&r.TELEFON2)?r.TELEFON2:(r.TELEFON||kbilgi.tel||'');return aktTel?`<a href="tel:${aktTel.replace(/\s/g,'')}" onclick="event.stopPropagation()" style="color:#0369a1;text-decoration:none">📞 ${aktTel}</a>`:'—';})()}</td>
      <td style="font-size:11px;color:var(--text-soft);max-width:180px">${r.ADRES||kbilgi.adres||'—'}</td>
      <td>${durBadge(r.DURUM)}</td>
      <td onclick="event.stopPropagation()" style="text-align:center;padding:4px;white-space:nowrap">
        <button class="btn" onclick="openEditModal(${globalIdx})" style="padding:3px 8px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:6px;cursor:pointer" title="Düzenle">✏️</button>
        <button class="btn" onclick="silVatandas(${globalIdx})" style="padding:3px 8px;font-size:11px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;cursor:pointer;margin-left:3px" title="Sil">🗑️</button>
      </td>
    </tr>`;}).join('')}
    ${slice.length===0?'<tr><td colspan="10" class="no-data">Kayıt bulunamadı</td></tr>':''}
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

