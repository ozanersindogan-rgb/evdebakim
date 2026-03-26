
/* Kayit modülü - yeni kayıtlara KISI_ID ekler */

function krYeniKisiID() {
  return 'KISI_' + Date.now() + '_' + Math.floor(Math.random()*100000);
}

// gkKaydet içine eklenecek parça mantığı (override değil, destek)
async function krEnsureKisiID(rec) {
  if (!rec.KISI_ID) {
    rec.KISI_ID = krYeniKisiID();
    if (rec._fbId && typeof _db !== 'undefined') {
      await _db.collection('evdebakim').doc(rec._fbId).update({
        KISI_ID: rec.KISI_ID
      });
    }
  }
}
