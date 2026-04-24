// ══════════════════════════════════════════════════════════════════════
// DUPLİKAT TEMİZLE — Seçmeli silme, korunan kaydı kullanıcı seçer
// ══════════════════════════════════════════════════════════════════════

let _dtSonuc = [];
// Her grup için hangi kayıt korunacak: { "grupIdx": kayitIdx }
let _dtKorunan = {};
// Toplu seçim: seçili kayıtların fbId seti
let _dtSecili = new Set();

function dtTara() {
  _dtSonuc = [];
  _dtKorunan = {};
  _dtSecili = new Set();
  const gruplar = {};

  allData.forEach((r, idx) => {
    const key = `${(r.ISIM_SOYISIM||'').toLocaleUpperCase('tr-TR')}__${r['HİZMET']}__${r.AY}`;
    if (!gruplar[key]) gruplar[key] = [];
    gruplar[key].push({ r, idx });
  });

  for (const [key, liste] of Object.entries(gruplar)) {
    if (liste.length < 2) continue;
    const [isim, hizmet, ay] = key.split('__');
    _dtKorunan[_dtSonuc.length] = 0;
    _dtSonuc.push({ isim, hizmet, ay, kayitlar: liste });
  }

  _dtRender();
  if (_dtSonuc.length === 0) {
    showToast('✅ Duplikat bulunamadı, sistem temiz');
  } else {
    showToast(`⚠️ ${_dtSonuc.length} duplikat grup bulundu`);
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

  // Tüm görünen kayıtların fbId listesi (toplu seç/kaldır için)
  const tumGorunenIds = [];
  _dtSonuc.forEach(g => {
    g.kayitlar.forEach(({ r }) => {
      if (r._fbId) tumGorunenIds.push(r._fbId);
    });
  });

  const tumSecili = tumGorunenIds.length > 0 && tumGorunenIds.every(id => _dtSecili.has(id));

  // Duplikat silme (eski sistem) için silinecek sayısı
  let toplamDuplikatSilinecek = 0;
  _dtSonuc.forEach((g, gi) => {
    g.kayitlar.forEach((_, ki) => {
      if (_dtKorunan[gi] !== ki) toplamDuplikatSilinecek++;
    });
  });

  const seciliSayisi = _dtSecili.size;

  let html = `
  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">

    <!-- Üst araç çubuğu: Toplu Seçim -->
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:700;color:#374151;user-select:none">
        <input type="checkbox" id="dt-tumunu-sec" ${tumSecili?'checked':''} onchange="dtTumunuSec(this.checked)"
          style="width:16px;height:16px;cursor:pointer;accent-color:#7c3aed">
        Tümünü Seç
      </label>
      <span style="font-size:12px;color:#64748b">${seciliSayisi > 0 ? `<b style="color:#7c3aed">${seciliSayisi} kayıt seçili</b>` : 'Kayıt seçilmedi'}</span>
      <button onclick="dtSecilenleriSil()"
        ${seciliSayisi === 0 ? 'disabled' : ''}
        style="margin-left:auto;background:${seciliSayisi>0?'#7c3aed':'#cbd5e1'};color:#fff;border:none;border-radius:10px;padding:8px 20px;font-size:13px;font-weight:800;cursor:${seciliSayisi>0?'pointer':'not-allowed'};transition:background .2s">
        🗑️ Seçilenleri Sil${seciliSayisi > 0 ? ` (${seciliSayisi})` : ''}
      </button>
    </div>

    <!-- Alt araç çubuğu: Duplikat sistemi (eski) -->
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff8f8;border:1.5px solid #fecaca;border-radius:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:#64748b;font-weight:700">
        ${_dtSonuc.length} duplikat grup •
        <span style="color:#dc2626">${toplamDuplikatSilinecek} kayıt silinecek (korunan hariç)</span>
      </span>
      <button onclick="dtHepsiniUygula()"
        style="margin-left:auto;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:8px 20px;font-size:13px;font-weight:800;cursor:pointer">
        🗑️ Duplikatları Sil (${toplamDuplikatSilinecek})
      </button>
    </div>

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
      </div>
      <!-- Kayıt listesi -->
      <div style="display:flex;flex-direction:column;gap:6px">
        ${g.kayitlar.map(({ r }, ki) => {
          const tarihler = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
            .map(f => r[f]).filter(Boolean);
          const korunuyor = korunanIdx === ki;
          const secili = r._fbId && _dtSecili.has(r._fbId);
          const bg = secili ? '#f5f3ff' : (korunuyor ? '#f0fdf4' : '#fef2f2');
          const border = secili ? '#a78bfa' : (korunuyor ? '#86efac' : '#fecaca');

          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${bg};border:1.5px solid ${border};border-radius:10px;flex-wrap:wrap">
            <!-- Toplu seçim checkbox -->
            <input type="checkbox" ${secili?'checked':''} ${r._fbId?'':'disabled'}
              onchange="dtToggleSecim('${r._fbId}', this.checked)"
              onclick="event.stopPropagation()"
              style="width:16px;height:16px;cursor:pointer;accent-color:#7c3aed;flex-shrink:0">
            <!-- Radio: korunan seç (mevcut sistem) -->
            <div onclick="dtSecKorunan(${gi},${ki})" title="Bu kaydı duplikat korumasında sakla"
              style="width:20px;height:20px;border-radius:50%;border:2px solid ${korunuyor?'#16a34a':'#d1d5db'};background:${korunuyor?'#16a34a':'#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .15s">
              ${korunuyor?'<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>':''}
            </div>
            <!-- Durum -->
            <span style="font-size:11px;font-weight:800;color:${r.DURUM==='AKTİF'?'#16a34a':r.DURUM==='İPTAL'?'#dc2626':'#92400e'};min-width:55px">${r.DURUM||'—'}</span>
            <!-- Tarihler -->
            <span style="font-size:12px;color:#374151;flex:1">${tarihler.length ? tarihler.join('  •  ') : '<span style="color:#94a3b8">Tarih yok</span>'}</span>
            <!-- Not -->
            ${r.NOT1 ? `<span style="font-size:11px;color:#64748b;font-style:italic;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.NOT1}</span>` : ''}
            <!-- Etiket -->
            <span style="font-size:11px;font-weight:800;color:${secili?'#7c3aed':korunuyor?'#16a34a':'#dc2626'};min-width:70px;text-align:right">
              ${secili ? '☑️ SEÇİLDİ' : korunuyor ? '✅ KORUNAN' : '🗑️ SİLİNECEK'}
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = html;
}

// ── Toplu seçim fonksiyonları ──────────────────────────────────────────

// Tek kayıt toggle
function dtToggleSecim(fbId, secili) {
  if (!fbId) return;
  if (secili) _dtSecili.add(fbId);
  else _dtSecili.delete(fbId);
  _dtRender();
}

// Tümünü seç / kaldır
function dtTumunuSec(secili) {
  _dtSecili = new Set();
  if (secili) {
    _dtSonuc.forEach(g => {
      g.kayitlar.forEach(({ r }) => {
        if (r._fbId) _dtSecili.add(r._fbId);
      });
    });
  }
  _dtRender();
}

// Seçili kayıtları sil (toplu)
async function dtSecilenleriSil() {
  if (_dtSecili.size === 0) { showToast('Silinecek kayıt seçilmedi'); return; }
  if (!confirm(`${_dtSecili.size} seçili kayıt silinecek. Onaylıyor musunuz?`)) return;

  const db = firebase.firestore();
  let silinen = 0;
  const idler = [..._dtSecili];

  for (const fbId of idler) {
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

// ── Mevcut duplikat sistemi (değişmedi) ───────────────────────────────

function dtSecKorunan(gi, ki) {
  _dtKorunan[gi] = ki;
  _dtRender();
}

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

window.dtTara          = dtTara;
window.dtSecKorunan    = dtSecKorunan;
window.dtHepsiniUygula = dtHepsiniUygula;
window.dtToggleSecim   = dtToggleSecim;
window.dtTumunuSec     = dtTumunuSec;
window.dtSecilenleriSil = dtSecilenleriSil;
