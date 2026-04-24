// ══════════════════════════════════════════════════════════════════════
// DUPLİKAT TEMİZLE — Aynı kişi + aynı ay + aynı hizmet çakışmaları
// ══════════════════════════════════════════════════════════════════════

let _dtSonuc = []; // bulunan duplikatlar

// ─────────────────────────────────────────────
// TARA — Bellekteki allData içinde duplikatları bul
// ─────────────────────────────────────────────
function dtTara() {
  _dtSonuc = [];
  const gruplar = {};

  allData.forEach((r, idx) => {
    const key = `${(r.ISIM_SOYISIM||'').toLocaleUpperCase('tr-TR')}__${r['HİZMET']}__${r.AY}`;
    if (!gruplar[key]) gruplar[key] = [];
    gruplar[key].push({ r, idx });
  });

  for (const [key, liste] of Object.entries(gruplar)) {
    if (liste.length < 2) continue;
    const [isim, hizmet, ay] = key.split('__');
    _dtSonuc.push({ isim, hizmet, ay, kayitlar: liste });
  }

  _dtRender();
  if (_dtSonuc.length === 0) {
    showToast('✅ Duplikat bulunamadı, sistem temiz');
  } else {
    showToast(`⚠️ ${_dtSonuc.length} duplikat grup bulundu`);
  }
}

// ─────────────────────────────────────────────
// RENDER — Duplikat listesini göster
// ─────────────────────────────────────────────
function _dtRender() {
  const el = document.getElementById('dt-sonuc');
  if (!el) return;

  if (!_dtSonuc.length) {
    el.innerHTML = '<div style="text-align:center;color:#16a34a;font-size:13px;padding:24px;font-weight:700">✅ Duplikat kaydı yok</div>';
    return;
  }

  const HC = {'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100'};

  el.innerHTML = _dtSonuc.map((g, gi) => {
    const tarihSeti = new Set();
    const tumTarihler = g.kayitlar.flatMap(({ r }) =>
      ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
        .map(f => r[f]).filter(Boolean)
    );
    tumTarihler.forEach(t => tarihSeti.add(t));
    const ayniTarih = tumTarihler.length !== tarihSeti.size || tarihSeti.size === 0;

    return `<div style="background:${ayniTarih?'#fff7ed':'#fef2f2'};border:1.5px solid ${ayniTarih?'#fed7aa':'#fecaca'};border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-weight:900;font-size:14px">${g.isim}</span>
        <span style="background:${HC[g.hizmet]||'#374151'};color:#fff;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.hizmet}</span>
        <span style="background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.ay}</span>
        <span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800">${g.kayitlar.length} kayıt</span>
        ${ayniTarih
          ? `<button onclick="dtOtomatikSil(${gi})" style="margin-left:auto;background:#dc2626;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:800;cursor:pointer">🗑️ Fazlayı Sil</button>`
          : `<span style="margin-left:auto;background:#fef3c7;color:#92400e;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700">⚠️ Tarihler farklı — manuel kontrol</span>`
        }
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${g.kayitlar.map(({ r, idx }, ki) => {
          const tarihler = ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
            .map(f => r[f]).filter(Boolean);
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;flex-wrap:wrap">
            <span style="font-size:11px;color:#94a3b8;min-width:20px">${ki+1}.</span>
            <span style="font-size:11px;font-weight:700;color:${r.DURUM==='AKTİF'?'#16a34a':'#dc2626'}">${r.DURUM||'—'}</span>
            <span style="font-size:11px;color:#64748b">${tarihler.join(', ')||'Tarih yok'}</span>
            ${ki > 0 ? `<button onclick="dtTekSil(${gi},${ki})" style="margin-left:auto;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer">Sil</button>` : '<span style="margin-left:auto;font-size:10px;color:#94a3b8">korunan</span>'}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// OTOMATİK SİL — İlk kaydı koru, diğerlerini sil
// ─────────────────────────────────────────────
async function dtOtomatikSil(gi) {
  const g = _dtSonuc[gi];
  if (!g) return;

  if (!confirm(`"${g.isim}" — ${g.hizmet} — ${g.ay}\n${g.kayitlar.length - 1} fazla kayıt silinecek.\nOnaylıyor musunuz?`)) return;

  const db = firebase.firestore();
  // İlk kaydı koru (index 0), geri kalanları sil
  const silinecekler = g.kayitlar.slice(1);
  let silinen = 0;

  for (const { r, idx } of silinecekler) {
    if (!r._fbId) continue;
    try {
      await db.collection('vatandaslar').doc(r._fbId).delete();
      // allData'dan çıkar
      const ai = allData.findIndex(x => x._fbId === r._fbId);
      if (ai !== -1) allData.splice(ai, 1);
      silinen++;
    } catch(e) {
      console.warn('Silme hatası:', r._fbId, e);
    }
  }

  showToast(`✅ ${silinen} duplikat kayıt silindi`);
  // Listeyi güncelle
  _dtSonuc.splice(gi, 1);
  _dtRender();
  if (typeof filterVat === 'function') filterVat();
  if (typeof buildAyTabs === 'function') buildAyTabs();
}

// ─────────────────────────────────────────────
// TEK SİL — Belirli bir kaydı sil
// ─────────────────────────────────────────────
async function dtTekSil(gi, ki) {
  const g = _dtSonuc[gi];
  if (!g || ki === 0) return; // İlk kaydı (korunan) silme

  const { r } = g.kayitlar[ki];
  if (!r._fbId) { showToast('⚠️ Firebase ID yok'); return; }

  if (!confirm(`Bu kaydı silmek istediğinize emin misiniz?\n${g.isim} — ${g.ay}`)) return;

  try {
    await firebase.firestore().collection('vatandaslar').doc(r._fbId).delete();
    const ai = allData.findIndex(x => x._fbId === r._fbId);
    if (ai !== -1) allData.splice(ai, 1);
    g.kayitlar.splice(ki, 1);
    if (g.kayitlar.length < 2) _dtSonuc.splice(gi, 1);
    _dtRender();
    if (typeof filterVat === 'function') filterVat();
    showToast('✅ Kayıt silindi');
  } catch(e) {
    showToast('❌ Silinemedi: ' + e.message);
  }
}

// ─────────────────────────────────────────────
// TÜMÜNÜ OTOMATİK TEMİZLE — Tüm duplikatları tek tıkla temizle
// ─────────────────────────────────────────────
async function dtHepsiniTemizle() {
  const otomatikler = _dtSonuc.filter(g => {
    // Aynı tarih grubunu otomatik temizleyebiliriz
    const tumTarihler = g.kayitlar.flatMap(({ r }) =>
      ['BANYO1','BANYO2','BANYO3','BANYO4','BANYO5','SAC1','SAC2','TIRNAK1','TIRNAK2','SAKAL1','SAKAL2']
        .map(f => r[f]).filter(Boolean)
    );
    const tarihSeti = new Set(tumTarihler);
    return tumTarihler.length !== tarihSeti.size || tarihSeti.size === 0;
  });

  if (!otomatikler.length) { showToast('Otomatik temizlenecek duplikat yok'); return; }
  if (!confirm(`${otomatikler.length} grup otomatik temizlenecek. Onaylıyor musunuz?`)) return;

  const db = firebase.firestore();
  let toplamSilinen = 0;

  for (const g of otomatikler) {
    const silinecekler = g.kayitlar.slice(1);
    for (const { r } of silinecekler) {
      if (!r._fbId) continue;
      try {
        await db.collection('vatandaslar').doc(r._fbId).delete();
        const ai = allData.findIndex(x => x._fbId === r._fbId);
        if (ai !== -1) allData.splice(ai, 1);
        toplamSilinen++;
      } catch(e) { console.warn(e); }
    }
  }

  showToast(`✅ ${toplamSilinen} duplikat kayıt temizlendi`);
  dtTara(); // Yeniden tara
  if (typeof filterVat === 'function') filterVat();
  if (typeof buildAyTabs === 'function') buildAyTabs();
}

window.dtTara = dtTara;
window.dtOtomatikSil = dtOtomatikSil;
window.dtTekSil = dtTekSil;
window.dtHepsiniTemizle = dtHepsiniTemizle;
