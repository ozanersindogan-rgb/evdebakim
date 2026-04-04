// ══════════════════════════════════════════════════════════
//  TEMİZLİK PLANI
//  Kaynak: allData (vatandaslar koleksiyonu)
//  - HİZMET === 'TEMİZLİK' olan tüm kayıtlar taranır
//  - Aynı kişinin Ocak/Şubat/Mart... ayrı dökümanları var
//  - BANYO1-5 alanları DD.MM.YYYY formatında
//  - Tüm dökümanlardan en son tarihi bulur
//  - 2026'da hiç tarih yoksa kırmızı uyarı gösterir
// ══════════════════════════════════════════════════════════

let TP_DATA = [];
let tpSortDir = 'asc';   // en eski önce (en uzun gidilmeyen üstte)
let tpSortCol = 'gun';
window._tpPersonelFiltre = window._tpPersonelFiltre || '';

// Kolon dropdown filtre değerleri
const _tpFiltreler = { isim: '', mahalle: '', durum: '', personel: '', renk: '' };

// ── Format yardımcıları ──────────────────────────────────

// DD.MM.YYYY → YYYY-MM-DD (sıralama/karşılaştırma için)
function tpToISO(v) {
  if (!v) return '';
  v = v.trim();
  if (v.includes('-')) return v;           // zaten ISO
  const p = v.split('.');
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  return '';
}

// YYYY-MM-DD → DD.MM.YYYY
function tpTR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// Bugünden kaç gün önce?
function tpGun(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso); d.setHours(0,0,0,0);
  const diff = Math.floor((today - d) / 86400000);
  return isNaN(diff) ? null : diff;
}

// Gün → renk/dot
function tpRenk(gun) {
  if (gun === null) return { bg:'rgba(0,0,0,0.05)', dot:'⚫', cls:'siyah' };
  if (gun > 90)    return { bg:'rgba(0,0,0,0.05)', dot:'⚫', cls:'siyah' };
  if (gun >= 61)   return { bg:'rgba(239,68,68,0.08)', dot:'🔴', cls:'kirmizi' };
  if (gun >= 45)   return { bg:'rgba(251,191,36,0.12)', dot:'🟡', cls:'sari' };
  return               { bg:'rgba(34,197,94,0.10)', dot:'🟢', cls:'yesil' };
}

// ── allData'dan TEMİZLİK listesi üret ────────────────────
function tpAllDatadanUret() {
  const buYil = new Date().getFullYear(); // 2026
  const byIsim = {};

  (allData || []).forEach(r => {
    if (r['HİZMET'] !== 'TEMİZLİK') return;
    if (!r.ISIM_SOYISIM) return;

    const key = r.ISIM_SOYISIM.trim().toUpperCase();

    // Bu kayıttaki BANYO1-5'ten en son ISO tarih
    let maxISO = '';
    let maxYil2026 = ''; // sadece 2026 tarihleri
    ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'].forEach(a => {
      const iso = tpToISO(r[a]);
      if (!iso) return;
      if (iso > maxISO) maxISO = iso;
      if (iso.startsWith(buYil + '')) {
        if (iso > maxYil2026) maxYil2026 = iso;
      }
    });

    if (!byIsim[key]) {
      byIsim[key] = {
        isim: r.ISIM_SOYISIM.trim(),
        mahalle: (r.MAHALLE || '').trim(),
        sonGidilme: maxISO,
        sonGidilme2026: maxYil2026,
        durum: r.DURUM || 'AKTİF',
        not_: [r.NOT1, r.NOT2, r.NOT3].filter(Boolean).join(' | '),
        ekip: '',
        PERSONEL1: r.PERSONEL1 || '',
        PERSONEL2: r.PERSONEL2 || '',
        PERSONEL3: r.PERSONEL3 || '',
        _fbId: r._fbId,
      };
    } else {
      // Daha yeni genel tarih
      if (maxISO > byIsim[key].sonGidilme) byIsim[key].sonGidilme = maxISO;
      // Daha yeni 2026 tarihi
      if (maxYil2026 > byIsim[key].sonGidilme2026) byIsim[key].sonGidilme2026 = maxYil2026;
      // Mahalle/durum en güncel kayıttan
      if (r.MAHALLE) byIsim[key].mahalle = r.MAHALLE.trim();
      if (r.DURUM)   byIsim[key].durum = r.DURUM;
      if (r.PERSONEL1) byIsim[key].PERSONEL1 = r.PERSONEL1;
      if (r.PERSONEL2) byIsim[key].PERSONEL2 = r.PERSONEL2;
      if (r.PERSONEL3) byIsim[key].PERSONEL3 = r.PERSONEL3;
      if (r._fbId) byIsim[key]._fbId = r._fbId;
      // Notları birleştir (tekrar etmeden)
      const yeni = [r.NOT1, r.NOT2, r.NOT3].filter(Boolean).join(' | ');
      if (yeni && !byIsim[key].not_.includes(yeni)) {
        byIsim[key].not_ = [byIsim[key].not_, yeni].filter(Boolean).join(' · ');
      }
    }
  });

  return Object.values(byIsim);
}

// ── Yükle (Firestore yok, sadece allData) ────────────────
function tpFirestoreYukle() {
  TP_DATA.length = 0;
  tpAllDatadanUret().forEach((r, i) => TP_DATA.push({ ...r, _origIdx: i }));
  if (typeof atamaAllDataUygula === 'function') atamaAllDataUygula();
  tpBuildHead();
  tpRender();
}

// ── Kolon başlıklarını (Excel dropdown'larla) oluştur ────
function tpBuildHead() {
  const thead = document.getElementById('tp-thead');
  if (!thead) return;

  // Mahalle listesi
  const mahalleler = [...new Set(TP_DATA.map(r => r.mahalle).filter(Boolean))].sort();
  // Durum listesi
  const durumlar = [...new Set(TP_DATA.map(r => r.durum || '—'))].sort();
  // Personel listesi
  const personeller = [...new Set(TP_DATA.flatMap(r => [r.PERSONEL1||r.ekip, r.PERSONEL2, r.PERSONEL3].filter(Boolean)))].sort();

  const thStyle = 'padding:8px 6px;text-align:left;white-space:nowrap;user-select:none;position:relative';
  const ddStyle = 'margin-top:3px;width:100%;font-size:10px;border:1px solid rgba(255,255,255,0.3);border-radius:4px;background:rgba(255,255,255,0.15);color:#fff;padding:2px 4px;cursor:pointer';

  thead.innerHTML = `<tr style="background:var(--primary);color:#fff">
    <th style="${thStyle}">
      <div onclick="tpSortBy('isim')" style="cursor:pointer;font-size:12px">İsim Soyisim ${tpSortCol==='isim'?(tpSortDir==='asc'?'↑':'↓'):'⇅'}</div>
      <input id="tp-f-isim" placeholder="Ara..." oninput="_tpFiltreler.isim=this.value;tpRender()"
        style="${ddStyle};padding:2px 6px" value="${_tpFiltreler.isim}">
    </th>
    <th style="${thStyle}">
      <div onclick="tpSortBy('mahalle')" style="cursor:pointer;font-size:12px">Mahalle ${tpSortCol==='mahalle'?(tpSortDir==='asc'?'↑':'↓'):'⇅'}</div>
      <select id="tp-f-mah" onchange="_tpFiltreler.mahalle=this.value;tpRender()" style="${ddStyle}">
        <option value="">Tümü</option>
        ${mahalleler.map(m=>`<option value="${m}" ${_tpFiltreler.mahalle===m?'selected':''}>${m}</option>`).join('')}
      </select>
    </th>
    <th style="${thStyle}">
      <div onclick="tpSortBy('gun')" style="cursor:pointer;font-size:12px">Son Gidiş ${tpSortCol==='gun'?(tpSortDir==='asc'?'↑':'↓'):'⇅'}</div>
    </th>
    <th style="${thStyle};text-align:center">
      <div onclick="tpSortBy('gun')" style="cursor:pointer;font-size:12px">Geçen Gün ${tpSortCol==='gun'?(tpSortDir==='asc'?'↑':'↓'):'⇅'}</div>
      <select id="tp-f-renk" onchange="_tpFiltreler.renk=this.value;tpRender()" style="${ddStyle}">
        <option value="">Tümü</option>
        <option value="yesil" ${_tpFiltreler.renk==='yesil'?'selected':''}>🟢 0–44 gün</option>
        <option value="sari" ${_tpFiltreler.renk==='sari'?'selected':''}>🟡 45–60 gün</option>
        <option value="kirmizi" ${_tpFiltreler.renk==='kirmizi'?'selected':''}>🔴 61–90 gün</option>
        <option value="siyah" ${_tpFiltreler.renk==='siyah'?'selected':''}>⚫ 90+ gün</option>
      </select>
    </th>
    <th style="${thStyle}">Not / Neden</th>
    <th style="${thStyle};text-align:center">
      <div style="font-size:12px">Durum</div>
      <select id="tp-f-dur" onchange="_tpFiltreler.durum=this.value;tpRender()" style="${ddStyle}">
        <option value="">Tümü</option>
        ${durumlar.map(d=>`<option value="${d}" ${_tpFiltreler.durum===d?'selected':''}>${d}</option>`).join('')}
      </select>
    </th>
    <th style="${thStyle};text-align:center">
      <div style="font-size:12px">Personel</div>
      <select id="tp-f-per" onchange="_tpFiltreler.personel=this.value;tpRender()" style="${ddStyle}">
        <option value="">Tümü</option>
        ${personeller.map(p=>`<option value="${p}" ${_tpFiltreler.personel===p?'selected':''}>${p}</option>`).join('')}
      </select>
    </th>
    <th style="padding:8px 6px;text-align:center;font-size:12px">İşlem</th>
  </tr>`;
}

// ── Sıralama ──────────────────────────────────────────────
function tpSortBy(col) {
  if (tpSortCol === col) tpSortDir = tpSortDir === 'asc' ? 'desc' : 'asc';
  else { tpSortCol = col; tpSortDir = 'asc'; }
  tpBuildHead();
  tpRender();
}

function tpSort() {
  tpSortDir = tpSortDir === 'asc' ? 'desc' : 'asc';
  const btn = document.getElementById('tp-sort-btn');
  if (btn) btn.textContent = tpSortDir === 'asc' ? '⬆ En Eski Önce' : '⬇ En Yeni Önce';
  tpBuildHead();
  tpRender();
}

// ── Ana render ────────────────────────────────────────────
function tpRender() {
  const buYil = new Date().getFullYear();
  const seciliDurumlar = [...document.querySelectorAll('.tp-dur-cb:checked')].map(cb => cb.value);

  let rows = TP_DATA.map((r, i) => ({
    ...r,
    gun: tpGun(r.sonGidilme),
    _origIdx: i,
    _no2026: !r.sonGidilme2026, // 2026'da hiç tarih yok
  }));

  // Durum checkbox filtresi
  if (seciliDurumlar.length) rows = rows.filter(r => seciliDurumlar.includes(r.durum));

  // Kolon dropdown filtreleri
  if (_tpFiltreler.isim)     rows = rows.filter(r => (r.isim||'').toUpperCase().includes(_tpFiltreler.isim.toUpperCase()));
  if (_tpFiltreler.mahalle)  rows = rows.filter(r => r.mahalle === _tpFiltreler.mahalle);
  if (_tpFiltreler.durum)    rows = rows.filter(r => (r.durum||'—') === _tpFiltreler.durum);
  if (_tpFiltreler.personel) {
    rows = rows.filter(r => {
      const ps = [r.PERSONEL1||r.ekip, r.PERSONEL2, r.PERSONEL3].filter(Boolean);
      return ps.includes(_tpFiltreler.personel);
    });
  }
  if (_tpFiltreler.renk) {
    rows = rows.filter(r => {
      const { cls } = tpRenk(r.gun);
      return cls === _tpFiltreler.renk;
    });
  }

  // Personel kart filtresi
  if (window._tpPersonelFiltre) {
    if (window._tpPersonelFiltre === 'Atanmamış') {
      rows = rows.filter(r => ![r.PERSONEL1||r.ekip, r.PERSONEL2, r.PERSONEL3].filter(Boolean).length);
    } else {
      rows = rows.filter(r => [r.PERSONEL1||r.ekip, r.PERSONEL2, r.PERSONEL3].filter(Boolean).includes(window._tpPersonelFiltre));
    }
  }

  // Sırala
  rows.sort((a, b) => {
    let va, vb;
    if (tpSortCol === 'isim')    { va = a.isim||''; vb = b.isim||''; return tpSortDir==='asc' ? va.localeCompare(vb,'tr') : vb.localeCompare(va,'tr'); }
    if (tpSortCol === 'mahalle') { va = a.mahalle||''; vb = b.mahalle||''; return tpSortDir==='asc' ? va.localeCompare(vb,'tr') : vb.localeCompare(va,'tr'); }
    // Varsayılan: gün (en eski önce = en büyük gün önce)
    const ga = a.gun ?? -99999;
    const gb = b.gun ?? -99999;
    return tpSortDir === 'asc' ? gb - ga : ga - gb;
  });

  const countEl = document.getElementById('tp-count');
  if (countEl) countEl.textContent = rows.length + ' kayıt';

  if (typeof tpRenderPersonelStats === 'function') {
    tpRenderPersonelStats(window._tpPersonelFiltre || '');
  }

  const EKIP_RENK = { 'Gülin':'#C2185B','Hava':'#1565C0','Nihal':'#2E7D32','Tüm Ekip':'#7c3aed' };
  const tbody = document.getElementById('tp-tbody');
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => {
    const { bg, dot } = tpRenk(r.gun);
    const tarihStr = tpTR(r.sonGidilme);
    const gunStr   = r.gun !== null ? `${r.gun} gün` : '—';
    const durumColor = r.durum==='AKTİF'?'#16a34a':r.durum==='PASİF'?'#64748b':'#ef4444';

    const personeller = [r.PERSONEL1||r.ekip, r.PERSONEL2, r.PERSONEL3].filter(Boolean);
    const personelHTML = personeller.length
      ? personeller.map(p => {
          const renk = EKIP_RENK[p] || '#64748b';
          return `<span style="display:inline-block;background:${renk}18;color:${renk};border:1px solid ${renk}55;border-radius:8px;padding:2px 7px;font-size:10px;font-weight:800;margin:1px">${p}</span>`;
        }).join('')
      : `<span style="color:#94a3b8;font-size:11px">—</span>`;

    // 2026'da hizmet verilmedi uyarısı
    const uyariHTML = r._no2026
      ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#dc2626;margin-top:3px;white-space:nowrap">⚠️ ${buYil} YILINDA HİZMET VERİLMEDİ</div>`
      : '';

    const isimEsc = (r.isim||'').replace(/'/g,"\\'");

    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:9px 8px;font-weight:700;min-width:140px">
        <span style="cursor:pointer;color:#1A237E;text-decoration:underline dotted"
          onclick="openVatandasCard('${isimEsc}')">${dot} ${r.isim}</span>
        ${uyariHTML}
      </td>
      <td style="padding:9px 8px;color:var(--text-soft);font-size:12px">${r.mahalle||'—'}</td>
      <td style="padding:9px 8px;white-space:nowrap;font-size:12px">${tarihStr}</td>
      <td style="padding:9px 8px;text-align:center;font-weight:800;font-size:14px">${gunStr}</td>
      <td style="padding:9px 8px;font-size:11px;color:var(--text-soft);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${(r.not_||'').replace(/"/g,"'")}">${r.not_||'—'}</td>
      <td style="padding:9px 8px;text-align:center;font-size:11px;font-weight:800;color:${durumColor}">${r.durum||'—'}</td>
      <td style="padding:9px 8px;text-align:center;white-space:nowrap">${personelHTML}</td>
      <td style="padding:9px 8px;text-align:center">
        <div style="display:flex;gap:4px;justify-content:center">
          <button onclick="tpPersonelAta(${r._origIdx})" title="Personel Ata"
            style="background:#E65100;color:#fff;border:none;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer">👤</button>
          <button onclick="tpEdit(${r._origIdx})"
            style="background:var(--primary);color:#fff;border:none;border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer">✏️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">Kayıt bulunamadı</td></tr>`;
  }
}

// ── Edit modal ────────────────────────────────────────────
let tpEditIdx = null;
function tpEdit(idx) {
  tpEditIdx = idx;
  const r = TP_DATA[idx]; if (!r) return;
  document.getElementById('tpe-isim').value  = r.isim  || '';
  document.getElementById('tpe-ekip').value  = r.ekip  || '';
  document.getElementById('tpe-tarih').value = r.sonGidilme || '';
  document.getElementById('tpe-durum').value = r.durum || 'AKTİF';
  document.getElementById('tpe-not').value   = r.not_  || '';
  const mahSel = document.getElementById('tpe-mahalle');
  const mahs = ['ALACAMESCIT','BAYRAKLIDEDE','CAMİATİK','CAMİKEBİR','CUMHURİYET','DAĞ','DAVUTLAR',
    'DEĞİRMENDERE','EGE','GÜZELÇAMLI','HACIFEYZULLAH','İKİÇEŞMELİK','KADIKALESİ',
    'KADINLAR DENİZİ','KARAOVA','KİRAZLI','SOĞUCAK','TÜRKMEN','YAVANSU','YAYLAKÖY','YENİKÖY'];
  mahSel.innerHTML = mahs.map(m =>
    `<option value="${m}" ${m===(r.mahalle||'').toUpperCase()?'selected':''}>${m}</option>`
  ).join('');
  if (r.mahalle && !mahs.includes(r.mahalle.toUpperCase())) {
    mahSel.innerHTML += `<option value="${r.mahalle}" selected>${r.mahalle}</option>`;
  }
  document.getElementById('tp-modal').style.display = 'flex';
}
function tpCloseModal() {
  document.getElementById('tp-modal').style.display = 'none';
  tpEditIdx = null;
}
async function tpSaveEdit() {
  if (tpEditIdx === null) return;
  const r = TP_DATA[tpEditIdx];
  r.ekip       = document.getElementById('tpe-ekip').value;
  r.mahalle    = document.getElementById('tpe-mahalle').value;
  r.sonGidilme = document.getElementById('tpe-tarih').value;
  r.durum      = document.getElementById('tpe-durum').value;
  r.not_       = document.getElementById('tpe-not').value.trim();
  tpCloseModal();
  tpBuildHead();
  tpRender();
  if (typeof refreshAll === 'function') refreshAll();
  if (r._fbId) {
    try {
      await firebase.firestore().collection('vatandaslar').doc(r._fbId).update({ DURUM: r.durum, NOT1: r.not_ });
      showToast('✅ Güncellendi');
    } catch(e) { showToast("⚠️ Yerel güncellendi, Firestore'a yazılamadı"); }
  }
}

// ── navTo ─────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'Ana Sayfa',gunluk:'Günlük Liste',vatandaslar:'Vatandaşlar',
  mahalle:'Mahalle Raporu','gunluk-kayit':'Günlük Hizmet Kaydı',
  'yeni-vatandas':'Yeni Vatandaş Kaydı',durum:'Durum Güncelle',
  export:'Veri Al','kisi-bilgi':'Vatandaş Adres - Telefon',
  takvim:'📆 Ziyaret Takvimi',plan:'🤖 Akıllı Planlama',
  yedekler:'💾 Yedekleme',ayarlar:'⚙️ Ayarlar',
};
function navTo(id, el) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const t=document.getElementById('page-title'); if(t) t.textContent=PAGE_TITLES[id]||id;
  try{localStorage.setItem('evdebakim_sonSayfa',id);}catch(e){}
  if(id==='mahalle')        if(typeof renderMahalle==='function') renderMahalle();
  if(id==='export')         {if(typeof renderExpStats==='function')renderExpStats();if(typeof expPreview==='function')expPreview();}
  if(id==='araclar')        {if(typeof arInitMahalleler==='function')arInitMahalleler();if(typeof taInit==='function')taInit();}
  if(id==='islem-log')      if(typeof renderIslemLog==='function')renderIslemLog();
  if(id==='adres-guncelle') if(typeof adresRender==='function')adresRender();
  if(id==='temizlik-plan')  tpFirestoreYukle();
  if(id==='kisi-bilgi')     if(typeof kbYukle==='function')kbYukle();
  if(id==='takvim')         if(typeof renderTakvim==='function')renderTakvim();
  if(id==='sayi-ver')       if(typeof svRender==='function')svRender();
  if(id==='plan')           if(typeof renderPlan==='function')renderPlan();
  if(id==='yedekler')       if(typeof yedekSayfaYukle==='function')yedekSayfaYukle();
  if(id==='ayarlar')        if(typeof ayarlarPersonelRender==='function')ayarlarPersonelRender();
  if(id==='personel-atama') if(typeof atamaRenderSayfa==='function')atamaRenderSayfa();
  if(id==='analiz')         if(typeof analizRender==='function')analizRender();
  if(typeof mobMenuKapat==='function')mobMenuKapat();
  const mbnMap={dashboard:'mbn-dashboard',gunluk:'mbn-gunluk','gunluk-kayit':'mbn-gunluk-kayit',vatandaslar:'mbn-vatandaslar'};
  if(mbnMap[id]){document.querySelectorAll('.mbn-item').forEach(b=>b.classList.remove('active'));document.getElementById(mbnMap[id])?.classList.add('active');}
}
function quickFilter(hizmet,el){
  vatHizmet=hizmet;vatAy='';vatPage=1;
  navTo('vatandaslar',null);
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el)el.classList.add('active');
  const t=document.getElementById('page-title');if(t)t.textContent='Vatandaşlar';
  document.querySelectorAll('.htab').forEach(t=>{t.className='htab';if(t.dataset.hizmet===hizmet)t.classList.add('active-'+(HIZMET_COLORS?.[hizmet]||''));else if(!hizmet&&t.dataset.hizmet==='')t.classList.add('active-all');});
  if(typeof filterVat==='function')filterVat();
}
