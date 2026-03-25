// ── ADRES & TELEFON + YEDEKLEME ──
// ═══════════════════════════════════════════════════════════
// ADRES & TELEFON YÖNETİMİ
// ═══════════════════════════════════════════════════════════
window._adresBilgi = {};

async function adresBilgiYukle() {
  try {
    const snap = await firebase.firestore().collection('adres_bilgi').get();
    window._adresBilgi = {};
    snap.forEach(d => { window._adresBilgi[d.id] = d.data(); });
    if (snap.empty && typeof KUAFOR_BILGI !== 'undefined') {
      showToast('Adres verileri aktarılıyor...');
      const entries = Object.entries(KUAFOR_BILGI);
      for (let i = 0; i < entries.length; i += 400) {
        await Promise.all(entries.slice(i,i+400).map(([isim,bilgi]) =>
          firebase.firestore().collection('adres_bilgi').doc(isim).set({tel:bilgi.tel||'',adres:bilgi.adres||''})
        ));
        entries.slice(i,i+400).forEach(([isim,bilgi]) => {
          window._adresBilgi[isim] = {tel:bilgi.tel||'',adres:bilgi.adres||''};
        });
      }
      showToast('✅ Adres verileri aktarıldı');
    }
  } catch(e) {
    console.warn('adres_bilgi yuklenemedi:', e);
    window._adresBilgi = {};
    if (typeof KUAFOR_BILGI !== 'undefined') {
      Object.entries(KUAFOR_BILGI).forEach(([isim,bilgi]) => {
        window._adresBilgi[isim] = {tel:bilgi.tel||'',adres:bilgi.adres||''};
      });
    }
  }
}

// Manuel tekli ekleme
const ADRES_MAHALLELER = ['ALACAMESCİT','BAYRAKLIDEDE','CAMİATİK','CAMİKEBİR','CUMHURİYET','DAVUTLAR','DAĞ','DEĞİRMENDERE','EGE','GÜZELÇAMLI','HACIFEYZULLAH','KADINLAR DENİZİ','KARAOVA','SOĞUCAK','TÜRKMEN','YAVANSU','İKİÇEŞMELİK'];
const ADRES_HIZMETLER = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];

async function adresManuelEkle() {
  const isim=(document.getElementById('am-isim')?.value||'').trim().toUpperCase();
  const tel=(document.getElementById('am-tel')?.value||'').trim();
  const tel2=(document.getElementById('am-tel2')?.value||'').trim();
  const telAktif=document.getElementById('am-tel-aktif')?.value||'1';
  const adresV=(document.getElementById('am-adres')?.value||'').trim();
  const mahalle=(document.getElementById('am-mahalle')?.value||'').trim();
  const dogumRaw=(document.getElementById('am-dogum')?.value||'').trim();
  const hizmetler = ['amh-kadin','amh-erkek','amh-kuafor','amh-temizlik']
    .map(id=>document.getElementById(id)).filter(cb=>cb&&cb.checked).map(cb=>cb.value);
  if(!isim){showToast('⚠️ İsim zorunlu');return;}
  // YYYY-MM-DD → DD.MM.YYYY
  let dogum=dogumRaw;
  if(/^\d{4}-\d{2}-\d{2}$/.test(dogumRaw)){const[y,m,d]=dogumRaw.split('-');dogum=`${d}.${m}.${y}`;}
  try {
    const bilgi={tel,tel2,telAktif,adres:adresV,dogum};
    await firebase.firestore().collection('adres_bilgi').doc(isim).set(bilgi);
    if(!window._adresBilgi)window._adresBilgi={};
    window._adresBilgi[isim]=bilgi;
    // allData güncelle
    allData.forEach(r=>{
      if(r.ISIM_SOYISIM===isim){
        if(tel) r.TELEFON=tel;
        if(tel2)r.TELEFON2=tel2;
        if(telAktif)r.TELEFON_AKTIF=telAktif;
        if(adresV)r.ADRES=adresV;
        if(mahalle)r.MAHALLE=mahalle;
        if(dogum)r.DOGUM_TARIHI=dogum;
      }
    });
    // vatandaslar koleksiyonu güncelle
    const changes={};
    if(tel)     changes.TELEFON=tel;
    if(tel2)    changes.TELEFON2=tel2;
    if(telAktif)changes.TELEFON_AKTIF=telAktif;
    if(adresV)  changes.ADRES=adresV;
    if(mahalle) changes.MAHALLE=mahalle;
    if(dogum)   changes.DOGUM_TARIHI=dogum;
    if(Object.keys(changes).length){
      // Hizmet seçiliyse sadece o hizmetlerin kayıtlarını güncelle, değilse tümünü
      const ilgili=allData.filter(r=>r.ISIM_SOYISIM===isim&&r._fbId&&(!hizmetler.length||hizmetler.includes(r['HİZMET'])));
      await Promise.all(ilgili.map(r=>firebase.firestore().collection('vatandaslar').doc(r._fbId).update(changes)));
    }
    ['am-isim','am-tel','am-tel2','am-adres','am-dogum'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const mahEl=document.getElementById('am-mahalle');if(mahEl)mahEl.value='';
    ['amh-kadin','amh-erkek','amh-kuafor','amh-temizlik'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
    const aktEl=document.getElementById('am-tel-aktif');if(aktEl)aktEl.value='1';
    showToast('✅ '+isim+' eklendi/güncellendi');
    adresRender();
  } catch(e){showToast('Hata: '+e.message);}
}

function adresRender() {
  const ara = (document.getElementById('adres-ara')?.value||'').toUpperCase();
  const tablo = document.getElementById('adres-table');
  const sayac = document.getElementById('adres-count');
  // Manuel ekleme formunu yerleştir (her açılışta güncelle — mahalle listesi dinamik)
  const manuelContainer = document.getElementById('adres-manuel-form') || (() => {
    const div=document.createElement('div');div.id='adres-manuel-form';
    tablo && tablo.parentNode && tablo.parentNode.insertBefore(div, tablo);
    return div;
  })();
  if(manuelContainer) {
    const mahOpts = ADRES_MAHALLELER.map(m=>`<option value="${m}">${m}</option>`).join('');
    manuelContainer.innerHTML=`
      <div style="background:#EEF2FF;border:1.5px solid #c7d2fe;border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="font-weight:800;color:#1A237E;font-size:13px;margin-bottom:10px">➕ Manuel Tekli Kayıt Ekle / Güncelle</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">

          <div style="flex:1;min-width:150px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">İSİM SOYİSİM *</label>
            <input id="am-isim" type="text" placeholder="AHMET YILMAZ"
              style="width:100%;padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px;text-transform:uppercase">
          </div>

          <div style="min-width:130px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">MAHALLE</label>
            <select id="am-mahalle" style="width:100%;padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px;background:#fff">
              <option value="">Seçin...</option>${mahOpts}
            </select>
          </div>

          <div style="min-width:130px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px">HİZMET TÜRÜ</label>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-kadin" value="KADIN BANYO" style="width:15px;height:15px;accent-color:#C2185B"> <span style="color:#C2185B;font-weight:700">Kadın Banyo</span>
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-erkek" value="ERKEK BANYO" style="width:15px;height:15px;accent-color:#1565C0"> <span style="color:#1565C0;font-weight:700">Erkek Banyo</span>
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-kuafor" value="KUAFÖR" style="width:15px;height:15px;accent-color:#2E7D32"> <span style="color:#2E7D32;font-weight:700">Kuaför</span>
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-temizlik" value="TEMİZLİK" style="width:15px;height:15px;accent-color:#E65100"> <span style="color:#E65100;font-weight:700">Temizlik</span>
              </label>
            </div>
          </div>

          <div style="min-width:120px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">1. TELEFON</label>
            <input id="am-tel" type="tel" placeholder="532 123 45 67"
              style="width:100%;padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px">
          </div>

          <div style="min-width:120px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">2. TELEFON</label>
            <input id="am-tel2" type="tel" placeholder="533 987 65 43"
              style="width:100%;padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px">
          </div>

          <div style="min-width:120px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">AKTİF TELEFON</label>
            <select id="am-tel-aktif" style="width:100%;padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px;background:#fff">
              <option value="1">1. Telefon</option>
              <option value="2">2. Telefon</option>
            </select>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">DOĞUM TARİHİ</label>
            <input id="am-dogum" type="date"
              style="padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px">
          </div>

          <div style="flex:2;min-width:180px">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">ADRES</label>
            <input id="am-adres" type="text" placeholder="Sokak, No, Daire"
              style="width:100%;padding:7px 10px;border:1.5px solid #c7d2fe;border-radius:7px;font-size:13px">
          </div>

          <button onclick="adresManuelEkle()"
            style="background:#1A237E;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">
            💾 Kaydet
          </button>
        </div>
        <div style="font-size:11px;color:#6366f1;margin-top:6px">💡 Mevcut ismi yazarsanız bilgileri güncellenir. Hizmet türü seçerseniz sadece o hizmet kaydı güncellenir, boş bırakırsanız tümü.</div>
      </div>`;
  }
  if (!tablo) return;
  const tumIsimler = Object.keys(window._adresBilgi).sort();
  const filtered = ara ? tumIsimler.filter(k=>k.includes(ara)) : tumIsimler;
  if (sayac) sayac.textContent = filtered.length+' kayıt';
  if (!filtered.length) {
    tablo.innerHTML='<tr><td style="text-align:center;padding:24px;color:#94a3b8">Kayıt bulunamadı — Excel yükleyin</td></tr>';
    return;
  }
  tablo.innerHTML=`
    <thead><tr style="background:#1A237E;color:#fff">
      <th style="padding:9px 12px;text-align:left">İSİM SOYİSİM</th>
      <th style="padding:9px 12px;text-align:left">HİZMET</th>
      <th style="padding:9px 12px;text-align:left">TELEFON</th>
      <th style="padding:9px 12px;text-align:left">DOGUM / YAŞ</th>
      <th style="padding:9px 12px;text-align:left">MAHALLE</th>
      <th style="padding:9px 12px;text-align:left">ADRES</th>
      <th style="padding:9px 8px;width:40px"></th>
    </tr></thead>
    <tbody>
      ${filtered.map((isim,i)=>{
        const b=window._adresBilgi[isim]||{};
        const vd=allData.find(x=>x.ISIM_SOYISIM===isim);
        const mahalle=vd?.MAHALLE||'';
        const dogum=vd?.DOGUM_TARIHI||b.dogum||'';
        // DD.MM.YYYY → YYYY-MM-DD (input type=date için)
        const dogumInput=(()=>{if(!dogum)return'';if(/^\d{2}\.\d{2}\.\d{4}$/.test(dogum)){const[d,m,y]=dogum.split('.');return`${y}-${m}-${d}`;}return dogum;})();
        const yas=hesaplaYas(dogum);
        const hizmetler=[...new Set(allData.filter(x=>x.ISIM_SOYISIM===isim).map(x=>x['HİZMET']).filter(Boolean))];
        const HZ_RENK={'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFOR':'#2E7D32','TEMİZLİK':'#E65100'};
        const bg=i%2===0?'#fff':'#f8fafc';
        const ev=s=>String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
        return `<tr style="background:${bg}" id="adres-row-${i}">
          <td style="padding:8px 12px;font-weight:700;border-bottom:1px solid #e2e8f0;font-size:12px">${isim}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px">
            ${hizmetler.length?hizmetler.map(h=>`<span style="background:${HZ_RENK[h]||'#64748b'}18;color:${HZ_RENK[h]||'#64748b'};padding:1px 7px;border-radius:8px;font-weight:700;white-space:nowrap;display:inline-block;margin:1px">${h}</span>`).join(''):'<span style="color:#94a3b8">—</span>'}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0369a1">
            ${(()=>{
              const aktifTel=(b.telAktif==='2'&&b.tel2)?b.tel2:(b.tel||'');
              const diger=(b.telAktif==='2'&&b.tel2)?b.tel:(b.tel2||'');
              return (aktifTel?`<a href="tel:${aktifTel.replace(/\s/g,'')}" style="color:#0369a1;text-decoration:none;display:block">📞 ${aktifTel}</a>`:'<span style="color:#94a3b8">—</span>')
                    +(diger?`<span style="color:#94a3b8;font-size:11px">📞 ${diger}</span>`:'');
            })()}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px">
            ${dogum?`<span style="color:#374151">${dogum}</span>${yas!==null?` <span style="background:#16a34a;color:#fff;border-radius:8px;padding:1px 7px;font-weight:800;font-size:11px">${yas}</span>`:''}` : '<span style="color:#94a3b8">—</span>'}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#7c3aed">${mahalle||'—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#546E7A">${b.adres||'—'}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;white-space:nowrap">
            <button onclick="adresEditAc('${ev(isim)}')"
              style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px;color:#475569;margin-right:4px">✏️</button>
            <button onclick="adresSil('${ev(isim)}')"
              style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px;color:#dc2626">🗑️</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>`;
}

function adresDuzenle(){} // artık kullanılmıyor

async function adresSil(isim) {
  if(!confirm(`"${isim}" kişisini adres listesinden silmek istediğinize emin misiniz?\n(Vatandaş kaydı silinmez, sadece adres/telefon listesinden çıkar)`)) return;
  try {
    await firebase.firestore().collection('adres_bilgi').doc(isim).delete();
    delete window._adresBilgi[isim];
    showToast('🗑️ '+isim+' adres listesinden silindi');
    adresRender();
  } catch(e){showToast('Hata: '+e.message);}
}

function adresEditAc(isim) {
  const b = window._adresBilgi[isim] || {};
  const vd = allData.find(x => x.ISIM_SOYISIM === isim);
  const mahalle = vd?.MAHALLE || '';
  const dogum = vd?.DOGUM_TARIHI || b.dogum || '';
  const toD = (val) => {
    if(!val) return '';
    if(/^\d{2}\.\d{2}\.\d{4}$/.test(val)){const[d,m,y]=val.split('.');return`${y}-${m}-${d}`;}
    return val;
  };

  // Kişi kartı stili header
  const HZ_RENK = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};
  const hizmetler = [...new Set(allData.filter(x=>x.ISIM_SOYISIM===isim).map(x=>x['HİZMET']).filter(Boolean))];
  // Header rengini ilk hizmetten al, yoksa koyu mavi
  const headerRenk = hizmetler.length ? (HZ_RENK[hizmetler[0]] || '#1A237E') : '#1A237E';
  const yas = hesaplaYas(dogum);

  const header = document.getElementById('adres-edit-modal-header');
  if(header) header.style.background = `linear-gradient(135deg, ${headerRenk}, ${headerRenk}cc)`;

  const isimEl = document.getElementById('adres-edit-modal-isim');
  if(isimEl) isimEl.textContent = isim;

  const altEl = document.getElementById('adres-edit-modal-alt');
  if(altEl) {
    const hizBadges = hizmetler.map(h=>
      `<span style="background:rgba(255,255,255,0.25);padding:1px 8px;border-radius:10px;font-weight:700;font-size:11px">${h}</span>`
    ).join('');
    const mahBadge = mahalle ? `<span style="opacity:.9">📍 ${mahalle}</span>` : '';
    const yasBadge = yas !== null ? `<span style="background:rgba(255,255,255,0.2);padding:1px 8px;border-radius:10px;font-weight:700">${yas} yaş</span>` : '';
    altEl.innerHTML = hizBadges + mahBadge + yasBadge;
  }

  // Form alanlarını doldur
  document.getElementById('aem-tel').value = b.tel || '';
  document.getElementById('aem-tel2').value = b.tel2 || '';
  document.getElementById('aem-tel-aktif').value = b.telAktif || '1';
  document.getElementById('aem-dogum').value = toD(dogum);
  document.getElementById('aem-adres').value = b.adres || '';

  // Mahalle select
  const mahSel = document.getElementById('aem-mahalle');
  if(mahSel) {
    mahSel.innerHTML = '<option value="">Seçin...</option>' +
      ADRES_MAHALLELER.map(m=>`<option value="${m}"${m===mahalle?' selected':''}>${m}</option>`).join('');
  }

  const modal = document.getElementById('adres-edit-modal');
  if(modal) { modal.dataset.isim = isim; modal.style.display = 'flex'; }
  document.body.style.overflow = 'hidden';
}

function adresEditKapat() {
  const modal = document.getElementById('adres-edit-modal');
  if(modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

async function adresEditKaydet() {
  const modal = document.getElementById('adres-edit-modal');
  const isim = modal?.dataset.isim;
  if(!isim) return;
  const tel      = (document.getElementById('aem-tel')?.value||'').trim();
  const tel2     = (document.getElementById('aem-tel2')?.value||'').trim();
  const telAktif = document.getElementById('aem-tel-aktif')?.value || '1';
  const adres    = (document.getElementById('aem-adres')?.value||'').trim();
  const mahalle  = document.getElementById('aem-mahalle')?.value || '';
  const dogumRaw = (document.getElementById('aem-dogum')?.value||'').trim();
  // YYYY-MM-DD → DD.MM.YYYY
  let dogum = dogumRaw;
  if(/^\d{4}-\d{2}-\d{2}$/.test(dogumRaw)){const[y,m,d]=dogumRaw.split('-');dogum=`${d}.${m}.${y}`;}
  try {
    const bilgi = {tel, tel2, telAktif, adres, dogum};
    // 1) adres_bilgi güncelle
    await firebase.firestore().collection('adres_bilgi').doc(isim).set(bilgi);
    if(!window._adresBilgi) window._adresBilgi = {};
    window._adresBilgi[isim] = bilgi;
    // 2) allData (bellek) güncelle
    allData.forEach(r => {
      if(r.ISIM_SOYISIM !== isim) return;
      if(tel)     r.TELEFON       = tel;
      if(tel2)    r.TELEFON2      = tel2;
      if(telAktif)r.TELEFON_AKTIF = telAktif;
      if(adres)   r.ADRES         = adres;
      if(mahalle) r.MAHALLE       = mahalle;
      if(dogum)   r.DOGUM_TARIHI  = dogum;
    });
    // 3) vatandaslar koleksiyonu güncelle
    const changes = {};
    if(tel)     changes.TELEFON       = tel;
    if(tel2)    changes.TELEFON2      = tel2;
    if(telAktif)changes.TELEFON_AKTIF = telAktif;
    if(adres)   changes.ADRES         = adres;
    if(mahalle) changes.MAHALLE       = mahalle;
    if(dogum)   changes.DOGUM_TARIHI  = dogum;
    if(Object.keys(changes).length) {
      const ilgili = allData.filter(r => r.ISIM_SOYISIM === isim && r._fbId);
      await Promise.all(ilgili.map(r =>
        firebase.firestore().collection('vatandaslar').doc(r._fbId).update(changes)
      ));
    }
    showToast('✅ ' + isim + ' güncellendi');
    adresEditKapat();
    adresRender();
  } catch(e) { showToast('Hata: ' + e.message); }
}

async function adresIndir() {
  const isimSet=new Set();
  allData.forEach(r=>{if(r.ISIM_SOYISIM)isimSet.add(r.ISIM_SOYISIM);});
  Object.keys(window._adresBilgi).forEach(k=>isimSet.add(k));
  const tumIsimler=[...isimSet].sort();
  if(!tumIsimler.length){showToast('Kayıt yok');return;}
  try {
    const te=new TextEncoder();const enc=s=>te.encode(s);
    const escXml=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const ss=[];const ssIdx={};
    const S=v=>{const k=String(v==null?'':v);if(!k)return null;if(ssIdx[k]===undefined){ssIdx[k]=ss.length;ss.push(k);}return ssIdx[k];};
    const dataRows=[
      ['İSİM SOYİSİM','1. TELEFON','2. TELEFON','AKTİF TEL','MAHALLE','ADRES','DOGUM TARİHİ','HİZMET(LER)'],
      ...tumIsimler.map(isim=>{
        const b=window._adresBilgi[isim]||{};
        const r=allData.find(x=>x.ISIM_SOYISIM===isim);
        const hizmetler=[...new Set(allData.filter(x=>x.ISIM_SOYISIM===isim).map(x=>x['HİZMET']).filter(Boolean))].join(' | ');
        const dogum=b.dogum||r?.DOGUM_TARIHI||'';
        const aktifLabel=b.telAktif==='2'?'2. Telefon':'1. Telefon';
        return[isim,b.tel||r?.TELEFON||'',b.tel2||r?.TELEFON2||'',aktifLabel,r?.MAHALLE||'',b.adres||r?.ADRES||'',dogum,hizmetler];
      })
    ];
    dataRows.forEach(row=>row.forEach(v=>{if(v)S(v);}));
    const COLS='ABCDEF'.split('');
    let rowsXml='';
    dataRows.forEach((row,ri)=>{
      let cx='';
      row.forEach((v,ci)=>{
        const ref=COLS[ci]+(ri+1);
        const idx=S(v);
        if(idx===null)cx+=`<c r="${ref}" s="0"/>`;
        else cx+=`<c r="${ref}" s="${ri===0?0:1}" t="s"><v>${idx}</v></c>`;
      });
      rowsXml+=`<row r="${ri+1}" ht="18" customHeight="1">${cx}</row>`;
    });
    const sharedXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s=>`<si><t xml:space="preserve">${escXml(s)}</t></si>`).join('')}</sst>`;
    const fontsXml='<font><sz val="11"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF263238"/><name val="Calibri"/></font>';
    const fillsXml='<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1A237E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>';
    const cellXfs='<xf numFmtId="0" fontId="0" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>';
    const stylesXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2">${fontsXml}</fonts><fills count="4">${fillsXml}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2">${cellXfs}</cellXfs></styleSheet>`;
    const sheetXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/><col min="4" max="4" width="45" customWidth="1"/><col min="5" max="5" width="16" customWidth="1"/><col min="6" max="6" width="28" customWidth="1"/></cols><sheetData>${rowsXml}</sheetData></worksheet>`;
    const wbXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Adres Listesi" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
    const APP_RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const CT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;
    const zip=await buildZip([['[Content_Types].xml',enc(CT),true],['_rels/.rels',enc(APP_RELS),true],['xl/workbook.xml',enc(wbXml),false],['xl/_rels/workbook.xml.rels',enc(RELS),true],['xl/worksheets/sheet1.xml',enc(sheetXml),false],['xl/styles.xml',enc(stylesXml),false],['xl/sharedStrings.xml',enc(sharedXml),false]]);
    const blob=new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='adres_telefon.xlsx';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    showToast('Excel indirildi: '+tumIsimler.length+' kişi');
  } catch(e){console.error(e);showToast('Hata: '+e.message);}
}

async function adresYukle(input) {
  const file=input.files[0];if(!file)return;
  const durumEl=document.getElementById('adres-durum');
  if(durumEl)durumEl.innerHTML='<div style="color:#0369a1;font-size:13px">⏳ Okunuyor...</div>';
  try {
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array'});
    const sheet=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    const dataRows=rows[0]&&rows[0][0].toString().toUpperCase().includes('İSİM')?rows.slice(1):rows;
    const yeniVeri={};let eklenen=0;
    dataRows.forEach(row=>{
      const isim=(row[0]||'').toString().trim().toUpperCase();
      const tel=(row[1]||'').toString().trim();
      const adres=(row[3]||row[2]||'').toString().trim();
      const dogum=(row[4]||'').toString().trim();
      if(isim){yeniVeri[isim]={tel,adres,dogum};eklenen++;}
    });
    if(!eklenen){showToast('Geçerli satır bulunamadı');return;}

    // 1) adres_bilgi koleksiyonunu güncelle
    if(durumEl)durumEl.innerHTML=`<div style="color:#0369a1;font-size:13px">⏳ ${eklenen} adres kaydı yazılıyor...</div>`;
    const mevcutSnap=await firebase.firestore().collection('adres_bilgi').get();
    if(!mevcutSnap.empty){
      for(let i=0;i<mevcutSnap.docs.length;i+=400){
        await Promise.all(mevcutSnap.docs.slice(i,i+400).map(d=>d.ref.delete()));
      }
    }
    const entries=Object.entries(yeniVeri);
    for(let i=0;i<entries.length;i+=400){
      await Promise.all(entries.slice(i,i+400).map(([isim,bilgi])=>
        firebase.firestore().collection('adres_bilgi').doc(isim).set(bilgi)
      ));
    }
    window._adresBilgi=yeniVeri;

    // 2) allData (bellek) güncelle
    allData.forEach(r=>{
      const b=window._adresBilgi[r.ISIM_SOYISIM];
      if(b){
        if(b.tel)  r.TELEFON=b.tel;
        if(b.adres)r.ADRES=b.adres;
        if(b.dogum)r.DOGUM_TARIHI=b.dogum;
      }
    });

    // 3) vatandaslar koleksiyonunu da güncelle (sadece değişen alanlar)
    if(durumEl)durumEl.innerHTML=`<div style="color:#0369a1;font-size:13px">⏳ Vatandaş kayıtları güncelleniyor...</div>`;
    let vatGuncellenen=0;
    const vatGuncellenecek=allData.filter(r=>{
      const b=yeniVeri[r.ISIM_SOYISIM];
      return b && r._fbId && (b.tel||b.adres||b.dogum);
    });
    for(let i=0;i<vatGuncellenecek.length;i+=400){
      await Promise.all(vatGuncellenecek.slice(i,i+400).map(r=>{
        const b=yeniVeri[r.ISIM_SOYISIM];
        const changes={};
        if(b.tel)  changes.TELEFON=b.tel;
        if(b.adres)changes.ADRES=b.adres;
        if(b.dogum)changes.DOGUM_TARIHI=b.dogum;
        vatGuncellenen++;
        return firebase.firestore().collection('vatandaslar').doc(r._fbId).update(changes);
      }));
    }

    if(durumEl)durumEl.innerHTML=`<div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:10px 14px;color:#1B5E20;font-size:13px;font-weight:700">
      ✅ ${eklenen} adres kaydı güncellendi!<br>
      <span style="font-weight:400;font-size:12px">👥 ${vatGuncellenen} vatandaş kaydı da güncellendi</span>
    </div>`;
    input.value='';adresRender();showToast(`✅ ${eklenen} adres, ${vatGuncellenen} vatandaş güncellendi`);
  } catch(e){console.error(e);if(durumEl)durumEl.innerHTML=`<div style="color:#B71C1C">Hata: ${e.message}</div>`;}
}

