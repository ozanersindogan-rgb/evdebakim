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

const _TR_VOWELS = {A:"kalin",I:"kalin",O:"kalin",U:"kalin",E:"ince","İ":"ince","Ö":"ince","Ü":"ince"};

// ── ASCII karşılıkları olan Türkçe karakter çiftleri ──
// Hata tipi: ASCII ile yazılmış ama Türkçe karakter olması gereken yerler
// Tespite yönelik yaygın pattern'ler
const _TR_PATTERNS = [
  // GH → Ğ (DOGHAN → DOĞAN, AGHCA → AĞCA)
  { re: /GH/g, fix: 'Ğ', tip: 'GH → Ğ' },
  // Kelime sonu veya sessiz öncesi G → Ğ (YAGMUR, DOGDU, BAGCI)
  // Bu çok agresif olur, sadece çok yaygın pattern'ler
  // SH → Ş (ASHA → AŞA) — nadir
  // Sonuç: G → Ğ, S → Ş, C → Ç, O → Ö, U → Ü için yaygın isim listesi kullan
];

// Sık yazım hatası yapılan isim dönüşümleri (kesin liste)
const _TR_ISIM_ESLESTIR = [
  // Ğ hataları
  ['DAGHAN','DAĞAN'],['SOGHAN','SOĞAN'],
  // Yaygın soyisimler — G yerine Ğ
  ['YAGMUR','YAĞMUR'],['YAGIZ','YAĞIZ'],['CAGLA','ÇAĞLA'],['CAGRI','ÇAĞRI'],
  ['OZGUR','ÖZGÜR'],['OZGUN','ÖZGÜN'],['OZGE','ÖZGE'],
  ['TUGBA','TUĞBA'],['TUGCE','TUĞÇE'],['TUGRUL','TUĞRUL'],
  ['BAGCI','BAĞCI'],['SAGLIK','SAĞLIK'],['DAGCI','DAĞCI'],
  ['ERDOGAN','ERDOĞAN'],['DOGAN','DOĞAN'],['DOGRU','DOĞRU'],
  ['AGUN','AĞUN'],['AGUS','AĞUŞ'],
  // Ş hataları — S yerine Ş
  ['SAHIN','ŞAHİN'],['SAHINS','ŞAHİNS'],
  ['SIMSEK','ŞİMŞEK'],['SIMDI','ŞİMDİ'],
  ['SEKER','ŞEKER'],['SENEL','ŞENEL'],['SENOL','ŞENOL'],
  ['SULE','ŞÜLE'],['SULEN','ŞÜLEN'],['SULENAZ','ŞÜLENAZ'],
  ['SIRIN','ŞİRİN'],['SIRMA','ŞİRMA'],
  ['SUNAY','ŞÜNAY'],
  // Ç hataları — C yerine Ç
  ['CELIK','ÇELİK'],['CETIN','ÇETİN'],['CINAR','ÇINAR'],
  ['CAKIR','ÇAKIR'],['CAKAR','ÇAKAR'],['CALI','ÇALI'],
  ['CICEK','ÇİÇEK'],['CIGDEM','ÇİĞDEM'],['CILEK','ÇİLEK'],
  ['CIMEN','ÇİMEN'],['CIFTCI','ÇİFTÇİ'],
  ['COBAN','ÇOBAN'],['COKUN','ÇOKUN'],['COPUR','ÇOPUR'],
  ['CUBUK','ÇUBUK'],['CUKUR','ÇUKUR'],
  // Ö hataları — O yerine Ö
  ['OZTÜRK','ÖZTÜRK'],['OZTURK','ÖZTÜRK'],['OZKAN','ÖZKAN'],
  ['OZER','ÖZER'],['OZMEN','ÖZMEN'],['OZDEMIR','ÖZDEMİR'],
  ['OZCELIK','ÖZÇELİK'],['OZKAYA','ÖZKAYA'],['OZAY','ÖZAY'],
  ['OLMEZ','ÖLMEZ'],['ODABAS','ODABAŞ'],
  // Ü hataları — U yerine Ü
  ['UNAL','ÜNAL'],['UNVER','ÜNVER'],['UNLU','ÜNLÜ'],
  ['URKMEZ','ÜRKMEZ'],['URÜN','ÜRÜN'],
  ['YUKSEK','YÜKSEK'],['YUKSEL','YÜKSEL'],
  ['GUNDUZ','GÜNDÜZ'],['GUNAY','GÜNAY'],['GUNER','GÜNER'],
  ['GUZEL','GÜZEL'],['GUNEY','GÜNEY'],['GURKAN','GÜRKAN'],
  ['TUNCAY','TUNÇAY'],['TURK','TÜRK'],['TURKER','TÜRKER'],
  ['KUCUK','KÜÇÜK'],['KULAC','KULAÇ'],
];

// Kelime bazlı eşleştirme haritası
const _TR_ESLESME_MAP = {};
_TR_ISIM_ESLESTIR.forEach(([yanlis, dogru]) => {
  _TR_ESLESME_MAP[yanlis] = dogru;
});

// I/İ sesli uyumu düzeltmesi (kelime bazlı)
function _idTrDuzeltIi(word) {
  if (!word || word !== word.toLocaleUpperCase('tr-TR')) return null;
  const arr = word.split('');
  let changed = false;
  for (let i = 0; i < arr.length; i++) {
    const ch = arr[i];
    if (ch !== 'I' && ch !== 'İ') continue;
    let prev = null, next = null;
    for (let j = i-1; j >= 0; j--) if (_TR_VOWELS[arr[j]]) { prev = arr[j]; break; }
    for (let j = i+1; j < arr.length; j++) if (_TR_VOWELS[arr[j]]) { next = arr[j]; break; }
    const ref = prev || next;
    if (!ref) continue;
    if (ch === 'I' && _TR_VOWELS[ref] === 'ince')  { arr[i] = 'İ'; changed = true; }
    if (ch === 'İ' && _TR_VOWELS[ref] === 'kalin' && ref !== 'İ') { arr[i] = 'I'; changed = true; }
  }
  return changed ? arr.join('') : null;
}

// Bir kelime için tüm olası düzeltmeleri bul
function _idTrDuzeltKelime(word) {
  const upper = word.toLocaleUpperCase('tr-TR');
  const sonuclar = [];

  // 1) Kesin eşleşme listesi
  if (_TR_ESLESME_MAP[upper] && _TR_ESLESME_MAP[upper] !== upper) {
    sonuclar.push({ tip: 'karakter', orijinal: upper, oneri: _TR_ESLESME_MAP[upper] });
  }

  // 2) I/İ sesli uyumu
  const iiDuz = _idTrDuzeltIi(upper);
  if (iiDuz && iiDuz !== upper) {
    // Eğer zaten karakter düzeltmesi önerdiyse onun üstünden I/İ uygula
    const base = sonuclar.length ? sonuclar[0].oneri : upper;
    const iiDuzBase = _idTrDuzeltIi(base);
    if (iiDuzBase && iiDuzBase !== base) {
      sonuclar.push({ tip: 'I/İ', orijinal: upper, oneri: iiDuzBase });
    } else if (!sonuclar.length) {
      sonuclar.push({ tip: 'I/İ', orijinal: upper, oneri: iiDuz });
    }
  }

  return sonuclar;
}

// Tam isim için öneriler
function _idTrSuggestName(name) {
  const words = name.trim().split(/\s+/);
  const oneriKelimeler = words.map(w => {
    const duz = _idTrDuzeltKelime(w);
    return duz.length ? duz[duz.length-1].oneri : w;
  });
  const suggested = oneriKelimeler.join(' ');
  return suggested !== name ? { suggested, tip: '' } : null;
}

// Taranan liste
let _idTrListe = [];

function idTrTara() {
  const btn = document.getElementById('id-tr-tara-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Taranıyor...'; }

  const benzersiz = [...new Set(allData.map(r => r.ISIM_SOYISIM).filter(Boolean))].sort();
  _idTrListe = [];

  benzersiz.forEach(isim => {
    const result = _idTrSuggestName(isim);
    if (result) {
      // Farkın ne olduğunu göster
      const eskiKelimeler = isim.split(/\s+/);
      const yeniKelimeler = result.suggested.split(/\s+/);
      const farklar = [];
      eskiKelimeler.forEach((w, i) => {
        if (w !== yeniKelimeler[i]) {
          farklar.push({ eski: w, yeni: yeniKelimeler[i] });
        }
      });
      _idTrListe.push({
        original: isim,
        suggested: result.suggested,
        farklar,
        onaylandi: null
      });
    }
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Yeniden Tara'; }
  _idTrRender();
}

function _idTrRender() {
  const el = document.getElementById('id-tr-sonuc');
  if (!el) return;

  const bekleyenler = _idTrListe.filter(x => x.onaylandi === null);
  const onaylananlar = _idTrListe.filter(x => x.onaylandi === true);
  const reddedilenler = _idTrListe.filter(x => x.onaylandi === false);

  if (!_idTrListe.length) {
    el.innerHTML = '<div style="text-align:center;color:#16a34a;font-size:13px;padding:20px">✅ Sorunlu isim bulunamadı</div>';
    return;
  }

  let html = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
      <span style="background:#fef3c7;color:#92400e;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:800">⏳ ${bekleyenler.length} bekliyor</span>
      <span style="background:#dcfce7;color:#166534;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:800">✓ ${onaylananlar.length} onaylandı</span>
      <span style="background:#f1f5f9;color:#64748b;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:800">✗ ${reddedilenler.length} reddedildi</span>`;

  if (onaylananlar.length > 0) {
    html += `<button onclick="idTrHepsiniKaydet()"
      style="margin-left:auto;background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border:none;border-radius:9px;padding:8px 20px;font-size:12px;font-weight:800;cursor:pointer">
      💾 Onaylananları Kaydet (${onaylananlar.length})
    </button>`;
  }
  html += '</div>';

  // Bekleyenler
  if (bekleyenler.length) {
    html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">';
    bekleyenler.forEach((item, globalIdx) => {
      const realIdx = _idTrListe.indexOf(item);
      // Farkları vurgula
      const farkHtml = item.farklar.map(f =>
        `<span style="color:#dc2626;font-family:monospace;font-weight:700;text-decoration:line-through;opacity:.7">${f.eski}</span>`+
        `<span style="margin:0 6px;color:#94a3b8">→</span>`+
        `<span style="color:#15803d;font-family:monospace;font-weight:900">${f.yeni}</span>`
      ).join('<span style="margin:0 8px;color:#d1d5db">|</span>');

      html += `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:10px 14px">
          <div style="flex:1;min-width:180px">
            <div style="font-size:13px;margin-bottom:4px">${farkHtml}</div>
            <div style="font-size:11px;color:#92400e;font-family:monospace">
              ${item.original} &nbsp;→&nbsp; <b>${item.suggested}</b>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button onclick="idTrOnayla(${realIdx})"
              style="background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:800;cursor:pointer">
              ✓ Evet, Düzelt
            </button>
            <button onclick="idTrReddet(${realIdx})"
              style="background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer">
              ✗ Hayır
            </button>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  // Onaylananlar (kaydet bekleniyor)
  if (onaylananlar.length) {
    html += `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:800;color:#166534;margin-bottom:8px;text-transform:uppercase">✓ Kaydetmeye Hazır</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">`;
    onaylananlar.forEach(item => {
      html += `<span style="background:#dcfce7;color:#166534;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;font-family:monospace">${item.original} → ${item.suggested}</span>`;
    });
    html += '</div></div>';
  }

  el.innerHTML = html;
}

function idTrOnayla(idx) {
  if (_idTrListe[idx]) _idTrListe[idx].onaylandi = true;
  _idTrRender();
}

function idTrReddet(idx) {
  if (_idTrListe[idx]) _idTrListe[idx].onaylandi = false;
  _idTrRender();
}

async function idTrHepsiniKaydet() {
  const onaylananlar = _idTrListe.filter(x => x.onaylandi === true);
  if (!onaylananlar.length) return;

  const btn = document.querySelector('[onclick="idTrHepsiniKaydet()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...'; }

  let basarili = 0, hata = 0;

  for (const item of onaylananlar) {
    try {
      // Firestore: vatandaslar
      const snap = await firebase.firestore()
        .collection('vatandaslar')
        .where('ISIM_SOYISIM', '==', item.original)
        .get();
      for (const doc of snap.docs) {
        await doc.ref.update({ ISIM_SOYISIM: item.suggested });
      }
      // allData güncelle
      allData.forEach(r => {
        if (r.ISIM_SOYISIM === item.original) r.ISIM_SOYISIM = item.suggested;
      });
      // vatandaslar_bilgi güncelle
      if (typeof kbData !== 'undefined') {
        const bilgiSnap = await firebase.firestore()
          .collection('vatandaslar_bilgi')
          .where('AD_SOYAD', '==', item.original)
          .get();
        for (const doc of bilgiSnap.docs) {
          await doc.ref.update({ AD_SOYAD: item.suggested });
        }
        kbData.forEach(k => {
          if ((k.AD_SOYAD || '') === item.original) k.AD_SOYAD = item.suggested;
        });
      }
      // Log
      _idRecs.unshift({
        eskiIsim: item.original, yeniIsim: item.suggested,
        eskiMah: '', yeniMah: '', isimDeg: true, mahDeg: false,
        guncellenen: snap.docs.length,
        zaman: new Date().toLocaleTimeString('tr-TR')
      });
      item.onaylandi = 'kaydedildi';
      basarili++;
    } catch(e) {
      console.error('TR düzeltme hatası:', item.original, e);
      hata++;
    }
  }

  _idLogRender();
  idUpdateIsimler();
  if (typeof filterVat === 'function') filterVat();
  _idTrRender();

  showToast(`✅ ${basarili} isim düzeltildi${hata ? ` — ${hata} hata` : ''}`);
}

window.idTrTara = idTrTara;
window.idTrOnayla = idTrOnayla;
window.idTrReddet = idTrReddet;
window.idTrHepsiniKaydet = idTrHepsiniKaydet;
