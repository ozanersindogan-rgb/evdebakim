async function tumKayitlaraOrtakKisiIDVer() {
  try {
    if (!_db) throw new Error('Firestore yok');

    showToast('🔄 Kişi ID eşleştirmesi yapılıyor...');

    const col = _db.collection('evdebakim'); // koleksiyon adı farklıysa değiştir
    const snap = await col.get();

    const kisiMap = new Map();
    let guncellenen = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};

      const isim = (data.ISIM_SOYISIM || data.AD_SOYAD || '').toString().trim().toUpperCase();
      const telefon = (data.TELEFON || '').toString().trim();

      if (!isim) continue;

      const key = `${isim}__${telefon}`;

      let kisiID = kisiMap.get(key);
      if (!kisiID) {
        kisiID = data.KISI_ID || ('KISI_' + Date.now() + '_' + Math.floor(Math.random() * 100000));
        kisiMap.set(key, kisiID);
      }

      if (data.KISI_ID !== kisiID) {
        await col.doc(docSnap.id).update({ KISI_ID: kisiID });
        guncellenen++;
      }
    }

    showToast(`✅ ${guncellenen} kayıt güncellendi`);
    console.log('Ortak KISI_ID atama tamamlandı:', guncellenen);

  } catch (err) {
    console.error('tumKayitlaraOrtakKisiIDVer hatası:', err);
    showToast('❌ Hata: ' + (err.message || err));
  }
}
