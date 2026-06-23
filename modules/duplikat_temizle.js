// ══════════════════════════════════════════════════════════════════════
// DUPLİKAT TEMİZLE — Seçmeli silme, korunan kaydı kullanıcı seçer
// ══════════════════════════════════════════════════════════════════════

let _dtSonuc = [];
// Her grup için hangi kayıt korunacak: { "grupIdx": kayitIdx }
let _dtKorunan = {};
// Toplu seçim için seçili fbId seti
let _dtSecili = new Set();

// Akıllı puanlama
function dtPuanla(r){
  let p=0;
  ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','SAKAL1','SAKAL2','TIRNAK1','TIRNAK2','TIRNAK3']
    .forEach(f=>{ if(r[f]) p+=10; });
  ['NOT1','NOT2','NOT3'].forEach(f=>{ if(r[f]) p+=5; });
  if(r.ONAY_TARIHI) p+=20;
  if(r.IPTAL_TARIHI) p+=20;
  return p;
}

function dtTarihImza(r){
 return ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','SAKAL1','SAKAL2','TIRNAK1','TIRNAK2','TIRNAK3']
 .map(f=>r[f]).filter(Boolean).sort().join('|');
}


// Kayıt tamamen boş mu? (tarih, not yok)
function dtBosmu(r) {
  const tarihAlanlar = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2'];
  const notAlanlar   = ['NOT1','NOT2','NOT3'];
  const tarihVar = tarihAlanlar.some(f => r[f] && String(r[f]).trim());
  const notVar   = notAlanlar.some(f => r[f] && String(r[f]).trim());
  return !tarihVar && !notVar;
}

// İki kaydın içeriği aynı mı? (tarihler + notlar karşılaştır)
function dtAyniIcerik(a, b) {
  const alanlar = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2','NOT1','NOT2','NOT3'];
  return alanlar.every(f => (a[f]||'').trim() === (b[f]||'').trim());
}

async function dtTara() {
  _dtSonuc = [];
  _dtKorunan = {};
  _dtSecili = new Set();
  const gruplar = {};

  allData.forEach((r, idx) => {
    const key = `${(r.ISIM_SOYISIM||'').toLocaleUpperCase('tr-TR')}__${r['HİZMET']}__${r.AY}`;
    if (!gruplar[key]) gruplar[key] = [];
    gruplar[key].push({ r, idx });
  });

  // ── OTOMATİK SİL: tamamen boş veya birebir aynı duplikatlar ──
  const otomatikSilinecek = []; // { r, sebep }
  const manuelGruplar = [];     // kullanıcıya gösterilecek gruplar

  for (const [key, liste] of Object.entries(gruplar)) {
    if (liste.length < 2) continue;
    const [isim, hizmet, ay] = key.split('__');

    // 1) Tamamen boş olanları ayır
    const boslar    = liste.filter(({ r }) => dtBosmu(r));
    const doluListe = liste.filter(({ r }) => !dtBosmu(r));

    // Boş olanların hepsini sil (en az 1 dolu varsa)
    if (doluListe.length > 0 && boslar.length > 0) {
      boslar.forEach(({ r }) => otomatikSilinecek.push({ r, sebep: 'BOŞ' }));
    } else if (boslar.length > 1) {
      // Hepsi boşsa — birini koru, gerisini sil
      boslar.slice(1).forEach(({ r }) => otomatikSilinecek.push({ r, sebep: 'BOŞ' }));
    }

    // 2) Geri kalan dolu liste içinde aynı içerikli olanları bul
    const kalan = doluListe.length > 0 ? doluListe : boslar.slice(0, 1);
    const benzersiz = [];
    const ayniOlanlar = [];
    kalan.forEach(item => {
      const zatenVar = benzersiz.find(({ r }) => dtAyniIcerik(r, item.r));
      if (zatenVar) {
        // İçerik tamamen aynı → düşük puanlıyı sil
        const itemPuan = dtPuanla(item.r);
        const zatenPuan = dtPuanla(zatenVar.r);
        if (itemPuan <= zatenPuan) {
          otomatikSilinecek.push({ r: item.r, sebep: 'AYNI İÇERİK' });
        } else {
          otomatikSilinecek.push({ r: zatenVar.r, sebep: 'AYNI İÇERİK' });
          benzersiz.splice(benzersiz.indexOf(zatenVar), 1);
          benzersiz.push(item);
        }
      } else {
        benzersiz.push(item);
      }
    });

    // 3) Hâlâ birden fazla benzersiz kayıt varsa → kullanıcıya göster
    if (benzersiz.length > 1) {
      let enIyi = 0, enPuan = -1;
      benzersiz.forEach(({ r }, i) => {
        const p = dtPuanla(r);
        if (p > enPuan) { enPuan = p; enIyi = i; }
      });
      _dtKorunan[manuelGruplar.length] = enIyi;
      manuelGruplar.push({ isim, hizmet, ay, kayitlar: benzersiz, tip: 'FARKLI_VERI' });
    }
  }

  // Otomatik silme: onay al, sonra toplu sil
  if (otomatikSilinecek.length > 0) {
    const bosKayitSayisi = otomatikSilinecek.filter(x => x.sebep === 'BOŞ').length;
    const ayniKayitSayisi = otomatikSilinecek.filter(x => x.sebep === 'AYNI İÇERİK').length;
    const mesaj = [
      `🤖 Otomatik silinebilecek duplikatlar bulundu:\n`,
      bosKayitSayisi   ? `• ${bosKayitSayisi} adet tamamen BOŞ kayıt` : '',
      ayniKayitSayisi  ? `• ${ayniKayitSayisi} adet BİREBİR AYNI içerikli kayıt` : '',
      `\nBunlar otomatik silinsin mi?`
    ].filter(Boolean).join('\n');

    if (confirm(mesaj)) {
      const db = firebase.firestore();
      let silinen = 0;
      for (const { r } of otomatikSilinecek) {
        if (!r._fbId) continue;
        try {
          await db.collection('vatandaslar').doc(r._fbId).delete();
          const ai = allData.findIndex(x => x._fbId === r._fbId);
          if (ai !== -1) allData.splice(ai, 1);
          silinen++;
        } catch(e) { console.warn('Otomatik silme hatası:', r._fbId, e); }
      }
      showToast(`✅ ${silinen} duplikat otomatik silindi`);
    }
  }

  _dtSonuc = manuelGruplar;
  _dtRender();

  if (_dtSonuc.length === 0 && otomatikSilinecek.length === 0) {
    showToast('✅ Duplikat bulunamadı, sistem temiz');
  } else if (_dtSonuc.length > 0) {
    showToast(`⚠️ ${_dtSonuc.length} grup farklı veriler içeriyor — manuel inceleme gerekiyor`);
  }
}

function _dtRender() {
  const el = document.getElementById('dt-sonuc');
  if (!el) return;

  if (!_dtSonuc.length) {
    el.innerHTML = '<div style="text-align:center;color:#16a34a;font-size:14px;padding:32px;font-weight:700">✅ Duplikat kaydı yok</div>';
    return;
  }

  const HC = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};

  // Toplam silinecek sayısı
  let toplamSilinecek = 0;
  _dtSonuc.forEach((g, gi) => {
    g.kayitlar.forEach((_, ki) => {
      if (_dtKorunan[gi] !== ki) toplamSilinecek++;
    });
  });

  // Toplu seçim bilgileri
  const seciliSayisi = _dtSecili.size;
  const tumIds = [];
  _dtSonuc.forEach(g => g.kayitlar.forEach(({ r }) => { if (r._fbId) tumIds.push(r._fbId); }));
  const tumSecili = tumIds.length > 0 && tumIds.every(id => _dtSecili.has(id));

  let html = `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
    <span style="font-size:13px;color:#64748b;font-weight:700">${_dtSonuc.length} duplikat grup • <span style="color:#dc2626">${toplamSilinecek} kayıt silinecek</span></span>
    <button onclick="dtHepsiniUygula()" style="margin-left:auto;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:8px 20px;font-size:13px;font-weight:800;cursor:pointer">🗑️ Seçilenleri Sil (${toplamSilinecek})</button>
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:8px 14px;background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:10px;flex-wrap:wrap">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:700;color:#374151;user-select:none">
      <input type="checkbox" ${tumSecili ? 'checked' : ''} onchange="dtTumunuSec(this.checked)"
        style="width:15px;height:15px;cursor:pointer;accent-color:#7c3aed">
      Tümünü Seç
    </label>
    <span style="font-size:12px;color:#64748b">${seciliSayisi > 0 ? '<b style="color:#7c3aed">' + seciliSayisi + ' kayıt seçili</b>' : 'Kayıt seçilmedi'}</span>
    <button onclick="dtSecilenleriSil()" ${seciliSayisi === 0 ? 'disabled' : ''}
      style="margin-left:auto;background:${seciliSayisi > 0 ? '#7c3aed' : '#cbd5e1'};color:#fff;border:none;border-radius:10px;padding:6px 16px;font-size:13px;font-weight:800;cursor:${seciliSayisi > 0 ? 'pointer' : 'not-allowed'}">
      ☑️ Toplu Sil${seciliSayisi > 0 ? ' (' + seciliSayisi + ')' : ''}
    </button>
  </div>`;

  html += _dtSonuc.map((g, gi) => {
    const korunanIdx = _dtKorunan[gi] ?? 0;

    return `<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <!-- Grup başlığı -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <span style="font-weight:900;font-size:15px">${g.isim}</span>
        <span style="background:${HC[g.hizmet]||'#374151'};color:#fff;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.hizmet}</span>
        <span style="background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.ay}</span>
        <span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.kayitlar.length} kayıt</span>
        <span style="background:#fef9c3;color:#92400e;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">⚠️ FARKLI VERİ — Manuel Seç</span>
      </div>
      <!-- Kayıt listesi -->
      <div style="display:flex;flex-direction:column;gap:6px">
        ${g.kayitlar.map(({ r }, ki) => {
          const tarihler = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
            .map(f => r[f]).filter(Boolean);
          const korunuyor = korunanIdx === ki;
          const secili = r._fbId && _dtSecili.has(r._fbId);
          const bg = korunuyor ? '#f0fdf4' : '#fef2f2';
          const border = korunuyor ? '#86efac' : '#fecaca';

          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${bg};border:1.5px solid ${border};border-radius:10px;flex-wrap:wrap;cursor:pointer"
            onclick="dtSecKorunan(${gi},${ki})" title="Bu kaydı koru">
            <!-- Radio benzeri seçici -->
            <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${korunuyor?'#16a34a':'#d1d5db'};background:${korunuyor?'#16a34a':'#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s">
              ${korunuyor?'<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>':''}
            </div>
            <!-- Durum -->
            <span style="font-size:11px;font-weight:800;color:${r.DURUM==='AKTİF'?'#16a34a':r.DURUM==='İPTAL'?'#dc2626':'#92400e'};min-width:55px">${r.DURUM||'—'}</span>
            <!-- Tarihler -->
            <span style="font-size:12px;color:#374151;flex:1">${tarihler.length ? tarihler.join('  •  ') : '<span style="color:#94a3b8">Tarih yok</span>'}</span>
            <!-- Not -->
            ${r.NOT1 ? `<span style="font-size:11px;color:#64748b;font-style:italic;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.NOT1}</span>` : ''}
            <!-- Etiket -->
            <span style="font-size:11px;font-weight:800;color:${korunuyor?'#16a34a':'#dc2626'};min-width:60px;text-align:right">
              ${korunuyor ? '✅ KORUNAN' : '🗑️ SİLİNECEK'}
            </span>
            <!-- Toplu seçim checkbox — onclick ile satır tıklamasını engelle -->
            <input type="checkbox" ${secili ? 'checked' : ''} ${r._fbId ? '' : 'disabled'}
              onclick="event.stopPropagation()"
              onchange="dtToggleSecim('${r._fbId}', this.checked)"
              style="width:15px;height:15px;cursor:pointer;accent-color:#7c3aed;flex-shrink:0"
              title="Toplu silmeye ekle">
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = html;
}

// Korunacak kaydı seç (değişmedi)
function dtSecKorunan(gi, ki) {
  _dtKorunan[gi] = ki;
  _dtRender();
}

// Seçilenleri sil — mevcut duplikat sistemi (değişmedi)
async function dtHepsiniUygula() {
  const silinecekler = [];
  _dtSonuc.forEach((g, gi) => {
    const korunanIdx = _dtKorunan[gi] ?? 0;
    g.kayitlar.forEach(({ r }, ki) => {
      if (ki !== korunanIdx && r._fbId) silinecekler.push({ r, gi, ki });
    });
  });

  if (!silinecekler.length) { showToast('Silinecek kayıt yok'); return; }
  if (!confirm(`${silinecekler.length} kayıt silinecek. Onaylıyor musunuz?`)) return;

  const db = firebase.firestore();
  let silinen = 0;

  for (const { r } of silinecekler) {
    try {
      await db.collection('vatandaslar').doc(r._fbId).delete();
      const ai = allData.findIndex(x => x._fbId === r._fbId);
      if (ai !== -1) allData.splice(ai, 1);
      silinen++;
    } catch(e) { console.warn('Silme hatası:', r._fbId, e); }
  }

  showToast(`✅ ${silinen} duplikat kayıt silindi`);
  dtTara();
  if (typeof filterVat === 'function') filterVat();
  if (typeof buildAyTabs === 'function') buildAyTabs();
}

// ── Toplu seçim (YENİ) ────────────────────────────────────────────────

function dtToggleSecim(fbId, secili) {
  if (!fbId) return;
  if (secili) _dtSecili.add(fbId);
  else _dtSecili.delete(fbId);
  _dtRender();
}

function dtTumunuSec(secili) {
  _dtSecili = new Set();
  if (secili) {
    _dtSonuc.forEach(g => g.kayitlar.forEach(({ r }) => { if (r._fbId) _dtSecili.add(r._fbId); }));
  }
  _dtRender();
}

async function dtSecilenleriSil() {
  if (_dtSecili.size === 0) { showToast('Silinecek kayıt seçilmedi'); return; }
  if (!confirm(`${_dtSecili.size} seçili kayıt silinecek. Onaylıyor musunuz?`)) return;

  const db = firebase.firestore();
  let silinen = 0;

  for (const fbId of [..._dtSecili]) {
    try {
      await db.collection('vatandaslar').doc(fbId).delete();
      const ai = allData.findIndex(x => x._fbId === fbId);
      if (ai !== -1) allData.splice(ai, 1);
      silinen++;
    } catch(e) { console.warn('Silme hatası:', fbId, e); }
  }

  showToast(`✅ ${silinen} kayıt silindi`);
  _dtSecili = new Set();
  dtTara();
  if (typeof filterVat === 'function') filterVat();
  if (typeof buildAyTabs === 'function') buildAyTabs();
}

window.dtTara            = dtTara;
window.dtSecKorunan      = dtSecKorunan;
window.dtHepsiniUygula   = dtHepsiniUygula;
window.dtToggleSecim     = dtToggleSecim;
window.dtTumunuSec       = dtTumunuSec;
window.dtSecilenleriSil  = dtSecilenleriSil;

