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
// Mahalle listesi: allData'dan canlı + sabit liste birleşimi
const _ADRES_MAH_SABIT = ['ALACAMESCİT','BAYRAKLIDEDE','CAFERLİ','CAMİATİK','CAMİKEBİR','CUMHURİYET',
  'DAVUTLAR','DAĞ','DEĞİRMENDERE','EGE','GÜZELÇAMLI','HACIFEYZULLAH','İKİÇEŞMELİK',
  'KADIKALESİ','KADINLAR DENİZİ','KARAOVA','KİRAZLI','SOĞUCAK','TÜRKMEN','YAVANSU','YAYLAKÖY','YENİKÖY'];
function getAdresMahalleler() {
  const dinamik = (typeof allData !== 'undefined')
    ? allData.map(r => r.MAHALLE).filter(Boolean)
    : [];
  return [...new Set([..._ADRES_MAH_SABIT, ...dinamik])].sort((a,b) => a.localeCompare(b,'tr'));
}
const ADRES_MAHALLELER = _ADRES_MAH_SABIT; // geriye dönük uyumluluk
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

// ── DURUM ──────────────────────────────
window._adresSortKol = 'isim';
window._adresSortDir = 1;
window._adresHizmetFiltre = new Set(); // boş = HEPSI

function adresHizmetFiltre(hz) {
  const s = window._adresHizmetFiltre;
  if (hz === 'HEPSI') { s.clear(); }
  else {
    if (s.has(hz)) s.delete(hz); else s.add(hz);
    if (s.size === 0) {} // hepsi gibi
  }
  // Buton görünümlerini güncelle
  const secilenler = [...s];
  const BTN = { 'HEPSI':'afh-hepsi','KADIN BANYO':'afh-kadin','ERKEK BANYO':'afh-erkek','KUAFÖR':'afh-kuafor','TEMİZLİK':'afh-temizlik' };
  const HZ_RENK = { 'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100' };
  Object.entries(BTN).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const aktif = key === 'HEPSI' ? s.size === 0 : s.has(key);
    const renk = key === 'HEPSI' ? '#1A237E' : (HZ_RENK[key] || '#1A237E');
    el.style.background = aktif ? renk : '#fff';
    el.style.color       = aktif ? '#fff' : renk;
  });
  adresRender();
}

function adresFiltreSifirla() {
  ['adres-ara','af-mahalle','af-telefon','af-adres'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  window._adresHizmetFiltre.clear();
  adresHizmetFiltre('HEPSI');
}

function adresSortBy(kol) {
  if (window._adresSortKol === kol) window._adresSortDir *= -1;
  else { window._adresSortKol = kol; window._adresSortDir = 1; }
  adresRender();
}

function adresRender() {
  const araVal    = (document.getElementById('adres-ara')?.value     || '').toUpperCase();
  const mAra      = (document.getElementById('af-mahalle')?.value    || '').toUpperCase();
  const tAra      = (document.getElementById('af-telefon')?.value    || '').replace(/\s/g,'');
  const aAra      = (document.getElementById('af-adres')?.value      || '').toUpperCase();
  const hzFiltre  = window._adresHizmetFiltre || new Set();
  const tablo     = document.getElementById('adres-table');
  const sayac     = document.getElementById('adres-count');

  // Manuel ekleme formunu yerleştir
  const manuelContainer = document.getElementById('adres-manuel-form') || (() => {
    const div = document.createElement('div'); div.id = 'adres-manuel-form';
    tablo && tablo.parentNode && tablo.parentNode.insertBefore(div, tablo);
    return div;
  })();
  if (manuelContainer) {
    const mahOpts = getAdresMahalleler().map(m => `<option value="${m}">${m}</option>`).join('');
    manuelContainer.innerHTML = `
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
                <input type="checkbox" id="amh-kadin"    value="KADIN BANYO" style="width:15px;height:15px;accent-color:#C2185B"> <span style="color:#C2185B;font-weight:700">Kadın Banyo</span></label>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-erkek"    value="ERKEK BANYO" style="width:15px;height:15px;accent-color:#1565C0"> <span style="color:#1565C0;font-weight:700">Erkek Banyo</span></label>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-kuafor"   value="KUAFÖR"      style="width:15px;height:15px;accent-color:#2E7D32"> <span style="color:#2E7D32;font-weight:700">Kuaför</span></label>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="amh-temizlik" value="TEMİZLİK"   style="width:15px;height:15px;accent-color:#E65100"> <span style="color:#E65100;font-weight:700">Temizlik</span></label>
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
        <div style="font-size:11px;color:#6366f1;margin-top:6px">💡 Mevcut ismi yazarsanız bilgileri güncellenir.</div>
      </div>`;
  }

  if (!tablo) return;

  // Sadece adres_bilgi koleksiyonundaki isimler (allData birleşimi kaldırıldı)
  let tumIsimler = Object.keys(window._adresBilgi || {});

  // Her isim için önce temel veri objesi oluştur
  let rows = tumIsimler.map(isim => {
    const b   = (window._adresBilgi || {})[isim] || {};
    const vd  = (allData||[]).find(x => x.ISIM_SOYISIM === isim) || {};
    const hizmetler = [...new Set((allData||[]).filter(x => x.ISIM_SOYISIM === isim).map(x => x['HİZMET']).filter(Boolean))];
    const mahalle   = vd.MAHALLE || b.mahalle || '';
    const dogum     = vd.DOGUM_TARIHI || b.dogum || '';
    const aktifTel  = (b.telAktif === '2' && b.tel2) ? b.tel2 : (b.tel || vd.TELEFON || '');
    const digerTel  = (b.telAktif === '2' && b.tel2) ? b.tel  : (b.tel2 || vd.TELEFON2 || '');
    const adresV    = b.adres || vd.ADRES || '';
    return { isim, b, vd, hizmetler, mahalle, dogum, aktifTel, digerTel, adresV };
  });

  // HİZMET FİLTRESİ
  if (hzFiltre.size > 0) {
    rows = rows.filter(r => r.hizmetler.some(h => hzFiltre.has(h)));
  }

  // GENEL ARAMA
  if (araVal) {
    rows = rows.filter(r =>
      r.isim.includes(araVal) ||
      r.mahalle.toUpperCase().includes(araVal) ||
      r.adresV.toUpperCase().includes(araVal) ||
      r.aktifTel.replace(/\s/g,'').includes(araVal) ||
      r.digerTel.replace(/\s/g,'').includes(araVal)
    );
  }

  // SÜTUN FİLTRELERİ
  if (mAra) rows = rows.filter(r => r.mahalle.toUpperCase().includes(mAra));
  if (tAra) rows = rows.filter(r =>
    r.aktifTel.replace(/\s/g,'').includes(tAra) || r.digerTel.replace(/\s/g,'').includes(tAra));
  if (aAra) rows = rows.filter(r => r.adresV.toUpperCase().includes(aAra));

  // SIRALAMA
  const kol = window._adresSortKol || 'isim';
  const dir = window._adresSortDir || 1;
  const kolVal = r => {
    if (kol === 'isim')    return r.isim;
    if (kol === 'mahalle') return r.mahalle;
    if (kol === 'tel')     return r.aktifTel;
    if (kol === 'adres')   return r.adresV;
    if (kol === 'dogum')   return r.dogum;
    if (kol === 'hizmet')  return r.hizmetler.join(',');
    return '';
  };
  rows.sort((a, b) => dir * kolVal(a).localeCompare(kolVal(b), 'tr'));

  if (sayac) sayac.textContent = rows.length + ' kayıt';

  const HZ_RENK = { 'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100' };
  const HZ_BG   = { 'KADIN BANYO':'#fce4ec','ERKEK BANYO':'#e3f2fd','KUAFÖR':'#e8f5e9','TEMİZLİK':'#fff3e0' };
  const TUMU    = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];

  const sIcon = (k) => {
    if (window._adresSortKol !== k) return '⇅';
    return window._adresSortDir === 1 ? '↑' : '↓';
  };
  const thStyle = "padding:9px 11px;text-align:left;cursor:pointer;white-space:nowrap;user-select:none";
  const ev = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');

  if (!rows.length) {
    tablo.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8">Kayıt bulunamadı</td></tr>';
    return;
  }

  tablo.innerHTML = `
    <thead>
      <tr style="background:#1A237E;color:#fff">
        <th style="${thStyle}" onclick="adresSortBy('isim')">İSİM SOYİSİM ${sIcon('isim')}</th>
        <th style="${thStyle}" onclick="adresSortBy('hizmet')">HİZMET ${sIcon('hizmet')}</th>
        <th style="${thStyle}" onclick="adresSortBy('tel')">TELEFON ${sIcon('tel')}</th>
        <th style="${thStyle}" onclick="adresSortBy('dogum')">DOGUM / YAŞ ${sIcon('dogum')}</th>
        <th style="${thStyle}" onclick="adresSortBy('mahalle')">MAHALLE ${sIcon('mahalle')}</th>
        <th style="${thStyle}" onclick="adresSortBy('adres')">ADRES ${sIcon('adres')}</th>
        <th style="padding:9px 8px;width:40px"></th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => {
        const dogumInput = (()=>{
          const d = r.dogum;
          if (!d) return '';
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) { const [dd,mm,yy]=d.split('.'); return `${yy}-${mm}-${dd}`; }
          return d;
        })();
        const yas = hesaplaYas(r.dogum);
        const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
        const isimEsc = ev(r.isim);

        // HİZMET inline pill'leri — tıklanınca toggle
        const hizPills = TUMU.map(hz => {
          const aktif = r.hizmetler.includes(hz);
          const renkF = aktif ? HZ_RENK[hz] : '#cbd5e1';
          const bgF   = aktif ? HZ_BG[hz]   : '#f1f5f9';
          return `<span
            onclick="adresHizmetDegistir('${isimEsc}','${hz}')"
            title="${aktif ? hz + ' — kaldırmak için tıkla' : hz + ' — eklemek için tıkla'}"
            style="background:${bgF};color:${renkF};padding:2px 8px;border-radius:10px;
              font-weight:700;font-size:10px;white-space:nowrap;display:inline-block;
              margin:1px;cursor:pointer;border:1.5px solid ${renkF};
              transition:all .15s;${aktif?'':'opacity:.5'}">
            ${hz === 'KADIN BANYO' ? '♀ K.Banyo' : hz === 'ERKEK BANYO' ? '♂ E.Banyo' : hz === 'KUAFÖR' ? '✂ Kuaför' : '🧹 Temiz.'}
          </span>`;
        }).join('');

        const telHtml = r.aktifTel
          ? `<a href="tel:${r.aktifTel.replace(/\s/g,'')}" style="color:#0369a1;text-decoration:none">📞 ${r.aktifTel}</a>
             ${r.digerTel ? `<div style="color:#94a3b8;font-size:11px">📞 ${r.digerTel}</div>` : ''}`
          : '<span style="color:#94a3b8">—</span>';

        const dogumHtml = r.dogum
          ? `${r.dogum}${yas !== null ? ` <span style="background:#16a34a;color:#fff;border-radius:8px;padding:1px 6px;font-weight:800;font-size:11px">${yas}</span>` : ''}`
          : '<span style="color:#94a3b8">—</span>';

        return `<tr style="background:${bg}" id="adres-row-${i}">
          <td style="padding:8px 11px;font-weight:700;border-bottom:1px solid #e2e8f0;font-size:12px;color:#1A237E;cursor:pointer;text-decoration:underline dotted"
              onclick="adresKisiKartiAc('${isimEsc}')">${r.isim}</td>
          <td style="padding:6px 11px;border-bottom:1px solid #e2e8f0">${hizPills}</td>
          <td style="padding:8px 11px;border-bottom:1px solid #e2e8f0;font-size:12px">${telHtml}</td>
          <td style="padding:8px 11px;border-bottom:1px solid #e2e8f0;font-size:12px">${dogumHtml}</td>
          <td style="padding:8px 11px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#7c3aed">${r.mahalle||'—'}</td>
          <td style="padding:8px 11px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#546E7A">${r.adresV||'—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;white-space:nowrap">
            <button onclick="adresEditAc('${isimEsc}')"
              style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px;margin-right:3px">✏️</button>
            <button onclick="adresSil('${isimEsc}')"
              style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px;color:#dc2626">🗑️</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>`;
}

// ── İNLINE HİZMET TOGGLE ─────────────────────────────────
async function adresHizmetDegistir(isim, hizmet) {
  const kayitlar = (allData||[]).filter(r => r.ISIM_SOYISIM === isim);
  const mevcutHizmetler = [...new Set(kayitlar.map(r => r['HİZMET']).filter(Boolean))];
  const varMi = mevcutHizmetler.includes(hizmet);

  if (varMi) {
    // Kaldır: o hizmetin kaydını iptal et (DURUM=İPTAL)
    if (!confirm(`"${isim}" kişisinin "${hizmet}" hizmetini kaldırmak istiyor musunuz?\n(Kayıtlar silinmez, pasife alınır)`)) return;
    const ilgili = kayitlar.filter(r => r['HİZMET'] === hizmet && r._fbId);
    await Promise.all(ilgili.map(r => {
      r.DURUM = 'İPTAL';
      return firebase.firestore().collection('vatandaslar').doc(r._fbId).update({ DURUM: 'İPTAL' });
    }));
    showToast(`✅ ${hizmet} pasife alındı`);
  } else {
    // Ekle: mevcut en son kayıttan kopyala
    if (!confirm(`"${isim}" kişisine "${hizmet}" hizmetini eklemek istiyor musunuz?`)) return;
    const referans = kayitlar[0] || {};
    const sonAy = (allData||[]).filter(r => r.AY).map(r => r.AY)
      .sort((a,b) => AY_TAM.indexOf(b) - AY_TAM.indexOf(a))[0] || 'OCAK';
    const yeni = {
      ISIM_SOYISIM: isim,
      MAHALLE: referans.MAHALLE || '',
      'HİZMET': hizmet,
      AY: sonAy,
      DURUM: 'AKTİF',
      CİNSİYET: hizmet === 'ERKEK BANYO' ? 'ERKEK' : (hizmet === 'KADIN BANYO' ? 'KADIN' : (referans.CİNSİYET || '')),
      TELEFON: referans.TELEFON || '',
      TELEFON2: referans.TELEFON2 || '',
      ADRES: referans.ADRES || '',
      DOGUM_TARIHI: referans.DOGUM_TARIHI || '',
      BANYO1:'',BANYO2:'',BANYO3:'',BANYO4:'',BANYO5:'',
      SAC1:'',SAC2:'',TIRNAK1:'',TIRNAK2:'',SAKAL1:'',SAKAL2:''
    };
    const fbId = await fbAddDoc(yeni);
    yeni._fbId = fbId;
    allData.push(yeni);
    showToast(`✅ ${hizmet} eklendi`);
  }
  adresRender();
}
window.adresHizmetDegistir = adresHizmetDegistir;
window.adresSortBy = adresSortBy;
window.adresHizmetFiltre = adresHizmetFiltre;
window.adresFiltreSifirla = adresFiltreSifirla;


function adresDuzenle(){} // artık kullanılmıyor

function _adresNormText(v='') {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/İ/g,'I').replace(/İ/g,'I')
    .replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/ı/g,'I').replace(/ş/g,'S').replace(/ğ/g,'G').replace(/ü/g,'U').replace(/ö/g,'O').replace(/ç/g,'C');
}

function _adresBosDegerler() {
  return { TELEFON:'', TELEFON2:'', TELEFON_AKTIF:'1', ADRES:'', DOGUM_TARIHI:'', MAHALLE:'' };
}

async function _adresVatandasAlanlariniTemizle(durumEl) {
  const targets = allData.filter(r => r && r._fbId);
  const bos = _adresBosDegerler();
  let sayi = 0;

  for (const r of allData) Object.assign(r, bos);

  for(let i=0; i<targets.length; i+=400) {
    const chunk = targets.slice(i, i+400);
    await Promise.all(chunk.map(r =>
      firebase.firestore().collection('vatandaslar').doc(r._fbId).update(bos)
    ));
    sayi += chunk.length;
    if(durumEl) durumEl.innerHTML = `<div style="color:#b45309;font-size:13px">⏳ Vatandaş kayıtları temizleniyor... (${sayi}/${targets.length})</div>`;
  }
  return targets.length;
}

async function adresSil(isim) {
  if(!confirm(`"${isim}" kişisini adres listesinden silmek istediğinize emin misiniz?
(Vatandaş kaydı silinmez, sadece adres/telefon listesinden çıkar)`)) return;
  try {
    await firebase.firestore().collection('adres_bilgi').doc(isim).delete();
    delete window._adresBilgi[isim];
    showToast('🗑️ '+isim+' adres listesinden silindi');
    adresRender();
  } catch(e){showToast('Hata: '+e.message);}
}

async function adresTumunuTemizle() {
  const durumEl = document.getElementById('adres-durum');
  const toplamAdres = Object.keys(window._adresBilgi || {}).length;
  const toplamVatandas = allData.filter(r => r && r._fbId).length;
  const onay = confirm(
    `Adres & Telefon listesindeki TÜM kayıtlar silinecek.

- ${toplamAdres} adres kaydı silinecek
- ${toplamVatandas} vatandaş kaydındaki adres/telefon alanları boşaltılacak

Vatandaş kayıtları tamamen silinmez; sadece adres, telefon, mahalle ve doğum tarihi alanları temizlenir. Devam edilsin mi?`
  );
  if(!onay) return;

  try {
    if(durumEl) durumEl.innerHTML = '<div style="color:#b45309;font-size:13px">⏳ Adres kayıtları siliniyor...</div>';
    const snap = await firebase.firestore().collection('adres_bilgi').get();
    if(!snap.empty) {
      for(let i=0; i<snap.docs.length; i+=400) {
        await Promise.all(snap.docs.slice(i, i+400).map(d => d.ref.delete()));
        if(durumEl) durumEl.innerHTML = `<div style="color:#b45309;font-size:13px">⏳ Adres kayıtları siliniyor... (${Math.min(i+400, snap.docs.length)}/${snap.docs.length})</div>`;
      }
    }

    window._adresBilgi = {};
    const vatTemizlenen = await _adresVatandasAlanlariniTemizle(durumEl);
    if(durumEl) durumEl.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;color:#991b1b;font-size:13px;font-weight:700">🧹 Tüm adres/telefon verileri temizlendi.<br><span style="font-weight:400;font-size:12px">🗑️ ${toplamAdres} adres kaydı silindi • 👥 ${vatTemizlenen} vatandaş kaydı temizlendi</span></div>`;
    showToast(`🧹 ${toplamAdres} adres kaydı silindi, ${vatTemizlenen} vatandaş kaydı temizlendi`);
    refreshAll();
    adresRender();
  } catch(e) {
    console.error(e);
    if(durumEl) durumEl.innerHTML = `<div style="color:#B71C1C">Hata: ${e.message}</div>`;
    showToast('Hata: ' + e.message);
  }
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
      getAdresMahalleler().map(m=>`<option value="${m}"${m===mahalle?' selected':''}>${m}</option>`).join('');
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
  // Sadece adres_bilgi koleksiyonundaki isimler
  const tumIsimler = Object.keys(window._adresBilgi || {}).sort((a,b) => a.localeCompare(b,'tr'));
  if (!tumIsimler.length) { showToast('Kayıt yok'); return; }

  try {
    const te  = new TextEncoder();
    const enc = s => te.encode(s);
    const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // ── Shared Strings ──────────────────────────────────────────
    const ss = []; const ssIdx = {};
    const S = v => {
      const k = String(v==null?'':v);
      if (!k) return null;
      if (ssIdx[k] === undefined) { ssIdx[k] = ss.length; ss.push(k); }
      return ssIdx[k];
    };

    // ── Veri satırları ──────────────────────────────────────────
    // Sütunlar: A İSİM | B HİZMET | C 1.TEL | D 2.TEL | E MAHALLE | F ADRES | G DOĞUM | H YAŞ
    const BASLIK = ['İSİM SOYİSİM','HİZMET(LER)','1. TELEFON','2. TELEFON','MAHALLE','ADRES','DOĞUM TARİHİ','YAŞ'];

    const dataRows = [BASLIK, ...tumIsimler.map(isim => {
      const b  = (window._adresBilgi||{})[isim] || {};
      const vd = (allData||[]).find(x => x.ISIM_SOYISIM === isim) || {};
      const hizmetler = [...new Set((allData||[]).filter(x=>x.ISIM_SOYISIM===isim).map(x=>x['HİZMET']).filter(Boolean))].join(' | ');
      const dogum = b.dogum || vd.DOGUM_TARIHI || '';
      const yas   = (() => {
        if (!dogum) return '';
        let d = dogum;
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) { const [dd,mm,yy]=d.split('.'); d=`${yy}-${mm}-${dd}`; }
        const diff = Date.now() - new Date(d).getTime();
        const y = Math.floor(diff / (365.25*24*3600*1000));
        return isNaN(y)||y<0||y>120 ? '' : String(y);
      })();
      const tel1 = b.tel  || vd.TELEFON  || '';
      const tel2 = b.tel2 || vd.TELEFON2 || '';
      const mah  = vd.MAHALLE || b.mahalle || '';
      const adresV = b.adres || vd.ADRES || '';
      return [isim, hizmetler, tel1, tel2, mah, adresV, dogum, yas];
    })];

    // Shared strings indexle
    dataRows.forEach(row => row.forEach(v => { if(v) S(v); }));

    // ── Sütun referansları (A–H) ──────────────────────────────
    const COLS = ['A','B','C','D','E','F','G','H'];

    // ── Styles ───────────────────────────────────────────────────
    // Stil indeksleri:
    // 0 = başlık  (koyu lacivert arka plan, beyaz kalın yazı, kenarlık, ortalı)
    // 1 = normal tek  (beyaz, ince kenarlık, sol hizalı)
    // 2 = normal çift (açık gri zebra, ince kenarlık, sol hizalı)
    // 3 = hizmet (lacivert tint, ince kenarlık)
    // 4 = tel     (mavi tint)
    // 5 = yas     (yeşil, kalın, ortalı)

    const borderDef = `<border><left style="thin"><color rgb="FFD0D0D0"/></left><right style="thin"><color rgb="FFD0D0D0"/></right><top style="thin"><color rgb="FFD0D0D0"/></top><bottom style="thin"><color rgb="FFD0D0D0"/></bottom><diagonal/></border>`;
    const borderHeader = `<border><left style="medium"><color rgb="FF1A237E"/></left><right style="medium"><color rgb="FF1A237E"/></right><top style="medium"><color rgb="FF1A237E"/></top><bottom style="medium"><color rgb="FF1A237E"/></bottom><diagonal/></border>`;

    const fontsXml = [
      `<font><sz val="11"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>`,   // 0 başlık
      `<font><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>`,         // 1 normal
      `<font><sz val="10"/><b/><color rgb="FF1A237E"/><name val="Calibri"/></font>`,     // 2 isim
      `<font><sz val="10"/><color rgb="FF1A237E"/><name val="Calibri"/></font>`,         // 3 hizmet
      `<font><sz val="10"/><color rgb="FF0369A1"/><name val="Calibri"/></font>`,         // 4 tel
      `<font><sz val="10"/><b/><color rgb="FF166534"/><name val="Calibri"/></font>`,     // 5 yaş
    ].join('');

    const fillsXml = [
      `<fill><patternFill patternType="none"/></fill>`,
      `<fill><patternFill patternType="gray125"/></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FF1A237E"/></patternFill></fill>`,  // 2 başlık
      `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>`,  // 3 beyaz
      `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5FF"/></patternFill></fill>`,  // 4 zebra mavi
      `<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/></patternFill></fill>`,  // 5 hizmet tint
      `<fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/></patternFill></fill>`,  // 6 tel tint
      `<fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/></patternFill></fill>`,  // 7 yaş tint
    ].join('');

    // xf indeksleri — (fontId, fillId, borderId, alignment)
    const xfs = [
      // 0: Başlık — lacivert, beyaz kalın, ortalı, kalın kenarlık
      `<xf numFmtId="0" fontId="0" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="0"/></xf>`,
      // 1: Normal tek satır — beyaz
      `<xf numFmtId="0" fontId="1" fillId="3" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 2: Normal çift satır — zebra
      `<xf numFmtId="0" fontId="1" fillId="4" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 3: İsim tek — beyaz, lacivert kalın
      `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 4: İsim çift — zebra, lacivert kalın
      `<xf numFmtId="0" fontId="2" fillId="4" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 5: Hizmet tek — tint arka plan
      `<xf numFmtId="0" fontId="3" fillId="5" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 6: Hizmet çift
      `<xf numFmtId="0" fontId="3" fillId="5" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 7: Tel tek — açık mavi
      `<xf numFmtId="0" fontId="4" fillId="6" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 8: Tel çift
      `<xf numFmtId="0" fontId="4" fillId="6" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      // 9: Yaş tek — yeşil tint, kalın, ortalı
      `<xf numFmtId="0" fontId="5" fillId="7" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      // 10: Yaş çift
      `<xf numFmtId="0" fontId="5" fillId="7" borderId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
    ].join('');

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6">${fontsXml}</fonts>
  <fills count="8">${fillsXml}</fills>
  <borders count="2">${borderHeader}${borderDef}</borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">${xfs}</cellXfs>
</styleSheet>`;

    // ── Satır XML üretimi ────────────────────────────────────────
    // Sütun → hangi stil çiftini kullan: [tek, çift]
    // A=İsim[3,4] B=Hizmet[5,6] C,D=Tel[7,8] E,F,G=Normal[1,2] H=Yaş[9,10]
    const colStyle = (ci, cift) => {
      if (ci === 0) return cift ? 4 : 3;       // İsim
      if (ci === 1) return 5;                   // Hizmet (her iki sıra aynı)
      if (ci === 2 || ci === 3) return 7;       // Tel
      if (ci === 7) return cift ? 10 : 9;       // Yaş
      return cift ? 2 : 1;                      // Normal
    };

    let rowsXml = '';
    dataRows.forEach((row, ri) => {
      const cift = ri % 2 === 0; // 0=başlık(tek), 1=çift, 2=tek...
      let cx = '';
      row.forEach((v, ci) => {
        const ref = COLS[ci] + (ri + 1);
        const idx = S(v);
        const s   = ri === 0 ? 0 : colStyle(ci, cift);
        if (idx === null) cx += `<c r="${ref}" s="${s}"/>`;
        else              cx += `<c r="${ref}" s="${s}" t="s"><v>${idx}</v></c>`;
      });
      const ht = ri === 0 ? '22' : '18';
      rowsXml += `<row r="${ri+1}" ht="${ht}" customHeight="1">${cx}</row>`;
    });

    // ── Sheet XML ───────────────────────────────────────────────
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="26" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="30" customWidth="1"/>
    <col min="7" max="7" width="14" customWidth="1"/>
    <col min="8" max="8" width="6"  customWidth="1"/>
  </cols>
  <sheetData>${rowsXml}</sheetData>
  <autoFilter ref="A1:H1"/>
</worksheet>`;

    // ── Ortak XML parçaları ─────────────────────────────────────
    const sharedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`;
    const wbXml     = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Adres Listesi" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const RELS      = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
    const APP_RELS  = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const CT        = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

    // ── ZIP oluştur & indir ─────────────────────────────────────
    const zip = await buildZip([
      ['[Content_Types].xml',        enc(CT),        true],
      ['_rels/.rels',                enc(APP_RELS),  true],
      ['xl/workbook.xml',            enc(wbXml),     false],
      ['xl/_rels/workbook.xml.rels', enc(RELS),      true],
      ['xl/worksheets/sheet1.xml',   enc(sheetXml),  false],
      ['xl/styles.xml',              enc(stylesXml), false],
      ['xl/sharedStrings.xml',       enc(sharedXml), false],
    ]);
    const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'adres_telefon.xlsx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Excel indirildi: ' + tumIsimler.length + ' kişi');
  } catch(e) { console.error(e); showToast('Hata: ' + e.message); }
}

async function adresYukle(input) {
  const file=input.files[0]; if(!file) return;
  const durumEl=document.getElementById('adres-durum');
  if(durumEl)durumEl.innerHTML='<div style="color:#0369a1;font-size:13px">⏳ Excel okunuyor...</div>';

  const fmtDogum = (v) => {
    if(v == null || v === '') return '';
    const raw = String(v).trim();
    if(!raw) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) { const [y,m,d]=raw.split('-'); return `${d}.${m}.${y}`; }
    if(/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return raw;
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
      const [d,m,y]=raw.split('/');
      return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;
    }
    return raw;
  };
  const aktifTelToVal = (v) => {
    const s = _adresNormText(v);
    return s.startsWith('2') ? '2' : '1';
  };

  try {
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array', cellDates:true});
    const sheet=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
    if(!rows.length){ showToast('Excel boş'); return; }

    const headers=(rows[0]||[]).map(h=>_adresNormText(h));
    const hasHeader = headers.some(h => h.includes('ISIM'));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const idxBy = (...names) => {
      for(const n of names){
        const i = headers.findIndex(h => h === n || h.includes(n));
        if(i >= 0) return i;
      }
      return -1;
    };

    const idx = {
      isim:   idxBy('ISIM SOYISIM','AD SOYAD','ISIM'),
      tel1:   idxBy('1. TELEFON','TELEFON 1','TELEFON1','TELEFON'),
      tel2:   idxBy('2. TELEFON','TELEFON 2','TELEFON2'),
      aktif:  idxBy('AKTIF TEL','AKTIF TELEFON','TELEFON AKTIF','TERCIH TELEFON'),
      mahalle:idxBy('MAHALLE'),
      adres:  idxBy('ADRES','ACIK ADRES'),
      dogum:  idxBy('DOGUM TARIHI','DOGUM','DOGUM TARİHİ')
    };

    const readCell = (row, i, fallback='') => (i >= 0 ? (row[i] ?? fallback) : fallback);
    const yeniVeri={}; let eklenen=0;
    dataRows.forEach((row)=>{
      const isim=String(readCell(row, idx.isim, row[0]||'')).trim().toUpperCase();
      if(!isim) return;
      const tel = String(readCell(row, idx.tel1, row[1]||'')).trim();
      const tel2 = String(readCell(row, idx.tel2, '')).trim();
      const aktifTel = aktifTelToVal(readCell(row, idx.aktif, '1'));
      const mahalleRaw = String(readCell(row, idx.mahalle, hasHeader ? '' : (row[2]||''))).trim().toUpperCase();
      const mahalle = mahalleRaw.replace('SOGUCAK','SOĞUCAK');
      const adres = String(readCell(row, idx.adres, hasHeader ? '' : (row[3]||row[2]||''))).trim();
      const dogum = fmtDogum(readCell(row, idx.dogum, hasHeader ? '' : (row[4]||'')));
      yeniVeri[isim]={tel, tel2, telAktif:aktifTel, mahalle, adres, dogum};
      eklenen++;
    });
    if(!eklenen){showToast('Geçerli satır bulunamadı');return;}

    if(durumEl)durumEl.innerHTML=`<div style="color:#0369a1;font-size:13px">⏳ Eski adres verileri temizleniyor...</div>`;
    const mevcutSnap=await firebase.firestore().collection('adres_bilgi').get();
    if(!mevcutSnap.empty){
      for(let i=0;i<mevcutSnap.docs.length;i+=400){
        await Promise.all(mevcutSnap.docs.slice(i,i+400).map(d=>d.ref.delete()));
      }
    }

    const bos = _adresBosDegerler();
    const vatTargets = allData.filter(r => r && r._fbId);
    if(durumEl)durumEl.innerHTML=`<div style="color:#0369a1;font-size:13px">⏳ Vatandaş adres alanları sıfırlanıyor...</div>`;
    for(const r of allData) Object.assign(r, bos);
    for(let i=0;i<vatTargets.length;i+=400){
      await Promise.all(vatTargets.slice(i,i+400).map(r=>firebase.firestore().collection('vatandaslar').doc(r._fbId).update(bos)));
    }

    if(durumEl)durumEl.innerHTML=`<div style="color:#0369a1;font-size:13px">⏳ ${eklenen} yeni adres kaydı yazılıyor...</div>`;
    const entries=Object.entries(yeniVeri);
    for(let i=0;i<entries.length;i+=400){
      await Promise.all(entries.slice(i,i+400).map(([isim,bilgi])=>
        firebase.firestore().collection('adres_bilgi').doc(isim).set(bilgi)
      ));
    }
    window._adresBilgi=yeniVeri;

    if(durumEl)durumEl.innerHTML=`<div style="color:#0369a1;font-size:13px">⏳ Vatandaş kayıtları yeni Excel ile güncelleniyor...</div>`;
    let vatGuncellenen=0;
    const byName = yeniVeri;
    const vatGuncellenecek=allData.filter(r=>byName[r.ISIM_SOYISIM] && r._fbId);
    for(let i=0;i<vatGuncellenecek.length;i+=400){
      await Promise.all(vatGuncellenecek.slice(i,i+400).map(r=>{
        const b=byName[r.ISIM_SOYISIM];
        r.TELEFON=b.tel || '';
        r.TELEFON2=b.tel2 || '';
        r.TELEFON_AKTIF=b.telAktif || '1';
        r.ADRES=b.adres || '';
        r.DOGUM_TARIHI=b.dogum || '';
        r.MAHALLE=b.mahalle || '';
        vatGuncellenen++;
        return firebase.firestore().collection('vatandaslar').doc(r._fbId).update({
          TELEFON: r.TELEFON,
          TELEFON2: r.TELEFON2,
          TELEFON_AKTIF: r.TELEFON_AKTIF,
          ADRES: r.ADRES,
          DOGUM_TARIHI: r.DOGUM_TARIHI,
          MAHALLE: r.MAHALLE
        });
      }));
    }

    if(durumEl)durumEl.innerHTML=`<div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:10px 14px;color:#1B5E20;font-size:13px;font-weight:700">
      ✅ ${eklenen} adres kaydı yüklendi!<br>
      <span style="font-weight:400;font-size:12px">👥 ${vatGuncellenen} vatandaş kaydı da yeni Excel ile güncellendi</span>
    </div>`;
    input.value='';
    refreshAll();
    adresRender();
    showToast(`✅ ${eklenen} adres yüklendi, ${vatGuncellenen} vatandaş kaydı güncellendi`);
  } catch(e){
    console.error(e);
    if(durumEl)durumEl.innerHTML=`<div style="color:#B71C1C">Hata: ${e.message}</div>`;
    showToast('Hata: ' + e.message);
  }
}



// ══════════════════════════════════════════════
// KİŞİ KARTI MODALI
// ══════════════════════════════════════════════
function adresKisiKartiAc(isim) {
  const b = window._adresBilgi[isim] || {};
  const kayitlar = allData.filter(r => r.ISIM_SOYISIM === isim);
  const vd = kayitlar[0] || {};
  const mahalle = vd.MAHALLE || b.mahalle || '';
  const dogum = vd.DOGUM_TARIHI || b.dogum || '';
  const yas = hesaplaYas(dogum);
  const adres = vd.ADRES || b.adres || '';
  const hizmetler = [...new Set(kayitlar.map(r => r['HİZMET']).filter(Boolean))];

  const aktifTel = (b.telAktif === '2' && b.tel2) ? b.tel2 : (b.tel || '');
  const digerTel = (b.telAktif === '2' && b.tel2) ? b.tel : (b.tel2 || '');

  const HZ_RENK = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};
  const HZ_BG   = {'KADIN BANYO':'#FCE4EC','ERKEK BANYO':'#E3F2FD','KUAFÖR':'#E8F5E9','TEMİZLİK':'#FFF3E0'};

  // Son ziyaret tarihlerini bul
  const sonZiyaretler = kayitlar.map(r => {
    const hizmet = r['HİZMET'] || '';
    const alanlar = hizmet === 'KUAFÖR'
      ? [r.SAC1,r.SAC2,r.TIRNAK1,r.TIRNAK2,r.SAKAL1,r.SAKAL2]
      : [r.BANYO1,r.BANYO2,r.BANYO3,r.BANYO4,r.BANYO5];
    const dolu = alanlar.filter(Boolean);
    if (!dolu.length) return null;
    const enSon = dolu.sort((a, b) => {
      const parse = t => t.includes('-') ? new Date(t) : new Date(t.split('.').reverse().join('-'));
      return parse(b) - parse(a);
    })[0];
    return { hizmet, tarih: enSon, ay: r.AY || '' };
  }).filter(Boolean);

  // Avatar rengi (isimden hash)
  const renkler = ['#1A237E','#C2185B','#1565C0','#2E7D32','#E65100','#6A1B9A','#00695C'];
  const avatarRenk = renkler[isim.charCodeAt(0) % renkler.length];
  const initials = isim.split(' ').slice(0,2).map(w=>w[0]||'').join('');

  // Modal HTML
  const modal = document.createElement('div');
  modal.id = 'kisi-karti-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;width:100%;max-width:420px;
      box-shadow:0 25px 60px rgba(0,0,0,0.25);
      overflow:hidden;position:relative;
      animation:kkSlideIn 0.22s ease;
    ">
      <style>
        @keyframes kkSlideIn {
          from { opacity:0; transform:translateY(20px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
      </style>

      <!-- Üst bant -->
      <div style="background:${avatarRenk};padding:28px 20px 20px;text-align:center;position:relative">
        <button onclick="document.getElementById('kisi-karti-modal').remove()"
          style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.2);border:none;
          border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;font-size:16px;
          display:flex;align-items:center;justify-content:center">✕</button>
        <div style="
          width:70px;height:70px;border-radius:50%;
          background:rgba(255,255,255,0.25);border:3px solid rgba(255,255,255,0.6);
          margin:0 auto 12px;
          display:flex;align-items:center;justify-content:center;
          font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;
        ">${initials}</div>
        <div style="font-size:17px;font-weight:900;color:#fff;letter-spacing:0.3px">${isim}</div>
        ${mahalle ? `<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px">📍 ${mahalle}</div>` : ''}
        <div style="margin-top:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
          ${hizmetler.map(h=>`
            <span style="background:${HZ_BG[h]||'#f1f5f9'};color:${HZ_RENK[h]||'#475569'};
              padding:2px 10px;border-radius:20px;font-size:11px;font-weight:800">
              ${h}
            </span>`).join('')}
        </div>
      </div>

      <!-- İçerik -->
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">

        <!-- Yaş / Doğum -->
        ${dogum ? `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f8fafc;border-radius:12px">
          <span style="font-size:22px">🎂</span>
          <div>
            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Doğum Tarihi</div>
            <div style="font-size:15px;font-weight:700;color:#1e293b">
              ${dogum}
              ${yas !== null ? `<span style="background:${avatarRenk};color:#fff;border-radius:8px;padding:1px 8px;font-size:12px;font-weight:800;margin-left:8px">${yas} yaş</span>` : ''}
            </div>
          </div>
        </div>` : ''}

        <!-- Telefon -->
        ${aktifTel ? `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f8fafc;border-radius:12px">
          <span style="font-size:22px">📞</span>
          <div style="flex:1">
            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Telefon</div>
            <a href="tel:${aktifTel.replace(/\s/g,'')}"
              style="font-size:15px;font-weight:700;color:#0369a1;text-decoration:none">${aktifTel}</a>
            ${digerTel ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px">📞 ${digerTel}</div>` : ''}
          </div>
          <a href="tel:${aktifTel.replace(/\s/g,'')}"
            style="background:#0369a1;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap">
            Ara
          </a>
        </div>` : ''}

        <!-- Adres -->
        ${adres ? `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;background:#f8fafc;border-radius:12px">
          <span style="font-size:22px">🏠</span>
          <div>
            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Adres</div>
            <div style="font-size:13px;font-weight:600;color:#374151;line-height:1.5">${adres}</div>
          </div>
        </div>` : ''}

        <!-- Son Ziyaretler -->
        ${sonZiyaretler.length ? `
        <div style="padding:10px 14px;background:#f8fafc;border-radius:12px">
          <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Son Ziyaretler</div>
          ${sonZiyaretler.map(z=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #e2e8f0">
              <span style="font-size:12px;font-weight:700;color:${HZ_RENK[z.hizmet]||'#475569'}">${z.hizmet}</span>
              <span style="font-size:12px;color:#64748b">${z.tarih} <span style="color:#94a3b8">(${z.ay})</span></span>
            </div>`).join('')}
        </div>` : ''}

        <!-- Düzenle butonu -->
        <button onclick="document.getElementById('kisi-karti-modal').remove();adresEditAc('${isim.replace(/'/g,"\'")}')"
          style="width:100%;background:${avatarRenk};color:#fff;border:none;border-radius:12px;
          padding:12px;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px">
          ✏️ Bilgileri Düzenle
        </button>
      </div>
    </div>`;

  // Dışına tıklayınca kapat
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ══════════════════════════════════════════════════════════════════════
// MÜKERRER İSİM — Aynı isimde birden fazla kaydı olan kişiler
// ══════════════════════════════════════════════════════════════════════

let _mkSonuc = []; // { isim, kayitlar: [{r}] }

// Sekme geçişi
function dtSekmeAc(sekme) {
  document.getElementById('dt-panel-duplikat').style.display = sekme === 'duplikat' ? '' : 'none';
  document.getElementById('dt-panel-mukerrer').style.display = sekme === 'mukerrer' ? '' : 'none';
  const tabD = document.getElementById('dt-tab-duplikat');
  const tabM = document.getElementById('dt-tab-mukerrer');
  tabD.style.borderBottomColor = sekme === 'duplikat' ? '#1A237E' : 'transparent';
  tabD.style.color = sekme === 'duplikat' ? '#1A237E' : '#94a3b8';
  tabM.style.borderBottomColor = sekme === 'mukerrer' ? '#1A237E' : 'transparent';
  tabM.style.color = sekme === 'mukerrer' ? '#1A237E' : '#94a3b8';
}
window.dtSekmeAc = dtSekmeAc;

// İsim normalize (yazım farkı karşılaştırması için)
function _mkNorm(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G')
    .replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/ı/g,'I').replace(/ş/g,'S').replace(/ğ/g,'G')
    .replace(/ü/g,'U').replace(/ö/g,'O').replace(/ç/g,'C')
    .replace(/\s+/g,' ').trim();
}

// Levenshtein mesafesi (benzer isim tespiti)
function _mkLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) =>
    Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function mkTara() {
  _mkSonuc = [];
  const benzerMod = document.getElementById('mk-benzer')?.checked;

  // 1) Birebir aynı isim grupları
  const gruplar = {};
  (allData || []).forEach(r => {
    const isim = (r.ISIM_SOYISIM || '').trim().toUpperCase();
    if (!isim) return;
    if (!gruplar[isim]) gruplar[isim] = [];
    gruplar[isim].push(r);
  });

  // Birden fazla kaydı olanlar
  for (const [isim, kayitlar] of Object.entries(gruplar)) {
    if (kayitlar.length < 2) continue;
    _mkSonuc.push({ isim, kayitlar, tip: 'AYNI' });
  }

  // 2) Benzer isimler (yazım farkı)
  if (benzerMod) {
    const isimler = Object.keys(gruplar);
    const eslesmis = new Set();
    for (let i = 0; i < isimler.length; i++) {
      for (let j = i + 1; j < isimler.length; j++) {
        const a = _mkNorm(isimler[i]);
        const b = _mkNorm(isimler[j]);
        if (a === b) continue; // zaten aynı, yukarıda yakalandı
        if (eslesmis.has(a + '||' + b)) continue;
        // Uzun isimde kısa mesafe → benzer say
        const maxLen = Math.max(a.length, b.length);
        const dist = _mkLevenshtein(a, b);
        const oran = dist / maxLen;
        if (dist <= 3 && oran <= 0.25) {
          eslesmis.add(a + '||' + b);
          _mkSonuc.push({
            isim: isimler[i] + ' ≈ ' + isimler[j],
            kayitlar: [...gruplar[isimler[i]], ...gruplar[isimler[j]]],
            tip: 'BENZER',
            isim1: isimler[i],
            isim2: isimler[j]
          });
        }
      }
    }
  }

  _mkSonuc.sort((a, b) => b.kayitlar.length - a.kayitlar.length);
  mkRender();

  const msg = _mkSonuc.length === 0
    ? '✅ Mükerrer isim bulunamadı'
    : `⚠️ ${_mkSonuc.filter(g=>g.tip==='AYNI').length} mükerrer + ${_mkSonuc.filter(g=>g.tip==='BENZER').length} benzer grup bulundu`;
  showToast(msg);
}
window.mkTara = mkTara;

function mkRender() {
  const el = document.getElementById('mk-sonuc');
  const sayac = document.getElementById('mk-count');
  const araVal = (_mkNorm(document.getElementById('mk-ara')?.value || ''));
  if (!el) return;

  let liste = _mkSonuc;
  if (araVal) {
    liste = liste.filter(g => _mkNorm(g.isim).includes(araVal));
  }

  if (sayac) sayac.textContent = liste.length + ' grup';

  if (!liste.length) {
    el.innerHTML = '<div style="text-align:center;color:#16a34a;font-size:14px;padding:32px;font-weight:700">✅ Gösterilecek kayıt yok</div>';
    return;
  }

  const HC = { 'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100' };
  const HB = { 'KADIN BANYO':'#fce4ec','ERKEK BANYO':'#e3f2fd','KUAFÖR':'#e8f5e9','TEMİZLİK':'#fff3e0' };
  const AY_SIRA = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

  el.innerHTML = liste.map((g, gi) => {
    const renkBant = g.tip === 'BENZER' ? '#7c3aed' : '#dc2626';
    const etiket   = g.tip === 'BENZER'
      ? `<span style="background:#f5f3ff;color:#7c3aed;border-radius:6px;padding:2px 9px;font-size:11px;font-weight:800">✏️ BENZER İSİM</span>`
      : `<span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 9px;font-size:11px;font-weight:800">⚠️ ${g.kayitlar.length} KAYIT</span>`;

    // Kayıtları aya göre sırala
    const sirali = [...g.kayitlar].sort((a, b) =>
      AY_SIRA.indexOf(a.AY) - AY_SIRA.indexOf(b.AY)
    );

    const satirlar = sirali.map(r => {
      const hz  = r['HİZMET'] || '—';
      const hzRenk = HC[hz] || '#64748b';
      const hzBg   = HB[hz] || '#f1f5f9';
      const durum  = r.DURUM || '—';
      const durumRenk = durum === 'AKTİF' ? '#16a34a' : durum === 'İPTAL' ? '#dc2626' : '#92400e';
      const tarihler = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5',
                        'SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
        .map(f => r[f]).filter(Boolean);
      const mahalle  = r.MAHALLE || '—';
      const telefon  = r.TELEFON || r.TELEFON2 || '—';

      return `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#1e293b">${r.ISIM_SOYISIM || '—'}</td>
        <td style="padding:7px 10px">
          <span style="background:${hzBg};color:${hzRenk};border-radius:8px;padding:2px 8px;font-size:11px;font-weight:800">${hz}</span>
        </td>
        <td style="padding:7px 10px;font-size:12px;color:#374151">${r.AY || '—'}</td>
        <td style="padding:7px 10px">
          <span style="color:${durumRenk};font-size:12px;font-weight:800">${durum}</span>
        </td>
        <td style="padding:7px 10px;font-size:12px;color:#64748b">${mahalle}</td>
        <td style="padding:7px 10px;font-size:12px;color:#0369a1">${telefon}</td>
        <td style="padding:7px 10px;font-size:11px;color:#94a3b8">${tarihler.length ? tarihler.join(' · ') : '—'}</td>
        <td style="padding:7px 8px;text-align:center">
          ${r._fbId ? `<button onclick="mkKayitSil('${r._fbId}')"
            style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:3px 8px;
            cursor:pointer;font-size:11px;color:#dc2626" title="Bu kaydı sil">🗑️</button>` : ''}
        </td>
      </tr>`;
    }).join('');

    return `<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;
      margin-bottom:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <!-- Grup başlığı -->
      <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;
        background:#f8fafc;border-bottom:1.5px solid #e2e8f0;flex-wrap:wrap">
        <div style="width:4px;height:24px;background:${renkBant};border-radius:2px;flex-shrink:0"></div>
        <span style="font-weight:900;font-size:14px;color:#1e293b">${g.isim}</span>
        ${etiket}
        <div style="margin-left:auto;display:flex;gap:6px">
          ${g.tip === 'BENZER' ? `
            <button onclick="mkBirlestir('${(g.isim1||'').replace(/'/g,"\\'")}','${(g.isim2||'').replace(/'/g,"\\'")}')"
              style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:5px 12px;
              font-size:12px;font-weight:700;cursor:pointer" title="İkinci ismi birinciye dönüştür">
              🔗 Birleştir
            </button>` : ''}
          <button onclick="mkGrupSil(${gi})"
            style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:5px 12px;
            font-size:12px;font-weight:700;cursor:pointer;color:#dc2626">
            🗑️ Gruptaki Kopyaları Sil
          </button>
        </div>
      </div>
      <!-- Kayıt tablosu -->
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">İSİM</th>
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">HİZMET</th>
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">AY</th>
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">DURUM</th>
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">MAHALLE</th>
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">TELEFON</th>
              <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700">ZİYARET TARİHLERİ</th>
              <th style="padding:6px 8px;width:36px"></th>
            </tr>
          </thead>
          <tbody>${satirlar}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}
window.mkRender = window.mkRender || mkRender;
// mkRender global olarak atama
window.mkRender = mkRender;

// Tek kayıt sil
async function mkKayitSil(fbId) {
  if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
  try {
    await firebase.firestore().collection('vatandaslar').doc(fbId).delete();
    const i = allData.findIndex(r => r._fbId === fbId);
    if (i !== -1) allData.splice(i, 1);
    showToast('✅ Kayıt silindi');
    mkTara();
  } catch(e) { showToast('Hata: ' + e.message); }
}
window.mkKayitSil = mkKayitSil;

// Gruptaki ilk hariç diğer kopyaları sil (aynı isim + hizmet + ay)
async function mkGrupSil(gi) {
  const g = _mkSonuc[gi];
  if (!g) return;

  // Aynı (isim+hizmet+ay) kombinasyonlarında ilkini koru, diğerini sil
  const goruldu = {};
  const silinecekler = [];
  for (const r of g.kayitlar) {
    const key = `${r.ISIM_SOYISIM}|${r['HİZMET']}|${r.AY}`;
    if (goruldu[key]) {
      if (r._fbId) silinecekler.push(r._fbId);
    } else {
      goruldu[key] = true;
    }
  }

  if (!silinecekler.length) {
    showToast('Bu grupta silinecek kopya yok (her hizmet+ay kombinasyonu zaten tekil)');
    return;
  }
  if (!confirm(`${silinecekler.length} kopya kayıt silinecek. Devam?`)) return;

  for (const fbId of silinecekler) {
    await firebase.firestore().collection('vatandaslar').doc(fbId).delete();
    const i = allData.findIndex(r => r._fbId === fbId);
    if (i !== -1) allData.splice(i, 1);
  }
  showToast(`✅ ${silinecekler.length} kopya silindi`);
  mkTara();
}
window.mkGrupSil = mkGrupSil;

// Benzer isimleri birleştir: isim2 → isim1 olarak güncelle
async function mkBirlestir(isim1, isim2) {
  const ilgili = allData.filter(r => r.ISIM_SOYISIM === isim2 && r._fbId);
  if (!ilgili.length) { showToast('Güncellenecek kayıt yok'); return; }
  if (!confirm(`"${isim2}" → "${isim1}" olarak değiştirilecek.\n${ilgili.length} kayıt güncellenecek. Devam?`)) return;
  for (const r of ilgili) {
    r.ISIM_SOYISIM = isim1;
    await firebase.firestore().collection('vatandaslar').doc(r._fbId).update({ ISIM_SOYISIM: isim1 });
  }
  showToast(`✅ ${ilgili.length} kayıt "${isim1}" olarak güncellendi`);
  mkTara();
}
window.mkBirlestir = mkBirlestir;

// ── ADRES SAYFASI SEKME GEÇİŞİ ──────────────────────────
function adresSekmeAc(sekme) {
  document.getElementById('adres-panel-liste').style.display    = sekme === 'liste'    ? '' : 'none';
  document.getElementById('adres-panel-mukerrer').style.display = sekme === 'mukerrer' ? '' : 'none';
  const tabL = document.getElementById('adres-tab-liste');
  const tabM = document.getElementById('adres-tab-mukerrer');
  if (tabL) { tabL.style.borderBottomColor = sekme === 'liste'    ? '#1A237E' : 'transparent'; tabL.style.color = sekme === 'liste'    ? '#1A237E' : '#94a3b8'; }
  if (tabM) { tabM.style.borderBottomColor = sekme === 'mukerrer' ? '#1A237E' : 'transparent'; tabM.style.color = sekme === 'mukerrer' ? '#1A237E' : '#94a3b8'; }
}
window.adresSekmeAc = adresSekmeAc;
