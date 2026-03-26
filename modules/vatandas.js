
/* Vatandas modülü - ID tabanlı toplu güncelleme (app.js'e dokunmaz) */

async function vtGetOrCreateKisiID(rec) {
  if (rec.KISI_ID) return rec.KISI_ID;
  const id = 'KISI_' + Date.now() + '_' + Math.floor(Math.random()*100000);
  rec.KISI_ID = id;
  // firebase'a yaz
  if (rec._fbId && typeof _db !== 'undefined') {
    await _db.collection('evdebakim').doc(rec._fbId).update({ KISI_ID: id });
  }
  return id;
}

async function vtTopluGuncelleByID(kisiID, yeniData) {
  const snap = await _db.collection('evdebakim').get();
  let say = 0;

  for (const d of snap.docs) {
    const data = d.data() || {};
    if (data.KISI_ID === kisiID) {
      await _db.collection('evdebakim').doc(d.id).update({
        ISIM_SOYISIM: yeniData.ISIM_SOYISIM,
        AD_SOYAD: yeniData.ISIM_SOYISIM,
        TELEFON: yeniData.TELEFON,
        ADRES: yeniData.ADRES,
        MAHALLE: yeniData.MAHALLE
      });
      say++;
    }
  }
  return say;
}

// saveEdit override (güvenli)
async function saveEdit() {
  try {
    if (!window.currentEditRecord) throw new Error('Kayıt yok');

    const rec = window.currentEditRecord;

    const yeniData = {
      ISIM_SOYISIM: (document.getElementById('editAdSoyad')?.value || '').trim(),
      TELEFON: (document.getElementById('editTelefon')?.value || '').trim(),
      ADRES: (document.getElementById('editAdres')?.value || '').trim(),
      MAHALLE: (document.getElementById('editMahalle')?.value || '').trim()
    };

    if (!yeniData.ISIM_SOYISIM) throw new Error('İsim boş');

    const kisiID = await vtGetOrCreateKisiID(rec);
    const adet = await vtTopluGuncelleByID(kisiID, yeniData);

    // local güncelle
    allData.forEach(r=>{
      if (r.KISI_ID === kisiID) {
        r.ISIM_SOYISIM = yeniData.ISIM_SOYISIM;
        r.AD_SOYAD = yeniData.ISIM_SOYISIM;
        r.TELEFON = yeniData.TELEFON;
        r.ADRES = yeniData.ADRES;
        r.MAHALLE = yeniData.MAHALLE;
      }
    });

    if (typeof refreshAll === 'function') refreshAll();
    if (typeof closeEditModal === 'function') closeEditModal();

    showToast('✅ Tüm kayıtlar güncellendi (' + adet + ')');

  } catch(e) {
    console.error(e);
    showToast('❌ ' + e.message);
  }
}
