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

// ════════════════════════════════════════════
//  TÜRKÇE KARAKTER TARAMA — TÜM ÖZEL KARAKTERLER
// ════════════════════════════════════════════
//
// Yaklaşım: Tüm benzersiz isimleri listele.
// Her kelimeye tıklayınca içindeki ASCII karakterlerin
// Türkçe alternatifleri buton olarak çıkar.
// Kullanıcı onaylayınca Firestore'a yazar.

// ASCII → Türkçe alternatif haritası (her karakter için olası değişimler)
const _TR_ALT = {
  'I':  ['İ'],
  'İ':  ['I'],
  'G':  ['Ğ'],
  'Ğ':  ['G'],
  'S':  ['Ş'],
  'Ş':  ['S'],
  'C':  ['Ç'],
  'Ç':  ['C'],
  'O':  ['Ö'],
  'Ö':  ['O'],
  'U':  ['Ü'],
  'Ü':  ['U'],
};

// Bir kelimede Türkçe alternatifi olan karakter var mı?
function _trHasAlt(word) {
  return word.split('').some(ch => _TR_ALT[ch]);
}

// Taranan isim listesi: { original, current, onaylandi }
let _idTrListe = [];
let _idTrAcilanKelime = null; // "isimIdx_kelimeIdx" formatında

function idTrTara() {
  const btn = document.getElementById('id-tr-tara-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Taranıyor...'; }

  const benzersiz = [...new Set(allData.map(r => r.ISIM_SOYISIM).filter(Boolean))].sort();
  _idTrListe = benzersiz.map(isim => ({
    original: isim,
    current:  isim,
    onaylandi: false // false = değişmemiş/bekliyor, true = kaydetmeye hazır
  }));
  _idTrAcilanKelime = null;

  if (btn) { btn.disabled = false; btn.textContent = 'Yeniden Tara'; }
  _idTrRender();
}

function _idTrRender() {
  const el = document.getElementById('id-tr-sonuc');
  if (!el) return;

  if (!_idTrListe.length) {
    el.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:13px;padding:20px">Henüz tarama yapılmadı</div>';
    return;
  }

  const degisenler = _idTrListe.filter(x => x.current !== x.original);
  const bekleyenler = degisenler.filter(x => !x.onaylandi);
  const hazirlar    = degisenler.filter(x => x.onaylandi);

  let html = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
    <span style="font-size:12px;color:#64748b">${_idTrListe.length} benzersiz isim</span>`;
  if (degisenler.length) {
    html += `<span style="background:#fef3c7;color:#92400e;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700">${degisenler.length} değişiklik var</span>`;
  }
  if (hazirlar.length) {
    html += `<button onclick="idTrHepsiniKaydet()" style="margin-left:auto;background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border:none;border-radius:8px;padding:7px 18px;font-size:12px;font-weight:800;cursor:pointer">💾 Kaydet (${hazirlar.length})</button>`;
  }
  html += `<div style="font-size:11px;color:#94a3b8;margin-left:${hazirlar.length?'0':'auto'}">Bir kelimeye tıkla → karakter değiştir</div></div>`;

  // İsim listesi
  html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:520px;overflow-y:auto;padding-right:4px">';

  _idTrListe.forEach((item, nameIdx) => {
    const degisti = item.current !== item.original;
    const bg = degisti ? (item.onaylandi ? '#f0fdf4' : '#fffbeb') : '#f8fafc';
    const border = degisti ? (item.onaylandi ? '#bbf7d0' : '#fde68a') : '#e2e8f0';

    html += `<div style="background:${bg};border:1.5px solid ${border};border-radius:10px;padding:10px 14px;display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">`;

    // Sıra no
    html += `<span style="font-size:11px;color:#94a3b8;min-width:28px;padding-top:2px">${nameIdx+1}.</span>`;

    // Kelimeler — her kelime tıklanabilir
    html += `<div style="flex:1;display:flex;flex-wrap:wrap;gap:6px;align-items:center">`;
    const kelimeler = item.current.split(/\s+/);
    kelimeler.forEach((kelime, kelimeIdx) => {
      const acilanKey = `${nameIdx}_${kelimeIdx}`;
      const acik = _idTrAcilanKelime === acilanKey;
      const orijKelime = item.original.split(/\s+/)[kelimeIdx] || kelime;
      const kelimeDegisti = kelime !== orijKelime;

      html += `<div style="position:relative;display:inline-block">`;
      // Kelime butonu
      html += `<button onclick="idTrKelimeTikla(${nameIdx},${kelimeIdx})" style="
        background:${acik?'#1A237E':kelimeDegisti?'#dcfce7':'#fff'};
        color:${acik?'#fff':kelimeDegisti?'#166534':'#0f172a'};
        border:1.5px solid ${acik?'#1A237E':kelimeDegisti?'#86efac':'#e2e8f0'};
        border-radius:7px;padding:4px 10px;font-size:13px;font-weight:800;
        font-family:monospace;cursor:pointer;letter-spacing:0.04em;
        transition:all .1s">${kelime}</button>`;

      // Açık panel — karakter alternatifleri
      if (acik) {
        html += `<div style="position:absolute;top:calc(100% + 4px);left:0;z-index:999;background:#fff;border:2px solid #1A237E;border-radius:10px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:220px">`;
        html += `<div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:8px;text-transform:uppercase">Karakter Değiştir</div>`;

        // Her karakteri göster
        const chars = kelime.split('');
        let butonVar = false;
        chars.forEach((ch, chIdx) => {
          if (_TR_ALT[ch]) {
            _TR_ALT[ch].forEach(alt => {
              html += `<button onclick="idTrKarDegistir(${nameIdx},${kelimeIdx},${chIdx},'${alt}')" style="
                display:block;width:100%;text-align:left;
                background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:7px;
                padding:7px 12px;margin-bottom:6px;cursor:pointer;font-size:13px;font-weight:700;
                font-family:monospace" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='#f8fafc'">
                <span style="color:#dc2626">${ch}</span>
                <span style="color:#94a3b8;margin:0 8px">→</span>
                <span style="color:#16a34a">${alt}</span>
                <span style="color:#94a3b8;font-size:11px;margin-left:6px">(${chIdx+1}. karakter)</span>
              </button>`;
              butonVar = true;
            });
          }
        });

        if (!butonVar) {
          html += `<div style="font-size:12px;color:#94a3b8;padding:4px 0">Değiştirilebilir karakter yok</div>`;
        }

        // Sıfırla + Kapat
        html += `<div style="display:flex;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9">`;
        if (kelimeDegisti) {
          html += `<button onclick="idTrKelimeSifirla(${nameIdx},${kelimeIdx})" style="flex:1;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer">Sıfırla</button>`;
        }
        html += `<button onclick="idTrKapat()" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:6px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer">Kapat</button>`;
        html += '</div></div>';
      }
      html += '</div>'; // position:relative
    });
    html += '</div>'; // kelimeler div

    // Sağ: değişiklik varsa onayla/geri al
    if (degisti) {
      if (!item.onaylandi) {
        html += `<div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
          <button onclick="idTrOnayla(${nameIdx})" style="background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border:none;border-radius:7px;padding:6px 14px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap">✓ Onayla</button>
          <button onclick="idTrIsimSifirla(${nameIdx})" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:7px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer">↺</button>
        </div>`;
      } else {
        html += `<div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
          <span style="background:#dcfce7;color:#166534;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:800">✓ Hazır</span>
          <button onclick="idTrIsimSifirla(${nameIdx})" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:7px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer">↺</button>
        </div>`;
      }
    }

    html += '</div>'; // satır div
  });

  html += '</div>'; // liste
  el.innerHTML = html;
}

function idTrKelimeTikla(nameIdx, kelimeIdx) {
  const key = `${nameIdx}_${kelimeIdx}`;
  _idTrAcilanKelime = (_idTrAcilanKelime === key) ? null : key;
  _idTrRender();
}

function idTrKapat() {
  _idTrAcilanKelime = null;
  _idTrRender();
}

function idTrKarDegistir(nameIdx, kelimeIdx, charIdx, yeniChar) {
  const item = _idTrListe[nameIdx];
  if (!item) return;
  const kelimeler = item.current.split(/\s+/);
  const arr = kelimeler[kelimeIdx].split('');
  arr[charIdx] = yeniChar;
  kelimeler[kelimeIdx] = arr.join('');
  item.current = kelimeler.join(' ');
  item.onaylandi = false;
  // Panel açık kalsın — kullanıcı başka karakter de değiştirebilir
  _idTrRender();
}

function idTrKelimeSifirla(nameIdx, kelimeIdx) {
  const item = _idTrListe[nameIdx];
  if (!item) return;
  const kelimeler = item.current.split(/\s+/);
  const origKelimeler = item.original.split(/\s+/);
  kelimeler[kelimeIdx] = origKelimeler[kelimeIdx] || kelimeler[kelimeIdx];
  item.current = kelimeler.join(' ');
  item.onaylandi = false;
  _idTrRender();
}

function idTrIsimSifirla(nameIdx) {
  const item = _idTrListe[nameIdx];
  if (!item) return;
  item.current = item.original;
  item.onaylandi = false;
  _idTrAcilanKelime = null;
  _idTrRender();
}

function idTrOnayla(nameIdx) {
  const item = _idTrListe[nameIdx];
  if (!item || item.current === item.original) return;
  item.onaylandi = true;
  _idTrAcilanKelime = null;
  _idTrRender();
}

async function idTrHepsiniKaydet() {
  const hazirlar = _idTrListe.filter(x => x.onaylandi && x.current !== x.original);
  if (!hazirlar.length) return;

  const btn = document.querySelector('[onclick="idTrHepsiniKaydet()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...'; }

  let basarili = 0, hata = 0;

  for (const item of hazirlar) {
    try {
      const snap = await firebase.firestore()
        .collection('vatandaslar')
        .where('ISIM_SOYISIM', '==', item.original)
        .get();
      for (const doc of snap.docs) {
        await doc.ref.update({ ISIM_SOYISIM: item.current });
      }
      allData.forEach(r => {
        if (r.ISIM_SOYISIM === item.original) r.ISIM_SOYISIM = item.current;
      });
      if (typeof kbData !== 'undefined') {
        const bilgiSnap = await firebase.firestore()
          .collection('vatandaslar_bilgi')
          .where('AD_SOYAD', '==', item.original)
          .get();
        for (const doc of bilgiSnap.docs) {
          await doc.ref.update({ AD_SOYAD: item.current });
        }
        kbData.forEach(k => {
          if ((k.AD_SOYAD || '') === item.original) k.AD_SOYAD = item.current;
        });
      }
      _idRecs.unshift({
        eskiIsim: item.original, yeniIsim: item.current,
        eskiMah: '', yeniMah: '', isimDeg: true, mahDeg: false,
        guncellenen: snap.docs.length,
        zaman: new Date().toLocaleTimeString('tr-TR')
      });
      // Orijinali güncelle, artık bu isim "düzeltilmiş"
      item.original = item.current;
      item.onaylandi = false;
      basarili++;
    } catch(e) {
      console.error('TR kayıt hatası:', item.original, e);
      hata++;
    }
  }

  _idLogRender();
  idUpdateIsimler();
  if (typeof filterVat === 'function') filterVat();
  _idTrRender();
  showToast(`✅ ${basarili} isim kaydedildi${hata ? ` — ${hata} hata` : ''}`);
}

window.idTrTara = idTrTara;
window.idTrKelimeTikla = idTrKelimeTikla;
window.idTrKapat = idTrKapat;
window.idTrKarDegistir = idTrKarDegistir;
window.idTrKelimeSifirla = idTrKelimeSifirla;
window.idTrIsimSifirla = idTrIsimSifirla;
window.idTrOnayla = idTrOnayla;
window.idTrHepsiniKaydet = idTrHepsiniKaydet;
