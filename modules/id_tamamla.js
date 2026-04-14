// ── TC / DOĞUM TARİHİ TAMAMLAMA SAYFASI ──────────────────────────────────

let _idData = [];       // TC eksik kayıtlar
let _idTumData = [];    // Tüm vatandaşlar (bilgi koleksiyonu)
let _idAktifSekme = 'eksik'; // 'eksik' | 'tumVatandaslar'
let _idTumArama = '';

// ════════════════════════════════════════════
//  SAYFA GÖSTERİLDİĞİNDE ÇAĞRILIR
// ════════════════════════════════════════════
async function idTamamlaYukle() {
  const wrap = document.getElementById('id-tamamla-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-soft)">⏳ Yükleniyor…</div>';

  try {
    const snap = await firebase.firestore().collection('vatandaslar_bilgi').get();
    const tumKayitlar = snap.docs.map(d => ({ _fbId: d.id, ...d.data() }));

    // TC eksik veya geçersiz olanları filtrele
    _idData = tumKayitlar.filter(r => {
      const tc = String(r.TC || '').replace(/\D/g, '');
      return tc.length !== 11;
    });

    // Tüm vatandaşlar — ada göre sırala
    _idTumData = [...tumKayitlar].sort((a, b) =>
      (a.AD_SOYAD || '').localeCompare(b.AD_SOYAD || '', 'tr')
    );

    _idSayfaRender();
  } catch (e) {
    wrap.innerHTML = `<div style="padding:20px;color:var(--danger)">❌ Yükleme hatası: ${e.message}</div>`;
  }
}

// ════════════════════════════════════════════
//  ANA ÇERÇEVE (sekmeler + içerik)
// ════════════════════════════════════════════
function _idSayfaRender() {
  const wrap = document.getElementById('id-tamamla-wrap');
  if (!wrap) return;

  const sekmeStil = (id) => {
    const aktif = _idAktifSekme === id;
    return aktif
      ? 'padding:9px 20px;border-radius:8px 8px 0 0;border:1.5px solid var(--border,#e2e8f0);border-bottom:2px solid #fff;background:#fff;font-size:12px;font-weight:900;cursor:pointer;color:#1d4ed8;margin-bottom:-1px;position:relative;z-index:2'
      : 'padding:9px 20px;border-radius:8px 8px 0 0;border:1.5px solid transparent;background:#f1f5f9;font-size:12px;font-weight:700;cursor:pointer;color:#64748b;margin-bottom:-1px';
  };

  wrap.innerHTML = `
    <!-- Sekmeler -->
    <div style="display:flex;gap:4px;border-bottom:1.5px solid var(--border,#e2e8f0);margin-bottom:0">
      <button onclick="_idSekmeGec('eksik')" style="${sekmeStil('eksik')}">
        ⚠️ TC Eksik
        <span style="background:${_idAktifSekme==='eksik'?'#fcd34d':'#e2e8f0'};color:${_idAktifSekme==='eksik'?'#92400e':'#64748b'};border-radius:10px;padding:1px 7px;font-size:10px;font-weight:900;margin-left:6px">
          ${_idData.length}
        </span>
      </button>
      <button onclick="_idSekmeGec('tumVatandaslar')" style="${sekmeStil('tumVatandaslar')}">
        👥 Tüm Vatandaşlar
        <span style="background:${_idAktifSekme==='tumVatandaslar'?'#dbeafe':'#e2e8f0'};color:${_idAktifSekme==='tumVatandaslar'?'#1d4ed8':'#64748b'};border-radius:10px;padding:1px 7px;font-size:10px;font-weight:900;margin-left:6px">
          ${_idTumData.length}
        </span>
      </button>
    </div>

    <!-- Sekme içeriği -->
    <div id="id-sekme-icerik" style="border:1.5px solid var(--border,#e2e8f0);border-top:none;border-radius:0 8px 8px 8px;padding:18px;background:#fff">
    </div>
  `;

  _idSekmeIcerikRender();
}

function _idSekmeGec(sekme) {
  _idAktifSekme = sekme;
  _idSayfaRender();
}

function _idSekmeIcerikRender() {
  if (_idAktifSekme === 'eksik') {
    _idTamamlaRender();
  } else {
    _idTumVatandaslarRender();
  }
}

// ════════════════════════════════════════════
//  SEKMe 1 — TC EKSİK LİSTESİ
// ════════════════════════════════════════════
function _idTamamlaRender() {
  const cont = document.getElementById('id-sekme-icerik');
  if (!cont) return;

  if (!_idData.length) {
    cont.innerHTML = `
      <div style="padding:40px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px">🎉</div>
        <div style="font-size:16px;font-weight:800;color:var(--ok,#16a34a)">Tüm kayıtların TC numarası girilmiş!</div>
      </div>`;
    return;
  }

  // Hizmet bazlı özet
  const hizmetSayac = {};
  _idData.forEach(r => {
    const hizmetler = Array.isArray(r.HIZMETLER) ? r.HIZMETLER : (r.HIZMET ? [r.HIZMET] : ['—']);
    hizmetler.forEach(h => { hizmetSayac[h] = (hizmetSayac[h] || 0) + 1; });
  });

  cont.innerHTML = `
    <!-- Özet -->
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;align-items:center">
      <div style="background:#fef9c3;border:1.5px solid #fcd34d;color:#92400e;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:800">
        ⚠️ ${_idData.length} kayıtta TC eksik
      </div>
      ${Object.entries(hizmetSayac).map(([h,s])=>`
        <div style="background:#f0f9ff;border:1.5px solid #bae6fd;color:#0369a1;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700">
          ${h}: ${s}
        </div>`).join('')}
    </div>

    <!-- Eylem butonları -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;align-items:center">
      <button class="btn btn-primary" onclick="idExcelIndir()" style="background:#16a34a;color:#fff">
        ⬇️ Excel İndir (Boş Şablon)
      </button>
      <label class="btn" style="background:#1d4ed8;color:#fff;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
        ⬆️ Excel Yükle (Dolu)
        <input type="file" accept=".xlsx,.xls" onchange="idExcelYukle(this)" style="display:none">
      </label>
      <span style="font-size:11px;color:var(--text-soft)">
        Excel'i indirin → TC ve Doğum Tarihi sütunlarını doldurun → geri yükleyin
      </span>
    </div>

    <!-- Tablo -->
    <div style="border-radius:10px;border:1.5px solid var(--border,#e2e8f0);overflow:hidden;max-height:600px;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--primary,#1d4ed8);color:#fff">
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;white-space:nowrap">#</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Ad Soyad</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Hizmet</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Mahalle</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">TC (Mevcut)</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Doğum Tarihi</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Düzenle</th>
          </tr>
        </thead>
        <tbody>
          ${_idData.map((r, i) => {
            const hizmetler = Array.isArray(r.HIZMETLER) ? r.HIZMETLER : (r.HIZMET ? [r.HIZMET] : []);
            const tcMevcut = String(r.TC || '').replace(/\D/g,'');
            return `
            <tr style="${i%2===0?'background:#fff':'background:#f8fafc'}">
              <td style="padding:7px 10px;color:#94a3b8;font-weight:700">${i+1}</td>
              <td style="padding:7px 10px;font-weight:800">${_esc(r.AD_SOYAD||'—')}</td>
              <td style="padding:7px 10px">${hizmetler.map(h=>`<span style="background:#f0f9ff;color:#0369a1;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:800">${_esc(h)}</span>`).join(' ')}</td>
              <td style="padding:7px 10px">${_esc(r.MAHALLE||'—')}</td>
              <td style="padding:7px 10px;font-family:'Courier New',monospace">
                ${tcMevcut ? `<span style="color:#f97316;font-weight:700">${tcMevcut} <span style="font-size:9px;color:#94a3b8">(eksik/hatalı)</span></span>` : '<span style="color:#dc2626;font-weight:700">Yok</span>'}
              </td>
              <td style="padding:7px 10px;color:${r.DOGUM_TARIHI?'#0f172a':'#dc2626'};font-weight:${r.DOGUM_TARIHI?'600':'800'}">
                ${_esc(r.DOGUM_TARIHI||'Yok')}
              </td>
              <td style="padding:7px 10px">
                <button onclick="idSatirDuzenle('${r._fbId}')"
                  style="background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:7px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer">
                  ✏️ Düzenle
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ════════════════════════════════════════════
//  SEKMe 2 — TÜM VATANDAŞLAR
// ════════════════════════════════════════════
function _idTumVatandaslarRender() {
  const cont = document.getElementById('id-sekme-icerik');
  if (!cont) return;

  // Arama filtresi
  const arama = _idTumArama.trim().toUpperCase();
  const filtreli = arama
    ? _idTumData.filter(r =>
        (r.AD_SOYAD||'').toUpperCase().includes(arama) ||
        String(r.TC||'').includes(arama) ||
        (r.MAHALLE||'').toUpperCase().includes(arama)
      )
    : _idTumData;

  // Boş TC sayısı
  const bosTC = _idTumData.filter(r => String(r.TC||'').replace(/\D/g,'').length !== 11).length;

  cont.innerHTML = `
    <!-- Üst bar -->
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:center">
      <div style="background:#dbeafe;border:1.5px solid #93c5fd;color:#1d4ed8;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:800">
        👥 Toplam: ${_idTumData.length}
      </div>
      <div style="background:#fef9c3;border:1.5px solid #fcd34d;color:#92400e;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:800">
        ⚠️ TC Eksik: ${bosTC}
      </div>
      <!-- Arama -->
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <input
          id="id-tum-arama"
          type="text"
          placeholder="Ad, TC veya Mahalle ara…"
          value="${_esc(_idTumArama)}"
          oninput="_idTumAramaGuncelle(this.value)"
          style="padding:7px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none;min-width:220px"
          onfocus="this.style.borderColor='#1d4ed8'"
          onblur="this.style.borderColor='#e2e8f0'"
        >
        ${arama ? `<button onclick="_idTumAramaGuncelle('')" style="padding:7px 11px;border:1.5px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;cursor:pointer">✕</button>` : ''}
      </div>
    </div>

    ${arama && filtreli.length === 0 ? `
      <div style="padding:32px;text-align:center;color:#94a3b8;font-size:13px">Sonuç bulunamadı.</div>
    ` : `
    <!-- Tablo -->
    <div style="border-radius:10px;border:1.5px solid var(--border,#e2e8f0);overflow:hidden;max-height:580px;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--primary,#1d4ed8);color:#fff;position:sticky;top:0;z-index:1">
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;white-space:nowrap">#</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Ad Soyad</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Hizmet</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Mahalle</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">TC</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Doğum Tarihi</th>
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase">Düzenle</th>
          </tr>
        </thead>
        <tbody>
          ${filtreli.map((r, i) => {
            const hizmetler = Array.isArray(r.HIZMETLER) ? r.HIZMETLER : (r.HIZMET ? [r.HIZMET] : []);
            const tc = String(r.TC||'').replace(/\D/g,'');
            const tcEksik = tc.length !== 11;
            return `
            <tr style="${i%2===0?'background:#fff':'background:#f8fafc'}${tcEksik?' outline:2px solid #fef08a;outline-offset:-2px;':''}" title="${tcEksik?'TC numarası eksik/hatalı':''}">
              <td style="padding:7px 10px;color:#94a3b8;font-weight:700">${i+1}</td>
              <td style="padding:7px 10px;font-weight:800">${_esc(r.AD_SOYAD||'—')}</td>
              <td style="padding:7px 10px">${hizmetler.map(h=>`<span style="background:#f0f9ff;color:#0369a1;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:800">${_esc(h)}</span>`).join(' ')}</td>
              <td style="padding:7px 10px;font-size:11px">${_esc(r.MAHALLE||'—')}</td>
              <td style="padding:7px 10px;font-family:'Courier New',monospace">
                ${tc
                  ? (tcEksik
                      ? `<span style="color:#f97316;font-weight:700">${tc} <span style="font-size:9px;color:#94a3b8">(eksik)</span></span>`
                      : `<span style="color:#16a34a;font-weight:700">${tc}</span>`)
                  : '<span style="color:#dc2626;font-weight:800">Yok</span>'}
              </td>
              <td style="padding:7px 10px;color:${r.DOGUM_TARIHI?'#0f172a':'#dc2626'};font-weight:${r.DOGUM_TARIHI?'600':'800'}">
                ${_esc(r.DOGUM_TARIHI||'Yok')}
              </td>
              <td style="padding:7px 10px">
                <button onclick="idTumDuzenle('${r._fbId}')"
                  style="background:${tcEksik?'#fef9c3':'#f1f5f9'};border:1.5px solid ${tcEksik?'#fcd34d':'#e2e8f0'};border-radius:7px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer">
                  ✏️ Düzenle
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    `}
  `;
}

function _idTumAramaGuncelle(val) {
  _idTumArama = val;
  _idTumVatandaslarRender();
  // odağı koru
  const inp = document.getElementById('id-tum-arama');
  if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

// ════════════════════════════════════════════
//  TÜM VATANDAŞLAR — DÜZENLE MODALİ
// ════════════════════════════════════════════
function idTumDuzenle(fbId) {
  // Her iki listede de arayalım (eksik listesinde veya tümünde olabilir)
  const r = _idTumData.find(x => x._fbId === fbId);
  if (!r) return;

  const eskiModal = document.getElementById('id-tum-modal');
  if (eskiModal) eskiModal.remove();

  const tc = String(r.TC||'').replace(/\D/g,'');

  const modal = document.createElement('div');
  modal.id = 'id-tum-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:420px;box-shadow:0 8px 40px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:900;color:#1d4ed8;margin-bottom:6px">✏️ TC & Doğum Tarihi Düzenle</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:14px">${_esc(r.AD_SOYAD||'')} · ${_esc(r.MAHALLE||'')}</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px">TC Kimlik No (11 hane)</label>
          <input id="idtm-tc" type="text" maxlength="11" inputmode="numeric"
            value="${tc}"
            style="width:100%;padding:9px 12px;border:1.5px solid ${tc.length===11?'#86efac':'#e2e8f0'};border-radius:8px;font-size:14px;font-family:'Courier New',monospace;letter-spacing:.1em;outline:none;box-sizing:border-box"
            oninput="this.value=this.value.replace(/\\D/g,'').slice(0,11);_idTmValide()"
            onfocus="this.style.borderColor='#1d4ed8'"
            onblur="_idTmValide()">
          <div id="idtm-tc-hint" style="font-size:10px;margin-top:3px;color:${tc.length===11?'#16a34a':'#94a3b8'}">
            ${tc.length===11?'✅ Geçerli TC':tc.length>0?tc.length+'/11 rakam':'11 rakam girilmesi gerekiyor'}
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px">Doğum Tarihi</label>
          <input id="idtm-dogum" type="date" value="${r.DOGUM_TARIHI||''}"
            style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='#1d4ed8'"
            onblur="this.style.borderColor='#e2e8f0'">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
        <button onclick="document.getElementById('id-tum-modal').remove()"
          style="padding:8px 16px;border:1.5px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;font-weight:700;cursor:pointer">
          İptal
        </button>
        <button id="idtm-btn" onclick="idTumKaydet('${fbId}')"
          style="padding:8px 18px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">
          ✅ Kaydet
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  setTimeout(() => { document.getElementById('idtm-tc')?.focus(); }, 100);
}

function _idTmValide() {
  const tc = document.getElementById('idtm-tc')?.value || '';
  const hint = document.getElementById('idtm-tc-hint');
  const input = document.getElementById('idtm-tc');
  if (!hint) return;
  if (tc.length === 11) {
    hint.textContent = '✅ Geçerli TC';
    hint.style.color = '#16a34a';
    if (input) input.style.borderColor = '#86efac';
  } else {
    hint.textContent = tc.length > 0 ? `${tc.length}/11 rakam` : '11 rakam girilmesi gerekiyor';
    hint.style.color = '#94a3b8';
    if (input) input.style.borderColor = '#e2e8f0';
  }
}

async function idTumKaydet(fbId) {
  const r = _idTumData.find(x => x._fbId === fbId);
  if (!r) return;

  const tc = (document.getElementById('idtm-tc')?.value || '').trim();
  const dogum = (document.getElementById('idtm-dogum')?.value || '').trim();

  if (tc && tc.length !== 11) {
    showToast('⚠️ TC 11 hane olmalı'); return;
  }

  const btn = document.getElementById('idtm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    const guncelleme = {};
    if (tc) guncelleme.TC = tc;
    if (dogum) guncelleme.DOGUM_TARIHI = dogum;
    if (!Object.keys(guncelleme).length) {
      showToast('Değişiklik yok');
      document.getElementById('id-tum-modal')?.remove();
      return;
    }

    // vatandaslar_bilgi güncelle
    await firebase.firestore().collection('vatandaslar_bilgi').doc(fbId).update(guncelleme);

    // vatandaslar koleksiyonunda aynı isimli tüm kayıtlara yansıt
    const isim = r.AD_SOYAD || '';
    const snap = await firebase.firestore().collection('vatandaslar').where('ISIM_SOYISIM','==',isim).get();
    let guncellenen = 0;
    for (const doc of snap.docs) {
      await doc.ref.update(guncelleme);
      guncellenen++;
    }

    // allData güncelle
    if (typeof allData !== 'undefined') {
      allData.forEach(rec => {
        if ((rec.ISIM_SOYISIM||'').toUpperCase() === isim.toUpperCase()) {
          if (tc) rec.TC = tc;
          if (dogum) rec.DOGUM_TARIHI = dogum;
        }
      });
    }

    // Yerel veri güncelle
    Object.assign(r, guncelleme);

    // Eksik listesini güncelle: TC artık geçerliyse çıkar
    if (tc && tc.length === 11) {
      _idData = _idData.filter(x => x._fbId !== fbId);
    }

    document.getElementById('id-tum-modal')?.remove();
    _idSayfaRender(); // sekme sayaçları da güncellensin
    showToast(`✅ Kaydedildi${guncellenen ? ' — ' + guncellenen + ' aya yansıtıldı' : ''}`);
  } catch (e) {
    showToast('❌ Hata: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '✅ Kaydet'; }
  }
}

// ════════════════════════════════════════════
//  SEKMe 1 — SATIR BAZLI HIZLI DÜZENLE (inline modal)
// ════════════════════════════════════════════
function idSatirDuzenle(fbId) {
  const r = _idData.find(x => x._fbId === fbId);
  if (!r) return;

  // Mevcut modalı varsa kapat
  const eskiModal = document.getElementById('id-quick-modal');
  if (eskiModal) eskiModal.remove();

  const modal = document.createElement('div');
  modal.id = 'id-quick-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:420px;box-shadow:0 8px 40px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:900;color:#1d4ed8;margin-bottom:16px">🪪 TC & Doğum Tarihi Ekle</div>
      <div style="font-size:13px;font-weight:800;margin-bottom:14px">${_esc(r.AD_SOYAD||'')}</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px">TC Kimlik No (11 hane)</label>
          <input id="idqm-tc" type="text" maxlength="11" inputmode="numeric"
            value="${String(r.TC||'').replace(/\D/g,'')}"
            style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'Courier New',monospace;letter-spacing:.1em;outline:none"
            oninput="this.value=this.value.replace(/\\D/g,'').slice(0,11);_idQmValide()"
            onfocus="this.style.borderColor='#1d4ed8'"
            onblur="this.style.borderColor='#e2e8f0'">
          <div id="idqm-tc-hint" style="font-size:10px;color:#94a3b8;margin-top:3px">11 rakam girilmesi gerekiyor</div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px">Doğum Tarihi</label>
          <input id="idqm-dogum" type="date" value="${r.DOGUM_TARIHI||''}"
            style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none"
            onfocus="this.style.borderColor='#1d4ed8'"
            onblur="this.style.borderColor='#e2e8f0'">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
        <button onclick="document.getElementById('id-quick-modal').remove()"
          style="padding:8px 16px;border:1.5px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;font-weight:700;cursor:pointer">
          İptal
        </button>
        <button id="idqm-btn" onclick="idQuickKaydet('${fbId}')"
          style="padding:8px 18px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">
          ✅ Kaydet
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  setTimeout(() => { document.getElementById('idqm-tc')?.focus(); }, 100);
}

function _idQmValide() {
  const tc = document.getElementById('idqm-tc')?.value || '';
  const hint = document.getElementById('idqm-tc-hint');
  const btn = document.getElementById('idqm-btn');
  if (!hint || !btn) return;
  if (tc.length === 11) {
    hint.textContent = '✅ Geçerli uzunluk';
    hint.style.color = '#16a34a';
  } else {
    hint.textContent = `${tc.length}/11 rakam`;
    hint.style.color = '#94a3b8';
  }
}

async function idQuickKaydet(fbId) {
  const r = _idData.find(x => x._fbId === fbId);
  if (!r) return;
  const tc = (document.getElementById('idqm-tc')?.value || '').trim();
  const dogum = (document.getElementById('idqm-dogum')?.value || '').trim();

  if (tc && tc.length !== 11) {
    showToast('⚠️ TC 11 hane olmalı'); return;
  }

  const btn = document.getElementById('idqm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    const guncelleme = {};
    if (tc) guncelleme.TC = tc;
    if (dogum) guncelleme.DOGUM_TARIHI = dogum;
    if (!Object.keys(guncelleme).length) { showToast('Değişiklik yok'); document.getElementById('id-quick-modal')?.remove(); return; }

    // vatandaslar_bilgi güncelle
    await firebase.firestore().collection('vatandaslar_bilgi').doc(fbId).update(guncelleme);

    // vatandaslar koleksiyonunda aynı isimli tüm kayıtlara TC + doğum tarihi yaz
    const isim = r.AD_SOYAD || '';
    const snap = await firebase.firestore().collection('vatandaslar').where('ISIM_SOYISIM','==',isim).get();
    let guncellenen = 0;
    for (const doc of snap.docs) {
      await doc.ref.update(guncelleme);
      guncellenen++;
    }

    // allData'yı da güncelle (sayfa yenilemeye gerek kalmasın)
    if (typeof allData !== 'undefined') {
      allData.forEach(rec => {
        if ((rec.ISIM_SOYISIM||'').toUpperCase() === isim.toUpperCase()) {
          if (tc) rec.TC = tc;
          if (dogum) rec.DOGUM_TARIHI = dogum;
        }
      });
    }

    Object.assign(r, guncelleme);
    // Listeden çıkar (TC artık geçerli)
    if (tc && tc.length === 11) _idData = _idData.filter(x => x._fbId !== fbId);

    // Tüm veri listesini de güncelle
    const tumRec = _idTumData.find(x => x._fbId === fbId);
    if (tumRec) Object.assign(tumRec, guncelleme);

    document.getElementById('id-quick-modal')?.remove();
    _idSayfaRender();
    showToast(`✅ Kaydedildi${guncellenen ? ' — ' + guncellenen + ' aya yansıtıldı' : ''}`);
  } catch (e) {
    showToast('❌ Hata: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '✅ Kaydet'; }
  }
}

// ════════════════════════════════════════════
//  EXCEL İNDİR — Boş şablon
// ════════════════════════════════════════════
function idExcelIndir() {
  if (!_idData.length) { showToast('TC eksik kayıt yok'); return; }
  if (typeof XLSX === 'undefined') { showToast('Excel kütüphanesi yüklenmedi'); return; }

  const satirlar = _idData.map(r => {
    const hizmetler = Array.isArray(r.HIZMETLER) ? r.HIZMETLER.join(', ') : (r.HIZMET || '');
    return {
      'FIREBASE_ID': r._fbId,         // referans için — değiştirme
      'AD_SOYAD':    r.AD_SOYAD || '',
      'HİZMET':      hizmetler,
      'MAHALLE':     r.MAHALLE || '',
      'TC':          String(r.TC || '').replace(/\D/g,''),
      'DOGUM_TARIHI': r.DOGUM_TARIHI || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(satirlar);

  // Sütun genişlikleri
  ws['!cols'] = [
    { wch: 24 }, // FIREBASE_ID
    { wch: 28 }, // AD_SOYAD
    { wch: 20 }, // HİZMET
    { wch: 18 }, // MAHALLE
    { wch: 14 }, // TC
    { wch: 14 }, // DOGUM_TARIHI
  ];

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DBEAFE' } } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TC Eksik');
  XLSX.writeFile(wb, 'tc_eksik_listesi.xlsx');
  showToast('⬇️ Excel indirildi');
}

// ════════════════════════════════════════════
//  EXCEL YÜKLE — Dolu şablon işle
// ════════════════════════════════════════════
async function idExcelYukle(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { showToast('Excel kütüphanesi yüklenmedi'); return; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) { showToast('⚠️ Excel boş'); return; }

      // Önizleme göster
      _idYuklemeOnizle(rows);
    } catch(err) {
      showToast('❌ Excel okunamadı: ' + err.message);
    }
  };
  reader.readAsBinaryString(file);
  // input'u sıfırla (aynı dosyayı tekrar seçebilsin)
  input.value = '';
}

function _idYuklemeOnizle(rows) {
  // Kaç satırda TC veya doğum tarihi dolu?
  let tcDolu = 0, dogumDolu = 0, hataVar = false;
  const islenecek = rows.map(row => {
    const fbId = String(row['FIREBASE_ID'] || '').trim();
    const tc = String(row['TC'] || '').replace(/\D/g,'').slice(0,11);
    const dogum = _tarihNormalize(row['DOGUM_TARIHI']);
    if (tc) tcDolu++;
    if (dogum) dogumDolu++;
    if (tc && tc.length !== 11) hataVar = true;
    return { fbId, tc, dogum, ad: String(row['AD_SOYAD']||'') };
  }).filter(r => r.fbId && (r.tc || r.dogum));

  // Mevcut modalı varsa kapat
  const eskiM = document.getElementById('id-upload-modal');
  if (eskiM) eskiM.remove();

  const m = document.createElement('div');
  m.id = 'id-upload-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:560px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25)">
      <div style="font-size:15px;font-weight:900;color:#1d4ed8;margin-bottom:14px">📋 Yükleme Önizlemesi</div>
      ${hataVar ? '<div style="background:#fee2e2;border:1.5px solid #fca5a5;color:#dc2626;border-radius:8px;padding:9px 13px;font-size:12px;font-weight:700;margin-bottom:12px">⚠️ Bazı TC numaraları 11 hane değil — bunlar atlanacak</div>' : ''}
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <div style="background:#dcfce7;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:800;color:#16a34a">✅ ${islenecek.length} kayıt işlenecek</div>
        <div style="background:#dbeafe;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:800;color:#1d4ed8">🪪 ${tcDolu} TC dolu</div>
        <div style="background:#fef9c3;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:800;color:#92400e">🎂 ${dogumDolu} doğum tarihi dolu</div>
      </div>
      <div style="border-radius:8px;border:1.5px solid #e2e8f0;overflow:hidden;max-height:300px;overflow-y:auto;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#1d4ed8;color:#fff">
            <th style="padding:7px 9px;text-align:left">Ad Soyad</th>
            <th style="padding:7px 9px;text-align:left">TC</th>
            <th style="padding:7px 9px;text-align:left">Doğum Tarihi</th>
            <th style="padding:7px 9px;text-align:left">Durum</th>
          </tr></thead>
          <tbody>
            ${islenecek.map((r,i) => {
              const tcOk = r.tc && r.tc.length === 11;
              const tcRed = r.tc && r.tc.length !== 11;
              return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
                <td style="padding:5px 9px;font-weight:700">${_esc(r.ad)}</td>
                <td style="padding:5px 9px;font-family:'Courier New',monospace;color:${tcOk?'#16a34a':tcRed?'#dc2626':'#94a3b8'};font-weight:700">
                  ${r.tc || '<em style="color:#94a3b8">—</em>'}${tcRed?' ⚠️':''}
                </td>
                <td style="padding:5px 9px;color:${r.dogum?'#0f172a':'#94a3b8'}">${r.dogum||'—'}</td>
                <td style="padding:5px 9px">
                  ${tcOk || r.dogum
                    ? '<span style="background:#dcfce7;color:#16a34a;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:800">İşlenecek</span>'
                    : '<span style="background:#f1f5f9;color:#94a3b8;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">Atlanacak</span>'}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('id-upload-modal').remove()"
          style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;font-weight:700;cursor:pointer">
          İptal
        </button>
        <button onclick="_idYuklemeUygula(${JSON.stringify(islenecek).replace(/</g,'\\u003c')})"
          style="padding:9px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">
          ✅ Uygula (${islenecek.length} kayıt)
        </button>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

async function _idYuklemeUygula(islenecek) {
  document.getElementById('id-upload-modal')?.remove();

  if (!islenecek.length) { showToast('İşlenecek kayıt yok'); return; }

  let tamam = 0, hata = 0;

  for (const item of islenecek) {
    const tc = item.tc && item.tc.length === 11 ? item.tc : null;
    const dogum = item.dogum || null;
    if (!tc && !dogum) continue;

    const guncelleme = {};
    if (tc) guncelleme.TC = tc;
    if (dogum) guncelleme.DOGUM_TARIHI = dogum;

    try {
      // vatandaslar_bilgi güncelle
      await firebase.firestore().collection('vatandaslar_bilgi').doc(item.fbId).update(guncelleme);

      // vatandaslar'daki tüm aylara yansıt
      const bilgiRec = _idTumData.find(x => x._fbId === item.fbId);
      if (bilgiRec) {
        const isim = bilgiRec.AD_SOYAD || item.ad;
        const snap = await firebase.firestore().collection('vatandaslar').where('ISIM_SOYISIM','==',isim).get();
        for (const doc of snap.docs) await doc.ref.update(guncelleme);

        // allData güncelle
        if (typeof allData !== 'undefined') {
          allData.forEach(rec => {
            if ((rec.ISIM_SOYISIM||'').toUpperCase() === isim.toUpperCase()) {
              if (tc) rec.TC = tc;
              if (dogum) rec.DOGUM_TARIHI = dogum;
            }
          });
        }

        Object.assign(bilgiRec, guncelleme);
        // TC geçerliyse eksik listesinden çıkar
        if (tc) _idData = _idData.filter(x => x._fbId !== item.fbId);
      }
      tamam++;
    } catch(e) {
      console.error('ID yükleme hatası:', item.ad, e.message);
      hata++;
    }
  }

  _idSayfaRender();
  showToast(`✅ ${tamam} kayıt güncellendi${hata ? ` — ${hata} hata` : ''}`);
}

// ════════════════════════════════════════════
//  YARDIMCILAR
// ════════════════════════════════════════════
function _tarihNormalize(v) {
  if (!v) return '';
  // Date nesnesi (xlsx cellDates:true)
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth()+1).padStart(2,'0'), d = String(v.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) { const [d,m,y]=s.split('.'); return `${y}-${m}-${d}`; }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d,m,y]=s.split('/'); return `${y}-${m}-${d}`; }
  return s;
}

function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
