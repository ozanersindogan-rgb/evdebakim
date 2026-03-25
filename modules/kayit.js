
async function gkKaydet() {
  try {
    const isim = (document.getElementById('gkKisi')?.value || '').trim().toUpperCase();
    const hizmet = (document.getElementById('gkHizmet')?.value || '').trim();
    const tarih = (document.getElementById('gkTarih')?.value || '').trim();

    if (!isim) throw new Error('Kişi seçilmedi');
    if (!hizmet) throw new Error('Hizmet seçilmedi');
    if (!tarih) throw new Error('Tarih seçilmedi');

    const aktifAy =
      (typeof selectedAy !== 'undefined' && selectedAy) ||
      (typeof getSonAy === 'function' ? getSonAy() : '');

    let rec = allData.find(r =>
      (r['HİZMET'] || r.HIZMET || '') === hizmet &&
      (r.AY || r.ay || '') === aktifAy &&
      (r.ISIM_SOYISIM || r.AD_SOYAD || '').toString().trim().toUpperCase() === isim
    );

    if (!rec) throw new Error('Kayıt bulunamadı');

    if (!Array.isArray(rec.GUNLUK_HIZMET_KAYITLARI)) {
      rec.GUNLUK_HIZMET_KAYITLARI = [];
    }

    rec.GUNLUK_HIZMET_KAYITLARI.push({
      tarih,
      hizmet,
      kayitZamani: new Date().toISOString()
    });

    showToast('💾 Kayıt yapılıyor...');
    await _gkVatandasKaydet(rec);

    showToast('✅ Kayıt başarılı');

    setTimeout(() => {
      localStorage.setItem('aktifSayfa', 'gunluk-hizmet-kaydi');
      location.reload();
    }, 800);

  } catch (err) {
    console.error(err);
    showToast('❌ ' + (err.message || 'Kayıt yapılamadı'));
  }
}
