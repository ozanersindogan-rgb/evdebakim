// ══════════════════════════════════════════════════════════════
// HEMŞİRE TAKİP MODÜLÜ
// Koleksiyon: hemsire_ziyaret
// ══════════════════════════════════════════════════════════════

let hmZiyaretler = [];          // Yüklenen tüm ziyaretler
let hmSecilenVatandas = null;   // Aktif seçilen vatandaş objesi
let hmDuzenleId = null;         // Düzenlenen ziyaret fbId
let hmListeFiltre = { hizmet: '', ara: '', tur: '' };

// ── Sayfa açıldığında ──────────────────────────────────────────
async function hmYukle() {
  try {
    const snap = await firebase.firestore().collection('hemsire_ziyaret')
      .orderBy('ziyaret_tarihi', 'desc').limit(500).get();
    hmZiyaretler = [];
    snap.forEach(d => hmZiyaretler.push({ _fbId: d.id, ...d.data() }));
    hmListeRender();
    hmFormHizmetDoldur();
    hmHemsireAdiniDoldur();
  } catch (e) {
    showToast('❌ Hemşire verileri yüklenemedi: ' + e.message);
  }
}

// ── Engel durumu değişince yüzde/açıklama göster/gizle ─────────
function hmEngelDurumDegisti() {
  const val = document.getElementById('hm-engel')?.value;
  const extra = document.getElementById('hm-engel-extra');
  if (!extra) return;
  extra.style.display = val === 'Var' ? '' : 'none';
  if (val !== 'Var') {
    const yuzde = document.getElementById('hm-engel-yuzde');
    const ac = document.getElementById('hm-engel-aciklama');
    if (yuzde) yuzde.value = '';
    if (ac) ac.value = '';
  }
}

// ── Hemşire adını USERS_MAP'ten otomatik seç ──────────────────
function hmHemsireAdiniDoldur() {
  const sel = document.getElementById('hm-hemsire');
  if (!sel) return;

  // Önce giriş yapmış kullanıcıya bak (currentUser app.js'de tanımlı, global scope)
  try {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.ad) {
      sel.value = currentUser.ad;
      return;
    }
  } catch(e) {}

  // currentUser yoksa USERS_MAP'ten hemşire rolünü bul
  try {
    const map = typeof USERS_MAP !== 'undefined' ? USERS_MAP : {};
    const hemsireler = Object.values(map).filter(u =>
      u.rol === 'Hemşire' || (u.rol || '').toLowerCase().includes('hemşire')
    );
    if (hemsireler.length) sel.value = hemsireler[0].ad;
  } catch(e) {}
}

// ── Hizmet select doldurucu ────────────────────────────────────
function hmFormHizmetDoldur() {
  const sel = document.getElementById('hm-hizmet');
  if (!sel) return;
  const hizmetler = ['KADIN BANYO', 'ERKEK BANYO', 'KUAFÖR', 'TEMİZLİK'];
  sel.innerHTML = '<option value="">— Hizmet Seçin —</option>' +
    hizmetler.map(h => `<option value="${h}">${h}</option>`).join('');
}

// ── Hizmet seçilince isim listesi dolsun ──────────────────────
function hmHizmetSecildi() {
  const hizmet = document.getElementById('hm-hizmet').value;
  const sel = document.getElementById('hm-vatandas');
  const bilgiDiv = document.getElementById('hm-vatandas-bilgi');
  sel.innerHTML = '<option value="">— Vatandaş Seçin —</option>';
  bilgiDiv.innerHTML = '';
  hmSecilenVatandas = null;
  if (!hizmet) return;

  const aktifler = [...new Map(
    allData.filter(r => r['HİZMET'] === hizmet && r.DURUM === 'AKTİF')
      .map(r => [r.ISIM_SOYISIM, r])
  ).values()].sort((a, b) => a.ISIM_SOYISIM.localeCompare(b.ISIM_SOYISIM, 'tr'));

  // Tüm aktif vatandaşları data olarak sakla, arama ile filtrele
  sel._tumAktifler = aktifler;
  hmVatandasListeFiltrele();
}

// ── Vatandaş listesini isim aramasına göre filtrele ────────────
function hmVatandasListeFiltrele() {
  const sel = document.getElementById('hm-vatandas');
  const araEl = document.getElementById('hm-vatandas-ara');
  const araStr = araEl ? araEl.value.toLowerCase() : '';
  const tumAktifler = sel._tumAktifler || [];

  const filtreli = araStr
    ? tumAktifler.filter(r => r.ISIM_SOYISIM.toLowerCase().includes(araStr))
    : tumAktifler;

  sel.innerHTML = '<option value="">— Vatandaş Seçin —</option>' +
    filtreli.map(r => `<option value="${r.ISIM_SOYISIM}">${r.ISIM_SOYISIM} — ${r.MAHALLE}</option>`).join('');
}

// ── Vatandaş seçilince bilgileri otomatik doldur ──────────────
function hmVatandasSecildi() {
  const isim = document.getElementById('hm-vatandas').value;
  const hizmet = document.getElementById('hm-hizmet').value;
  const bilgiDiv = document.getElementById('hm-vatandas-bilgi');

  if (!isim) { bilgiDiv.innerHTML = ''; hmSecilenVatandas = null; return; }

  const r = allData.find(x => x.ISIM_SOYISIM === isim && x['HİZMET'] === hizmet && x.DURUM === 'AKTİF')
          || allData.find(x => x.ISIM_SOYISIM === isim);

  // kbData'dan ek bilgi (vatandaslar_bilgi koleksiyonu)
  const kb = (typeof kbData !== 'undefined' ? kbData : [])
    .find(x => (x.AD_SOYAD || '').toUpperCase() === isim.toUpperCase()) || {};

  hmSecilenVatandas = { ...r, ...kb };

  const yas = typeof hesaplaYas === 'function' ? hesaplaYas(r?.DOGUM_TARIHI || kb.DOGUM_TARIHI || '') : null;
  const tel = r?.TELEFON || kb.TELEFON || '';
  const adres = r?.ADRES || kb.ADRES || '';
  const engel = r?.ENGEL || kb.ENGEL || 'Yok';
  const engelAc = r?.ENGEL_ACIKLAMA || kb.ENGEL_ACIKLAMA || '';
  const engelYuzde = r?.ENGEL_YUZDE || kb.ENGEL_YUZDE || '';
  const tc = r?.TC || kb.TC || '';
  const dogum = r?.DOGUM_TARIHI || kb.DOGUM_TARIHI || '';

  // TC alanını otomatik doldur
  const tcEl = document.getElementById('hm-tc');
  if (tcEl) {
    if (tc) {
      tcEl.value = tc;
      tcEl.readOnly = true;
      tcEl.style.background = '#f0fdf4';
      tcEl.style.color = '#166534';
      tcEl.style.border = '1.5px solid #86efac';
    } else {
      tcEl.value = '';
      tcEl.readOnly = false;
      tcEl.style.background = '';
      tcEl.style.color = '';
      tcEl.style.border = '';
    }
  }

  // Engel alanını otomatik doldur
  const engelEl = document.getElementById('hm-engel');
  if (engelEl && engel) {
    engelEl.value = engel;
    const extra = document.getElementById('hm-engel-extra');
    if (extra) extra.style.display = engel === 'Var' ? '' : 'none';
  }
  const engelYuzdeEl = document.getElementById('hm-engel-yuzde');
  if (engelYuzdeEl && engelYuzde) engelYuzdeEl.value = engelYuzde;
  const engelAcEl = document.getElementById('hm-engel-aciklama');
  if (engelAcEl && engelAc) engelAcEl.value = engelAc;

  const HC = { 'KADIN BANYO': '#C2185B', 'ERKEK BANYO': '#1565C0', 'KUAFÖR': '#2E7D32', 'TEMİZLİK': '#E65100' };
  const renk = HC[hizmet] || '#1A237E';

  bilgiDiv.innerHTML = `
    <div style="background:${renk}18;border:1.5px solid ${renk}44;border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="font-weight:900;font-size:15px;color:${renk};margin-bottom:8px">👤 ${isim}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;font-size:12px">
        ${dogum ? `<div><span style="color:#94a3b8;font-weight:700">DOĞUM</span><br><b>${dogum}</b>${yas !== null ? ` <span style="color:${renk};font-weight:800">(${yas} yaş)</span>` : ''}</div>` : ''}
        ${tc ? `<div><span style="color:#94a3b8;font-weight:700">T.C.</span><br><b>${tc}</b></div>` : ''}
        ${tel ? `<div><span style="color:#94a3b8;font-weight:700">TELEFON</span><br><b>${tel}</b></div>` : ''}
        <div><span style="color:#94a3b8;font-weight:700">MAHALLE</span><br><b>${r?.MAHALLE || ''}</b></div>
        ${adres ? `<div><span style="color:#94a3b8;font-weight:700">ADRES</span><br><b>${adres}</b></div>` : ''}
        <div style="grid-column:1/-1">
          <span style="color:#94a3b8;font-weight:700;font-size:11px">ENGEL DURUMU</span><br>
          ${engel === 'Var'
            ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;align-items:center">
                <b style="color:#dc2626;font-size:13px">⚠️ Engelli</b>
                ${engelYuzde ? `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;padding:2px 10px;font-size:12px;font-weight:800">%${engelYuzde}</span>` : ''}
                ${engelAc ? `<span style="color:#64748b;font-size:12px">— ${engelAc}</span>` : ''}
              </div>`
            : `<b style="color:#16a34a">✓ Engel Yok</b>`}
        </div>
      </div>
    </div>`;

  // Önceki ziyaret sayısını göster
  const oncekiZiyaretler = hmZiyaretler.filter(z =>
    z.vatandas === isim && z.hizmet === hizmet
  );
  if (oncekiZiyaretler.length > 0) {
    const son = oncekiZiyaretler[0];
    bilgiDiv.innerHTML += `
      <div style="background:#FFF9C4;border:1px solid #F9A825;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#795548">
        ℹ️ Bu vatandaş için <b>${oncekiZiyaretler.length}</b> önceki ziyaret kaydı var.
        Son ziyaret: <b>${son.ziyaret_tarihi || '—'}</b> (${son.ziyaret_turu || '—'})
      </div>`;
  }
}

// ── Formu sıfırla ─────────────────────────────────────────────
function hmFormTemizle() {
  document.getElementById('hm-hizmet').value = '';
  document.getElementById('hm-vatandas').innerHTML = '<option value="">— Önce hizmet seçin —</option>';
  document.getElementById('hm-vatandas-bilgi').innerHTML = '';
  document.getElementById('hm-tarih').value = new Date().toISOString().split('T')[0];
  document.getElementById('hm-saat').value = '';
  document.getElementById('hm-tur').value = 'İlk Ziyaret';
  document.getElementById('hm-hemsire').value = '';

  // TC alanını sıfırla
  const tcEl = document.getElementById('hm-tc');
  if (tcEl) { tcEl.value = ''; tcEl.readOnly = false; tcEl.style.background = ''; tcEl.style.color = ''; tcEl.style.border = '1.5px solid #f59e0b'; }

  // Genel durum seçimleri sıfırla
  ['hm-bilincDurumu', 'hm-ruhsal', 'hm-beslenme', 'hm-hareket', 'hm-cilt', 'hm-evHijyeni', 'hm-banyoIhtiyac', 'hm-kuaforIhtiyac', 'hm-engel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['hm-bilincAciklama','hm-ruhsalAciklama','hm-beslenmeAciklama','hm-hareketAciklama',
   'hm-ciltAciklama','hm-evHijyeniAciklama','hm-aileNotu','hm-degerlendirme','hm-engel-yuzde','hm-engel-aciklama'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('#hm-yonlendirmeler input[type=checkbox]').forEach(cb => cb.checked = false);
  const extra = document.getElementById('hm-engel-extra');
  if (extra) extra.style.display = 'none';

  // Düzenleme banner'ını gizle
  const banner = document.getElementById('hm-duzenle-banner');
  if (banner) banner.style.display = 'none';

  hmSecilenVatandas = null;
  hmDuzenleId = null;
  document.getElementById('hm-form-baslik').textContent = '📋 Yeni Ziyaret Formu';
  document.getElementById('hm-kaydet-btn').textContent = '💾 Ziyareti Kaydet';
  hmHemsireAdiniDoldur();
}

// ── Kaydet ────────────────────────────────────────────────────
async function hmKaydet() {
  const hizmet = document.getElementById('hm-hizmet').value;
  const vatandas = document.getElementById('hm-vatandas').value;
  const tarih = document.getElementById('hm-tarih').value;
  const hemsire = document.getElementById('hm-hemsire').value.trim();

  if (!hizmet || !vatandas) { showToast('⚠️ Hizmet ve vatandaş seçin'); return; }
  if (!tarih) { showToast('⚠️ Ziyaret tarihi giriniz'); return; }
  if (!hemsire) { showToast('⚠️ Hemşire adını giriniz'); return; }

  const hmTc = (document.getElementById('hm-tc')?.value || '').trim();
  const hmEngel = document.getElementById('hm-engel')?.value || '';
  if (!hmEngel) { showToast('❌ Engel durumu zorunlu'); return; }

  const getVal = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const getText = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  const yonlendirmeler = [...document.querySelectorAll('#hm-yonlendirmeler input[type=checkbox]:checked')]
    .map(cb => cb.value);

  const veri = {
    vatandas,
    hizmet,
    ziyaret_tarihi: tarih,
    ziyaret_saati: getVal('hm-saat'),
    ziyaret_turu: getVal('hm-tur'),
    hemsire,
    genel_durum: {
      bilincDurumu:   getVal('hm-bilincDurumu'),
      bilincAciklama: getText('hm-bilincAciklama'),
      ruhsal:         getVal('hm-ruhsal'),
      ruhsalAciklama: getText('hm-ruhsalAciklama'),
      beslenme:       getVal('hm-beslenme'),
      beslenmeAciklama: getText('hm-beslenmeAciklama'),
      hareket:        getVal('hm-hareket'),
      hareketAciklama: getText('hm-hareketAciklama'),
      cilt:           getVal('hm-cilt'),
      ciltAciklama:   getText('hm-ciltAciklama'),
      evHijyeni:      getVal('hm-evHijyeni'),
      evHijyeniAciklama: getText('hm-evHijyeniAciklama'),
      banyoIhtiyac:   getVal('hm-banyoIhtiyac'),
      kuaforIhtiyac:  getVal('hm-kuaforIhtiyac'),
    },
    aile_notu: getText('hm-aileNotu'),
    degerlendirme: getText('hm-degerlendirme'),
    yonlendirmeler,
    engel:          getVal('hm-engel'),
    engel_yuzde:    getVal('hm-engel-yuzde'),
    engel_aciklama: getText('hm-engel-aciklama'),
    tc:             hmTc,
    olusturma_tarihi: new Date().toISOString(),
  };

  try {
    if (hmDuzenleId) {
      await firebase.firestore().collection('hemsire_ziyaret').doc(hmDuzenleId).update(veri);
      const idx = hmZiyaretler.findIndex(z => z._fbId === hmDuzenleId);
      if (idx >= 0) hmZiyaretler[idx] = { _fbId: hmDuzenleId, ...veri };
      showToast('✅ Ziyaret güncellendi');
    } else {
      const ref = await firebase.firestore().collection('hemsire_ziyaret').add(veri);
      hmZiyaretler.unshift({ _fbId: ref.id, ...veri });
      showToast(`✅ Ziyaret kaydedildi`);
    }

    // TC'yi aynı isme ait TÜM vatandaslar kayıtlarına yaz (batch)
    const isimUpper = vatandas.trim().toUpperCase();
    const tcGuncellenecek = (typeof allData !== 'undefined' ? allData : []).filter(r =>
      (r.ISIM_SOYISIM || '').toUpperCase() === isimUpper &&
      r._fbId &&
      (r.TC || '').trim() !== hmTc
    );
    if (tcGuncellenecek.length > 0) {
      try {
        const BATCH_SIZE = 400;
        for (let i = 0; i < tcGuncellenecek.length; i += BATCH_SIZE) {
          const batch = firebase.firestore().batch();
          tcGuncellenecek.slice(i, i + BATCH_SIZE).forEach(r => {
            r.TC = hmTc;
            batch.update(firebase.firestore().collection('vatandaslar').doc(r._fbId), { TC: hmTc });
          });
          await batch.commit();
        }
        showToast(`✅ TC, ${isimUpper} adına ait ${tcGuncellenecek.length} kayda işlendi`);
      } catch(e) { console.warn('TC toplu yazma hatası:', e); }
    }
    // Engel bilgisi girildiyse vatandaslar + vatandaslar_bilgi koleksiyonlarını güncelle
    const engelGirildi = veri.engel && veri.engel !== '';
    if (engelGirildi) {
      const engelChanges = {
        ENGEL:          veri.engel,
        ENGEL_YUZDE:    veri.engel_yuzde || '',
        ENGEL_ACIKLAMA: veri.engel_aciklama || '',
      };
      // allData içindeki tüm eşleşen kayıtları güncelle
      const eslesenler = (Array.isArray(allData) ? allData : [])
        .map((rec, idx) => ({ rec, idx }))
        .filter(({ rec }) => (rec.ISIM_SOYISIM || '').toUpperCase() === vatandas.toUpperCase());

      await Promise.all(eslesenler.map(({ rec, idx }) => {
        Object.assign(rec, engelChanges);
        return fbUpdateDoc(idx, engelChanges);
      }));

      // vatandaslar_bilgi koleksiyonunu da güncelle
      try {
        const kbSnap = await firebase.firestore().collection('vatandaslar_bilgi')
          .where('AD_SOYAD', '==', vatandas).get();
        await Promise.all(kbSnap.docs.map(d => d.ref.update(engelChanges)));
        // kbData bellekte de güncelle
        if (typeof kbData !== 'undefined') {
          kbData.filter(k => (k.AD_SOYAD || '').toUpperCase() === vatandas.toUpperCase())
            .forEach(k => Object.assign(k, engelChanges));
        }
      } catch(e2) { /* vatandaslar_bilgi yoksa sessizce geç */ }

      showToast(`✅ Ziyaret kaydedildi — Engel bilgisi güncellendi`);
    }

    hmFormTemizle();
    hmListeRender();
  } catch (e) {
    showToast('❌ Kayıt hatası: ' + e.message);
  }
}

// ── Ziyaret listesi render ─────────────────────────────────────
function hmListeRender() {
  const tbl = document.getElementById('hm-liste-table');
  const kartListeEl = document.getElementById('hm-kart-liste');

  const ara = (document.getElementById('hm-fil-ara')?.value || document.getElementById('hm-fil-ara2')?.value || '').toLowerCase();
  const hizmet = document.getElementById('hm-fil-hizmet')?.value || document.getElementById('hm-fil-hizmet2')?.value || '';
  const tur = document.getElementById('hm-fil-tur')?.value || document.getElementById('hm-fil-tur2')?.value || '';

  let liste = hmZiyaretler.filter(z => {
    if (ara && !(z.vatandas || '').toLowerCase().includes(ara)) return false;
    if (hizmet && z.hizmet !== hizmet) return false;
    if (tur && z.ziyaret_turu !== tur) return false;
    return true;
  });

  const sayiStr = liste.length + ' kayıt';
  const cntEl = document.getElementById('hm-liste-count');
  const cntEl2 = document.getElementById('hm-liste-count2');
  if (cntEl) cntEl.textContent = sayiStr;
  if (cntEl2) cntEl2.textContent = sayiStr;

  const HC = { 'KADIN BANYO': '#C2185B', 'ERKEK BANYO': '#1565C0', 'KUAFÖR': '#2E7D32', 'TEMİZLİK': '#E65100' };
  const TUR_RENK = { 'İlk Ziyaret': '#7c3aed', 'Kontrol Ziyareti': '#0369a1', 'İzlem Ziyareti': '#0891b2' };

  // ── Sağ panel: kart listesi (son 20, sabit yükseklikte) ──
  if (kartListeEl) {
    const son20 = liste.slice(0, 20);
    if (!son20.length) {
      kartListeEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:30px;font-size:13px">Kayıt bulunamadı</div>';
    } else {
      kartListeEl.innerHTML = son20.map(z => {
        const gd = z.genel_durum || {};
        const sorunlar = [
          gd.bilincDurumu && gd.bilincDurumu !== 'Normal' ? gd.bilincDurumu : null,
          gd.ruhsal && gd.ruhsal !== 'Uygun' ? gd.ruhsal : null,
          gd.cilt && gd.cilt !== 'Normal' ? gd.cilt : null,
          gd.banyoIhtiyac === 'Var' ? 'Banyo ihtiyacı' : null,
        ].filter(Boolean);
        const hRenk = HC[z.hizmet] || '#64748b';
        const iyi = !sorunlar.length;
        return `<div onclick="hmDetayAc('${z._fbId}')" style="
          background:#fff;
          border:1.5px solid ${iyi ? '#e2e8f0' : '#fecaca'};
          border-radius:12px;
          padding:12px 14px;
          cursor:pointer;
          transition:box-shadow .15s"
          onmouseover="this.style.boxShadow='0 4px 14px rgba(0,0,0,.10)'"
          onmouseout="this.style.boxShadow=''">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-size:13px;font-weight:800;color:#0f172a">${z.vatandas || '—'}</div>
            <span style="font-size:10px;font-weight:700;color:#94a3b8">${z.ziyaret_tarihi || ''}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:${sorunlar.length ? '6px' : '0'}">
            <span style="background:${hRenk}18;color:${hRenk};font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px">${z.hizmet || ''}</span>
            <span style="background:${TUR_RENK[z.ziyaret_turu]||'#64748b'}18;color:${TUR_RENK[z.ziyaret_turu]||'#64748b'};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${z.ziyaret_turu || ''}</span>
            ${z.hemsire ? `<span style="background:#f0fdf4;color:#16a34a;font-size:10px;padding:2px 8px;border-radius:20px">🏥 ${z.hemsire}</span>` : ''}
          </div>
          ${sorunlar.length ? `<div style="font-size:10px;color:#dc2626;font-weight:700">⚠️ ${sorunlar.join(' • ')}</div>` : ''}
        </div>`;
      }).join('');
    }
  }

  // ── Sekme 2: tam tablo ──
  if (!tbl) return;

  if (!liste.length) {
    tbl.innerHTML = '<tr><td colspan="7" class="no-data">Kayıt bulunamadı</td></tr>';
    return;
  }

  tbl.innerHTML = `
    <thead><tr style="background:var(--primary);color:#fff">
      <th style="padding:8px">Tarih</th>
      <th style="padding:8px">Vatandaş</th>
      <th style="padding:8px">Hizmet</th>
      <th style="padding:8px">Ziyaret Türü</th>
      <th style="padding:8px">Hemşire</th>
      <th style="padding:8px">Özet</th>
      <th style="width:80px;padding:8px"></th>
    </tr></thead>
    <tbody>${liste.map(z => {
      const gd = z.genel_durum || {};
      const sorunlar = [
        gd.bilincDurumu && gd.bilincDurumu !== 'Normal' ? gd.bilincDurumu : null,
        gd.ruhsal && gd.ruhsal !== 'Uygun' ? gd.ruhsal : null,
        gd.cilt && gd.cilt !== 'Normal' ? gd.cilt : null,
        gd.banyoIhtiyac === 'Var' ? 'Banyo ihtiyacı' : null,
      ].filter(Boolean);

      return `<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="hmDetayAc('${z._fbId}')">
        <td style="padding:8px;font-weight:700;font-size:12px;white-space:nowrap">${z.ziyaret_tarihi || '—'}</td>
        <td style="padding:8px;font-weight:700">${z.vatandas || '—'}</td>
        <td style="padding:8px">
          <span style="background:${HC[z.hizmet] || '#64748b'}22;color:${HC[z.hizmet] || '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${z.hizmet || '—'}</span>
        </td>
        <td style="padding:8px">
          <span style="background:${TUR_RENK[z.ziyaret_turu] || '#64748b'}22;color:${TUR_RENK[z.ziyaret_turu] || '#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${z.ziyaret_turu || '—'}</span>
        </td>
        <td style="padding:8px;font-size:12px">${z.hemsire || '—'}</td>
        <td style="padding:8px;font-size:11px;color:${sorunlar.length ? '#b91c1c' : '#16a34a'}">
          ${sorunlar.length ? '⚠️ ' + sorunlar.join(', ') : '✓ Normal'}
        </td>
        <td style="padding:8px;text-align:center;white-space:nowrap" onclick="event.stopPropagation()">
          <button onclick="hmDuzenle('${z._fbId}')" style="padding:3px 7px;font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;color:#475569">✏️</button>
          <button onclick="hmSil('${z._fbId}')" style="padding:3px 7px;font-size:11px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;cursor:pointer;color:#dc2626;margin-left:3px">🗑️</button>
        </td>
      </tr>`;
    }).join('')}</tbody>`;
}

// ── Detay modal aç ─────────────────────────────────────────────
function hmDetayAc(fbId) {
  const z = hmZiyaretler.find(x => x._fbId === fbId);
  if (!z) return;

  const HC = { 'KADIN BANYO': '#C2185B', 'ERKEK BANYO': '#1565C0', 'KUAFÖR': '#2E7D32', 'TEMİZLİK': '#E65100' };
  const renk = HC[z.hizmet] || '#1A237E';
  const gd = z.genel_durum || {};

  const satir = (label, val, ac) => val
    ? `<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
        <span style="min-width:160px;color:#94a3b8;font-weight:700;font-size:11px">${label}</span>
        <span style="font-weight:700;color:#1e293b">${val}</span>
        ${ac ? `<span style="color:#64748b;font-size:11px;margin-left:4px">— ${ac}</span>` : ''}
       </div>` : '';

  document.getElementById('hm-detay-header').style.background = renk;
  document.getElementById('hm-detay-isim').textContent = z.vatandas;
  document.getElementById('hm-detay-alt').textContent =
    `${z.hizmet} • ${z.ziyaret_tarihi}${z.ziyaret_saati ? ' ' + z.ziyaret_saati : ''} • ${z.ziyaret_turu}`;

  document.getElementById('hm-detay-body').innerHTML = `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase">Hemşire</div>
      <div style="font-weight:700">${z.hemsire || '—'}</div>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase">Genel Durum Gözlemi</div>
      ${satir('Bilinç Durumu', gd.bilincDurumu, gd.bilincAciklama)}
      ${satir('Ruhsal Durum', gd.ruhsal, gd.ruhsalAciklama)}
      ${satir('Beslenme', gd.beslenme, gd.beslenmeAciklama)}
      ${satir('Hareket', gd.hareket, gd.hareketAciklama)}
      ${satir('Cilt Durumu', gd.cilt, gd.ciltAciklama)}
      ${satir('Ev Hijyeni', gd.evHijyeni, gd.evHijyeniAciklama)}
      ${satir('Banyo İhtiyacı', gd.banyoIhtiyac, '')}
      ${satir('Kuaför İhtiyacı', gd.kuaforIhtiyac, '')}
    </div>
    ${(z.engel && z.engel !== 'Yok') ? `<div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase">Engel Durumu</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-weight:700;color:#dc2626">Var</span>
        ${z.engel_yuzde ? `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;padding:2px 10px;font-size:12px;font-weight:800">%${z.engel_yuzde}</span>` : ''}
        ${z.engel_aciklama ? `<span style="color:#64748b;font-size:12px">— ${z.engel_aciklama}</span>` : ''}
      </div>
    </div>` : (z.engel === 'Yok' ? `<div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase">Engel Durumu</div>
      <span style="font-weight:700;color:#16a34a">Yok</span>
    </div>` : '')}
    ${z.aile_notu ? `<div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;text-transform:uppercase">Aile / Yakın Notu</div>
      <div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:13px;color:#374151">${z.aile_notu}</div>
    </div>` : ''}
    ${z.degerlendirme ? `<div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;text-transform:uppercase">Değerlendirme ve Öneriler</div>
      <div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:13px;color:#374151">${z.degerlendirme}</div>
    </div>` : ''}
    ${z.yonlendirmeler && z.yonlendirmeler.length ? `<div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;text-transform:uppercase">Yönlendirmeler</div>
      ${z.yonlendirmeler.map(y => `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px">
        <span style="color:#16a34a;font-weight:700">✓</span> ${y}
      </div>`).join('')}
    </div>` : ''}
    <div style="display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0">
      <button onclick="hmDetayKapat();hmDuzenle('${z._fbId}')"
        style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;color:#475569">
        ✏️ Düzenle
      </button>
    </div>`;

  document.getElementById('hm-detay-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function hmDetayKapat() {
  document.getElementById('hm-detay-modal').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Düzenle ────────────────────────────────────────────────────
function hmDuzenle(fbId) {
  const z = hmZiyaretler.find(x => x._fbId === fbId);
  if (!z) return;
  hmDetayKapat();

  // Forma git
  navTo('hemsire-takip', null);

  // Hizmet ve vatandaş doldur — düzenleme modunda direkt set et
  document.getElementById('hm-hizmet').value = z.hizmet;
  hmHizmetSecildi();
  // hmHizmetSecildi listeyi dolduruyor, ardından vatandaşı seç
  setTimeout(() => {
    const sel = document.getElementById('hm-vatandas');
    // Vatandaş listede yoksa (arama filtresi vs) manuel option ekle
    if (![...sel.options].some(o => o.value === z.vatandas)) {
      const opt = document.createElement('option');
      opt.value = z.vatandas;
      opt.textContent = z.vatandas;
      sel.appendChild(opt);
    }
    sel.value = z.vatandas;
    hmVatandasSecildi();
  }, 150);

  document.getElementById('hm-tarih').value = z.ziyaret_tarihi || '';
  document.getElementById('hm-saat').value = z.ziyaret_saati || '';
  document.getElementById('hm-tur').value = z.ziyaret_turu || 'İlk Ziyaret';
  document.getElementById('hm-hemsire').value = z.hemsire || '';

  const gd = z.genel_durum || {};
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('hm-bilincDurumu', gd.bilincDurumu);
  setVal('hm-bilincAciklama', gd.bilincAciklama);
  setVal('hm-ruhsal', gd.ruhsal);
  setVal('hm-ruhsalAciklama', gd.ruhsalAciklama);
  setVal('hm-beslenme', gd.beslenme);
  setVal('hm-beslenmeAciklama', gd.beslenmeAciklama);
  setVal('hm-hareket', gd.hareket);
  setVal('hm-hareketAciklama', gd.hareketAciklama);
  setVal('hm-cilt', gd.cilt);
  setVal('hm-ciltAciklama', gd.ciltAciklama);
  setVal('hm-evHijyeni', gd.evHijyeni);
  setVal('hm-evHijyeniAciklama', gd.evHijyeniAciklama);
  setVal('hm-banyoIhtiyac', gd.banyoIhtiyac);
  setVal('hm-kuaforIhtiyac', gd.kuaforIhtiyac);
  setVal('hm-aileNotu', z.aile_notu);
  setVal('hm-degerlendirme', z.degerlendirme);

  setVal('hm-engel', z.engel);
  setVal('hm-engel-yuzde', z.engel_yuzde);
  setVal('hm-engel-aciklama', z.engel_aciklama);
  hmEngelDurumDegisti(); // extra alanların görünürlüğünü güncelle
  document.querySelectorAll('#hm-yonlendirmeler input[type=checkbox]').forEach(cb => {
    cb.checked = (z.yonlendirmeler || []).includes(cb.value);
  });

  hmDuzenleId = fbId;
  document.getElementById('hm-form-baslik').textContent = '✏️ Ziyaret Düzenle';
  document.getElementById('hm-kaydet-btn').textContent = '💾 Güncelle';

  // Düzenleme banner'ını göster
  const banner = document.getElementById('hm-duzenle-banner');
  const bannerIsim = document.getElementById('hm-duzenle-banner-isim');
  if (banner) { banner.style.display = 'flex'; }
  if (bannerIsim) { bannerIsim.textContent = z.vatandas + ' — ' + z.ziyaret_tarihi; }

  // Forma scroll
  document.getElementById('hm-duzenle-banner')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Sil ────────────────────────────────────────────────────────
async function hmSil(fbId) {
  const z = hmZiyaretler.find(x => x._fbId === fbId);
  if (!z) return;
  if (!confirm(`"${z.vatandas}" için ${z.ziyaret_tarihi} tarihli ziyareti silmek istediğinize emin misiniz?`)) return;
  try {
    await firebase.firestore().collection('hemsire_ziyaret').doc(fbId).delete();
    hmZiyaretler = hmZiyaretler.filter(x => x._fbId !== fbId);
    hmListeRender();
    showToast('🗑️ Ziyaret silindi');
  } catch (e) {
    showToast('❌ Silinemedi: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// KİŞİ KARTI — Hemşire Takip Bölümü
// showDetail içinden çağrılır
// ══════════════════════════════════════════════════════════════

// Uygulama başlarken hemşire verilerini arka planda yükle
async function hmZiyaretlerYukle() {
  if (hmZiyaretler.length > 0) return; // zaten yüklüyse geçme
  try {
    const snap = await firebase.firestore().collection('hemsire_ziyaret')
      .orderBy('ziyaret_tarihi', 'desc').limit(500).get();
    hmZiyaretler = [];
    snap.forEach(d => hmZiyaretler.push({ _fbId: d.id, ...d.data() }));
  } catch (e) { /* sessizce geç */ }
}

function hmKartBolumu(isim, hizmet) {
  // Eğer henüz yüklenmemişse arka planda yükle ve placeholder göster
  if (hmZiyaretler.length === 0) {
    hmZiyaretlerYukle().then(() => {
      // Kart hâlâ açıksa bölümü güncelle
      const el = document.getElementById('hm-kart-bolumu-' + CSS.escape(isim));
      if (el) el.outerHTML = hmKartBolumuHTML(isim, hizmet);
    });
    return `<div id="hm-kart-bolumu-${isim.replace(/[^a-zA-Z0-9]/g,'-')}"
      style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-top:14px;border:1px solid #e2e8f0">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:6px">🏥 Hemşire Takip</div>
      <div style="font-size:12px;color:#94a3b8;text-align:center;padding:8px 0">⏳ Yükleniyor...</div>
    </div>`;
  }
  return hmKartBolumuHTML(isim, hizmet);
}

function hmKartBolumuHTML(isim, hizmet) {
  const ziyaretler = hmZiyaretler.filter(z =>
    (z.vatandas || '').toUpperCase() === (isim || '').toUpperCase() &&
    (!hizmet || z.hizmet === hizmet)
  ).sort((a, b) => (b.ziyaret_tarihi || '').localeCompare(a.ziyaret_tarihi || ''));

  if (!ziyaretler.length) {
    return `<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-top:14px;border:1px solid #e2e8f0">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;text-transform:uppercase">🏥 Hemşire Takip</div>
      <div style="font-size:12px;color:#94a3b8;text-align:center;padding:8px 0">Henüz hemşire ziyareti kaydı yok</div>
    </div>`;
  }

  const TUR_RENK = { 'İlk Ziyaret': '#7c3aed', 'Kontrol Ziyareti': '#0369a1', 'İzlem Ziyareti': '#0891b2' };

  return `<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-top:14px;border:1px solid #e2e8f0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase">🏥 Hemşire Takip</div>
      <div style="font-size:11px;font-weight:800;color:var(--primary)">${ziyaretler.length} ziyaret</div>
    </div>
    ${ziyaretler.map(z => {
      const gd = z.genel_durum || {};
      const sorunlar = [
        gd.bilincDurumu && gd.bilincDurumu !== 'Normal' ? gd.bilincDurumu : null,
        gd.ruhsal && gd.ruhsal !== 'Uygun' ? gd.ruhsal : null,
        gd.cilt && gd.cilt !== 'Normal' ? gd.cilt : null,
      ].filter(Boolean);
      const renk = TUR_RENK[z.ziyaret_turu] || '#64748b';
      return `<div onclick="hmDetayAc('${z._fbId}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border-radius:8px;margin-bottom:6px;cursor:pointer;border:1px solid #e2e8f0;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
        <div style="font-size:11px;font-weight:800;color:${renk};min-width:80px">${z.ziyaret_tarihi || '—'}</div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:${renk}">${z.ziyaret_turu}</div>
          <div style="font-size:10px;color:#64748b">${z.hemsire || ''}</div>
        </div>
        <div style="font-size:10px;color:${sorunlar.length ? '#b91c1c' : '#16a34a'};text-align:right">
          ${sorunlar.length ? '⚠️ ' + sorunlar.join(', ') : '✓ Normal'}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// SEKME YÖNETİMİ
// ══════════════════════════════════════════════════════════════
function hmSekmeAc(sekme) {
  ['form','liste','gunluk'].forEach(s => {
    const panel = document.getElementById('hm-tab-' + s);
    const btn   = document.getElementById('hm-tab-btn-' + s);
    if (!panel || !btn) return;
    const aktif = s === sekme;
    panel.style.display = aktif ? (s === 'form' ? 'grid' : 'block') : 'none';
    btn.style.borderBottom = aktif ? '3px solid #1A237E' : '3px solid transparent';
    btn.style.color = aktif ? '#1A237E' : '#94a3b8';
    btn.style.fontWeight = aktif ? '800' : '700';
  });
  if (sekme === 'gunluk') {
    if (!document.getElementById('hm-gunluk-tarih').value) hmGunlukBugun();
    else hmGunlukRender();
  }
  if (sekme === 'liste') hmListeRender();
}

// ══════════════════════════════════════════════════════════════
// GÜNLÜK TAKİP
// ══════════════════════════════════════════════════════════════
function hmGunlukBugun() {
  const inp = document.getElementById('hm-gunluk-tarih');
  if (!inp) return;
  const bugun = new Date();
  inp.value = bugun.getFullYear() + '-'
    + String(bugun.getMonth()+1).padStart(2,'0') + '-'
    + String(bugun.getDate()).padStart(2,'0');
  hmGunlukRender();
}

function hmGunlukGunDegistir(delta) {
  const inp = document.getElementById('hm-gunluk-tarih');
  if (!inp) return;
  const d = inp.value ? new Date(inp.value + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + delta);
  inp.value = d.getFullYear() + '-'
    + String(d.getMonth()+1).padStart(2,'0') + '-'
    + String(d.getDate()).padStart(2,'0');
  hmGunlukRender();
}

function hmGunlukRender() {
  const tarihEl = document.getElementById('hm-gunluk-tarih');
  const ozetEl  = document.getElementById('hm-gunluk-ozet');
  const kartEl  = document.getElementById('hm-gunluk-kartlar');
  const bosEl   = document.getElementById('hm-gunluk-bos');
  if (!tarihEl || !ozetEl || !kartEl) return;

  const tarih = tarihEl.value; // YYYY-MM-DD
  if (!tarih) return;

  const liste = hmZiyaretler.filter(z => z.ziyaret_tarihi === tarih);

  // Özet sayaçlar
  const HC = { 'KADIN BANYO': '#C2185B', 'ERKEK BANYO': '#1565C0', 'KUAFÖR': '#2E7D32', 'TEMİZLİK': '#E65100' };
  const hizmetSayilari = {};
  liste.forEach(z => {
    hizmetSayilari[z.hizmet] = (hizmetSayilari[z.hizmet] || 0) + 1;
  });

  ozetEl.innerHTML = `
    <div style="background:linear-gradient(135deg,#f0f4ff,#e8eeff);border:1.5px solid #c7d2fe;border-radius:14px;padding:14px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:#1A237E">${liste.length}</div>
      <div style="font-size:11px;font-weight:700;color:#4338ca;margin-top:2px">Toplam Ziyaret</div>
    </div>
    ${['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'].map(h => `
    <div style="background:#fff;border:1.5px solid ${HC[h]}30;border-radius:14px;padding:14px;text-align:center">
      <div style="font-size:24px;font-weight:900;color:${HC[h]}">${hizmetSayilari[h] || 0}</div>
      <div style="font-size:10px;font-weight:700;color:${HC[h]}cc;margin-top:2px">${h === 'KADIN BANYO' ? 'Kadın Banyo' : h === 'ERKEK BANYO' ? 'Erkek Banyo' : h === 'KUAFÖR' ? 'Kuaför' : 'Temizlik'}</div>
    </div>`).join('')}`;

  if (!liste.length) {
    kartEl.innerHTML = '';
    if (bosEl) bosEl.style.display = 'block';
    return;
  }
  if (bosEl) bosEl.style.display = 'none';

  const TUR_RENK = { 'İlk Ziyaret': '#7c3aed', 'Kontrol Ziyareti': '#0369a1', 'İzlem Ziyareti': '#0891b2' };

  kartEl.innerHTML = liste
    .sort((a, b) => (a.ziyaret_saati || '').localeCompare(b.ziyaret_saati || ''))
    .map(z => {
      const gd = z.genel_durum || {};
      const sorunlar = [
        gd.bilincDurumu && gd.bilincDurumu !== 'Normal' ? '🧠 ' + gd.bilincDurumu : null,
        gd.ruhsal && gd.ruhsal !== 'Uygun' ? '💭 ' + gd.ruhsal : null,
        gd.beslenme && gd.beslenme !== 'Yeterli' ? '🍽️ ' + gd.beslenme : null,
        gd.hareket && gd.hareket !== 'Bağımsız' ? '🦽 ' + gd.hareket : null,
        gd.cilt && gd.cilt !== 'Normal' ? '🩹 ' + gd.cilt : null,
        gd.banyoIhtiyac === 'Var' ? '🚿 Banyo ihtiyacı' : null,
        gd.kuaforIhtiyac === 'Var' ? '✂️ Kuaför ihtiyacı' : null,
      ].filter(Boolean);
      const hRenk = HC[z.hizmet] || '#64748b';
      const tRenk = TUR_RENK[z.ziyaret_turu] || '#64748b';
      const iyi = !sorunlar.length;

      return `<div onclick="hmDetayAc('${z._fbId}')" style="
        background:#fff;
        border:1.5px solid ${iyi ? '#bbf7d0' : '#fecaca'};
        border-radius:16px;
        padding:16px;
        cursor:pointer;
        transition:box-shadow .15s, transform .1s;
        box-shadow:0 2px 8px rgba(0,0,0,.06)"
        onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,.12)';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,.06)';this.style.transform=''">

        <!-- Üst: isim + durum -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="font-size:14px;font-weight:900;color:#0f172a;margin-bottom:2px">${z.vatandas || '—'}</div>
            <div style="font-size:10px;color:#94a3b8">${z.ziyaret_saati ? '⏰ ' + z.ziyaret_saati : ''}</div>
          </div>
          <span style="background:${iyi ? '#dcfce7' : '#fee2e2'};color:${iyi ? '#16a34a' : '#dc2626'};font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap">
            ${iyi ? '✓ Normal' : '⚠️ Dikkat'}
          </span>
        </div>

        <!-- Rozetler -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          <span style="background:${hRenk}18;color:${hRenk};font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px">${z.hizmet || ''}</span>
          <span style="background:${tRenk}18;color:${tRenk};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">${z.ziyaret_turu || ''}</span>
          ${z.hemsire ? `<span style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">🏥 ${z.hemsire}</span>` : ''}
        </div>

        <!-- Sorunlar -->
        ${sorunlar.length ? `<div style="background:#fef2f2;border-radius:8px;padding:8px 10px;font-size:11px;color:#b91c1c;line-height:1.6">
          ${sorunlar.join('  •  ')}
        </div>` : ''}

        <!-- Değerlendirme notu -->
        ${z.degerlendirme ? `<div style="margin-top:8px;font-size:11px;color:#475569;border-top:1px solid #f1f5f9;padding-top:8px;line-height:1.5">
          📝 ${z.degerlendirme.slice(0, 80)}${z.degerlendirme.length > 80 ? '…' : ''}
        </div>` : ''}

      </div>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════════
// WHATSAPP PAYLAŞ — GÜNLÜK
// ══════════════════════════════════════════════════════════════
function hmWhatsappPaylasGunluk() {
  const tarihEl = document.getElementById('hm-gunluk-tarih');
  if (!tarihEl || !tarihEl.value) { showToast('⚠️ Önce tarih seçin'); return; }

  const tarih = tarihEl.value; // YYYY-MM-DD
  const [y, m, g] = tarih.split('-');
  const tarihTR = `${g}.${m}.${y}`;

  const liste = hmZiyaretler
    .filter(z => z.ziyaret_tarihi === tarih)
    .sort((a, b) => (a.ziyaret_saati || '99:99').localeCompare(b.ziyaret_saati || '99:99'));

  if (!liste.length) { showToast('Bu gün için ziyaret kaydı yok'); return; }

  const HC_EMOJI = { 'KADIN BANYO': '🚿', 'ERKEK BANYO': '🛁', 'KUAFÖR': '✂️', 'TEMİZLİK': '🧹' };

  let metin = `🏥 *HEMŞİRE ZİYARET RAPORU*\n`;
  metin += `📅 ${tarihTR}\n`;
  metin += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  liste.forEach((z, i) => {
    const gd = z.genel_durum || {};
    const sorunlar = [
      gd.bilincDurumu && gd.bilincDurumu !== 'Normal' ? 'Bilinç: ' + gd.bilincDurumu : null,
      gd.ruhsal && gd.ruhsal !== 'Uygun' ? 'Ruhsal: ' + gd.ruhsal : null,
      gd.beslenme && gd.beslenme !== 'Yeterli' ? 'Beslenme: ' + gd.beslenme : null,
      gd.cilt && gd.cilt !== 'Normal' ? 'Cilt: ' + gd.cilt : null,
      gd.banyoIhtiyac === 'Var' ? 'Banyo ihtiyacı var' : null,
      gd.kuaforIhtiyac === 'Var' ? 'Kuaför ihtiyacı var' : null,
    ].filter(Boolean);

    metin += `${i+1}. ${HC_EMOJI[z.hizmet] || '•'} *${z.vatandas || '—'}*\n`;
    if (z.ziyaret_saati) metin += `   ⏰ ${z.ziyaret_saati}\n`;
    metin += `   🔹 ${z.hizmet || ''} — ${z.ziyaret_turu || ''}\n`;
    if (z.hemsire) metin += `   👩‍⚕️ ${z.hemsire}\n`;
    if (sorunlar.length) metin += `   ⚠️ ${sorunlar.join(', ')}\n`;
    if (z.degerlendirme) metin += `   📝 ${z.degerlendirme.slice(0,120)}\n`;
    if (z.yonlendirmeler && z.yonlendirmeler.length) metin += `   📌 ${z.yonlendirmeler.join(', ')}\n`;
    metin += '\n';
  });

  metin += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  metin += `📊 Toplam: ${liste.length} ziyaret\n`;
  metin += `🏥 Kuşadası Belediyesi Evde Bakım`;

  const encoded = encodeURIComponent(metin);
  window.open('https://wa.me/?text=' + encoded, '_blank');
}

// hmListeRender'ı sekme 2 inputlarını da dinleyecek şekilde güncelle
const _hmListeRenderOrig = hmListeRender;
window.hmListeRender = function() {
  _hmListeRenderOrig();
  // Sekme 2 liste sayısını güncelle
  const cnt2 = document.getElementById('hm-liste-count2');
  const cnt1 = document.getElementById('hm-liste-count');
  if (cnt2 && cnt1) cnt2.textContent = cnt1.textContent;
};

window.hmSekmeAc = hmSekmeAc;
window.hmGunlukBugun = hmGunlukBugun;
window.hmGunlukGunDegistir = hmGunlukGunDegistir;
window.hmGunlukRender = hmGunlukRender;
window.hmWhatsappPaylasGunluk = hmWhatsappPaylasGunluk;
