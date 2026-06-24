// ══════════════════════════════════════════════════════════════════════
// DUPLİKAT TEMİZLE — Seçmeli silme, korunan kaydı kullanıcı seçer
// ══════════════════════════════════════════════════════════════════════

let _dtSonuc = [];
// Her grup için hangi kayıt korunacak: { "grupIdx": kayitIdx }
let _dtKorunan = {};
// Toplu seçim için seçili fbId seti
let _dtSecili = new Set();
// Otomatik silinecek boş/aynı kayıtlar — kullanıcıya göstermek için sakla
let _dtOtomatikSilinecek = [];

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
  _dtOtomatikSilinecek = [];
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

  // Otomatik silinecekler — listede göster, confirm yerine
  _dtOtomatikSilinecek = otomatikSilinecek;

  _dtSonuc = manuelGruplar;
  _dtRender();

  const toplamSorun = manuelGruplar.length + otomatikSilinecek.length;
  if (toplamSorun === 0) {
    showToast('✅ Duplikat bulunamadı, sistem temiz');
  } else if (manuelGruplar.length > 0) {
    showToast(`⚠️ ${manuelGruplar.length} grup farklı veriler içeriyor — manuel inceleme gerekiyor`);
  }
}

// ── İLERLEME BARI ──────────────────────────────────────────────────────
function _dtProgressGoster(simdiki, toplam, etiket) {
  let bar = document.getElementById('dt-progress-wrap');
  if (!bar) {
    const wrap = document.createElement('div');
    wrap.id = 'dt-progress-wrap';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center';
    wrap.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:32px 40px;min-width:340px;max-width:90vw;box-shadow:0 8px 40px rgba(0,0,0,.25);text-align:center">
        <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:6px" id="dt-prog-etiket">${etiket}</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px" id="dt-prog-sayi">${simdiki} / ${toplam}</div>
        <div style="background:#e2e8f0;border-radius:99px;height:14px;overflow:hidden;margin-bottom:12px">
          <div id="dt-prog-bar" style="height:100%;border-radius:99px;background:linear-gradient(90deg,#3b82f6,#6366f1);transition:width .2s;width:${Math.round(simdiki/toplam*100)}%"></div>
        </div>
        <div style="font-size:22px;font-weight:900;color:#3b82f6" id="dt-prog-yuzde">${Math.round(simdiki/toplam*100)}%</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:8px" id="dt-prog-sure">Tahmini süre hesaplanıyor...</div>
      </div>`;
    document.body.appendChild(wrap);
    bar = wrap;
  } else {
    document.getElementById('dt-prog-etiket').textContent = etiket;
    document.getElementById('dt-prog-sayi').textContent = `${simdiki} / ${toplam}`;
    const pct = Math.round(simdiki/toplam*100);
    document.getElementById('dt-prog-bar').style.width = pct + '%';
    document.getElementById('dt-prog-yuzde').textContent = pct + '%';
  }
}

function _dtProgressSureGuncelle(baslangic, simdiki, toplam) {
  if (simdiki < 2) return;
  const gecen = (Date.now() - baslangic) / 1000;
  const hiz = simdiki / gecen; // kayıt/sn
  const kalan = Math.ceil((toplam - simdiki) / hiz);
  const el = document.getElementById('dt-prog-sure');
  if (!el) return;
  if (kalan <= 0) { el.textContent = 'Tamamlanıyor...'; return; }
  const dk = Math.floor(kalan / 60);
  const sn = kalan % 60;
  el.textContent = dk > 0
    ? `Tahminen ${dk} dk ${sn} sn kaldı`
    : `Tahminen ${sn} saniye kaldı`;
}

function _dtProgressGizle() {
  const bar = document.getElementById('dt-progress-wrap');
  if (bar) bar.remove();
}

// ── RENDER ─────────────────────────────────────────────────────────────
function _dtRender() {
  const el = document.getElementById('dt-sonuc');
  if (!el) return;

  const HC = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};
  const bosKayitlar   = _dtOtomatikSilinecek.filter(x => x.sebep === 'BOŞ');
  const ayniKayitlar  = _dtOtomatikSilinecek.filter(x => x.sebep === 'AYNI İÇERİK');

  // Toplam silinecek (manuel gruplar)
  let toplamSilinecek = 0;
  _dtSonuc.forEach((g, gi) => {
    g.kayitlar.forEach((_, ki) => { if (_dtKorunan[gi] !== ki) toplamSilinecek++; });
  });

  const seciliSayisi = _dtSecili.size;
  const tumIds = [];
  _dtSonuc.forEach(g => g.kayitlar.forEach(({ r }) => { if (r._fbId) tumIds.push(r._fbId); }));
  const tumSecili = tumIds.length > 0 && tumIds.every(id => _dtSecili.has(id));

  const hicSorunYok = _dtSonuc.length === 0 && _dtOtomatikSilinecek.length === 0;
  if (hicSorunYok) {
    el.innerHTML = '<div style="text-align:center;color:#16a34a;font-size:14px;padding:32px;font-weight:700">✅ Duplikat kaydı yok</div>';
    return;
  }

  let html = '';

  // ── 1) OTOMATİK SİLİNECEK: BOŞ KAYITLAR ───────────────────────────
  if (bosKayitlar.length > 0) {
    html += `
    <div style="background:#fff8f1;border:2px solid #fb923c;border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:#92400e">🗑️ BOŞ KAYITLAR — ${bosKayitlar.length} adet</span>
        <span style="font-size:11px;color:#78350f;background:#fed7aa;border-radius:6px;padding:2px 8px">Tarih ve not girilmemiş</span>
        <button onclick="dtOtomatikSil()" style="margin-left:auto;background:#ea580c;color:#fff;border:none;border-radius:10px;padding:7px 18px;font-size:12px;font-weight:800;cursor:pointer">
          🗑️ Tümünü Sil (${_dtOtomatikSilinecek.length})
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;max-height:260px;overflow-y:auto">
        ${bosKayitlar.map(({ r }) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid #fed7aa;border-radius:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:800;color:#1e293b;min-width:180px">${r.ISIM_SOYISIM || '—'}</span>
            <span style="background:${HC[r['HİZMET']]||'#374151'};color:#fff;border-radius:5px;padding:1px 8px;font-size:10px;font-weight:800">${r['HİZMET']||'—'}</span>
            <span style="background:#eff6ff;color:#1d4ed8;border-radius:5px;padding:1px 8px;font-size:10px;font-weight:800">${r.AY||'—'}</span>
            <span style="font-size:11px;color:#94a3b8;font-style:italic">Tarih ve not yok</span>
            <span style="margin-left:auto;font-size:11px;font-weight:800;color:#dc2626">🗑️ SİLİNECEK</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // ── 2) OTOMATİK SİLİNECEK: AYNI İÇERİKLİ ──────────────────────────
  if (ayniKayitlar.length > 0) {
    html += `
    <div style="background:#f5f3ff;border:2px solid #a78bfa;border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:#4c1d95">📋 BİREBİR AYNI İÇERİK — ${ayniKayitlar.length} adet</span>
        <span style="font-size:11px;color:#5b21b6;background:#ede9fe;border-radius:6px;padding:2px 8px">Tüm alanlar özdeş</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;max-height:200px;overflow-y:auto">
        ${ayniKayitlar.map(({ r }) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid #ddd6fe;border-radius:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:800;color:#1e293b;min-width:180px">${r.ISIM_SOYISIM||'—'}</span>
            <span style="background:${HC[r['HİZMET']]||'#374151'};color:#fff;border-radius:5px;padding:1px 8px;font-size:10px;font-weight:800">${r['HİZMET']||'—'}</span>
            <span style="background:#eff6ff;color:#1d4ed8;border-radius:5px;padding:1px 8px;font-size:10px;font-weight:800">${r.AY||'—'}</span>
            <span style="margin-left:auto;font-size:11px;font-weight:800;color:#7c3aed">🗑️ SİLİNECEK</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // ── 3) MANUEL GRUPLAR ───────────────────────────────────────────────
  if (_dtSonuc.length > 0) {
    html += `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:13px;color:#64748b;font-weight:700">${_dtSonuc.length} manuel grup • <span style="color:#dc2626">${toplamSilinecek} kayıt silinecek</span></span>
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
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:15px">${g.isim}</span>
          <span style="background:${HC[g.hizmet]||'#374151'};color:#fff;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.hizmet}</span>
          <span style="background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.ay}</span>
          <span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.kayitlar.length} kayıt</span>
          <span style="background:#fef9c3;color:#92400e;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">⚠️ FARKLI VERİ — Manuel Seç</span>
        </div>
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
              <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${korunuyor?'#16a34a':'#d1d5db'};background:${korunuyor?'#16a34a':'#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s">
                ${korunuyor?'<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>':''}
              </div>
              <span style="font-size:11px;font-weight:800;color:${r.DURUM==='AKTİF'?'#16a34a':r.DURUM==='İPTAL'?'#dc2626':'#92400e'};min-width:55px">${r.DURUM||'—'}</span>
              <span style="font-size:12px;color:#374151;flex:1">${tarihler.length ? tarihler.join('  •  ') : '<span style="color:#94a3b8">Tarih yok</span>'}</span>
              ${r.NOT1 ? `<span style="font-size:11px;color:#64748b;font-style:italic;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.NOT1}</span>` : ''}
              <span style="font-size:11px;font-weight:800;color:${korunuyor?'#16a34a':'#dc2626'};min-width:60px;text-align:right">
                ${korunuyor ? '✅ KORUNAN' : '🗑️ SİLİNECEK'}
              </span>
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
  }

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
  const toplam = silinecekler.length;
  const baslangic = Date.now();

  for (const { r } of silinecekler) {
    try {
      _dtProgressGoster(silinen, toplam, '🗑️ Duplikatlar siliniyor...');
      _dtProgressSureGuncelle(baslangic, silinen, toplam);
      await db.collection('vatandaslar').doc(r._fbId).delete();
      const ai = allData.findIndex(x => x._fbId === r._fbId);
      if (ai !== -1) allData.splice(ai, 1);
      silinen++;
    } catch(e) { console.warn('Silme hatası:', r._fbId, e); }
  }

  _dtProgressGizle();
  showToast(`✅ ${silinen} duplikat kayıt silindi`);
  dtTara();
  if (typeof filterVat === 'function') filterVat();
  if (typeof buildAyTabs === 'function') buildAyTabs();
}

// ── Toplu seçim ────────────────────────────────────────────────────────

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
  const liste = [..._dtSecili];
  const toplam = liste.length;
  const baslangic = Date.now();

  for (const fbId of liste) {
    try {
      _dtProgressGoster(silinen, toplam, '🗑️ Seçili kayıtlar siliniyor...');
      _dtProgressSureGuncelle(baslangic, silinen, toplam);
      await db.collection('vatandaslar').doc(fbId).delete();
      const ai = allData.findIndex(x => x._fbId === fbId);
      if (ai !== -1) allData.splice(ai, 1);
      silinen++;
    } catch(e) { console.warn('Silme hatası:', fbId, e); }
  }

  _dtProgressGizle();
  showToast(`✅ ${silinen} kayıt silindi`);
  _dtSecili = new Set();
  dtTara();
  if (typeof filterVat === 'function') filterVat();
  if (typeof buildAyTabs === 'function') buildAyTabs();
}

// ── Boş + aynı içerikli otomatik silme ────────────────────────────────
async function dtOtomatikSil() {
  if (_dtOtomatikSilinecek.length === 0) { showToast('Silinecek otomatik kayıt yok'); return; }
  const bosS  = _dtOtomatikSilinecek.filter(x => x.sebep === 'BOŞ').length;
  const ayniS = _dtOtomatikSilinecek.filter(x => x.sebep === 'AYNI İÇERİK').length;
  const mesaj = [
    `🤖 Otomatik silinecek kayıtlar:\n`,
    bosS  ? `• ${bosS} adet tamamen BOŞ kayıt` : '',
    ayniS ? `• ${ayniS} adet BİREBİR AYNI içerikli kayıt` : '',
    `\nEmin misiniz?`
  ].filter(Boolean).join('\n');
  if (!confirm(mesaj)) return;

  const db = firebase.firestore();
  let silinen = 0;
  const toplam = _dtOtomatikSilinecek.length;
  const baslangic = Date.now();

  for (const { r } of _dtOtomatikSilinecek) {
    if (!r._fbId) continue;
    try {
      _dtProgressGoster(silinen, toplam, '🤖 Otomatik temizlik yapılıyor...');
      _dtProgressSureGuncelle(baslangic, silinen, toplam);
      await db.collection('vatandaslar').doc(r._fbId).delete();
      const ai = allData.findIndex(x => x._fbId === r._fbId);
      if (ai !== -1) allData.splice(ai, 1);
      silinen++;
    } catch(e) { console.warn('Otomatik silme hatası:', r._fbId, e); }
  }

  _dtProgressGizle();
  showToast(`✅ ${silinen} kayıt otomatik silindi`);
  _dtOtomatikSilinecek = [];
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
window.dtOtomatikSil     = dtOtomatikSil;

