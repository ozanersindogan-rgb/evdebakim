// ── İSİM / MAHALLE TOPLU DÜZENLEME ───────────────────────────────────────
// Durum güncelleme ekranıyla aynı mantık; isim + mahalle değiştirir,
// vatandaslar'daki TÜM aylara + vatandaslar_bilgi'ye yansıtır.

let _idRecs = []; // bu oturumda yapılan değişiklikler (log tablosu için)
let _idIsimler = []; // seçili hizmete göre isim listesi

// ════════════════════════════════════════════
//  HİZMET DEĞİŞİNCE İSİM LİSTESİNİ GÜNCELLE
// ════════════════════════════════════════════
function idUpdateIsimler() {
  const hizmet = document.getElementById('id-hizmet')?.value || '';
  _idIsimler = hizmet === '__TUMU__'
    ? [...new Set(allData.map(r => r.ISIM_SOYISIM).filter(Boolean))].sort()
    : [...new Set(allData.filter(r => r['HİZMET'] === hizmet).map(r => r.ISIM_SOYISIM).filter(Boolean))].sort();

  const searchEl = document.getElementById('id-isim-search');
  if (searchEl) searchEl.value = '';
  const sel = document.getElementById('id-isim');
  if (sel) sel.value = '';
  _idTemizleBilgi();
  idIsimFiltrele('');
}

// ════════════════════════════════════════════
//  CANLI ARAMA — SELECT'İ GÜNCELLE
// ════════════════════════════════════════════
function idIsimFiltrele(q) {
  const sel = document.getElementById('id-isim');
  if (!sel) return;
  const liste = _idIsimler.filter(i => i.toLocaleUpperCase('tr-TR').includes(q.toLocaleUpperCase('tr-TR')));
  sel.innerHTML = liste.map(i => `<option value="${i}">${i}</option>`).join('');
  sel.style.display = liste.length ? 'block' : 'none';
  if (liste.length === 1) { sel.value = liste[0]; idIsimSecildi(); }
}

// ════════════════════════════════════════════
//  İSİM SEÇİLDİĞİNDE — MEVCUT BİLGİLERİ DOLDUr
// ════════════════════════════════════════════
function idIsimSecildi() {
  const sel = document.getElementById('id-isim');
  const searchEl = document.getElementById('id-isim-search');
  if (searchEl && sel.value) searchEl.value = sel.value;

  const isim = sel.value.trim();
  if (!isim) { _idTemizleBilgi(); return; }

  const rec = allData.find(r => r.ISIM_SOYISIM === isim);
  if (rec) {
    const yeniIsimEl = document.getElementById('id-yeni-isim');
    const yeniMahEl  = document.getElementById('id-yeni-mah');
    if (yeniIsimEl) yeniIsimEl.value = rec.ISIM_SOYISIM || '';
    if (yeniMahEl)  yeniMahEl.value  = rec.MAHALLE || '';

    // Mevcut bilgi göster
    const mevEl = document.getElementById('id-mevcut-bilgi');
    if (mevEl) {
      const tc = String(rec.TC || '').replace(/\D/g, '');
      mevEl.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <span style="background:#f0f9ff;color:#0369a1;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700">📍 ${rec.MAHALLE || '—'}</span>
          <span style="background:#fef9c3;color:#92400e;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700">🔢 ${allData.filter(r => r.ISIM_SOYISIM === isim).length} ay kaydı</span>
          ${tc.length === 11 ? `<span style="background:#dcfce7;color:#16a34a;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;font-family:'Courier New',monospace">🪪 ${tc}</span>` : '<span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700">🪪 TC Eksik</span>'}
        </div>`;
    }
  }
}

function _idTemizleBilgi() {
  const yeniIsimEl = document.getElementById('id-yeni-isim');
  const yeniMahEl  = document.getElementById('id-yeni-mah');
  const mevEl      = document.getElementById('id-mevcut-bilgi');
  if (yeniIsimEl) yeniIsimEl.value = '';
  if (yeniMahEl)  yeniMahEl.value  = '';
  if (mevEl)      mevEl.innerHTML  = '';
}

// ════════════════════════════════════════════
//  KAYDET — TÜM AYLARA + vatandaslar_bilgi'ye YANSIT
// ════════════════════════════════════════════
async function idDuzenleKaydet() {
  const eskiIsim = (
    document.getElementById('id-isim')?.value ||
    document.getElementById('id-isim-search')?.value || ''
  ).trim().toLocaleUpperCase('tr-TR');

  if (!eskiIsim) { showToast('⚠️ Önce bir vatandaş seçin'); return; }

  const yeniIsim = (document.getElementById('id-yeni-isim')?.value || '').trim().toLocaleUpperCase('tr-TR');
  const yeniMah  = (document.getElementById('id-yeni-mah')?.value  || '').trim().toLocaleUpperCase('tr-TR');

  if (!yeniIsim) { showToast('⚠️ Yeni isim boş olamaz'); return; }

  // Değişiklik var mı?
  const eskiRec  = allData.find(r => r.ISIM_SOYISIM === eskiIsim);
  const eskiMah  = eskiRec?.MAHALLE || '';
  const isimDeg  = yeniIsim !== eskiIsim;
  const mahDeg   = yeniMah !== eskiMah;

  if (!isimDeg && !mahDeg) { showToast('ℹ️ Değişiklik yok'); return; }

  const btn = document.getElementById('id-duzenle-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...'; }

  try {
    const changes = {};
    if (isimDeg) changes.ISIM_SOYISIM = yeniIsim;
    if (mahDeg)  changes.MAHALLE      = yeniMah;

    // vatandaslar — eski isimle eşleşen TÜM kayıtları güncelle
    const snap = await firebase.firestore()
      .collection('vatandaslar')
      .where('ISIM_SOYISIM', '==', eskiIsim)
      .get();

    let guncellenen = 0;
    for (const doc of snap.docs) {
      await doc.ref.update(changes);
      guncellenen++;
    }

    // allData'yı güncelle (sayfa yenilemeye gerek kalmasın)
    allData.forEach(r => {
      if (r.ISIM_SOYISIM === eskiIsim) {
        if (isimDeg) r.ISIM_SOYISIM = yeniIsim;
        if (mahDeg)  r.MAHALLE      = yeniMah;
      }
    });

    // vatandaslar_bilgi — AD_SOYAD ve MAHALLE güncelle
    const bilgiChanges = {};
    if (isimDeg) bilgiChanges.AD_SOYAD = yeniIsim;
    if (mahDeg)  bilgiChanges.MAHALLE  = yeniMah;

    if (typeof kbData !== 'undefined') {
      const bilgiRecs = kbData.filter(k =>
        (k.AD_SOYAD || '').toLocaleUpperCase('tr-TR') === eskiIsim
      );
      for (const br of bilgiRecs) {
        await firebase.firestore().collection('vatandaslar_bilgi').doc(br._fbId).update(bilgiChanges);
        Object.assign(br, bilgiChanges);
      }
    }

    // Log tablosuna ekle
    _idRecs.unshift({
      eskiIsim, yeniIsim, eskiMah, yeniMah, isimDeg, mahDeg, guncellenen,
      zaman: new Date().toLocaleTimeString('tr-TR')
    });
    _idLogRender();

    // Isim listesini yenile
    idUpdateIsimler();
    idTemizle();

    // diğer ekranları yenile
    if (typeof filterVat   === 'function') filterVat();
    if (typeof buildSidebar=== 'function') buildSidebar();
    if (typeof renderDashboard==='function') renderDashboard();

    const mesajlar = [];
    if (isimDeg) mesajlar.push(`"${eskiIsim}" → "${yeniIsim}"`);
    if (mahDeg)  mesajlar.push(`Mahalle: "${eskiMah}" → "${yeniMah}"`);
    showToast(`✅ ${guncellenen} kayıt güncellendi — ${mesajlar.join(', ')}`);

  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Güncelle'; }
  }
}

// ════════════════════════════════════════════
//  TEMİZLE
// ════════════════════════════════════════════
function idTemizle() {
  ['id-isim', 'id-isim-search', 'id-yeni-isim', 'id-yeni-mah'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('id-isim');
  if (sel) sel.style.display = 'none';
  _idTemizleBilgi();
}

// ════════════════════════════════════════════
//  LOG TABLOSU
// ════════════════════════════════════════════
function _idLogRender() {
  const countEl = document.getElementById('id-log-count');
  const tableEl = document.getElementById('id-log-table');
  if (countEl) countEl.textContent = _idRecs.length + ' kayıt';
  if (!tableEl) return;

  if (!_idRecs.length) {
    tableEl.innerHTML = '<tr><td class="no-data" colspan="5">Henüz güncelleme yapılmadı</td></tr>';
    return;
  }

  tableEl.innerHTML = `
    <thead>
      <tr>
        <th>Saat</th>
        <th>Eski İsim</th>
        <th>Yeni İsim</th>
        <th>Mahalle</th>
        <th>Güncellenen Ay</th>
      </tr>
    </thead>
    <tbody>
      ${_idRecs.map(r => `<tr>
        <td><span class="date-chip">${r.zaman}</span></td>
        <td style="color:var(--danger);text-decoration:${r.isimDeg?'line-through':'none'};opacity:${r.isimDeg?'.6':'1'}">${r.eskiIsim}</td>
        <td style="font-weight:800;color:${r.isimDeg?'var(--primary)':'var(--text)'}">${r.yeniIsim}</td>
        <td style="font-size:12px">
          ${r.mahDeg
            ? `<span style="color:#dc2626;text-decoration:line-through;opacity:.6">${r.eskiMah||'—'}</span>
               → <span style="color:#16a34a;font-weight:700">${r.yeniMah||'—'}</span>`
            : `<span style="color:var(--text-soft)">${r.yeniMah||'—'}</span>`}
        </td>
        <td><span class="page-info">${r.guncellenen} ay</span></td>
      </tr>`).join('')}
    </tbody>`;
}
