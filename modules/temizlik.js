// ══════════════════════════════════════════════════════════
//  TEMİZLİK PLANI — allData'dan canlı çalışır
//  TP_DATA: Firestore durum/not + allData tarih bilgisi
//  sonGidilme: allData'daki BANYO1-5 en son tarihinden hesaplanır
//  ekip: sıfırlandı — personel ataması temiz başlıyor
// ══════════════════════════════════════════════════════════

let TP_DATA = [];
let tpSortDir = 'asc'; // asc = en eski önce (en uzun süre gidilmeyen)
window._tpPersonelFiltre = window._tpPersonelFiltre || '';

const _AY_LISTESI_TP = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

function tpAyBul(tarih) {
  if (!tarih) return '';
  try { return _AY_LISTESI_TP[new Date(tarih).getMonth()] || ''; } catch { return ''; }
}

function tpISOtoTR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// allData'daki TEMİZLİK kaydının en son BANYO tarihini YYYY-MM-DD olarak döndür
function tpSonTarih(rec) {
  let max = '';
  ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5'].forEach(a => {
    const v = rec[a]; if (!v) return;
    let iso = v;
    if (v.includes('.')) {
      const [d, m, y] = v.split('.');
      iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    if (iso > max) max = iso;
  });
  return max;
}

function tpGunFarki(isoTarih) {
  if (!isoTarih) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(isoTarih); d.setHours(0,0,0,0);
  return Math.floor((today - d) / 86400000);
}

function tpRenkHesapla(gun) {
  if (gun === null || gun > 90) return { bg: 'rgba(0,0,0,0.05)', dot: '⚫' };
  if (gun >= 61)  return { bg: 'rgba(239,68,68,0.08)', dot: '🔴' };
  if (gun >= 45)  return { bg: 'rgba(251,191,36,0.12)', dot: '🟡' };
  return             { bg: 'rgba(34,197,94,0.10)', dot: '🟢' };
}

// ── allData'dan TEMİZLİK listesi üret ────────────────────
function tpAllDatadanUret() {
  const temizlikler = (allData || []).filter(r => r['HİZMET'] === 'TEMİZLİK' && r.ISIM_SOYISIM);
  const byIsim = {};
  temizlikler.forEach(r => {
    const key = (r.ISIM_SOYISIM || '').trim().toUpperCase();
    const sonTarih = tpSonTarih(r);
    if (!byIsim[key] || sonTarih > (byIsim[key].sonGidilme || '')) {
      byIsim[key] = {
        _recRef: r,
        isim: r.ISIM_SOYISIM,
        mahalle: (r.MAHALLE || '').trim(),
        sonGidilme: sonTarih,
        durum: r.DURUM || 'AKTİF',
        not_: [r.NOT1, r.NOT2, r.NOT3].filter(Boolean).join(' | '),
        ekip: '',
      };
    }
  });
  return Object.values(byIsim);
}

// ── Firestore'dan yükle + allData ile birleştir ───────────
async function tpFirestoreYukle() {
  const allDataListe = tpAllDatadanUret();
  const map = {};
  allDataListe.forEach(r => { map[(r.isim||'').trim().toUpperCase()] = r; });

  try {
    const snap = await firebase.firestore().collection('temizlik_plan').get();
    snap.forEach(doc => {
      const fb = { _fbId: doc.id, ...doc.data() };
      const key = (fb.isim || '').trim().toUpperCase();
      if (map[key]) {
        map[key]._fbId  = fb._fbId;
        map[key].durum  = fb.durum || map[key].durum;
        map[key].not_   = fb.not_  || map[key].not_;
        // ekip sıfırlandığı için FB'den almıyoruz
      } else if (fb.isim) {
        map[key] = {
          _fbId: fb._fbId, isim: fb.isim,
          mahalle: fb.mahalle || '', sonGidilme: fb.sonGidilme || '',
          durum: fb.durum || 'AKTİF', not_: fb.not_ || '', ekip: '',
          _sadeceFB: true,
        };
      }
    });
  } catch(e) { console.warn('temizlik_plan yüklenemedi:', e); }

  TP_DATA.length = 0;
  Object.values(map).forEach(r => TP_DATA.push(r));
  TP_DATA.forEach((r, i) => { r._origIdx = i; });

  if (typeof atamaAllDataUygula === 'function') atamaAllDataUygula();
  tpRender();
}

// ── Ana render ────────────────────────────────────────────
function tpRender() {
  const seciliDurumlar = [...document.querySelectorAll('.tp-dur-cb:checked')].map(cb => cb.value);
  const ekipF = document.getElementById('tp-ekip')?.value || '';
  const renkF = document.getElementById('tp-renk')?.value || '';
  const araF  = (document.getElementById('tp-ara')?.value || '').trim().toUpperCase();

  let rows = TP_DATA.map((r, i) => ({ ...r, gun: tpGunFarki(r.sonGidilme), _origIdx: i }));

  if (seciliDurumlar.length) rows = rows.filter(r => seciliDurumlar.includes(r.durum));
  if (ekipF) rows = rows.filter(r => (r.ekip || '') === ekipF);
  if (araF)  rows = rows.filter(r => (r.isim || '').toUpperCase().includes(araF));
  if (renkF) {
    rows = rows.filter(r => {
      const g = r.gun;
      if (renkF === 'kirmizi') return g !== null && g >= 61 && g <= 90;
      if (renkF === 'sari')    return g !== null && g >= 45 && g <= 60;
      if (renkF === 'yesil')   return g !== null && g >= 0  && g <= 44;
      return false;
    });
  }
  if (window._tpPersonelFiltre) {
    if (window._tpPersonelFiltre === 'Atanmamış') {
      rows = rows.filter(r => !(r.PERSONEL1 || r.ekip || '').trim());
    } else {
      rows = rows.filter(r => {
        const p1 = r.PERSONEL1 || r.ekip || '';
        return p1 === window._tpPersonelFiltre || r.PERSONEL2 === window._tpPersonelFiltre || r.PERSONEL3 === window._tpPersonelFiltre;
      });
    }
  }

  // Sırala: en eski önce (en uzun süre gidilmeyen üstte)
  rows.sort((a, b) => {
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
    const { bg, dot } = tpRenkHesapla(r.gun);
    const tarihStr = tpISOtoTR(r.sonGidilme);
    const gunStr   = r.gun !== null ? `${r.gun} gün` : '—';
    const durumColor = r.durum==='AKTİF'?'#16a34a':r.durum==='PASİF'?'#64748b':'#ef4444';
    const personeller = [r.PERSONEL1||r.ekip, r.PERSONEL2, r.PERSONEL3].filter(Boolean);
    const personelBadges = personeller.length
      ? personeller.map(p => {
          const renk = EKIP_RENK[p] || '#64748b';
          return `<span style="display:inline-block;background:${renk}18;color:${renk};border:1px solid ${renk}55;border-radius:8px;padding:2px 7px;font-size:10px;font-weight:800;margin:1px">${p}</span>`;
        }).join('')
      : `<span style="color:#94a3b8;font-size:11px">—</span>`;
    const isimEsc = (r.isim||'').replace(/'/g,"\\'");
    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:9px 8px;font-weight:700">
        <span style="cursor:pointer;color:#1A237E;text-decoration:underline dotted" onclick="openVatandasCard('${isimEsc}')">${dot} ${r.isim}</span>
        ${r._sadeceFB?'<span style="font-size:9px;color:#f59e0b;margin-left:4px">⚠️</span>':''}
      </td>
      <td style="padding:9px 8px;color:var(--text-soft);font-size:12px">${r.mahalle||'—'}</td>
      <td style="padding:9px 8px;white-space:nowrap;font-size:12px">${tarihStr}</td>
      <td style="padding:9px 8px;text-align:center;font-weight:800;font-size:14px">${gunStr}</td>
      <td style="padding:9px 8px;font-size:11px;color:var(--text-soft);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.not_||'').replace(/"/g,"'")}">${r.not_||'—'}</td>
      <td style="padding:9px 8px;text-align:center;font-size:11px;font-weight:800;color:${durumColor}">${r.durum||'—'}</td>
      <td style="padding:9px 8px;text-align:center;white-space:nowrap">${personelBadges}</td>
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
}

function tpSort() {
  tpSortDir = tpSortDir === 'asc' ? 'desc' : 'asc';
  const btn = document.getElementById('tp-sort-btn');
  if (btn) btn.textContent = tpSortDir === 'asc' ? '⬆ En Eski Önce' : '⬇ En Yeni Önce';
  tpRender();
}

let tpEditIdx = null;
function tpEdit(idx) {
  tpEditIdx = idx;
  const r = TP_DATA[idx]; if (!r) return;
  document.getElementById('tpe-isim').value  = r.isim||'';
  document.getElementById('tpe-ekip').value  = r.ekip||'';
  document.getElementById('tpe-tarih').value = r.sonGidilme||'';
  document.getElementById('tpe-durum').value = r.durum||'AKTİF';
  document.getElementById('tpe-not').value   = r.not_||'';
  const mahSel = document.getElementById('tpe-mahalle');
  const mahs = ['ALACAMESCIT','BAYRAKLIDEDE','CAMİATİK','CAMİKEBİR','CUMHURİYET','DAĞ','DAVUTLAR',
    'DEĞİRMENDERE','EGE','GÜZELÇAMLI','HACIFEYZULLAH','İKİÇEŞMELİK','KADIKALESİ',
    'KADINLAR DENİZİ','KARAOVA','KİRAZLI','SOĞUCAK','TÜRKMEN','YAVANSU','YAYLAKÖY','YENİKÖY'];
  mahSel.innerHTML = mahs.map(m => `<option value="${m}" ${m===(r.mahalle||'').toUpperCase()?'selected':''}>${m}</option>`).join('');
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
  tpRender();
  if (typeof refreshAll === 'function') refreshAll();
  const fbData = { isim:r.isim, mahalle:r.mahalle, sonGidilme:r.sonGidilme, durum:r.durum, not_:r.not_, ekip:r.ekip };
  try {
    if (r._fbId) {
      await firebase.firestore().collection('temizlik_plan').doc(r._fbId).set(fbData, { merge: true });
    } else {
      const ref = await firebase.firestore().collection('temizlik_plan').add(fbData);
      r._fbId = ref.id;
    }
    showToast('✅ Kayıt güncellendi');
  } catch(e) { showToast("⚠️ Yerel güncellendi, Firestore'a yazılamadı"); }
}

// ── navTo ─────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'Ana Sayfa', gunluk:'Günlük Liste', vatandaslar:'Vatandaşlar',
  mahalle:'Mahalle Raporu', 'gunluk-kayit':'Günlük Hizmet Kaydı',
  'yeni-vatandas':'Yeni Vatandaş Kaydı', durum:'Durum Güncelle',
  export:'Veri Al', 'kisi-bilgi':'Vatandaş Adres - Telefon',
  takvim:'📆 Ziyaret Takvimi', plan:'🤖 Akıllı Planlama',
  yedekler:'💾 Yedekleme', ayarlar:'⚙️ Ayarlar',
};

function navTo(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[id] || id;
  try { localStorage.setItem('evdebakim_sonSayfa', id); } catch(e) {}

  if (id==='mahalle')        if(typeof renderMahalle==='function') renderMahalle();
  if (id==='export')         { if(typeof renderExpStats==='function') renderExpStats(); if(typeof expPreview==='function') expPreview(); }
  if (id==='araclar')        { if(typeof arInitMahalleler==='function') arInitMahalleler(); if(typeof taInit==='function') taInit(); }
  if (id==='islem-log')      if(typeof renderIslemLog==='function') renderIslemLog();
  if (id==='adres-guncelle') if(typeof adresRender==='function') adresRender();
  if (id==='temizlik-plan')  tpFirestoreYukle();
  if (id==='kisi-bilgi')     if(typeof kbYukle==='function') kbYukle();
  if (id==='takvim')         if(typeof renderTakvim==='function') renderTakvim();
  if (id==='sayi-ver')       if(typeof svRender==='function') svRender();
  if (id==='plan')           if(typeof renderPlan==='function') renderPlan();
  if (id==='yedekler')       if(typeof yedekSayfaYukle==='function') yedekSayfaYukle();
  if (id==='ayarlar')        if(typeof ayarlarPersonelRender==='function') ayarlarPersonelRender();
  if (id==='personel-atama') if(typeof atamaRenderSayfa==='function') atamaRenderSayfa();
  if (id==='analiz')         if(typeof analizRender==='function') analizRender();

  if (typeof mobMenuKapat==='function') mobMenuKapat();
  const mbnMap = { dashboard:'mbn-dashboard',gunluk:'mbn-gunluk','gunluk-kayit':'mbn-gunluk-kayit',vatandaslar:'mbn-vatandaslar' };
  if (mbnMap[id]) {
    document.querySelectorAll('.mbn-item').forEach(b => b.classList.remove('active'));
    document.getElementById(mbnMap[id])?.classList.add('active');
  }
}

function quickFilter(hizmet, el) {
  vatHizmet = hizmet; vatAy = ''; vatPage = 1;
  navTo('vatandaslar', null);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Vatandaşlar';
  document.querySelectorAll('.htab').forEach(t => {
    t.className = 'htab';
    if (t.dataset.hizmet===hizmet) t.classList.add('active-'+(HIZMET_COLORS?.[hizmet]||''));
    else if (!hizmet && t.dataset.hizmet==='') t.classList.add('active-all');
  });
  if (typeof filterVat==='function') filterVat();
}
