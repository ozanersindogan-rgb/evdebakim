// ── VATANDAŞLAR + DETAY + SİLME + KİŞİ BİLGİSİ ──
// ============ MAHALLE ============




// openEditModal ve saveEdit -> app.js'e taşındı

function closeEditModal(){document.getElementById('edit-modal').classList.remove('open'); editIdx=null;}
function saveEdit() {
  if(editIdx===null) return;
  const r = allData[editIdx];
  const isKuafor = r['HİZMET']==='KUAFÖR';
  r.ISIM_SOYISIM = document.getElementById('ed-isim').value.trim().toUpperCase();
  r.MAHALLE      = document.getElementById('ed-mah').value;
  r.DURUM        = document.getElementById('ed-durum').value;
  r.ONAY_TARIHI  = document.getElementById('ed-onay').value;
  r.DOGUM_TARIHI = document.getElementById('ed-dogum')?.value || '';
  r.IPTAL_TARIHI = document.getElementById('ed-iptal')?.value||'';
  r.IPTAL_NEDEN  = document.getElementById('ed-neden').value;
  r.TELEFON      = document.getElementById('ed-tel')?.value.trim() || '';
  r.TELEFON2     = document.getElementById('ed-tel2')?.value.trim() || '';
  r.TELEFON_AKTIF= document.getElementById('ed-tel-aktif')?.value || '1';
  r.ADRES        = document.getElementById('ed-adres')?.value.trim() || '';
  r.NOT1         = document.getElementById('ed-not1').value;
  r.NOT2         = document.getElementById('ed-not2').value;
  // Tarih alanları: input değerini direkt al (boş = sil)
  const getDate = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  if(isKuafor) {
    r.SAC1   = getDate('ed-sac1');
    r.SAC2   = getDate('ed-sac2');
    r.TIRNAK1= getDate('ed-tirnak1');
    r.TIRNAK2= getDate('ed-tirnak2');
    r.SAKAL1 = getDate('ed-sakal1');
    r.SAKAL2 = getDate('ed-sakal2');
  } else {
    r.BANYO1 = getDate('ed-b1');
    r.BANYO2 = getDate('ed-b2');
    r.BANYO3 = getDate('ed-b3');
    r.BANYO4 = getDate('ed-b4');
    r.BANYO5 = getDate('ed-b5');
  }
  if (!r._fbId) {
    showToast('⚠️ Bu kayıt Firebase ID\'si yok, kaydedilemedi');
    closeEditModal();
    return;
  }
  fbUpdateDoc(editIdx, Object.fromEntries(Object.entries(r).filter(([k])=>!k.startsWith('_'))));
  closeEditModal();
  filterVat(); buildSidebar(); renderDashboard();
  showToast(`✅ ${r.ISIM_SOYISIM} güncellendi`);
}

// ============ EXPORT ============
function renderExpStats(){
  const AY_SIRA = window.AY_SIRA;
  const sonAy=[...new Set(allData.map(r=>r.AY).filter(Boolean))].sort((a,b)=>AY_SIRA.indexOf(b)-AY_SIRA.indexOf(a))[0];
  const sonAyData=allData.filter(r=>r.AY===sonAy);
  const aktifler=new Set(sonAyData.filter(r=>r.DURUM==='AKTİF').map(r=>r['HİZMET']+'|'+r.ISIM_SOYISIM));
  const tb=sonAyData.reduce((s,r)=>s+[r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5].filter(Boolean).length,0);
  document.getElementById('exp-stats').innerHTML=`
    <div style="font-size:11px;font-weight:800;color:var(--text-soft);margin-bottom:8px;letter-spacing:.05em">${sonAy||''} AYI İSTATİSTİKLERİ</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">
      <div class="stat-card sc-all"><div class="sv">${sonAyData.length}</div><div class="sl">Toplam Kayıt</div></div>
      <div class="stat-card sc-kadin"><div class="sv">${sonAyData.filter(r=>r['HİZMET']==='KADIN BANYO').length}</div><div class="sl">Kadın Banyo</div></div>
      <div class="stat-card sc-erkek"><div class="sv">${sonAyData.filter(r=>r['HİZMET']==='ERKEK BANYO').length}</div><div class="sl">Erkek Banyo</div></div>
      <div class="stat-card sc-kuafor"><div class="sv">${sonAyData.filter(r=>r['HİZMET']==='KUAFÖR').length}</div><div class="sl">Kuaför</div></div>
      <div class="stat-card sc-temizlik"><div class="sv">${sonAyData.filter(r=>r['HİZMET']==='TEMİZLİK').length}</div><div class="sl">Temizlik</div></div>
      <div class="stat-card sc-all"><div class="sv">${aktifler.size}</div><div class="sl">Aktif Vatandaş</div></div>
      <div class="stat-card sc-all"><div class="sv">${tb}</div><div class="sl">Toplam Ziyaret</div></div>
      <div class="stat-card sc-all"><div class="sv">${new Set(sonAyData.map(r=>r.MAHALLE).filter(Boolean)).size}</div><div class="sl">Mahalle</div></div>
      <div class="stat-card sc-all"><div class="sv">${newRecs.length}</div><div class="sl">Bu Oturum Eklenen</div></div>
    </div>`;
}

function expAll(){
  const rows=[['Hizmet','Ay','İsim Soyisim','Mahalle','Cinsiyet','Tarih1','Tarih2','Tarih3','Tarih4','Tarih5','Not1','Not2','Durum']];
  allData.forEach(r=>rows.push([r['HİZMET'],r.AY,r.ISIM_SOYISIM,r.MAHALLE,r.CİNSİYET||'',r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5,r.NOT1,r.NOT2,r.DURUM]));
  dlCSV(rows,'tum_veriler.csv');showToast('Tüm veri indirildi ✓');
}
function expAktif(){
  const rows=[['Hizmet','Ay','İsim Soyisim','Mahalle','Tarih1','Tarih2','Tarih3','Durum']];
  allData.filter(r=>r.DURUM==='AKTİF').forEach(r=>rows.push([r['HİZMET'],r.AY,r.ISIM_SOYISIM,r.MAHALLE,r.BANYO1,r.BANYO2,r.BANYO3,r.DURUM]));
  dlCSV(rows,'aktif_kayitlar.csv');showToast('Aktif kayıtlar indirildi ✓');
}
function expHizmet(){
  const h=prompt('Hizmet türü? (KADIN BANYO, ERKEK BANYO, KUAFÖR, TEMİZLİK)','KADIN BANYO');
  if(!h) return;
  const data=allData.filter(r=>r['HİZMET']===h.toUpperCase());
  const rows=[['Ay','İsim Soyisim','Mahalle','Tarih1','Tarih2','Tarih3','Durum']];
  data.forEach(r=>rows.push([r.AY,r.ISIM_SOYISIM,r.MAHALLE,r.BANYO1,r.BANYO2,r.BANYO3,r.DURUM]));
  dlCSV(rows,`${h.replace(/ /g,'_').toLowerCase()}.csv`);showToast(h+' indirildi ✓');
}
function expAy(){
  const aylar = getMevcutAylar();
  if(!aylar.length){showToast('Kayıt yok');return;}
  const ay = aylar.length===1 ? aylar[0] : prompt('Ay seçin:\n'+aylar.map((a,i)=>`${i+1}. ${AY_LABELS[a]}`).join('\n')+'\n\nAy adını girin (örn: OCAK):', aylar[aylar.length-1]);
  if(!ay) return;
  const ayUpper = ay.toString().toUpperCase().trim();
  if(!AY_LISTESI.includes(ayUpper)){showToast('Geçersiz ay: '+ay);return;}
  const data=allData.filter(r=>r.AY===ayUpper);
  if(!data.length){showToast(AY_LABELS[ayUpper]+' ayında kayıt yok');return;}
  const rows=[['Hizmet','İsim Soyisim','Mahalle','Tarih1','Tarih2','Tarih3','Durum']];
  data.forEach(r=>rows.push([r['HİZMET'],r.ISIM_SOYISIM,r.MAHALLE,r.BANYO1,r.BANYO2,r.BANYO3,r.DURUM]));
  dlCSV(rows,`${ayUpper.toLowerCase()}_raporu.csv`);showToast(AY_LABELS[ayUpper]+' raporu indirildi ✓');
}
function expMahalle(){
  const rows=[['Mahalle','Hizmet','İsim Soyisim','Ay','Tarih1','Tarih2','Durum']];
  [...allData].sort((a,b)=>a.MAHALLE.localeCompare(b.MAHALLE)).forEach(r=>rows.push([r.MAHALLE,r['HİZMET'],r.ISIM_SOYISIM,r.AY,r.BANYO1,r.BANYO2,r.DURUM]));
  dlCSV(rows,'mahalle_raporu.csv');showToast('Mahalle raporu indirildi ✓');
}

// ============ ARAÇLAR ============
window.arLog = [];
// ============ YENİ AYA TAŞI ============

function taInit() {
  mevcutAySelectDoldur('ta-kaynak', '', true);
  aySelectDoldur('ta-hedef', getSonrakiAy(getSonAy()), true);
}

function taListele() {
  const kaynak  = document.getElementById('ta-kaynak').value;
  const hizmet  = document.getElementById('ta-hizmet').value;
  const liste   = document.getElementById('ta-liste');
  if(!kaynak) { liste.innerHTML='<div style="padding:16px;color:var(--text-soft);font-size:13px;text-align:center">Kaynak ay seçin</div>'; return; }

  const hedef = document.getElementById('ta-hedef').value;
  const hedefIsimler = new Set(hedef ? allData.filter(r=>r.AY===hedef).map(r=>r['HİZMET']+'|'+r.ISIM_SOYISIM) : []);

  const kayitlar = allData.filter(r=>r.AY===kaynak && r.DURUM==='AKTİF' && (!hizmet||r['HİZMET']===hizmet));
  if(!kayitlar.length) { liste.innerHTML='<div style="padding:16px;color:var(--text-soft);font-size:13px;text-align:center">Bu ayda aktif kayıt yok</div>'; return; }

  const HC = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};
  liste.innerHTML = kayitlar.map((r,i) => {
    const key = r['HİZMET']+'|'+r.ISIM_SOYISIM;
    const zatenVar = hedefIsimler.has(key);
    return `<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);cursor:${zatenVar?'default':'pointer'};opacity:${zatenVar?0.4:1}">
      <input type="checkbox" data-idx="${allData.indexOf(r)}" ${zatenVar?'disabled':''} onchange="taSecilenGuncelle()" style="width:15px;height:15px;cursor:pointer">
      <span style="font-size:10px;font-weight:800;color:${HC[r['HİZMET']]||'#455A64'};min-width:70px">${r['HİZMET']}</span>
      <span style="font-weight:700;flex:1">${r.ISIM_SOYISIM}</span>
      <span style="font-size:11px;color:var(--text-soft)">${r.MAHALLE}</span>
      ${zatenVar?'<span style="font-size:10px;color:#f59e0b">zaten var</span>':''}
    </label>`;
  }).join('');
  taSecilenGuncelle();
}

function taSecilenGuncelle() {
  const secilen = document.querySelectorAll('#ta-liste input[type=checkbox]:checked').length;
  document.getElementById('ta-secilen').textContent = secilen + ' seçili';
}

function taTumunuSec(sec) {
  document.querySelectorAll('#ta-liste input[type=checkbox]:not(:disabled)').forEach(cb=>cb.checked=sec);
  taSecilenGuncelle();
}

async function taUygula() {
  const hedef = document.getElementById('ta-hedef').value;
  if(!hedef) { showToast('⚠️ Hedef ay seçin'); return; }

  const seciliIdxler = [...document.querySelectorAll('#ta-liste input[type=checkbox]:checked')]
    .map(cb=>parseInt(cb.dataset.idx));
  if(!seciliIdxler.length) { showToast('⚠️ En az bir vatandaş seçin'); return; }

  const kaynak = document.getElementById('ta-kaynak').value;
  if(kaynak===hedef) { showToast('⚠️ Kaynak ve hedef aynı olamaz'); return; }
  if(!confirm(`${seciliIdxler.length} kayıt ${hedef} ayına taşınacak. Onaylıyor musunuz?`)) return;

  showToast(`⏳ ${seciliIdxler.length} kayıt taşınıyor...`);

  for(let i=0; i<seciliIdxler.length; i+=400) {
    const chunk = seciliIdxler.slice(i,i+400);
    await Promise.all(chunk.map(async idx => {
      const r = allData[idx];
      const yeniKayit = normalizeRecord({
        ISIM_SOYISIM: r.ISIM_SOYISIM, MAHALLE: r.MAHALLE,
        'HİZMET': r['HİZMET'], AY: hedef, DURUM: 'AKTİF',
        CİNSİYET: r.CİNSİYET||'', ONAY_TARIHI: r.ONAY_TARIHI||'',
        IPTAL_NEDEN:'', IPTAL_TARIHI:'', NOT1:'', NOT2:'', NOT3:'',
        BANYO1:'', BANYO2:'', BANYO3:'', BANYO4:'', BANYO5:'',
        SAC1:'', SAC2:'', TIRNAK1:'', TIRNAK2:'', SAKAL1:'', SAKAL2:'',
      });
      const fbId = await fbAddDoc(yeniKayit);
      yeniKayit._fbId = fbId;
      allData.push(yeniKayit);
    }));
  }

  refreshAll(); taListele();
  showToast(`✅ ${seciliIdxler.length} kayıt ${hedef} ayına taşındı!`);
}

function arInitMahalleler() {
  const mahs = [...new Set(allData.map(r=>r.MAHALLE).filter(Boolean))].sort();
  const sel = document.getElementById('ar-eski-mah');
  if(!sel) return;
  sel.innerHTML = '<option value="">— Seçin —</option>' + mahs.map(m=>`<option value="${m}">${m}</option>`).join('');
  const dl = document.getElementById('ar-mah-list');
  if(dl) dl.innerHTML = mahs.map(m=>`<option value="${m}">`).join('');
}
function arPreview() {
  const eski = document.getElementById('ar-eski-mah').value;
  const hizmet = document.getElementById('ar-hizmet').value;
  const yeni = document.getElementById('ar-yeni-mah').value.trim().toUpperCase();
  const prev = document.getElementById('ar-preview');
  if(!eski) { prev.innerHTML='Mahalle seçin, etkilenecek kayıtlar burada görünür.'; return; }
  const etkilenen = allData.filter(r=>r.MAHALLE===eski && (!hizmet||r['HİZMET']===hizmet));
  const hizmetler = {};
  etkilenen.forEach(r=>hizmetler[r['HİZMET']]=(hizmetler[r['HİZMET']]||0)+1);
  const hizStr = Object.entries(hizmetler).map(([h,c])=>`<strong>${h}</strong>: ${c}`).join(' &nbsp;|&nbsp; ');
  if(!etkilenen.length) {
    prev.innerHTML = `<span style="color:#94a3b8">Bu mahallede kayıt bulunamadı.</span>`;
    return;
  }
  prev.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <span style="font-size:22px;font-weight:900;color:var(--primary)">${etkilenen.length}</span>
      <span>kayıt etkilenecek &nbsp;•&nbsp; ${hizStr}</span>
      ${yeni?`<span style="margin-left:auto;color:var(--green);font-weight:700">📍 ${eski} → ${yeni}</span>`:'<span style="color:#f59e0b;font-size:12px">⚠️ Yeni mahalle adı girin</span>'}
    </div>`;
}
function arUygula() {
  const eski = document.getElementById('ar-eski-mah').value;
  const hizmet = document.getElementById('ar-hizmet').value;
  const yeni = document.getElementById('ar-yeni-mah').value.trim().toUpperCase();
  if(!eski) { showToast('⚠️ Mevcut mahalle seçin'); return; }
  if(!yeni) { showToast('⚠️ Yeni mahalle adı girin'); return; }
  if(eski===yeni) { showToast('⚠️ Aynı ismi girdiniz'); return; }
  const etkilenen = allData.filter(r=>r.MAHALLE===eski && (!hizmet||r['HİZMET']===hizmet));
  if(!etkilenen.length) { showToast('⚠️ Etkilenecek kayıt yok'); return; }
  etkilenen.forEach(r=>r.MAHALLE=yeni);
  arLog.push({eski, yeni, hizmet:hizmet||'Tümü', adet:etkilenen.length, zaman:new Date().toLocaleTimeString('tr-TR')});
  etkilenen.forEach(r=>{ const idx=allData.indexOf(r); fbUpdateDoc(idx,{MAHALLE:yeni}); });
  arInitMahalleler();
  arRenderLog(); arTemizle();
  filterVat(); buildSidebar(); renderDashboard();
  showToast(`✅ ${etkilenen.length} kayıt → ${yeni} olarak güncellendi`);
}
function arTemizle() {
  document.getElementById('ar-eski-mah').value='';
  document.getElementById('ar-yeni-mah').value='';
  document.getElementById('ar-hizmet').value='';
  document.getElementById('ar-preview').innerHTML='Mahalle seçin, etkilenecek kayıtlar burada görünür.';
}
function arRenderLog() {
  document.getElementById('ar-count').textContent=arLog.length+' işlem';
  document.getElementById('ar-table').innerHTML = arLog.length===0
    ? '<tr><td class="no-data">Henüz değişiklik yapılmadı</td></tr>'
    : `<thead><tr><th>Eski Mahalle</th><th>Yeni Mahalle</th><th>Hizmet</th><th>Etkilenen</th><th>Saat</th></tr></thead>
       <tbody>${[...arLog].reverse().map(l=>`<tr>
         <td style="color:#ef4444;font-weight:700">${l.eski}</td>
         <td style="color:#22c55e;font-weight:700">${l.yeni}</td>
         <td style="font-size:11px">${l.hizmet}</td>
         <td style="font-weight:800;color:var(--primary)">${l.adet}</td>
         <td style="font-size:11px;color:var(--text-soft)">${l.zaman}</td>
       </tr>`).join('')}</tbody>`;
}

// ═══════════════════════════════════════════════════════════
// VATANDAŞ BİLGİ KARTI — Global Modal
// ═══════════════════════════════════════════════════════════
function _vkNorm(v) {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g,'I').replace(/İ/g,'I')
    .replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/ı/g,'I').replace(/ş/g,'S').replace(/ğ/g,'G').replace(/ü/g,'U').replace(/ö/g,'O').replace(/ç/g,'C');
}

function _vkAdresBilgiBul(isim) {
  const hedef = _vkNorm(isim);
  const map = window._adresBilgi || {};
  for (const [key, val] of Object.entries(map)) {
    if (_vkNorm(key) === hedef) return val || {};
  }
  return {};
}

function showDetail(isim, hizmet, ay) {
  const modal = document.getElementById('vk-modal');
  if (!modal) return;

  const arananIsim = _vkNorm(isim);
  const tumKayitlar = (Array.isArray(allData) ? allData : []).filter(r => _vkNorm(r?.ISIM_SOYISIM) === arananIsim);

  let r;
  if (hizmet && ay) {
    r = tumKayitlar.find(x => x['HİZMET'] === hizmet && x.AY === ay)
      || tumKayitlar.find(x => x['HİZMET'] === hizmet)
      || tumKayitlar[0];
  } else if (hizmet) {
    r = tumKayitlar.find(x => x['HİZMET'] === hizmet) || tumKayitlar[0];
  } else {
    r = tumKayitlar[0];
  }

  const adresBilgiFallback = _vkAdresBilgiBul(isim);

  if (!r) {
    if (!Object.keys(adresBilgiFallback).length) {
      alert('Vatandaş bulunamadı');
      return;
    }

    r = {
      ISIM_SOYISIM: String(isim || '').trim(),
      MAHALLE: adresBilgiFallback.mahalle || '',
      AY: ay || '',
      'HİZMET': hizmet || '',
      DURUM: '',
      TELEFON: adresBilgiFallback.tel || '',
      ADRES: adresBilgiFallback.adres || '',
      TELEFON2: adresBilgiFallback.tel2 || '',
      TELEFON_AKTIF: adresBilgiFallback.telAktif || '1',
      DOGUM_TARIHI: adresBilgiFallback.dogum || '',
      NOT1: '',
      NOT2: '',
      NOT3: '',
      BANYO1: '',
      BANYO2: '',
      BANYO3: '',
      BANYO4: '',
      BANYO5: ''
    };
  }

  const HZ_RENK={'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};
  const renk=HZ_RENK[r['HİZMET']]||'#1A237E';
  document.getElementById('vk-header').style.background=renk;
  document.getElementById('vk-isim').textContent=r.ISIM_SOYISIM;
  const yas = hesaplaYas(r.DOGUM_TARIHI || adresBilgiFallback.dogum || '');
  const yasBilgi = yas !== null ? ` • ${yas} yas` : '';
  document.getElementById('vk-hizmet-badge').textContent=(r['HİZMET']||'')+' • '+(r.MAHALLE||adresBilgiFallback.mahalle||'')+' • '+(r.AY||'')+yasBilgi;
  const adresBilgi = _vkAdresBilgiBul(r.ISIM_SOYISIM);
  const tel=r.TELEFON||adresBilgi.tel||'';
  const tel2=r.TELEFON2||adresBilgi.tel2||'';
  const telAktif=r.TELEFON_AKTIF||adresBilgi.telAktif||'1';
  const aktifTel = telAktif==='2' && tel2 ? tel2 : tel;
  const adresHam=r.ADRES||adresBilgi.adres||'';
  const mahalle=(r.MAHALLE||adresBilgi.mahalle||'').trim();
  const adres=(function(){
    const a=(adresHam||'').trim();
    if(!a) return '';
    if(!mahalle) return a;
    const upA=a.toLocaleUpperCase('tr-TR');
    const upM=mahalle.toLocaleUpperCase('tr-TR');
    if(upA.startsWith(upM+' MAH') || upA.startsWith(upM+' MAHALLE') || upA.startsWith(upM+' MH') || upA.startsWith(upM)) return a;
    return mahalle + ' MAH. ' + a;
  })();
  const hz = r['HİZMET'] || '';
  const tarihler=[];
  if(hz==='KUAFÖR'){
    [['Sac',r.SAC1],['Sac',r.SAC2],['Tirnak',r.TIRNAK1],['Tirnak',r.TIRNAK2],['Sakal',r.SAKAL1],['Sakal',r.SAKAL2]].forEach(([tip,t])=>{if(t)tarihler.push({tip,tarih:t});});
  } else {
    const tip = hz==='KADIN BANYO'?'Kadin Banyo':hz==='ERKEK BANYO'?'Erkek Banyo':hz==='TEMİZLİK'?'Temizlik':hz||'Hizmet';
    [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5].filter(Boolean).forEach(t=>tarihler.push({tip,tarih:t}));
  }
  tarihler.sort((a,b)=>b.tarih.localeCompare(a.tarih));
  const durRenk={'AKTİF':'#C8E6C9|#1B5E20','İPTAL':'#FFCDD2|#B71C1C','VEFAT':'#CFD8DC|#263238','PASİF':'#ECEFF1|#546E7A','BEKLEME':'#FFF9C4|#F57F17'};
  const [dbg,dfg]=(durRenk[r.DURUM]||'#e2e8f0|#475569').split('|');
  const digerHizmetler=(Array.isArray(allData)?allData:[])
    .filter(x=>_vkNorm(x?.ISIM_SOYISIM)===arananIsim && x['HİZMET']!==hz)
    .map(x=>`<span style="background:${HZ_RENK[x['HİZMET']]||'#64748b'}22;color:${HZ_RENK[x['HİZMET']]||'#64748b'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${x['HİZMET']}</span>`)
    .join(' ');
  document.getElementById('vk-body').innerHTML=`
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center">
      <span style="background:${dbg};color:${dfg};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800">${r.DURUM}</span>
      ${digerHizmetler}
    </div>
    ${(tel||tel2||adres)?`<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-bottom:12px">
      ${tel?`<div style="margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:#94a3b8">1. TELEFON</span>
          ${telAktif==='1'?'<span style="font-size:10px;font-weight:800;background:#16a34a;color:#fff;padding:1px 6px;border-radius:8px;margin-left:4px">AKTIF</span>':''}
          <br><a href="tel:${tel.replace(/\s/g,'')}" style="color:#0369a1;font-weight:700;font-size:14px;text-decoration:none">📞 ${tel}</a>
      </div>`:''}
      ${tel2?`<div style="margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:#94a3b8">2. TELEFON</span>
          ${telAktif==='2'?'<span style="font-size:10px;font-weight:800;background:#16a34a;color:#fff;padding:1px 6px;border-radius:8px;margin-left:4px">AKTIF</span>':''}
          <br><a href="tel:${tel2.replace(/\s/g,'')}" style="color:#0369a1;font-weight:700;font-size:14px;text-decoration:none">📞 ${tel2}</a>
      </div>`:''}
      ${adres?`<div><span style="font-size:11px;font-weight:700;color:#94a3b8">ADRES</span><br>
        <span style="font-size:13px;color:#374151">📍 ${adres}</span></div>`:''}
    </div>`:''}
    ${(r.NOT1||r.NOT2||r.NOT3)?`<div style="background:#FFFDE7;border:1px solid #FDD835;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#795548">
      Not: ${[r.NOT1,r.NOT2,r.NOT3].filter(Boolean).join(' • ')}</div>`:''}
    ${(()=>{const tcVal=(r.TC||adresBilgi.TC||'').toString().replace(/\D/g,'');const tcOk=tcVal.length===11;return`<div style="background:#0f172a;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between"><div><span style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:.07em;text-transform:uppercase">T.C. Kimlik No</span><br><span style="font-family:'Courier New',monospace;font-size:17px;font-weight:900;color:${tcOk?'#e2e8f0':'#f87171'};letter-spacing:.1em">${tcOk?tcVal:'Girilmemiş'}</span></div><span style="background:${tcOk?'#1d4ed8':'#dc2626'};color:#fff;border-radius:8px;padding:3px 10px;font-size:10px;font-weight:800">${tcOk?'🪪 TC':'Eksik'}</span></div>`;})()}
    ${(r.DOGUM_TARIHI||adresBilgi.dogum)?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <div><span style="font-size:11px;font-weight:700;color:#94a3b8">DOGUM TARIHI</span><br>
      <span style="font-size:13px;color:#374151;font-weight:600">${r.DOGUM_TARIHI||adresBilgi.dogum||''}</span></div>
      ${yas!==null?`<div style="background:#16a34a;color:#fff;border-radius:12px;padding:4px 14px;font-size:18px;font-weight:900">${yas}</div>`:''}
    </div>`:''}
    ${tarihler.length?`<div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase">${hz} GECMISI (${tarihler.length})</div>
      ${tarihler.map(t=>`<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:7px;margin-bottom:4px;font-size:12px">
        <span style="color:#475569;font-weight:600">${t.tip}</span><span style="font-weight:700;color:#1e40af">${fmt(t.tarih)}</span></div>`).join('')}
    </div>`:'<div style="text-align:center;color:#94a3b8;font-size:13px;padding:8px 0">Henuz kayit yok</div>'}
    ${(typeof hmKartBolumu === 'function') ? hmKartBolumu(r.ISIM_SOYISIM, hz) : ''}
    <div style="display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0">
      ${r._fbId ? `<button onclick="vkKapat();openEditModal(${allData.indexOf(r)})"
        style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;color:#475569">Duzenle</button>` : ''}
      ${aktifTel?`<a href="tel:${aktifTel.replace(/\s/g,'')}"
        style="flex:1;background:${renk};color:#fff;border:none;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;display:block">📞 Ara (Aktif)</a>`:''}
      ${(()=>{const digerTel=telAktif==='2'?tel:tel2;return digerTel?`<a href="tel:${digerTel.replace(/\s/g,'')}" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;display:block;color:#475569">📞 ${telAktif==='2'?'1.':'2.'} Tel</a>`:'';})()}
    </div>`;
  modal.style.display='block';
  document.body.style.overflow='hidden';
}

function vkKapat(){
  const modal=document.getElementById('vk-modal');
  if(modal)modal.style.display='none';
  document.body.style.overflow='';
}
document.addEventListener('click',function(e){
  const modal=document.getElementById('vk-modal');
  if(modal&&e.target===modal)vkKapat();
});

// ============ VATANDAŞ SİLME ============
async function silVatandas(globalIdx) {
  const r = allData[globalIdx];
  if(!r) return;
  // _fbId ile çapraz doğrula — render/filtre arasında index kayabilir
  const hedefFbId = r._fbId;
  const hedefIsim = r.ISIM_SOYISIM;
  if(!confirm(`"${hedefIsim}" adlı kaydı silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz.`)) return;
  try {
    // Onay alındıktan sonra tekrar bul — index değişmiş olabilir
    const guncelIdx = hedefFbId
      ? allData.findIndex(x => x._fbId === hedefFbId)
      : globalIdx;
    if (guncelIdx === -1) { showToast('⚠️ Kayıt bulunamadı, zaten silinmiş olabilir'); refreshAll(); return; }
    if(hedefFbId) {
      await firebase.firestore().collection('vatandaslar').doc(hedefFbId).delete();
    }
    allData.splice(guncelIdx, 1);
    filterVat();
    buildSidebar();
    renderDashboard();
    showToast('🗑️ Kayıt silindi');
  } catch(e) {
    showToast('❌ Silinemedi: ' + e.message);
  }
}

// ============ KİŞİ BİLGİLERİ — GÜNCELLENMİŞ FONKSİYONLAR ============
// Bu bloğu app.js'deki mevcut kbYukle, kbRender fonksiyonlarının yerine yapıştırın
// Ayrıca kbFiltreTemizle ve kbExcelIndir fonksiyonları YENİDİR — ekleyin.

let kbData = [];
let kbEditId = null;

// ── Mahalle listesini doldur (kbYukle içinden çağrılır) ──
function kbMahalleListesiDoldur() {
  const sel = document.getElementById('kb-mahalle-fil');
  if (!sel) return;
  const mahalleler = [...new Set(kbData.map(r => r.MAHALLE).filter(Boolean))].sort();
  const mevcut = sel.value;
  sel.innerHTML = '<option value="">Tüm Mahalleler</option>' +
    mahalleler.map(m => `<option value="${m}"${m === mevcut ? ' selected' : ''}>${m}</option>`).join('');
}

async function kbYukle() {
  try {
    const snap = await firebase.firestore().collection('vatandaslar_bilgi').get();
    kbData = [];
    snap.forEach(d => kbData.push({ _fbId: d.id, ...d.data() }));
    if (kbData.length===0 && allData.length>0) { await kbAllDatadanDoldur(); return; }
    const mevcut=new Set(kbData.map(r=>(r.AD_SOYAD||'').toLocaleUpperCase("tr-TR")));
    const eksik=[...new Set(allData.filter(r=>!r._tpRef).map(r=>r.ISIM_SOYISIM).filter(Boolean))].filter(n=>!mevcut.has(n.toLocaleUpperCase("tr-TR")));
    for (const isim of eksik) {
      const o=allData.find(r=>r.ISIM_SOYISIM===isim);
      const y={AD_SOYAD:isim,MAHALLE:o?.MAHALLE||'',TELEFON:o?.TELEFON||'',ADRES:o?.ADRES||'',DOGUM_TARIHI:o?.DOGUM_TARIHI||'',ENGEL:o?.ENGEL||'Yok',ENGEL_ACIKLAMA:o?.ENGEL_ACIKLAMA||'',TC:o?.TC||'',HIZMET:o?.['HİZMET']||'',HIZMETLER:[...new Set(allData.filter(r=>r.ISIM_SOYISIM===isim).map(r=>r['HİZMET']).filter(Boolean))]};
      const d=await firebase.firestore().collection('vatandaslar_bilgi').add(y);
      kbData.push({_fbId:d.id,...y});
    }
    if (eksik.length) showToast(eksik.length+' yeni kisi eklendi');
    kbMahalleListesiDoldur(); kbRender();
  } catch (e) { showToast('Kisi bilgileri yuklenemedi: '+e.message); }
}
async function kbAllDatadanDoldur() {
  try {
    const tek=[...new Set(allData.filter(r=>!r._tpRef).map(r=>r.ISIM_SOYISIM).filter(Boolean))];
    for (const isim of tek) {
      const o=allData.find(r=>r.ISIM_SOYISIM===isim);
      const y={AD_SOYAD:isim,MAHALLE:o?.MAHALLE||'',TELEFON:o?.TELEFON||'',ADRES:o?.ADRES||'',DOGUM_TARIHI:o?.DOGUM_TARIHI||'',ENGEL:o?.ENGEL||'Yok',ENGEL_ACIKLAMA:o?.ENGEL_ACIKLAMA||'',TC:o?.TC||'',HIZMET:o?.['HİZMET']||'',HIZMETLER:[...new Set(allData.filter(r=>r.ISIM_SOYISIM===isim).map(r=>r['HİZMET']).filter(Boolean))]};
      const d=await firebase.firestore().collection('vatandaslar_bilgi').add(y);
      kbData.push({_fbId:d.id,...y});
    }
    showToast(tek.length+' kisi yuklendi');
    kbMahalleListesiDoldur(); kbRender();
  } catch (e) { showToast('Hata: '+e.message); }
}

function kbYas(dogum) {
  if (!dogum) return null;
  const bugun = new Date();
  const d = new Date(dogum);
  let yas = bugun.getFullYear() - d.getFullYear();
  const m = bugun.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && bugun.getDate() < d.getDate())) yas--;
  return yas;
}

function kbRender() {
  const ara     = (document.getElementById('kb-ara')?.value || '').toLocaleLowerCase('tr-TR');
  const hizmet  = document.getElementById('kb-hizmet')?.value || '';
  const engel   = document.getElementById('kb-engel')?.value || '';
  const mahalle = document.getElementById('kb-mahalle-fil')?.value || '';
  const siralama = document.getElementById('kb-siralama')?.value || 'ad-asc';

  let filtered = kbData.filter(r => {
    if (ara && !(r.AD_SOYAD || '').toLocaleLowerCase("tr-TR").includes(ara)) return false;
    if (hizmet) {
      const hizmetler = Array.isArray(r.HIZMETLER) ? r.HIZMETLER : (r.HIZMET ? [r.HIZMET] : []);
      if (!hizmetler.includes(hizmet)) return false;
    }
    if (mahalle && r.MAHALLE !== mahalle) return false;
    if (engel && r.ENGEL !== engel) return false;
    return true;
  });

  // Sıralama
  filtered.sort((a, b) => {
    switch (siralama) {
      case 'ad-asc':    return (a.AD_SOYAD || '').localeCompare(b.AD_SOYAD || '', 'tr');
      case 'ad-desc':   return (b.AD_SOYAD || '').localeCompare(a.AD_SOYAD || '', 'tr');
      case 'mah-asc':   return (a.MAHALLE || '').localeCompare(b.MAHALLE || '', 'tr');
      case 'mah-desc':  return (b.MAHALLE || '').localeCompare(a.MAHALLE || '', 'tr');
      case 'hizmet-asc':return (a.HIZMET || '').localeCompare(b.HIZMET || '', 'tr');
      case 'yas-asc': {
        const ya = kbYas(a.DOGUM_TARIHI) ?? 999;
        const yb = kbYas(b.DOGUM_TARIHI) ?? 999;
        return ya - yb;
      }
      case 'yas-desc': {
        const ya = kbYas(a.DOGUM_TARIHI) ?? -1;
        const yb = kbYas(b.DOGUM_TARIHI) ?? -1;
        return yb - ya;
      }
      default: return 0;
    }
  });

  const tbl = document.getElementById('kb-table');
  const cnt = document.getElementById('kb-count');
  if (!tbl) return;

  if (cnt) cnt.textContent = filtered.length + ' kayıt';

  if (!filtered.length) {
    tbl.innerHTML = '<tr><td colspan="9" class="no-data">Kayıt bulunamadı</td></tr>';
    return;
  }

  tbl.innerHTML = `
    <thead><tr>
      <th>Ad Soyad</th>
      <th>Hizmet</th>
      <th>Telefon</th>
      <th style="cursor:pointer" onclick="kbSiralamaToggle('mah')">Mahalle ⇅</th>
      <th>Adres</th>
      <th style="cursor:pointer" onclick="kbSiralamaToggle('yas')">Doğum / Yaş ⇅</th>
      <th>Engel</th>
      <th style="width:70px"></th>
    </tr></thead>
    <tbody>${filtered.map(r => {
      const hizmetler = Array.isArray(r.HIZMETLER) && r.HIZMETLER.length
        ? r.HIZMETLER
        : (r.HIZMET ? [r.HIZMET] : []);
      const yas = kbYas(r.DOGUM_TARIHI);
      const dogumStr = r.DOGUM_TARIHI ? fmt(r.DOGUM_TARIHI) : '—';
      const engelRenk = r.ENGEL === 'Var' ? '#dc2626' : '#16a34a';
      return `<tr>
        <td class="name-cell">${r.AD_SOYAD || '—'}</td>
        <td style="font-size:11px;font-weight:700">${hizmetler.map(h =>
          `<span style="display:inline-flex;align-items:center;gap:3px;margin:1px 0">
            <span class="hizmet-dot dot-${HIZMET_COLORS[h] || 'pasif'}"></span>${h}
          </span>`).join('<br>') || '—'}</td>
        <td style="font-size:12px;white-space:nowrap">${r.TELEFON || '—'}</td>
        <td class="mahalle-cell">${r.MAHALLE || '—'}</td>
        <td style="font-size:11px;max-width:180px;word-break:break-word">${r.ADRES || '—'}</td>
        <td style="font-size:12px;white-space:nowrap;text-align:center">
          ${dogumStr}<br>
          ${yas !== null ? `<span style="font-weight:800;color:var(--primary)">${yas} yaş</span>` : ''}
        </td>
        <td style="text-align:center">
          ${r.ENGEL === 'Var'
            ? `<span style="color:${engelRenk};font-weight:700;font-size:11px" title="${r.ENGEL_ACIKLAMA || ''}">⚠️ Var${r.ENGEL_YUZDE?' %'+r.ENGEL_YUZDE:''}<br><span style="font-size:10px;color:#64748b">${r.ENGEL_ACIKLAMA || ''}</span></span>`
            : `<span style="color:${engelRenk};font-weight:700;font-size:11px">✓ Yok</span>`}
        </td>
        <td style="text-align:center;white-space:nowrap">
          <button class="btn" onclick="kbDuzenle('${r._fbId}')" style="padding:3px 8px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:6px;cursor:pointer">✏️</button>
          <button class="btn" onclick="kbSil('${r._fbId}')" style="padding:3px 8px;font-size:11px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;cursor:pointer;margin-left:3px">🗑️</button>
        </td>
      </tr>`;
    }).join('')}</tbody>`;
}

// Tablo başlığına tıklayınca sıralama toggle
function kbSiralamaToggle(alan) {
  const sel = document.getElementById('kb-siralama');
  if (!sel) return;
  const siralama_map = {
    'mah': { asc: 'mah-asc', desc: 'mah-desc' },
    'yas': { asc: 'yas-asc', desc: 'yas-desc' },
  };
  const m = siralama_map[alan];
  if (!m) return;
  sel.value = sel.value === m.asc ? m.desc : m.asc;
  kbRender();
}

// Filtreleri temizle
function kbDuzenle(fbId) {
  if (!fbId) return;
  const r = kbData.find(x => x._fbId === fbId);
  if (!r) { showToast('❌ Kayıt bulunamadı'); return; }
  kbEditId = fbId;
  document.getElementById('kb-modal-title').textContent = '✏️ Kişi Bilgisi Düzenle';
  document.getElementById('kb-modal-body').innerHTML = `
    <div class="form-group"><label>Ad Soyad</label><input class="form-input" id="kbe-ad" type="text" value="${(r.AD_SOYAD||'').replace(/"/g,'&quot;')}"></div>
    <div class="form-group"><label>TC Kimlik No</label><input class="form-input" id="kbe-tc" type="text" value="${r.TC||''}"></div>
    <div class="form-group"><label>Telefon</label><input class="form-input" id="kbe-tel" type="tel" value="${r.TELEFON||''}"></div>
    <div class="form-group"><label>Mahalle</label><input class="form-input" id="kbe-mah" type="text" value="${r.MAHALLE||''}"></div>
    <div class="form-group full"><label>Adres</label><input class="form-input" id="kbe-adres" type="text" value="${(r.ADRES||'').replace(/"/g,'&quot;')}"></div>
    <div class="form-group"><label>Doğum Tarihi</label><input class="form-input" id="kbe-dogum" type="date" value="${r.DOGUM_TARIHI||''}"></div>
    <div class="form-group"><label>Engel</label>
      <select class="form-select" id="kbe-engel">
        <option value="Yok"${r.ENGEL==='Yok'?' selected':''}>Yok</option>
        <option value="Var"${r.ENGEL==='Var'?' selected':''}>Var</option>
      </select>
    </div>
    <div class="form-group"><label>Engel Yüzdesi (%)</label><input class="form-input" id="kbe-engelyuzde" type="number" min="0" max="100" value="${r.ENGEL_YUZDE||''}" placeholder="0-100"></div>
    <div class="form-group full"><label>Engel Açıklaması</label><input class="form-input" id="kbe-engelac" type="text" value="${(r.ENGEL_ACIKLAMA||'').replace(/"/g,'&quot;')}"></div>
  `;
  document.getElementById('kb-modal').classList.add('open');
}

async function kbKaydet() {
  if (!kbEditId) return;
  const r = kbData.find(x => x._fbId === kbEditId);
  if (!r) return;
  const changes = {
    AD_SOYAD:       document.getElementById('kbe-ad')?.value.trim().toUpperCase() || r.AD_SOYAD,
    TC:             document.getElementById('kbe-tc')?.value.trim() || r.TC,
    TELEFON:        document.getElementById('kbe-tel')?.value.trim() || r.TELEFON,
    MAHALLE:        document.getElementById('kbe-mah')?.value.trim().toUpperCase() || r.MAHALLE,
    ADRES:          document.getElementById('kbe-adres')?.value.trim() || r.ADRES,
    DOGUM_TARIHI:   document.getElementById('kbe-dogum')?.value || r.DOGUM_TARIHI,
    ENGEL:          document.getElementById('kbe-engel')?.value || r.ENGEL,
    ENGEL_YUZDE:    document.getElementById('kbe-engelyuzde')?.value || r.ENGEL_YUZDE || '',
    ENGEL_ACIKLAMA: document.getElementById('kbe-engelac')?.value.trim() || r.ENGEL_ACIKLAMA,
  };
  try {
    await firebase.firestore().collection('vatandaslar_bilgi').doc(kbEditId).update(changes);
    Object.assign(r, changes);

    // vatandaslar koleksiyonundaki tüm eşleşen kayıtları da güncelle
    const isim = r.AD_SOYAD || '';
    const engelChanges = {
      ENGEL:          changes.ENGEL,
      ENGEL_YUZDE:    changes.ENGEL_YUZDE,
      ENGEL_ACIKLAMA: changes.ENGEL_ACIKLAMA,
    };
    const eslesenler = allData
      .map((rec, idx) => ({ rec, idx }))
      .filter(({ rec }) => (rec.ISIM_SOYISIM || '').toLocaleUpperCase("tr-TR") === isim.toLocaleUpperCase("tr-TR"));

    await Promise.all(eslesenler.map(({ rec, idx }) => {
      Object.assign(rec, engelChanges);
      return fbUpdateDoc(idx, engelChanges);
    }));

    kbCloseModal();
    kbRender();
    showToast('✅ Kişi bilgisi güncellendi');
  } catch(e) {
    showToast('❌ Güncelleme hatası: ' + e.message);
  }
}

function kbCloseModal() {
  document.getElementById('kb-modal').classList.remove('open');
  kbEditId = null;
}

async function kbSil(fbId) {
  if (!fbId) return;
  const r = kbData.find(x => x._fbId === fbId);
  if (!r) return;
  if (!confirm(`"${r.AD_SOYAD}" kişisini silmek istediğinize emin misiniz?`)) return;
  try {
    await firebase.firestore().collection('vatandaslar_bilgi').doc(fbId).delete();
    kbData = kbData.filter(x => x._fbId !== fbId);
    kbRender();
    showToast('🗑️ Kayıt silindi');
  } catch(e) {
    showToast('❌ Silme hatası: ' + e.message);
  }
}

function kbFiltreTemizle() {
  const ids = ['kb-ara', 'kb-hizmet', 'kb-mahalle-fil', 'kb-engel'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sir = document.getElementById('kb-siralama');
  if (sir) sir.value = 'ad-asc';
  kbRender();
}

// ── Excel İndir ──
async function kbExcelIndir() {
  const ara     = (document.getElementById('kb-ara')?.value || '').toLocaleLowerCase("tr-TR");
  const hizmet  = document.getElementById('kb-hizmet')?.value || '';
  const engel   = document.getElementById('kb-engel')?.value || '';
  const mahalle = document.getElementById('kb-mahalle-fil')?.value || '';
  const siralama = document.getElementById('kb-siralama')?.value || 'ad-asc';

  let filtered = kbData.filter(r => {
    if (ara && !(r.AD_SOYAD || '').toLocaleLowerCase("tr-TR").includes(ara)) return false;
    if (hizmet) {
      const hizmetler = Array.isArray(r.HIZMETLER) ? r.HIZMETLER : (r.HIZMET ? [r.HIZMET] : []);
      if (!hizmetler.includes(hizmet)) return false;
    }
    if (mahalle && r.MAHALLE !== mahalle) return false;
    if (engel && r.ENGEL !== engel) return false;
    return true;
  });

  filtered.sort((a, b) => {
    switch (siralama) {
      case 'ad-asc':    return (a.AD_SOYAD || '').localeCompare(b.AD_SOYAD || '', 'tr');
      case 'ad-desc':   return (b.AD_SOYAD || '').localeCompare(a.AD_SOYAD || '', 'tr');
      case 'mah-asc':   return (a.MAHALLE || '').localeCompare(b.MAHALLE || '', 'tr');
      case 'mah-desc':  return (b.MAHALLE || '').localeCompare(a.MAHALLE || '', 'tr');
      case 'hizmet-asc':return (a.HIZMET || '').localeCompare(b.HIZMET || '', 'tr');
      case 'yas-asc': {
        const ya = kbYas(a.DOGUM_TARIHI) ?? 999;
        const yb = kbYas(b.DOGUM_TARIHI) ?? 999;
        return ya - yb;
      }
      case 'yas-desc': {
        const ya = kbYas(a.DOGUM_TARIHI) ?? -1;
        const yb = kbYas(b.DOGUM_TARIHI) ?? -1;
        return yb - ya;
      }
      default: return 0;
    }
  });

  if (!filtered.length) { showToast('⚠️ İndirilecek kayıt yok'); return; }

  showToast('⏳ Excel hazırlanıyor...');

  // Renk şeması
  const colorDefs = [
    { bg: '1A237E', fg: 'FFFFFF', bold: true, sz: 11, align: 'center' }, // 1: header
    { bg: 'E3F2FD', fg: '1565C0', bold: false, align: 'left' },           // 2: bant1
    { bg: 'FFFFFF', fg: '212121', bold: false, align: 'left' },            // 3: bant2
    { bg: 'C8E6C9', fg: '1B5E20', bold: true, align: 'center' },          // 4: engel yok
    { bg: 'FFCDD2', fg: 'B71C1C', bold: true, align: 'center' },          // 5: engel var
    { bg: 'E8F5E9', fg: '2E7D32', bold: false, align: 'center' },         // 6: yaş
  ];

  const SI = { HDR: 1, B1: 2, B2: 3, ENOK: 4, EVAR: 5, YAS: 6 };

  const HEADERS = ['Ad Soyad', 'Hizmet(ler)', 'Telefon', 'Mahalle', 'Adres', 'Doğum Tarihi', 'Yaş', 'Engel', 'Engel Açıklaması', 'TC'];
  const WIDTHS  = [28, 22, 16, 18, 36, 14, 8, 10, 24, 14];

  const rows = [{ cells: HEADERS.map(h => ({ v: h, s: SI.HDR })) }];

  filtered.forEach((r, i) => {
    const bs = i % 2 === 0 ? SI.B1 : SI.B2;
    const hizmetler = Array.isArray(r.HIZMETLER) && r.HIZMETLER.length ? r.HIZMETLER : (r.HIZMET ? [r.HIZMET] : []);
    const yas = kbYas(r.DOGUM_TARIHI);
    rows.push({ cells: [
      { v: r.AD_SOYAD || '',              s: bs },
      { v: hizmetler.join(' | '),         s: bs },
      { v: r.TELEFON || '',               s: bs },
      { v: r.MAHALLE || '',               s: bs },
      { v: r.ADRES || '',                 s: bs },
      { v: r.DOGUM_TARIHI ? fmt(r.DOGUM_TARIHI) : '', s: bs },
      { v: yas !== null ? yas : '',       s: SI.YAS },
      { v: r.ENGEL || '',                 s: r.ENGEL === 'Var' ? SI.EVAR : SI.ENOK },
      { v: r.ENGEL_ACIKLAMA || '',        s: bs },
      { v: r.TC || '',                    s: bs },
    ]});
  });

  // buildStyles ve buildSheet app.js'de zaten mevcut
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
  a.download = `kisi_bilgileri_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ ${filtered.length} kayıt Excel olarak indirildi`);
}

// GLOBAL ÇAĞRILABİLİR KART AÇICI
window.openVatandasCard = function(isim){
  try {
    if(typeof showDetail !== 'function'){
      alert('Kart sistemi yüklenmedi');
      return;
    }

    const hedef = _vkNorm(isim);
    const kayit = (Array.isArray(allData) ? allData : []).find(x => _vkNorm(x?.ISIM_SOYISIM) === hedef);

    if (kayit) {
      showDetail(kayit.ISIM_SOYISIM, kayit['HİZMET'] || 'TEMİZLİK', kayit.AY || '');
      return;
    }

    const adresBilgi = _vkAdresBilgiBul(isim);
    if (Object.keys(adresBilgi).length) {
      showDetail(String(isim || '').trim(), 'TEMİZLİK');
      return;
    }

    alert('Vatandaş bulunamadı');
  } catch(e){
    console.error(e);
    alert('Kart açılırken hata oluştu');
  }
}
