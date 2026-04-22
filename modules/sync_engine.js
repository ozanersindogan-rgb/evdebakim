// ══════════════════════════════════════════════════════════════════════════
// SYNC ENGINE — Merkezi Senkronizasyon Motoru
// ══════════════════════════════════════════════════════════════════════════
// Sistem genelinde bir değişiklik yapıldığında:
//   vatandaslar (tüm ay kayıtları) + vatandaslar_bilgi (kişi kartı)
//   hem Firestore'da hem bellekte (allData, kbData) tutarlı kalır.
//
// Diğer modüller doğrudan Firestore yazmak yerine bu motorun
// fonksiyonlarını çağırır.
// ══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// İÇ YARDIMCI: Kişi kartını bul (TC önce, isim sonra)
// ─────────────────────────────────────────────
function _syncBilgiKart(isim, tc) {
  if (typeof kbData === 'undefined') return null;
  const isimUp = (isim || '').toLocaleUpperCase('tr-TR');
  const tcStr  = (tc  || '').replace(/\D/g, '');
  if (tcStr.length === 11) {
    const byTc = kbData.find(k => (k.TC || '').replace(/\D/g, '') === tcStr);
    if (byTc) return byTc;
  }
  return kbData.find(k => (k.AD_SOYAD || '').toLocaleUpperCase('tr-TR') === isimUp) || null;
}

// ─────────────────────────────────────────────
// TEMEL YAYICI: Tek kişilik tüm veri alanlarını yayar
//   Parametre objesindeki alanlar hem vatandaslar hem vatandas_bilgi'ye yazılır.
//   vatsChanges: vatandaslar koleksiyonuna gidecek alanlar
//   bilgiChanges: vatandaslar_bilgi koleksiyonuna gidecek alanlar
//   Ortak alanlar (ISIM_SOYISIM/AD_SOYAD, MAHALLE, TC, TELEFON, ADRES, DOGUM_TARIHI, ENGEL, ENGEL_YUZDE, ENGEL_ACIKLAMA) her ikisine birden gider.
// ─────────────────────────────────────────────
async function syncKisiGuncelle(eskiIsim, eskiTc, vatsChanges, bilgiChanges) {
  const db = firebase.firestore();
  const isimUp = (eskiIsim || '').toLocaleUpperCase('tr-TR');

  // ── 1. vatandaslar: isimle eşleşen tüm ay kayıtları ──────────────────
  if (vatsChanges && Object.keys(vatsChanges).length) {
    const snap = await db.collection('vatandaslar')
      .where('ISIM_SOYISIM', '==', eskiIsim)
      .get();

    const BATCH = 400;
    let batch = db.batch();
    let cnt = 0;
    for (const doc of snap.docs) {
      batch.update(doc.ref, vatsChanges);
      cnt++;
      if (cnt % BATCH === 0) { await batch.commit(); batch = db.batch(); }
    }
    if (cnt % BATCH !== 0) await batch.commit();

    // allData'yı bellekte güncelle
    allData.forEach(r => {
      if ((r.ISIM_SOYISIM || '').toLocaleUpperCase('tr-TR') === isimUp) {
        Object.assign(r, vatsChanges);
      }
    });
  }

  // ── 2. vatandaslar_bilgi: kişi kartını güncelle ───────────────────────
  if (bilgiChanges && Object.keys(bilgiChanges).length && typeof kbData !== 'undefined') {
    const kart = _syncBilgiKart(eskiIsim, eskiTc);
    if (kart) {
      await db.collection('vatandaslar_bilgi').doc(kart._fbId).update(bilgiChanges);
      Object.assign(kart, bilgiChanges);
    } else {
      // Kart yoksa oluştur
      const yeni = {
        AD_SOYAD: vatsChanges.ISIM_SOYISIM || eskiIsim,
        MAHALLE:  vatsChanges.MAHALLE || '',
        TC:       vatsChanges.TC || '',
        TELEFON:  vatsChanges.TELEFON || '',
        ADRES:    vatsChanges.ADRES || '',
        DOGUM_TARIHI: vatsChanges.DOGUM_TARIHI || '',
        ENGEL: vatsChanges.ENGEL || 'Yok',
        ENGEL_YUZDE: vatsChanges.ENGEL_YUZDE || '',
        ENGEL_ACIKLAMA: vatsChanges.ENGEL_ACIKLAMA || '',
        HIZMETLER: [...new Set(allData.filter(r => r.ISIM_SOYISIM === eskiIsim).map(r => r['HİZMET']).filter(Boolean))],
        ...bilgiChanges,
      };
      const ref = await db.collection('vatandaslar_bilgi').add(yeni);
      kbData.push({ _fbId: ref.id, ...yeni });
    }
  }
}

// ─────────────────────────────────────────────
// KAYIT MODALI KAYDET — saveEdit() için çağrılır
//   Hem vatandaslar hem vatandas_bilgi senkronize edilir.
// ─────────────────────────────────────────────
async function syncSaveEdit(eskiIsim, eskiTc, tümChanges) {
  // tümChanges: modal'dan okunan tüm alan-değer çifti

  // vatandas_bilgi'ye gidecek alanları ayır
  const BILGI_ALANLARI = ['ISIM_SOYISIM','MAHALLE','TC','TELEFON','TELEFON2',
                           'ADRES','DOGUM_TARIHI','ENGEL','ENGEL_YUZDE','ENGEL_ACIKLAMA'];
  const bilgiChanges = {};
  BILGI_ALANLARI.forEach(k => {
    if (k in tümChanges) {
      // vatandas_bilgi'de AD_SOYAD kullanılır
      const bilgiKey = k === 'ISIM_SOYISIM' ? 'AD_SOYAD' : k;
      bilgiChanges[bilgiKey] = tümChanges[k];
    }
  });

  await syncKisiGuncelle(eskiIsim, eskiTc, tümChanges, bilgiChanges);

  // İsim değiştiyse: kbData'daki eski isim referansları da güncelle
  if (tümChanges.ISIM_SOYISIM && tümChanges.ISIM_SOYISIM !== eskiIsim) {
    if (typeof kbData !== 'undefined') {
      kbData.forEach(k => {
        if ((k.AD_SOYAD || '').toLocaleUpperCase('tr-TR') === eskiIsim.toLocaleUpperCase('tr-TR')) {
          k.AD_SOYAD = tümChanges.ISIM_SOYISIM;
        }
      });
    }
  }
}

// ─────────────────────────────────────────────
// KİŞİ KARTI KAYDET — kbKaydet() için çağrılır
//   Hem vatandas_bilgi hem vatandaslar senkronize edilir.
// ─────────────────────────────────────────────
async function syncKbKaydet(kbEditId, changes) {
  const db = firebase.firestore();
  if (typeof kbData === 'undefined') throw new Error('kbData yok');

  const kart = kbData.find(x => x._fbId === kbEditId);
  if (!kart) throw new Error('Kişi kartı bulunamadı');

  const eskiIsim = kart.AD_SOYAD || '';
  const eskiTc   = kart.TC || '';

  // 1. vatandaslar_bilgi'yi güncelle
  await db.collection('vatandaslar_bilgi').doc(kbEditId).update(changes);
  Object.assign(kart, changes);

  // 2. vatandaslar'a yayılacak alanlar (isim, mahalle, telefon, adres, engel, TC)
  const YAYILACAK = ['MAHALLE','TC','TELEFON','ADRES','DOGUM_TARIHI',
                     'ENGEL','ENGEL_YUZDE','ENGEL_ACIKLAMA'];
  const vatsChanges = {};
  YAYILACAK.forEach(k => { if (k in changes) vatsChanges[k] = changes[k]; });

  // AD_SOYAD değişmişse ISIM_SOYISIM de yayılmalı
  if (changes.AD_SOYAD && changes.AD_SOYAD !== eskiIsim) {
    vatsChanges.ISIM_SOYISIM = changes.AD_SOYAD;
  }

  if (Object.keys(vatsChanges).length) {
    const snap = await db.collection('vatandaslar')
      .where('ISIM_SOYISIM', '==', eskiIsim)
      .get();

    const BATCH = 400;
    let batch = db.batch();
    let cnt = 0;
    for (const doc of snap.docs) {
      batch.update(doc.ref, vatsChanges);
      cnt++;
      if (cnt % BATCH === 0) { await batch.commit(); batch = db.batch(); }
    }
    if (cnt % BATCH !== 0 && cnt > 0) await batch.commit();

    // allData belleğini güncelle
    const eskiIsimUp = eskiIsim.toLocaleUpperCase('tr-TR');
    allData.forEach(r => {
      if ((r.ISIM_SOYISIM || '').toLocaleUpperCase('tr-TR') === eskiIsimUp) {
        Object.assign(r, vatsChanges);
      }
    });
  }

  return { eskiIsim, yeniIsim: changes.AD_SOYAD || eskiIsim };
}

// ─────────────────────────────────────────────
// TC YAYICISI — Yeni kayıt veya TC girişinde tüm sisteme TC yazar
// ─────────────────────────────────────────────
async function syncTCYay(isim, tc) {
  if (!isim || !tc || tc.replace(/\D/g,'').length !== 11) return;
  const db = firebase.firestore();
  const tcTemiz = tc.replace(/\D/g, '');
  const isimUp = isim.toLocaleUpperCase('tr-TR');

  // vatandaslar
  const snap = await db.collection('vatandaslar')
    .where('ISIM_SOYISIM', '==', isim)
    .get();
  const batch = db.batch();
  let cnt = 0;
  for (const doc of snap.docs) {
    if ((doc.data().TC || '').replace(/\D/g,'') !== tcTemiz) {
      batch.update(doc.ref, { TC: tcTemiz });
      cnt++;
    }
  }
  if (cnt) await batch.commit();

  allData.forEach(r => {
    if ((r.ISIM_SOYISIM || '').toLocaleUpperCase('tr-TR') === isimUp) r.TC = tcTemiz;
  });

  // vatandaslar_bilgi
  if (typeof kbData !== 'undefined') {
    const kart = _syncBilgiKart(isim, tcTemiz);
    if (kart && (kart.TC || '').replace(/\D/g,'') !== tcTemiz) {
      await db.collection('vatandaslar_bilgi').doc(kart._fbId).update({ TC: tcTemiz });
      kart.TC = tcTemiz;
    }
  }
}

// ─────────────────────────────────────────────
// TUTARLILIK KONTROLÜ (Konsol / Admin)
//   Tüm vatandas_bilgi kayıtları için vatandaslar ile karşılaştır.
//   Sonuç: { uyumsuz: [...], eksik_bilgi: [...], orphan_bilgi: [...] }
// ─────────────────────────────────────────────
async function syncTutarlilikKontrol() {
  if (typeof kbData === 'undefined') return { hata: 'kbData yok' };
  const uyumsuz = [];
  const eksik_bilgi = [];

  // vatandaslar'da olup vatandas_bilgi'de olmayan isimler
  const bilgiIsimler = new Set(kbData.map(k => (k.AD_SOYAD || '').toLocaleUpperCase('tr-TR')));
  const vatsIsimler  = [...new Set(allData.map(r => (r.ISIM_SOYISIM || '').toLocaleUpperCase('tr-TR')).filter(Boolean))];
  for (const isim of vatsIsimler) {
    if (!bilgiIsimler.has(isim)) eksik_bilgi.push(isim);
  }

  // vatandas_bilgi ile vatandaslar arasında çakışan alanlar
  for (const kart of kbData) {
    const isimUp = (kart.AD_SOYAD || '').toLocaleUpperCase('tr-TR');
    const vatsRec = allData.find(r => (r.ISIM_SOYISIM || '').toLocaleUpperCase('tr-TR') === isimUp);
    if (!vatsRec) continue;
    const KONTROL = ['TC','MAHALLE','TELEFON','ADRES','ENGEL'];
    KONTROL.forEach(alan => {
      const v1 = (kart[alan] || '').toString().trim();
      const v2 = alan === 'TC'
        ? (vatsRec[alan] || '').replace(/\D/g,'')
        : (vatsRec[alan] || '').toString().trim();
      const k1 = alan === 'TC' ? v1.replace(/\D/g,'') : v1;
      if (k1 && v2 && k1 !== v2) {
        uyumsuz.push({ isim: kart.AD_SOYAD, alan, bilgi: v1, vats: v2 });
      }
    });
  }

  console.group('🔍 Senkronizasyon Kontrol Raporu');
  console.log(`Vatandaşlar_bilgi kaydı eksik: ${eksik_bilgi.length}`);
  eksik_bilgi.forEach(i => console.log('  ⚠️ Eksik kart:', i));
  console.log(`Uyumsuz alan: ${uyumsuz.length}`);
  uyumsuz.forEach(u => console.log(`  ❌ ${u.isim} | ${u.alan}: bilgi="${u.bilgi}" vs vats="${u.vats}"`));
  console.groupEnd();

  return { uyumsuz, eksik_bilgi };
}

// ─────────────────────────────────────────────
// OTO-ONARIM: Eksik vatandas_bilgi kartlarını oluştur + uyumsuz alanları düzelt
// ─────────────────────────────────────────────
async function syncOtoDuzelt() {
  const db = firebase.firestore();
  const { uyumsuz, eksik_bilgi } = await syncTutarlilikKontrol();
  let onarilan = 0;

  // Eksik kişi kartlarını oluştur
  for (const isim of eksik_bilgi) {
    const o = allData.find(r => (r.ISIM_SOYISIM||'').toLocaleUpperCase('tr-TR') === isim);
    if (!o) continue;
    const yeni = {
      AD_SOYAD: o.ISIM_SOYISIM, MAHALLE: o.MAHALLE||'',
      TC: o.TC||'', TELEFON: o.TELEFON||'', ADRES: o.ADRES||'',
      DOGUM_TARIHI: o.DOGUM_TARIHI||'', ENGEL: o.ENGEL||'Yok',
      ENGEL_YUZDE: o.ENGEL_YUZDE||'', ENGEL_ACIKLAMA: o.ENGEL_ACIKLAMA||'',
      HIZMETLER: [...new Set(allData.filter(r=>r.ISIM_SOYISIM===o.ISIM_SOYISIM).map(r=>r['HİZMET']).filter(Boolean))]
    };
    const ref = await db.collection('vatandaslar_bilgi').add(yeni);
    if (typeof kbData !== 'undefined') kbData.push({ _fbId: ref.id, ...yeni });
    onarilan++;
  }

  // Uyumsuzları düzelt — vatandaslar_bilgi'yi vatandaslar'a göre güncelle
  for (const u of uyumsuz) {
    const kart = _syncBilgiKart(u.isim, '');
    if (!kart) continue;
    const duzeltme = { [u.alan]: u.vats };
    await db.collection('vatandaslar_bilgi').doc(kart._fbId).update(duzeltme);
    Object.assign(kart, duzeltme);
    onarilan++;
  }

  showToast(`✅ Oto-onarım: ${onarilan} sorun giderildi`);
  if (typeof kbRender === 'function') kbRender();
  return onarilan;
}

// ─────────────────────────────────────────────
// Global erişim
// ─────────────────────────────────────────────
window.syncKisiGuncelle     = syncKisiGuncelle;
window.syncSaveEdit         = syncSaveEdit;
window.syncKbKaydet         = syncKbKaydet;
window.syncTCYay            = syncTCYay;
window.syncTutarlilikKontrol= syncTutarlilikKontrol;
window.syncOtoDuzelt        = syncOtoDuzelt;
