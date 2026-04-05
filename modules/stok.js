// ══════════════════════════════════════════════════════════
//  STOK YÖNETİMİ MODÜLÜ
//  Temizlik Malzemesi & Medikal Malzeme
//  Firestore koleksiyonu: stok_hareketler
//  Her hareket: { tip:'GELEN'|'CIKAN', malzeme, tur, miktar,
//                 personel, tarih, zimmetPersonel?, aciklama?, kategori }
// ══════════════════════════════════════════════════════════

// ── Malzeme listeleri ─────────────────────────────────────
const STOK_MALZEMELER = {
  temizlik: [
    { ad: 'Bulaşık Deterjanı',          tur: 'Paket' },
    { ad: 'Bulaşık Süngeri',            tur: 'Adet'  },
    { ad: 'Büyük Çekpas',               tur: 'Adet'  },
    { ad: 'Büyük Kova',                 tur: 'Adet'  },
    { ad: 'Cam Silme Bezi',             tur: 'Adet'  },
    { ad: 'Camsil',                     tur: 'Litre' },
    { ad: 'Cif',                        tur: 'Litre' },
    { ad: 'Çamaşır Deterjanı',          tur: 'Paket' },
    { ad: 'Çamaşır Suyu',               tur: 'Litre' },
    { ad: 'Çöp Poşeti ( Battal )',      tur: 'Adet'  },
    { ad: 'Çöp Poşeti ( Jumbo )',       tur: 'Adet'  },
    { ad: 'FIRÇA',                      tur: 'Adet'  },
    { ad: 'Galoş',                      tur: 'Paket' },
    { ad: 'Genel Temizleyici',          tur: 'Litre' },
    { ad: 'Kireç Çözücü',              tur: 'Litre' },
    { ad: 'Küçük Çekpas',              tur: 'Adet'  },
    { ad: 'M Beden Latex Pudralı Eldiven',  tur: 'Kutu' },
    { ad: 'M Beden Latex Pudrasız Eldiven', tur: 'Kutu' },
    { ad: 'Maske',                      tur: 'Kutu'  },
    { ad: 'Mutfak Silme Bezi',          tur: 'Adet'  },
    { ad: 'S Beden Latex Pudralı Eldiven',  tur: 'Kutu' },
    { ad: 'Sıvı Sabun',                 tur: 'Bidon' },
    { ad: 'Silme Bezi',                 tur: 'Paket' },
    { ad: 'Tıraş Bıçağı',              tur: 'Adet'  },
    { ad: 'Tuvalet Kağıdı',            tur: 'Adet'  },
    { ad: 'Vileda ( Metal )',           tur: 'Adet'  },
    { ad: 'Vileda ( Tahta )',           tur: 'Adet'  },
    { ad: 'Vileda Havlu Paspas',        tur: 'Adet'  },
    { ad: 'Vileda Kovası',              tur: 'Adet'  },
    { ad: 'Vileda Sapı',                tur: 'Adet'  },
    { ad: 'Yağçöz',                     tur: 'Litre' },
    { ad: 'Yüzey Temizleyici',          tur: 'Litre' },
  ],
  medikal: [
    { ad: 'Medikal Maske',              tur: 'Kutu'  },
    { ad: 'N95 Maske',                  tur: 'Adet'  },
    { ad: 'Nitril Eldiven (S)',          tur: 'Kutu'  },
    { ad: 'Nitril Eldiven (M)',          tur: 'Kutu'  },
    { ad: 'Nitril Eldiven (L)',          tur: 'Kutu'  },
    { ad: 'Galoş',                      tur: 'Paket' },
    { ad: 'Bone',                       tur: 'Paket' },
    { ad: 'Önlük (Tek Kullanımlık)',    tur: 'Adet'  },
    { ad: 'Alkol Bazlı El Dezenfektanı',tur: 'Litre' },
    { ad: 'Yüzey Dezenfektanı',        tur: 'Litre' },
    { ad: 'Steril Spanç',              tur: 'Paket' },
    { ad: 'Flaster',                    tur: 'Kutu'  },
    { ad: 'Sargı Bezi',                tur: 'Adet'  },
    { ad: 'Termometre',                tur: 'Adet'  },
    { ad: 'Tansiyon Aleti',            tur: 'Adet'  },
    { ad: 'Nabız Oksimetre',           tur: 'Adet'  },
  ],
};

// ── Yetki ─────────────────────────────────────────────────
// Ozan Ersin: ana admin (her şeyi yapabilir)
// Ayşegül: depo sorumlusu (stok işlemleri yapabilir)
// Diğerleri: sadece görüntüleyebilir
const STOK_ADMIN_UID   = 'SBIyovehB5RAkSkhc05bIm88PJs2'; // Ozan Ersin DOĞAN
const STOK_DEPO_UID    = 'LBntADGnP2MHVecmn4jAnFRPW222'; // Ayşegül TULĞAN

function stokYetkiVar() {
  const uid = window.currentUser?.uid;
  return uid === STOK_ADMIN_UID || uid === STOK_DEPO_UID;
}
function stokAyarlarGorebilir() {
  return window.currentUser?.uid === STOK_ADMIN_UID;
}
function stokDepoAdi() {
  return window.currentUser?.ad || 'Ayşegül TULĞAN';
}

// Firestore'dan yüklenen hareketler (her kategori için ayrı)
const _stokData = { temizlik: [], medikal: [] };
// Firestore'dan yüklenen malzeme listesi (kalıcı)
const _stokMalzemeler = { temizlik: [], medikal: [] };
let _stokAktifKategori = 'temizlik';
let _stokAktifSekme = 'ozet';

// Aktif malzeme listesini döndür (Firestore yüklüyse onu, yoksa STOK_MALZEMELER seed'ini)
function stokMalzemeListesi(kategori) {
  return _stokMalzemeler[kategori].length
    ? _stokMalzemeler[kategori]
    : STOK_MALZEMELER[kategori];
}

// ── Yardımcılar ──────────────────────────────────────────
function stokFmt(n) { return (n ?? 0).toLocaleString('tr-TR'); }
function stokTarihTR(d) {
  if (!d) return '—';
  if (typeof d === 'string') return d;
  const dt = d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function stokTodayISO() { return new Date().toISOString().split('T')[0]; }

// Malzeme listesinden tür bul
function stokTurBul(kategori, malzemeAd) {
  return stokMalzemeListesi(kategori).find(m => m.ad === malzemeAd)?.tur || 'Adet';
}

// Kalan stok hesapla
function stokHesaplaKalan(kategori) {
  const hareketler = _stokData[kategori] || [];
  const kalan = {};
  stokMalzemeListesi(kategori).forEach(m => { kalan[m.ad] = 0; });
  hareketler.forEach(h => {
    if (!kalan.hasOwnProperty(h.malzeme)) kalan[h.malzeme] = 0;
    if (h.tip === 'GELEN')  kalan[h.malzeme] += Number(h.miktar) || 0;
    if (h.tip === 'CIKAN')  kalan[h.malzeme] -= Number(h.miktar) || 0;
  });
  return kalan;
}

// ── Firestore yükle ───────────────────────────────────────
async function stokMalzemeListesiYukle(kategori) {
  try {
    const snap = await firebase.firestore()
      .collection('stok_malzemeler')
      .where('kategori', '==', kategori)
      .get();
    if (!snap.empty) {
      const liste = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      liste.sort((a,b) => a.ad.localeCompare(b.ad, 'tr'));
      _stokMalzemeler[kategori] = liste;
    } else {
      // Firestore boşsa seed'i yükle
      _stokMalzemeler[kategori] = [];
      const b = firebase.firestore().batch();
      STOK_MALZEMELER[kategori].forEach(m => {
        const ref = firebase.firestore().collection('stok_malzemeler').doc();
        b.set(ref, { ad: m.ad, tur: m.tur, kategori });
      });
      await b.commit();
      // Tekrar yükle
      const snap2 = await firebase.firestore()
        .collection('stok_malzemeler')
        .where('kategori', '==', kategori)
        .get();
      const liste2 = snap2.docs.map(d => ({ _id: d.id, ...d.data() }));
      liste2.sort((a,b) => a.ad.localeCompare(b.ad,'tr'));
      _stokMalzemeler[kategori] = liste2;
    }
  } catch(e) {
    console.warn('Malzeme listesi yüklenemedi:', e);
    _stokMalzemeler[kategori] = [];
  }
}

async function stokFirestoreYukle(kategori) {
  try {
    const snap = await firebase.firestore()
      .collection('stok_hareketler')
      .where('kategori', '==', kategori)
      .get();
    const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const ta = a.tarih?.toDate ? a.tarih.toDate() : new Date(a.tarih || 0);
      const tb = b.tarih?.toDate ? b.tarih.toDate() : new Date(b.tarih || 0);
      return tb - ta;
    });
    _stokData[kategori] = docs;
  } catch(e) {
    console.warn('Stok yüklenemedi:', e);
    _stokData[kategori] = [];
  }
}

// ── Ana render ────────────────────────────────────────────
async function stokRender(kategori) {
  _stokAktifKategori = kategori;
  const rootId = `stok-${kategori}-root`;
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-soft)">⏳ Yükleniyor...</div>`;
  await Promise.all([
    stokFirestoreYukle(kategori),
    stokMalzemeListesiYukle(kategori),
  ]);
  _stokAktifSekme = 'ozet';
  stokRenderIc(kategori);
}

function stokRenderIc(kategori) {
  const rootId = `stok-${kategori}-root`;
  const root = document.getElementById(rootId);
  if (!root) return;

  const baslik = kategori === 'temizlik' ? '🧴 Temizlik Malzemesi Stok' : '💊 Medikal Malzeme Stok';
  const renk   = kategori === 'temizlik' ? '#059669' : '#2563eb';

  const sekmeler = [
    { id: 'ozet',       ikon: '📊', ad: 'Stok Özeti'    },
    { id: 'hareketler', ikon: '📋', ad: 'Tüm Hareketler'},
    { id: 'personel',   ikon: '👥', ad: 'Personel'       },
    { id: 'gelen',      ikon: '📥', ad: 'Gelen Kayıt'   },
    { id: 'zimmet',     ikon: '📤', ad: 'Zimmet / Çıkış'},
    ...(stokAyarlarGorebilir() ? [{ id: 'ayarlar', ikon: '⚙️', ad: 'Ayarlar' }] : []),
  ];

  if (_stokAktifSekme === 'ayarlar' && !stokAyarlarGorebilir()) {
    _stokAktifSekme = 'ozet';
  }

  root.innerHTML = `
    <div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:20px;font-weight:900;color:var(--text)">${baslik}</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:2px">Firestore'dan canlı · ${(_stokData[kategori]||[]).length} hareket kaydı</div>
      </div>
      <button onclick="stokExcelIndir('${kategori}')"
        style="background:${renk};color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer">
        ⬇️ Excel İndir
      </button>
    </div>

    <!-- Sekmeler -->
    <div style="display:flex;gap:4px;border-bottom:2px solid var(--border);margin-bottom:20px;flex-wrap:wrap">
      ${sekmeler.map(s => `
        <button id="stok-tab-${s.id}" onclick="stokSekme('${kategori}','${s.id}')"
          style="padding:9px 16px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;
                 border-bottom:3px solid ${_stokAktifSekme===s.id?renk:'transparent'};
                 color:${_stokAktifSekme===s.id?renk:'var(--text-soft)'};transition:all .15s">
          ${s.ikon} ${s.ad}
        </button>`).join('')}
    </div>

    <!-- İçerik -->
    <div id="stok-sekme-icerik"></div>`;

  stokSekmeIcerik(kategori, _stokAktifSekme);
}

function stokSekme(kategori, sekme) {
  if (sekme === 'ayarlar' && !stokAyarlarGorebilir()) {
    _stokAktifSekme = 'ozet';
    stokRenderIc(kategori);
    showToast('⛔ Ayarlar sekmesini sadece Ozan Ersin DOĞAN görebilir');
    return;
  }
  _stokAktifSekme = sekme;
  stokRenderIc(kategori);
}

function stokSekmeIcerik(kategori, sekme) {
  const el = document.getElementById('stok-sekme-icerik');
  if (!el) return;
  if (sekme === 'ozet')       el.innerHTML = stokOzetHTML(kategori);
  if (sekme === 'hareketler') el.innerHTML = stokHareketlerHTML(kategori);
  if (sekme === 'personel')   el.innerHTML = stokPersonelHTML(kategori);
  if (sekme === 'gelen')      el.innerHTML = stokGelenFormHTML(kategori);
  if (sekme === 'zimmet')     el.innerHTML = stokZimmetFormHTML(kategori);
  if (sekme === 'ayarlar')    el.innerHTML = stokAyarlarGorebilir()
    ? stokAyarlarHTML(kategori)
    : stokOzetHTML(kategori);
}

// ── SEKME 1: STOK ÖZETİ ──────────────────────────────────
function stokOzetHTML(kategori) {
  const hareketler = _stokData[kategori] || [];
  const renk  = kategori === 'temizlik' ? '#059669' : '#2563eb';
  const malzemeler = STOK_MALZEMELER[kategori];

  // Her malzeme için başlangıç (ilk GELEN ile "Başlangıç sayımı" aciklamasi), sonraki gelenler, çıkanlar
  const rows = malzemeler.map(m => {
    const tumGelen  = hareketler.filter(h => h.tip === 'GELEN' && h.malzeme === m.ad);
    const tumCikan  = hareketler.filter(h => h.tip === 'CIKAN' && h.malzeme === m.ad);

    // Başlangıç sayımı: "Başlangıç sayımı" açıklamalı kayıtlar
    const baslangic = tumGelen
      .filter(h => (h.aciklama||'').includes('Başlangıç'))
      .reduce((s,h) => s + Number(h.miktar||0), 0);

    // Sonradan gelen (başlangıç sayımı hariç)
    const sonraGelen = tumGelen
      .filter(h => !(h.aciklama||'').includes('Başlangıç'))
      .reduce((s,h) => s + Number(h.miktar||0), 0);

    const toplam_gelen = baslangic + sonraGelen;
    const cikan  = tumCikan.reduce((s,h) => s + Number(h.miktar||0), 0);
    const kalan  = toplam_gelen - cikan;
    const durum  = kalan <= 0 ? 'kritik' : kalan <= 10 ? 'az' : 'ok';
    return { ...m, baslangic, sonraGelen, toplam_gelen, cikan, kalan, durum };
  }).sort((a, b) => a.kalan - b.kalan);

  const toplamMalzeme = malzemeler.length;
  const kritikSayisi  = rows.filter(r => r.durum === 'kritik').length;
  const azSayisi      = rows.filter(r => r.durum === 'az').length;
  const yeterliSayisi = rows.filter(r => r.durum === 'ok').length;

  return `
    <!-- Özet kartları -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      <div class="table-card" style="padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:${renk}">${toplamMalzeme}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Toplam Çeşit</div>
      </div>
      <div class="table-card" style="padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#16a34a">${yeterliSayisi}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Yeterli</div>
      </div>
      <div class="table-card" style="padding:14px;text-align:center;border-color:#fde68a">
        <div style="font-size:24px;font-weight:900;color:#d97706">${azSayisi}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Az Stok</div>
      </div>
      <div class="table-card" style="padding:14px;text-align:center;border-color:#fca5a5">
        <div style="font-size:24px;font-weight:900;color:#dc2626">${kritikSayisi}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Tükendi</div>
      </div>
    </div>

    <!-- Stok tablosu -->
    <div class="table-card" style="padding:0;overflow:hidden">
      <div class="table-header" style="background:linear-gradient(135deg,${renk}18,${renk}08)">
        <span class="table-title">📦 Mevcut Stok Durumu</span>
        <span style="font-size:11px;color:var(--text-soft)">Başlangıç + Gelen − Çıkan = Kalan</span>
      </div>
      <div class="scroll-table">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:${renk};color:#fff">
              <th style="padding:10px 12px;text-align:left">Malzeme</th>
              <th style="padding:10px 8px;text-align:center">Tür</th>
              <th style="padding:10px 8px;text-align:center;white-space:nowrap">🏁 Başlangıç</th>
              <th style="padding:10px 8px;text-align:center;white-space:nowrap">📥 Sonradan Gelen</th>
              <th style="padding:10px 8px;text-align:center;white-space:nowrap">📤 Çıkan</th>
              <th style="padding:10px 10px;text-align:center;white-space:nowrap">📦 Kalan</th>
              <th style="padding:10px 8px;text-align:center">Durum</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i) => {
              const bg    = i%2===0 ? '' : 'rgba(0,0,0,0.02)';
              const renkK = r.durum==='kritik' ? '#dc2626' : r.durum==='az' ? '#d97706' : '#16a34a';
              const badge = r.durum==='kritik'
                ? '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800">🔴 Tükendi</span>'
                : r.durum==='az'
                ? '<span style="background:#fffbeb;color:#d97706;border:1px solid #fde68a;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800">🟡 Az</span>'
                : '<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800">🟢 Yeterli</span>';
              return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
                <td style="padding:9px 12px;font-weight:600">${r.ad}</td>
                <td style="padding:9px 8px;text-align:center;font-size:11px;color:var(--text-soft)">${r.tur}</td>
                <td style="padding:9px 8px;text-align:center;color:#6366f1;font-weight:700">${r.baslangic > 0 ? stokFmt(r.baslangic) : '<span style="color:#ccc">—</span>'}</td>
                <td style="padding:9px 8px;text-align:center;color:#059669;font-weight:700">${r.sonraGelen > 0 ? '+'+stokFmt(r.sonraGelen) : '<span style="color:#ccc">—</span>'}</td>
                <td style="padding:9px 8px;text-align:center;color:#dc2626;font-weight:700">${r.cikan > 0 ? '−'+stokFmt(r.cikan) : '<span style="color:#ccc">—</span>'}</td>
                <td style="padding:9px 10px;text-align:center;font-size:18px;font-weight:900;color:${renkK}">${stokFmt(r.kalan)}</td>
                <td style="padding:9px 8px;text-align:center">${badge}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── SEKME 2: TÜM HAREKETLER ──────────────────────────────
function stokHareketlerHTML(kategori) {
  const hareketler = [...(_stokData[kategori] || [])];
  const renk = kategori === 'temizlik' ? '#059669' : '#2563eb';

  if (!hareketler.length) {
    return `<div style="text-align:center;padding:60px;color:var(--text-soft)">Henüz hareket kaydı yok</div>`;
  }

  // Arama + filtre
  return `
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <input id="stok-h-ara" placeholder="🔍 Malzeme veya personel ara..." oninput="stokHareketlerFiltrele('${kategori}')"
        style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;flex:1;min-width:180px">
      <select id="stok-h-tip" onchange="stokHareketlerFiltrele('${kategori}')"
        style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
        <option value="">Tüm Hareketler</option>
        <option value="GELEN">📥 Gelen</option>
        <option value="CIKAN">📤 Çıkan / Zimmet</option>
      </select>
      <span id="stok-h-sayi" style="font-size:12px;color:var(--text-soft);font-weight:700">${hareketler.length} kayıt</span>
    </div>
    <div class="table-card" style="padding:0">
      <div class="scroll-table">
        <table style="width:100%;border-collapse:collapse;font-size:13px" id="stok-h-tablo">
          <thead>
            <tr style="background:${renk};color:#fff">
              <th style="padding:9px 10px;text-align:left">Tip</th>
              <th style="padding:9px 10px;text-align:left">Malzeme</th>
              <th style="padding:9px 8px;text-align:center">Tür</th>
              <th style="padding:9px 8px;text-align:center">Miktar</th>
              <th style="padding:9px 10px;text-align:left">Personel</th>
              <th style="padding:9px 10px;text-align:left">Tarih</th>
              <th style="padding:9px 10px;text-align:left">Açıklama</th>
              <th style="padding:9px 6px;text-align:center">Sil</th>
            </tr>
          </thead>
          <tbody id="stok-h-body">
            ${stokHareketlerSatirlar(hareketler)}
          </tbody>
        </table>
      </div>
    </div>`;
}

function stokHareketlerSatirlar(hareketler) {
  return hareketler.map(h => {
    const isGelen = h.tip === 'GELEN';
    const bg = isGelen ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.04)';
    const renk2 = isGelen ? '#16a34a' : '#dc2626';
    const tipBadge = isGelen
      ? '<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800">📥 GELEN</span>'
      : '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:800">📤 ÇIKAN</span>';
    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:8px 10px">${tipBadge}</td>
      <td style="padding:8px 10px;font-weight:600">${h.malzeme||'—'}</td>
      <td style="padding:8px 8px;text-align:center;font-size:11px;color:var(--text-soft)">${h.tur||'—'}</td>
      <td style="padding:8px 8px;text-align:center;font-weight:900;font-size:15px;color:${renk2}">${stokFmt(h.miktar)}</td>
      <td style="padding:8px 10px;font-size:12px">${h.personel||'—'}</td>
      <td style="padding:8px 10px;font-size:12px;white-space:nowrap">${stokTarihTR(h.tarih)}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--text-soft);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.aciklama||'—'}</td>
      <td style="padding:8px 6px;text-align:center">
        <button onclick="stokSil('${h._id}','${_stokAktifKategori}')"
          style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function stokHareketlerFiltrele(kategori) {
  const ara = (document.getElementById('stok-h-ara')?.value || '').toLowerCase();
  const tip = document.getElementById('stok-h-tip')?.value || '';
  let h = _stokData[kategori] || [];
  if (tip) h = h.filter(r => r.tip === tip);
  if (ara) h = h.filter(r =>
    (r.malzeme||'').toLowerCase().includes(ara) ||
    (r.personel||'').toLowerCase().includes(ara)
  );
  const body = document.getElementById('stok-h-body');
  if (body) body.innerHTML = stokHareketlerSatirlar(h);
  const sayi = document.getElementById('stok-h-sayi');
  if (sayi) sayi.textContent = h.length + ' kayıt';
}

// ── SEKME 3: GELEN KAYIT FORMU ───────────────────────────
function stokGelenFormHTML(kategori) {
  const renk = kategori === 'temizlik' ? '#059669' : '#2563eb';
  const malzemeler = STOK_MALZEMELER[kategori];
  const son3 = (_stokData[kategori] || []).filter(h => h.tip === 'GELEN').slice(0, 5);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
      <!-- Form -->
      <div class="table-card" style="padding:20px">
        <div class="table-header" style="padding:0 0 14px;border:none;background:none">
          <span class="table-title">📥 Gelen Malzeme Kaydı</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">MALZEME *</label>
            <select id="stok-g-malzeme" onchange="stokGelenMalzemeSecildi('${kategori}')"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
              <option value="">— Seçin —</option>
              ${malzemeler.map(m => `<option value="${m.ad}">${m.ad}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TÜR</label>
              <input id="stok-g-tur" readonly
                style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-soft)">
            </div>
            <div>
              <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">MİKTAR *</label>
              <input id="stok-g-miktar" type="number" min="1" placeholder="0"
                style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TESLİM ALAN / KAYDEDEN</label>
            <input id="stok-g-personel" readonly value="${stokDepoAdi()}"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-soft);color:var(--text-soft)">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TARİH *</label>
            <input id="stok-g-tarih" type="date" value="${stokTodayISO()}" max="${stokTodayISO()}"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">AÇIKLAMA</label>
            <input id="stok-g-aciklama" placeholder="Opsiyonel not..."
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <button onclick="stokGelenKaydet('${kategori}')"
            style="background:${renk};color:#fff;border:none;border-radius:8px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            💾 Gelen Kaydı Kaydet
          </button>
        </div>
      </div>

      <!-- Son kayıtlar -->
      <div class="table-card" style="padding:20px">
        <div class="table-header" style="padding:0 0 14px;border:none;background:none">
          <span class="table-title">🕐 Son Gelen Kayıtlar</span>
        </div>
        ${son3.length ? son3.map(h => `
          <div style="padding:10px;background:rgba(34,197,94,0.06);border:1px solid #bbf7d0;border-radius:8px;margin-bottom:8px">
            <div style="font-weight:700;font-size:13px">${h.malzeme}</div>
            <div style="font-size:11px;color:var(--text-soft);margin-top:2px">
              ${stokFmt(h.miktar)} ${h.tur} · ${h.personel||'—'} · ${stokTarihTR(h.tarih)}
            </div>
          </div>`).join('') : '<div style="color:var(--text-soft);font-size:12px">Henüz kayıt yok</div>'}
      </div>
    </div>`;
}

function stokGelenMalzemeSecildi(kategori) {
  const ad = document.getElementById('stok-g-malzeme')?.value;
  const tur = stokTurBul(kategori, ad);
  const turEl = document.getElementById('stok-g-tur');
  if (turEl) turEl.value = tur;
}

async function stokGelenKaydet(kategori) {
  if (!stokYetkiVar()) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  const malzeme = document.getElementById('stok-g-malzeme')?.value?.trim();
  const tur     = document.getElementById('stok-g-tur')?.value?.trim();
  const miktar  = parseInt(document.getElementById('stok-g-miktar')?.value);
  const personel= document.getElementById('stok-g-personel')?.value?.trim();
  const tarih   = document.getElementById('stok-g-tarih')?.value;
  const aciklama= document.getElementById('stok-g-aciklama')?.value?.trim();

  if (!malzeme) { showToast('⚠️ Malzeme seçin'); return; }
  if (!miktar || miktar <= 0) { showToast('⚠️ Geçerli miktar girin'); return; }
  if (!tarih) { showToast('⚠️ Tarih girin'); return; }

  const kayit = {
    tip: 'GELEN', kategori, malzeme, tur, miktar,
    personel: personel || '',
    tarih: firebase.firestore.Timestamp.fromDate(new Date(tarih)),
    aciklama: aciklama || '',
    olusturma: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const ref = await firebase.firestore().collection('stok_hareketler').add(kayit);
    kayit._id = ref.id;
    kayit.tarih = new Date(tarih);
    _stokData[kategori].unshift(kayit);
    showToast(`✅ ${malzeme} — ${miktar} ${tur} gelen kaydedildi`);
    stokRenderIc(kategori); // yenile
  } catch(e) {
    showToast('❌ Kayıt sırasında hata: ' + e.message);
  }
}

// ── SEKME 4: ZİMMET / ÇIKIŞ FORMU ───────────────────────
function stokZimmetFormHTML(kategori) {
  const renk = kategori === 'temizlik' ? '#059669' : '#2563eb';
  const kalan = stokHesaplaKalan(kategori);
  const malzemeler = STOK_MALZEMELER[kategori];
  const son3 = (_stokData[kategori] || []).filter(h => h.tip === 'CIKAN').slice(0, 5);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
      <!-- Form -->
      <div class="table-card" style="padding:20px">
        <div class="table-header" style="padding:0 0 14px;border:none;background:none">
          <span class="table-title">📤 Zimmet / Çıkış Kaydı</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">MALZEME *</label>
            <select id="stok-z-malzeme" onchange="stokZimmetMalzemeSecildi('${kategori}')"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
              <option value="">— Seçin —</option>
              ${malzemeler.map(m => {
                const k = kalan[m.ad] ?? 0;
                const uyari = k <= 0 ? ' ⚠️ (stok yok)' : k <= 5 ? ` (${k} kaldı)` : '';
                return `<option value="${m.ad}" ${k<=0?'style="color:#dc2626"':''}>${m.ad}${uyari}</option>`;
              }).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TÜR</label>
              <input id="stok-z-tur" readonly
                style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-soft)">
            </div>
            <div>
              <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">MİKTAR *</label>
              <input id="stok-z-miktar" type="number" min="1" placeholder="0"
                style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
            </div>
          </div>
          <div id="stok-z-kalan-bilgi" style="font-size:12px;color:var(--text-soft);background:var(--bg-soft);padding:8px 12px;border-radius:6px"></div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">ALAN PERSONEL *</label>
            <select id="stok-z-personel"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
              <option value="">— Personel seçin —</option>
              ${(window.PERSONEL_DATA || [])
                .filter(p => p.aktif !== false)
                .sort((a,b) => a.ad.localeCompare(b.ad, 'tr'))
                .map(p => `<option value="${p.ad}">${p.ad} (${p.hizmet})</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">ZIMMET YAPAN (Depo Sorumlusu)</label>
            <input id="stok-z-zimmetpersonel" readonly value="${stokDepoAdi()}"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-soft);color:var(--text-soft)">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TARİH *</label>
            <input id="stok-z-tarih" type="date" value="${stokTodayISO()}" max="${stokTodayISO()}"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">AÇIKLAMA</label>
            <input id="stok-z-aciklama" placeholder="Opsiyonel not..."
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <button onclick="stokZimmetKaydet('${kategori}')"
            style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:12px;font-size:13px;font-weight:800;cursor:pointer"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            📤 Zimmet / Çıkışı Kaydet
          </button>
        </div>
      </div>

      <!-- Son zimmetler -->
      <div class="table-card" style="padding:20px">
        <div class="table-header" style="padding:0 0 14px;border:none;background:none">
          <span class="table-title">🕐 Son Zimmet Kayıtları</span>
        </div>
        ${son3.length ? son3.map(h => `
          <div style="padding:10px;background:rgba(239,68,68,0.06);border:1px solid #fca5a5;border-radius:8px;margin-bottom:8px">
            <div style="font-weight:700;font-size:13px">${h.malzeme}</div>
            <div style="font-size:11px;color:var(--text-soft);margin-top:2px">
              ${stokFmt(h.miktar)} ${h.tur} · ${h.personel||'—'} · ${stokTarihTR(h.tarih)}
            </div>
            ${h.aciklama ? `<div style="font-size:10px;color:var(--text-soft);margin-top:2px">${h.aciklama}</div>` : ''}
          </div>`).join('') : '<div style="color:var(--text-soft);font-size:12px">Henüz kayıt yok</div>'}
      </div>
    </div>`;
}

function stokZimmetMalzemeSecildi(kategori) {
  const ad = document.getElementById('stok-z-malzeme')?.value;
  const tur = stokTurBul(kategori, ad);
  const turEl = document.getElementById('stok-z-tur');
  if (turEl) turEl.value = tur;
  const kalan = stokHesaplaKalan(kategori);
  const k = kalan[ad] ?? 0;
  const bilgiEl = document.getElementById('stok-z-kalan-bilgi');
  if (bilgiEl) {
    bilgiEl.innerHTML = ad
      ? `📦 Mevcut stok: <strong style="color:${k<=0?'#dc2626':k<=5?'#d97706':'#16a34a'}">${stokFmt(k)} ${tur}</strong>`
      : '';
  }
}

async function stokZimmetKaydet(kategori) {
  if (!stokYetkiVar()) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  const malzeme      = document.getElementById('stok-z-malzeme')?.value?.trim();
  const tur          = document.getElementById('stok-z-tur')?.value?.trim();
  const miktar       = parseInt(document.getElementById('stok-z-miktar')?.value);
  const personel     = document.getElementById('stok-z-personel')?.value?.trim();
  const zimmetPer    = document.getElementById('stok-z-zimmetpersonel')?.value?.trim();
  const tarih        = document.getElementById('stok-z-tarih')?.value;
  const aciklama     = document.getElementById('stok-z-aciklama')?.value?.trim();

  if (!malzeme) { showToast('⚠️ Malzeme seçin'); return; }
  if (!miktar || miktar <= 0) { showToast('⚠️ Geçerli miktar girin'); return; }
  if (!personel) { showToast('⚠️ Alan personel adı girin'); return; }
  if (!tarih) { showToast('⚠️ Tarih girin'); return; }

  // Stok kontrol
  const kalan = stokHesaplaKalan(kategori);
  if ((kalan[malzeme] ?? 0) < miktar) {
    if (!confirm(`⚠️ Mevcut stok: ${kalan[malzeme] ?? 0} — yine de kaydet?`)) return;
  }

  const kayit = {
    tip: 'CIKAN', kategori, malzeme, tur, miktar,
    personel: personel || '',
    zimmetPersonel: zimmetPer || '',
    tarih: firebase.firestore.Timestamp.fromDate(new Date(tarih)),
    aciklama: aciklama || '',
    olusturma: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const ref = await firebase.firestore().collection('stok_hareketler').add(kayit);
    kayit._id = ref.id;
    kayit.tarih = new Date(tarih);
    _stokData[kategori].unshift(kayit);
    showToast(`✅ ${malzeme} — ${miktar} ${tur} zimmet kaydedildi`);
    stokRenderIc(kategori);
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── SEKME: PERSONEL KARTLARI ────────────────────────────
function stokPersonelHTML(kategori) {
  const hareketler = (_stokData[kategori] || []).filter(h => h.tip === 'CIKAN');
  const renk = kategori === 'temizlik' ? '#059669' : '#2563eb';

  // Personel listesini zimmet kayıtlarından çıkar + window.PERSONEL_DATA'dan ekle
  const personelSet = new Set();
  hareketler.forEach(h => { if (h.personel) personelSet.add(h.personel); });
  (window.PERSONEL_DATA || []).filter(p => p.aktif !== false).forEach(p => personelSet.add(p.ad));
  const personeller = [...personelSet].sort((a,b) => a.localeCompare(b,'tr'));

  if (!personeller.length) {
    return `<div style="text-align:center;padding:60px;color:var(--text-soft)">Henüz personel kaydı yok</div>`;
  }

  const kartlar = personeller.map(p => {
    const kayitlar = hareketler.filter(h => h.personel === p);
    const toplamKayit = kayitlar.length;
    const initials = p.split(' ').map(w => w[0]).filter(Boolean).slice(0,2).join('');
    return `
      <div onclick="stokPersonelDetay('${p.replace(/'/g,"\\'")}','${kategori}')"
        style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 6px rgba(0,0,0,0.08);
               cursor:pointer;transition:all .2s;border:2px solid transparent;display:flex;align-items:center;gap:14px"
        onmouseover="this.style.borderColor='${renk}';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.borderColor='transparent';this.style.transform='translateY(0)'">
        <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,${renk},${renk}99);
                    color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;
                    font-size:16px;flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p}</div>
          <div style="font-size:12px;color:var(--text-soft);margin-top:3px">${toplamKayit} zimmet kaydı</div>
        </div>
        <div style="font-size:11px;color:${renk};font-weight:700">›</div>
      </div>`;
  }).join('');

  return `
    <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:13px;color:var(--text-soft)">${personeller.length} personel</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${kartlar}
    </div>

    <!-- Detay modal -->
    <div id="stok-personel-modal" onclick="if(event.target===this)this.style.display='none'"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;
             align-items:center;justify-content:center;padding:16px">
      <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;
                  max-height:85vh;display:flex;flex-direction:column;overflow:hidden;
                  box-shadow:0 20px 60px rgba(0,0,0,.25)">
        <div id="stok-personel-modal-head"
          style="padding:18px 20px;color:#fff;background:linear-gradient(135deg,${renk},${renk}99)">
          <div style="font-size:11px;opacity:.8;margin-bottom:4px">ZİMMET GEÇMİŞİ</div>
          <div id="stok-personel-modal-isim" style="font-size:18px;font-weight:900"></div>
          <div id="stok-personel-modal-ozet" style="font-size:12px;opacity:.85;margin-top:4px"></div>
        </div>
        <div id="stok-personel-modal-body" style="overflow-y:auto;flex:1;padding:16px"></div>
        <div style="padding:12px 16px;border-top:1px solid #f0f0f0">
          <button onclick="document.getElementById('stok-personel-modal').style.display='none'"
            style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;
                   background:#f8fafc;font-size:13px;font-weight:700;cursor:pointer;color:#475569">
            Kapat
          </button>
        </div>
      </div>
    </div>`;
}

function stokPersonelDetay(personel, kategori) {
  const hareketler = (_stokData[kategori] || [])
    .filter(h => h.tip === 'CIKAN' && h.personel === personel)
    .sort((a,b) => {
      const ta = a.tarih?.toDate ? a.tarih.toDate() : new Date(a.tarih||0);
      const tb = b.tarih?.toDate ? b.tarih.toDate() : new Date(b.tarih||0);
      return tb - ta;
    });

  const modal = document.getElementById('stok-personel-modal');
  if (!modal) return;

  document.getElementById('stok-personel-modal-isim').textContent = personel;
  document.getElementById('stok-personel-modal-ozet').textContent =
    `${hareketler.length} zimmet kaydı · toplam ${hareketler.reduce((s,h)=>s+Number(h.miktar||0),0)} adet/birim`;

  const body = document.getElementById('stok-personel-modal-body');
  if (!hareketler.length) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-soft)">Henüz zimmet kaydı yok</div>`;
  } else {
    body.innerHTML = hareketler.map(h => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f4f4f4">
        <div style="min-width:82px;font-size:11px;color:var(--text-soft)">${stokTarihTR(h.tarih)}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px;color:var(--text)">${h.malzeme}</div>
          ${h.aciklama ? `<div style="font-size:11px;color:var(--text-soft);margin-top:2px">${h.aciklama}</div>` : ''}
        </div>
        <div style="font-weight:900;font-size:15px;color:#dc2626;white-space:nowrap">
          ${stokFmt(h.miktar)} ${h.tur}
        </div>
      </div>`).join('');
  }

  modal.style.display = 'flex';
}

// ── SEKME: AYARLAR (sadece yetkili) ─────────────────────
function stokAyarlarHTML(kategori) {
  if (!stokAyarlarGorebilir()) {
    return `<div style="text-align:center;padding:60px;color:var(--text-soft)">
      <div style="font-size:48px;margin-bottom:12px">🔒</div>
      <p>Bu alanı sadece Ozan Ersin DOĞAN görebilir.</p>
    </div>`;
  }

  const renk = '#059669';
  const malzemeler = stokMalzemeListesi(kategori);

  // Tüm personel: PERSONEL_DATA + zimmet kayıtlarından
  const personelMap = {};
  (window.PERSONEL_DATA || []).forEach(p => {
    if (p.aktif !== false) personelMap[p.ad] = { ...p, fbId: p._fbId };
  });
  (_stokData[kategori]||[]).filter(h=>h.tip==='CIKAN'&&h.personel).forEach(h => {
    if (!personelMap[h.personel]) personelMap[h.personel] = { ad: h.personel };
  });
  const personeller = Object.values(personelMap).sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));

  // Depo sorumluları (USERS_MAP'ten)
  const USERS_MAP_LOCAL = {
    'SBIyovehB5RAkSkhc05bIm88PJs2': { ad: 'Ozan Ersin DOĞAN',  rol: 'Birim Sorumlusu' },
    'LBntADGnP2MHVecmn4jAnFRPW222': { ad: 'Ayşegül TULĞAN',    rol: 'Hemşire / Depo'  },
    'Fpk3BcokNFU4NM1XL0JQsMP9ygM2': { ad: 'Şafak SAYAR',       rol: 'Temizlik - Banyo' },
    'wksJ9Tf3djhgp4of4DxC29rEdiL2': { ad: 'Sezgin TAŞ',        rol: 'Kuaför'           },
  };
  const depoSorumluAdlar = [STOK_ADMIN_UID, STOK_DEPO_UID].map(uid => USERS_MAP_LOCAL[uid]?.ad || uid);

  return `
  <div style="display:flex;flex-direction:column;gap:20px">

    <!-- ── MALZEME YÖNETİMİ ── -->
    <div class="table-card" style="padding:20px">
      <div class="table-header" style="padding:0 0 16px;border:none;background:none">
        <span class="table-title">📦 Malzeme Listesi</span>
        <span style="font-size:12px;color:var(--text-soft);background:var(--bg-soft);padding:3px 10px;border-radius:10px;font-weight:700">${malzemeler.length} malzeme</span>
      </div>
      <!-- Ekle satırı -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <input id="stok-ay-malzeme-ad" placeholder="Malzeme adı..."
          style="flex:1;min-width:160px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        <input id="stok-ay-malzeme-tur" placeholder="Birim (Adet, Litre...)"
          style="width:140px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        <button onclick="stokAyarlarMalzemeEkle('${kategori}')"
          style="background:${renk};color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap">
          ➕ Ekle
        </button>
      </div>
      <!-- Liste -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;max-height:320px;overflow-y:auto">
        ${malzemeler.map((m,i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;
                      background:${i%2===0?'var(--bg-soft)':'#fff'};border-radius:8px;border:1px solid var(--border)">
            <span style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${m.ad}</span>
            <span style="font-size:11px;color:var(--text-soft);background:#e5e7eb;padding:2px 8px;border-radius:8px;white-space:nowrap">${m.tur}</span>
            <button onclick="stokAyarlarMalzemeSil('${kategori}','${m._id}','${m.ad.replace(/'/g,"\\'").replace(/"/g,'\\"')}')"
              style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;
                     padding:4px 8px;font-size:11px;cursor:pointer;flex-shrink:0;font-weight:700">🗑️</button>
          </div>`).join('')}
      </div>
    </div>

    <!-- ── PERSONEL YÖNETİMİ ── -->
    <div class="table-card" style="padding:20px">
      <div class="table-header" style="padding:0 0 16px;border:none;background:none">
        <span class="table-title">👥 Personel Yönetimi</span>
        <span style="font-size:12px;color:var(--text-soft);background:var(--bg-soft);padding:3px 10px;border-radius:10px;font-weight:700">${personeller.length} personel</span>
      </div>
      <!-- Ekle satırı -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <input id="stok-ay-personel-ad" placeholder="Ad Soyad (örn: Hava Aybuğa)"
          style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        <select id="stok-ay-personel-hizmet"
          style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
          <option value="TEMİZLİK">Temizlik</option>
          <option value="KADIN BANYO">Kadın Banyo</option>
          <option value="ERKEK BANYO">Erkek Banyo</option>
          <option value="KUAFÖR">Kuaför</option>
        </select>
        <button onclick="stokAyarlarPersonelEkle('${kategori}')"
          style="background:${renk};color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap">
          ➕ Ekle
        </button>
      </div>
      <!-- Liste -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;max-height:320px;overflow-y:auto">
        ${personeller.map(p => {
          const sayi = (_stokData[kategori]||[]).filter(h=>h.tip==='CIKAN'&&h.personel===p.ad).length;
          const initials = p.ad.split(' ').map(w=>w[0]).filter(Boolean).slice(0,2).join('');
          const hizmet = p.hizmet || '—';
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;
                      background:var(--bg-soft);border-radius:8px;border:1px solid var(--border)">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${renk},${renk}99);
                        color:#fff;display:flex;align-items:center;justify-content:center;
                        font-size:12px;font-weight:800;flex-shrink:0">${initials}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.ad}</div>
              <div style="font-size:10px;color:var(--text-soft);margin-top:1px">${hizmet} · ${sayi} zimmet</div>
            </div>
            ${p.fbId ? `<button onclick="stokAyarlarPersonelSil('${p.fbId}','${p.ad.replace(/'/g,"\\'").replace(/"/g,'\\"')}','${kategori}')"
              style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;
                     padding:4px 8px;font-size:11px;cursor:pointer;flex-shrink:0;font-weight:700">🗑️</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- ── DEPO SORUMLUSU ── -->
    <div class="table-card" style="padding:20px">
      <div class="table-header" style="padding:0 0 16px;border:none;background:none">
        <span class="table-title">🔑 Depo Sorumluları</span>
        <span style="font-size:11px;color:var(--text-soft)">Stok işlemi yapabilecek kullanıcılar</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[STOK_ADMIN_UID, STOK_DEPO_UID].map(uid => {
          const u = USERS_MAP_LOCAL[uid] || { ad: uid, rol: '—' };
          const isAdmin = uid === STOK_ADMIN_UID;
          return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                      background:var(--bg-soft);border-radius:10px;border:1.5px solid ${isAdmin?'#6366f1':'#059669'}22">
            <div style="width:38px;height:38px;border-radius:50%;background:${isAdmin?'#6366f1':'#059669'};
                        color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
              ${isAdmin ? '👑' : '🔑'}
            </div>
            <div style="flex:1">
              <div style="font-weight:800;font-size:14px;color:var(--text)">${u.ad}</div>
              <div style="font-size:11px;color:var(--text-soft);margin-top:2px">${u.rol}</div>
            </div>
            <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:10px;
                         background:${isAdmin?'#ede9fe':'#d1fae5'};color:${isAdmin?'#7c3aed':'#065f46'}">
              ${isAdmin ? 'Ana Yönetici' : 'Depo Sorumlusu'}
            </span>
          </div>`;
        }).join('')}
        <p style="font-size:11px;color:var(--text-soft);margin-top:4px">
          ⓘ Depo sorumlularını değiştirmek için Ozan Ersin ile iletişime geçin.
        </p>
      </div>
    </div>

    <!-- ── VERİ AKTARIMI ── -->
    <div class="table-card" style="padding:20px">
      <div class="table-header" style="padding:0 0 16px;border:none;background:none">
        <span class="table-title">🗄️ Veri Aktarımı</span>
      </div>
      <p style="font-size:13px;color:var(--text-soft);margin-bottom:14px;line-height:1.6">
        Excel dosyasındaki geçmiş tüm stok hareketlerini (başlangıç sayımları + zimmetler) Firestore'a aktarır.
        Veritabanı doluysa önce mevcut kayıtları siler, sonra yeniden yükler.
      </p>
      <button onclick="stokSeedYukle()"
        style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:10px 20px;
               font-size:13px;font-weight:800;cursor:pointer">
        ⬆️ Excel Verilerini Yeniden Aktar
      </button>
    </div>

  </div>`;
}

async function stokAyarlarMalzemeEkle(kategori) {
  if (!stokYetkiVar()) return;
  const adEl  = document.getElementById('stok-ay-malzeme-ad');
  const turEl = document.getElementById('stok-ay-malzeme-tur');
  const ad  = adEl?.value?.trim();
  const tur = turEl?.value?.trim() || 'Adet';
  if (!ad) { showToast('⚠️ Malzeme adı girin'); return; }
  if (stokMalzemeListesi(kategori).find(m => m.ad.toLowerCase() === ad.toLowerCase())) {
    showToast('⚠️ Bu malzeme zaten mevcut'); return;
  }
  try {
    const ref = await firebase.firestore().collection('stok_malzemeler').add({ ad, tur, kategori });
    _stokMalzemeler[kategori].push({ _id: ref.id, ad, tur, kategori });
    _stokMalzemeler[kategori].sort((a,b) => a.ad.localeCompare(b.ad,'tr'));
    if (adEl) adEl.value = '';
    if (turEl) turEl.value = '';
    showToast(`✅ "${ad}" eklendi`);
    stokRenderIc(kategori);
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

async function stokAyarlarMalzemeSil(kategori, fbId, ad) {
  if (!stokYetkiVar()) return;
  if (!confirm(`"${ad}" malzemesini listeden kalıcı olarak kaldırmak istiyor musunuz?`)) return;
  try {
    await firebase.firestore().collection('stok_malzemeler').doc(fbId).delete();
    _stokMalzemeler[kategori] = _stokMalzemeler[kategori].filter(m => m._id !== fbId);
    showToast(`🗑️ "${ad}" kaldırıldı`);
    stokRenderIc(kategori);
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

async function stokAyarlarPersonelEkle(kategori) {
  if (!stokYetkiVar()) return;
  const adEl      = document.getElementById('stok-ay-personel-ad');
  const hizmetEl  = document.getElementById('stok-ay-personel-hizmet');
  const ham = adEl?.value?.trim();
  if (!ham) { showToast('⚠️ Ad Soyad girin'); return; }
  const ad = ham.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const hizmet = hizmetEl?.value || 'TEMİZLİK';
  try {
    await firebase.firestore().collection('personeller').add({ ad, hizmet, aktif: true });
    if (adEl) adEl.value = '';
    showToast(`✅ "${ad}" eklendi`);
    await personelYukle();
    stokRenderIc(kategori);
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

async function stokAyarlarPersonelSil(fbId, ad, kategori) {
  if (!stokYetkiVar()) return;
  if (!confirm(`"${ad}" personelini silmek istiyor musunuz?\nBu işlem zimmet kayıtlarını etkilemez.`)) return;
  try {
    await firebase.firestore().collection('personeller').doc(fbId).delete();
    showToast(`🗑️ "${ad}" silindi`);
    await personelYukle();
    stokRenderIc(kategori);
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── SİL ──────────────────────────────────────────────────
async function stokSil(id, kategori) {
  if (!stokYetkiVar()) { showToast('⛔ Bu işlem için yetkiniz yok'); return; }
  if (!confirm('Bu hareketi silmek istediğinizden emin misiniz?')) return;
  try {
    await firebase.firestore().collection('stok_hareketler').doc(id).delete();
    _stokData[kategori] = _stokData[kategori].filter(h => h._id !== id);
    showToast('✅ Kayıt silindi');
    stokRenderIc(kategori);
  } catch(e) {
    showToast('❌ Silinemedi: ' + e.message);
  }
}

// ── EXCEL İNDİR ──────────────────────────────────────────
async function stokExcelIndir(kategori) {
  const hareketler = [...(_stokData[kategori] || [])].sort((a,b) => {
    const ta = a.tarih?.toDate ? a.tarih.toDate() : new Date(a.tarih);
    const tb = b.tarih?.toDate ? b.tarih.toDate() : new Date(b.tarih);
    return tb - ta;
  });
  const kalan   = stokHesaplaKalan(kategori);
  const malzemeler = STOK_MALZEMELER[kategori];
  const baslik  = kategori === 'temizlik' ? 'TEMİZLİK MALZEMESİ STOK RAPORU' : 'MEDİKAL MALZEME STOK RAPORU';
  const renk    = kategori === 'temizlik' ? 'FF059669' : 'FF2563EB';
  const bugun   = new Date().toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric'});

  const te = new TextEncoder();
  const e  = s => te.encode(s);
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Shared strings
  const ss = []; const ssIdx = {};
  const S = v => {
    const k = String(v==null?'':v);
    if (!k) return null;
    if (ssIdx[k] === undefined) { ssIdx[k] = ss.length; ss.push(k); }
    return ssIdx[k];
  };

  // ── Style IDs ────────────────────────────────────────
  // 0: Başlık (beyaz bold, koyu arka plan)
  // 1: Alt başlık (beyaz, biraz daha açık)
  // 2: Tablo başlığı (beyaz bold, renk arka plan)
  // 3: Normal satır (koyu metin, beyaz)
  // 4: Zebra satır (açık gri arka plan)
  // 5: Sayı normal
  // 6: Sayı zebra
  // 7: GELEN badge (yeşil bold)
  // 8: ÇIKAN badge (kırmızı bold)
  // 9: Toplam satır (bold, sarı arka plan)
  // 10: Toplam sayı

  const fontsXml = [
    '<font><sz val="14"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',       // 0 başlık
    '<font><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',            // 1 alt başlık
    '<font><sz val="10"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',        // 2 tablo header
    '<font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/></font>',            // 3 normal
    '<font><sz val="10"/><b/><color rgb="FF059669"/><name val="Calibri"/></font>',        // 4 GELEN yeşil
    '<font><sz val="10"/><b/><color rgb="FFDC2626"/><name val="Calibri"/></font>',        // 5 ÇIKAN kırmızı
    '<font><sz val="10"/><b/><color rgb="FF1F2937"/><name val="Calibri"/></font>',        // 6 toplam bold
    '<font><sz val="10"/><b/><color rgb="FF1A3A6B"/><name val="Calibri"/></font>',        // 7 kalan mavi
  ].join('');

  const fillsXml = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    `<fill><patternFill patternType="solid"><fgColor rgb="${renk}"/></patternFill></fill>`,    // 2 ana renk
    `<fill><patternFill patternType="solid"><fgColor rgb="${renk}AA"/></patternFill></fill>`,  // 3 tablo header (biraz açık)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>',   // 4 beyaz
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFB"/></patternFill></fill>',   // 5 zebra açık
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF9C4"/></patternFill></fill>',   // 6 sarı toplam
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/></patternFill></fill>',   // 7 yeşil arka
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2F2"/></patternFill></fill>',   // 8 kırmızı arka
  ].join('');

  const bordersXml = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FFE5E7EB"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>',
  ].join('');

  // xf: [fontId, fillId, borderId, ha, va, bold]
  const xfs = [
    [0, 2, 0, 'center', 'center'],  // 0: başlık
    [1, 2, 0, 'center', 'center'],  // 1: alt başlık
    [2, 3, 1, 'center', 'center'],  // 2: tablo header
    [3, 4, 1, 'left',   'center'],  // 3: normal sol
    [3, 5, 1, 'left',   'center'],  // 4: zebra sol
    [3, 4, 1, 'center', 'center'],  // 5: normal merkez
    [3, 5, 1, 'center', 'center'],  // 6: zebra merkez
    [4, 7, 1, 'center', 'center'],  // 7: GELEN
    [5, 8, 1, 'center', 'center'],  // 8: ÇIKAN
    [6, 6, 1, 'left',   'center'],  // 9: toplam sol
    [6, 6, 1, 'center', 'center'],  // 10: toplam sayı
    [7, 4, 1, 'center', 'center'],  // 11: kalan mavi
    [7, 5, 1, 'center', 'center'],  // 12: kalan mavi zebra
  ];
  const cellXfs = xfs.map(([fi,fli,bi,ha,va]) =>
    `<xf numFmtId="0" fontId="${fi}" fillId="${fli}" borderId="${bi}" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${ha}" vertical="${va}" wrapText="0"/></xf>`
  ).join('');

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="8">${fontsXml}</fonts>
<fills count="9">${fillsXml}</fills>
<borders count="2">${bordersXml}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">${cellXfs}</cellXfs>
</styleSheet>`;

  // ── Sayfa 1: STOK ÖZETİ ──────────────────────────────
  const COLS1 = ['A','B','C','D','E'];
  const rows1 = [];

  // Başlık bloğu
  rows1.push([{v:S('T.C. KUŞADASI BELEDİYESİ — EVDE BAKIM BİRİMİ'),s:0,span:'A1:E1'}]);
  rows1.push([{v:S(baslik),s:1,span:'A2:E2'}]);
  rows1.push([{v:S('Rapor Tarihi: '+bugun),s:1,span:'A3:E3'}]);
  rows1.push([{v:null,s:0,span:'A4:E4'}]); // boş ayırıcı satır

  // Tablo başlığı
  rows1.push([
    {v:S('MALZEME ADI'),    s:2},
    {v:S('TÜR'),           s:2},
    {v:S('TOPLAM GİREN'),  s:2},
    {v:S('TOPLAM ÇIKAN'),  s:2},
    {v:S('KALAN STOK'),    s:2},
  ]);

  // Veri satırları
  let toplamGiren = 0, toplamCikan = 0;
  malzemeler.forEach((m, i) => {
    const giren = hareketler.filter(h=>h.malzeme===m.ad&&h.tip==='GELEN').reduce((s,h)=>s+Number(h.miktar||0),0);
    const cikan = hareketler.filter(h=>h.malzeme===m.ad&&h.tip==='CIKAN').reduce((s,h)=>s+Number(h.miktar||0),0);
    const k = giren - cikan;
    toplamGiren += giren; toplamCikan += cikan;
    const z = i % 2 === 0;
    const kalanS = k <= 0 ? (z?4:5) : (z?11:12); // kırmızı ise normal, pozitifse mavi
    const kalanFont = k <= 0 ? (z?3:4) : (z?11:12);
    rows1.push([
      {v:S(m.ad),  s:z?3:4},
      {v:S(m.tur), s:z?5:6},
      {v:giren,    s:z?5:6, n:true},
      {v:cikan,    s:z?5:6, n:true},
      {v:k,        s:kalanS, n:true},
    ]);
  });

  // Toplam satırı
  rows1.push([
    {v:S('TOPLAM'), s:9},
    {v:S(''),       s:10},
    {v:toplamGiren, s:10, n:true},
    {v:toplamCikan, s:10, n:true},
    {v:toplamGiren-toplamCikan, s:10, n:true},
  ]);

  // XML oluştur
  const merges1 = ['A1:E1','A2:E2','A3:E3','A4:E4'];
  let rowsXml1 = '';
  rows1.forEach((row, ri) => {
    let cx = '';
    row.forEach((cell, ci) => {
      const ref = COLS1[ci] + (ri+1);
      if (cell.v === null || cell.v === undefined) { cx += `<c r="${ref}" s="${cell.s}"/>`; return; }
      if (cell.n) cx += `<c r="${ref}" s="${cell.s}" t="n"><v>${cell.v}</v></c>`;
      else        cx += `<c r="${ref}" s="${cell.s}" t="s"><v>${cell.v}</v></c>`;
    });
    rowsXml1 += `<row r="${ri+1}" ht="20" customHeight="1">${cx}</row>`;
  });
  const mergeXml1 = merges1.map(m=>`<mergeCell ref="${m}"/>`).join('');
  const s1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetFormatPr defaultRowHeight="20"/>
<cols>
  <col min="1" max="1" width="32" customWidth="1"/>
  <col min="2" max="2" width="12" customWidth="1"/>
  <col min="3" max="4" width="14" customWidth="1"/>
  <col min="5" max="5" width="14" customWidth="1"/>
</cols>
<sheetData>${rowsXml1}</sheetData>
<mergeCells count="${merges1.length}">${mergeXml1}</mergeCells>
</worksheet>`;

  // ── Sayfa 2: HAREKETLER ──────────────────────────────
  const COLS2 = ['A','B','C','D','E','F','G','H'];
  const rows2 = [];

  rows2.push([{v:S('T.C. KUŞADASI BELEDİYESİ — EVDE BAKIM BİRİMİ'),s:0,span:'A1:H1'}]);
  rows2.push([{v:S('STOK HAREKETLERİ — '+baslik),s:1,span:'A2:H2'}]);
  rows2.push([{v:S('Rapor Tarihi: '+bugun+'   |   Toplam: '+hareketler.length+' Hareket'),s:1,span:'A3:H3'}]);
  rows2.push([{v:null,s:0,span:'A4:H4'}]);

  rows2.push([
    {v:S('TARİH'),    s:2},
    {v:S('TİP'),      s:2},
    {v:S('MALZEME'),  s:2},
    {v:S('TÜR'),      s:2},
    {v:S('MİKTAR'),   s:2},
    {v:S('ALAN PERSONEL'), s:2},
    {v:S('ZİMMET YAPAN'),  s:2},
    {v:S('AÇIKLAMA'),      s:2},
  ]);

  hareketler.forEach((h, i) => {
    const z = i % 2 === 0;
    const tipS = h.tip === 'GELEN' ? 7 : 8;
    rows2.push([
      {v:S(stokTarihTR(h.tarih)), s:z?5:6},
      {v:S(h.tip||''),            s:tipS},
      {v:S(h.malzeme||''),        s:z?3:4},
      {v:S(h.tur||''),            s:z?5:6},
      {v:Number(h.miktar||0),     s:z?5:6, n:true},
      {v:S(h.personel||'—'),      s:z?3:4},
      {v:S(h.zimmetPersonel||'—'),s:z?3:4},
      {v:S(h.aciklama||''),       s:z?3:4},
    ]);
  });

  const merges2 = ['A1:H1','A2:H2','A3:H3','A4:H4'];
  let rowsXml2 = '';
  rows2.forEach((row, ri) => {
    let cx = '';
    row.forEach((cell, ci) => {
      const ref = COLS2[ci] + (ri+1);
      if (cell.v === null || cell.v === undefined) { cx += `<c r="${ref}" s="${cell.s}"/>`; return; }
      if (cell.n) cx += `<c r="${ref}" s="${cell.s}" t="n"><v>${cell.v}</v></c>`;
      else        cx += `<c r="${ref}" s="${cell.s}" t="s"><v>${cell.v}</v></c>`;
    });
    rowsXml2 += `<row r="${ri+1}" ht="20" customHeight="1">${cx}</row>`;
  });
  const mergeXml2 = merges2.map(m=>`<mergeCell ref="${m}"/>`).join('');
  const s2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetFormatPr defaultRowHeight="20"/>
<cols>
  <col min="1" max="1" width="13" customWidth="1"/>
  <col min="2" max="2" width="10" customWidth="1"/>
  <col min="3" max="3" width="30" customWidth="1"/>
  <col min="4" max="4" width="10" customWidth="1"/>
  <col min="5" max="5" width="10" customWidth="1"/>
  <col min="6" max="6" width="22" customWidth="1"/>
  <col min="7" max="7" width="20" customWidth="1"/>
  <col min="8" max="8" width="20" customWidth="1"/>
</cols>
<sheetData>${rowsXml2}</sheetData>
<mergeCells count="${merges2.length}">${mergeXml2}</mergeCells>
</worksheet>`;

  // ── Zip & İndir ───────────────────────────────────────
  const sharedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`;
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Stok Özeti" sheetId="1" r:id="rId1"/><sheet name="Hareketler" sheetId="2" r:id="rId2"/></sheets></workbook>`;
  const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
  const APPRELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const CT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

  const zip = await buildZip([
    ['[Content_Types].xml',        e(CT),         true],
    ['_rels/.rels',                e(APPRELS),    true],
    ['xl/workbook.xml',            e(wbXml),      false],
    ['xl/_rels/workbook.xml.rels', e(RELS),       true],
    ['xl/worksheets/sheet1.xml',   e(s1Xml),      false],
    ['xl/worksheets/sheet2.xml',   e(s2Xml),      false],
    ['xl/styles.xml',              e(stylesXml),  false],
    ['xl/sharedStrings.xml',       e(sharedXml),  false],
  ]);

  const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `stok_${kategori}_${stokTodayISO()}.xlsx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast(`✅ ${kategori === 'temizlik' ? 'Temizlik' : 'Medikal'} stok raporu indirildi`);
}

// ── EXCEL'DEN AKTARILAN GEÇMİŞ VERİLER (SEED) ───────────
// Firestore boş olduğunda ilk açılışta bu veriler yüklenir.
// Çalıştırmak için: stokSeedYukle() — ayarlar sayfasından veya konsoldan
const STOK_SEED_HAREKETLER = [
  // ── BAŞLANGIÇ SAYIMLARI (17.11.2025) ────────────────────
  {tip:'GELEN',malzeme:'Büyük Çekpas',tur:'Adet',miktar:22,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Büyük Kova',tur:'Adet',miktar:14,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Cam Silme Bezi',tur:'Paket',miktar:33,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Camsil',tur:'Litre',miktar:380,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Cif',tur:'Litre',miktar:86,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Çamaşır Deterjanı',tur:'Paket',miktar:10,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Çamaşır Suyu',tur:'Litre',miktar:220,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Çöp Poşeti ( Battal )',tur:'Adet',miktar:90,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Çöp Poşeti ( Jumbo )',tur:'Adet',miktar:55,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'FIRÇA',tur:'Adet',miktar:17,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Genel Temizleyici',tur:'Litre',miktar:100,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Kireç Çözücü',tur:'Litre',miktar:380,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Küçük Çekpas',tur:'Adet',miktar:28,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:100,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'M Beden Latex Pudrasız Eldiven',tur:'Kutu',miktar:62,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Mutfak Silme Bezi',tur:'Paket',miktar:5,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:334,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Sıvı Sabun',tur:'Bidon',miktar:50,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:288,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Tuvalet Kağıdı',tur:'Adet',miktar:48,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Vileda ( Metal )',tur:'Adet',miktar:69,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Vileda ( Tahta )',tur:'Adet',miktar:58,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Vileda Havlu Paspas',tur:'Adet',miktar:171,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Vileda Kovası',tur:'Adet',miktar:23,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Yağçöz',tur:'Litre',miktar:420,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Yüzey Temizleyici',tur:'Litre',miktar:280,personel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Bulaşık Deterjanı',tur:'Litre',miktar:5,personel:'Ayşegül Tulğan',tarih:'2025-11-19',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Çamaşır Suyu',tur:'Litre',miktar:30,personel:'Ayşegül Tulğan',tarih:'2025-11-19',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Silme Bezi',tur:'Paket',miktar:260,personel:'Ayşegül Tulğan',tarih:'2025-11-19',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Tuvalet Kağıdı',tur:'Adet',miktar:12,personel:'Ayşegül Tulğan',tarih:'2025-11-19',aciklama:'Başlangıç sayımı'},
  {tip:'GELEN',malzeme:'Maske',tur:'Kutu',miktar:250,personel:'Ayşegül Tulğan',tarih:'2025-11-11',aciklama:'Başlangıç sayımı'},
  // ── ARALIK 2025 GELENLEr ────────────────────────────────
  {tip:'GELEN',malzeme:'Bulaşık Süngeri',tur:'Adet',miktar:4,personel:'Ayşegül Tulğan',tarih:'2025-12-25',aciklama:'Gelen malzeme'},
  {tip:'GELEN',malzeme:'Bulaşık Deterjanı',tur:'Litre',miktar:10,personel:'Ayşegül Tulğan',tarih:'2025-12-25',aciklama:'Gelen malzeme'},
  {tip:'GELEN',malzeme:'Çamaşır Suyu',tur:'Litre',miktar:20,personel:'Ayşegül Tulğan',tarih:'2025-12-25',aciklama:'Gelen malzeme'},
  {tip:'GELEN',malzeme:'Çöp Poşeti ( Battal )',tur:'Adet',miktar:10,personel:'Ayşegül Tulğan',tarih:'2025-12-25',aciklama:'Gelen malzeme'},
  {tip:'GELEN',malzeme:'Tuvalet Kağıdı',tur:'Adet',miktar:12,personel:'Ayşegül Tulğan',tarih:'2025-12-25',aciklama:'Gelen malzeme'},
  {tip:'GELEN',malzeme:'Tuvalet Kağıdı',tur:'Adet',miktar:12,personel:'Ayşegül Tulğan',tarih:'2025-11-26',aciklama:'Gelen malzeme'},
  {tip:'GELEN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Ayşegül Tulğan',tarih:'2025-12-25',aciklama:'Gelen kayıt'},
  // ── ZİMMETLER / ÇIKIŞLAR ────────────────────────────────
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:16,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-03-05',aciklama:''},
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:8,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-29',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-29',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-29',aciklama:''},
  {tip:'CIKAN',malzeme:'Tuvalet Kağıdı',tur:'Adet',miktar:2,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-28',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:10,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Büyük Çekpas',tur:'Adet',miktar:3,personel:'Nihal Erkivaç',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Nihal Erkivaç',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Kovası',tur:'Adet',miktar:2,personel:'Nihal Erkivaç',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda ( Tahta )',tur:'Adet',miktar:1,personel:'Nihal Erkivaç',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'FIRÇA',tur:'Adet',miktar:2,personel:'Nihal Erkivaç',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Kovası',tur:'Adet',miktar:1,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'Çöp Poşeti ( Jumbo )',tur:'Adet',miktar:3,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Havlu Paspas',tur:'Adet',miktar:8,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-25',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Münire Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-13',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-13',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-13',aciklama:''},
  {tip:'CIKAN',malzeme:'Çamaşır Suyu',tur:'Litre',miktar:30,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-12',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:5,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-09',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-09',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-09',aciklama:''},
  {tip:'CIKAN',malzeme:'Cam Silme Bezi',tur:'Paket',miktar:3,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-07',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Sibel Can',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-07',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-07',aciklama:''},
  {tip:'CIKAN',malzeme:'Çamaşır Suyu',tur:'Litre',miktar:30,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-07',aciklama:''},
  {tip:'CIKAN',malzeme:'Yağçöz',tur:'Litre',miktar:30,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-07',aciklama:''},
  {tip:'CIKAN',malzeme:'Camsil',tur:'Litre',miktar:30,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-07',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Sezgin Gür',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-06',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:2,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-06',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2026-01-06',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:2,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-31',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-31',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'Cif',tur:'Litre',miktar:3,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Ferda Evran',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudrasız Eldiven',tur:'Kutu',miktar:2,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:4,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudrasız Eldiven',tur:'Kutu',miktar:1,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:8,personel:'Sezgin Gür',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:8,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-30',aciklama:''},
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:8,personel:'Talat Duman',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-22',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:2,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-22',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:2,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-22',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-22',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Sezgin Gür',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-22',aciklama:''},
  {tip:'CIKAN',malzeme:'Yüzey Temizleyici',tur:'Litre',miktar:20,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-22',aciklama:''},
  {tip:'CIKAN',malzeme:'Cam Silme Bezi',tur:'Paket',miktar:1,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-17',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-17',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:20,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-17',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Ferda Evran',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-16',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudrasız Eldiven',tur:'Kutu',miktar:1,personel:'Ferda Evran',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-16',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Münire Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-16',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:2,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-16',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:4,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-16',aciklama:''},
  {tip:'CIKAN',malzeme:'Yağçöz',tur:'Litre',miktar:20,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-16',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-15',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-15',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-15',aciklama:''},
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:8,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-15',aciklama:''},
  {tip:'CIKAN',malzeme:'Tıraş Bıçağı',tur:'Adet',miktar:16,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-15',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-11',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Perihan Gökçenoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-11',aciklama:''},
  {tip:'CIKAN',malzeme:'Tuvalet Kağıdı',tur:'Adet',miktar:1,personel:'Talat Duman',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-10',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Ferda Evran',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-05',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-05',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:4,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-05',aciklama:''},
  {tip:'CIKAN',malzeme:'Çöp Poşeti ( Jumbo )',tur:'Adet',miktar:1,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-04',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-04',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:4,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-04',aciklama:''},
  {tip:'CIKAN',malzeme:'Çöp Poşeti ( Jumbo )',tur:'Adet',miktar:2,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-03',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:3,personel:'Sibel Can',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-03',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-03',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Sezgin Gür',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-01',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:3,personel:'Sibel Can',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-01',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-12-01',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:1,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-28',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:2,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-28',aciklama:''},
  {tip:'CIKAN',malzeme:'Cam Silme Bezi',tur:'Paket',miktar:3,personel:'Şafak Sayar',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Mutfak Silme Bezi',tur:'Paket',miktar:1,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Mutfak Silme Bezi',tur:'Paket',miktar:4,personel:'Şafak Sayar',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Şafak Sayar',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Havlu Paspas',tur:'Adet',miktar:20,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Havlu Paspas',tur:'Adet',miktar:2,personel:'Şafak Sayar',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Kovası',tur:'Adet',miktar:1,personel:'Şafak Sayar',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-27',aciklama:''},
  {tip:'CIKAN',malzeme:'Cam Silme Bezi',tur:'Paket',miktar:3,personel:'Ferda Evran',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-26',aciklama:''},
  {tip:'CIKAN',malzeme:'Çamaşır Suyu',tur:'Litre',miktar:10,personel:'Ozan Ersin Doğan',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-26',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Ecevit Çakır',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-24',aciklama:''},
  {tip:'CIKAN',malzeme:'Maske',tur:'Kutu',miktar:2,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-24',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Seher Işık',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-24',aciklama:''},
  {tip:'CIKAN',malzeme:'Silme Bezi',tur:'Paket',miktar:4,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-24',aciklama:''},
  {tip:'CIKAN',malzeme:'Yüzey Temizleyici',tur:'Litre',miktar:20,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudrasız Eldiven',tur:'Kutu',miktar:1,personel:'Perihan Gökçenoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Yasemin Kapusuz',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Perihan Gökçenoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Emine Abdülkerimoğlu',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Sezgin Gür',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda Havlu Paspas',tur:'Adet',miktar:10,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-21',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Münire Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-20',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Talat Duman',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-19',aciklama:''},
  {tip:'CIKAN',malzeme:'M Beden Latex Pudrasız Eldiven',tur:'Kutu',miktar:1,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Gülin Çetindağ',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:''},
  {tip:'CIKAN',malzeme:'Vileda ( Tahta )',tur:'Adet',miktar:5,personel:'Hava Aybuğa',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-17',aciklama:''},
  {tip:'CIKAN',malzeme:'S Beden Latex Pudralı Eldiven',tur:'Kutu',miktar:1,personel:'Perihan Taş',zimmetPersonel:'Ayşegül Tulğan',tarih:'2025-11-18',aciklama:''},
];

// Seed yükleyici — konsoldan veya Ayarlar'dan çalıştırılır
async function stokSeedYukle() {
  const db = firebase.firestore();

  // Mevcut kayıtları sil
  const mevcutSnap = await db.collection('stok_hareketler').get();
  if (!mevcutSnap.empty) {
    const devamEt = confirm(`⚠️ Veritabanında ${mevcutSnap.size} kayıt var.\nHepsini silip Excel verilerini yüklemek ister misiniz?`);
    if (!devamEt) return;
    // 20'şerli batch ile sil
    const silDocs = mevcutSnap.docs;
    for (let i = 0; i < silDocs.length; i += 20) {
      const b = db.batch();
      silDocs.slice(i, i + 20).forEach(d => b.delete(d.ref));
      await b.commit();
    }
    showToast('🗑️ Eski kayıtlar silindi');
  }

  // 20'şerli batch ile yükle
  showToast('⏳ Yükleniyor...');
  const liste = STOK_SEED_HAREKETLER;
  let yuklenen = 0;
  for (let i = 0; i < liste.length; i += 20) {
    const b = db.batch();
    liste.slice(i, i + 20).forEach(h => {
      const ref = db.collection('stok_hareketler').doc();
      b.set(ref, {
        tip: h.tip,
        kategori: 'temizlik',
        malzeme: h.malzeme,
        tur: h.tur,
        miktar: Number(h.miktar),
        personel: h.personel || '',
        zimmetPersonel: h.zimmetPersonel || '',
        tarih: firebase.firestore.Timestamp.fromDate(new Date(h.tarih + 'T00:00:00')),
        aciklama: h.aciklama || '',
      });
    });
    await b.commit();
    yuklenen += Math.min(20, liste.length - i);
    showToast(`⏳ ${yuklenen}/${liste.length} kayıt yüklendi...`);
  }

  showToast(`✅ ${yuklenen} kayıt başarıyla Firestore'a yüklendi!`);
  await stokRender('temizlik');
}
window.stokSeedYukle = stokSeedYukle;

// Global olarak aç
window.stokRender              = stokRender;
window.stokSekme               = stokSekme;
window.stokHareketlerFiltrele  = stokHareketlerFiltrele;
window.stokGelenMalzemeSecildi = stokGelenMalzemeSecildi;
window.stokGelenKaydet         = stokGelenKaydet;
window.stokZimmetMalzemeSecildi= stokZimmetMalzemeSecildi;
window.stokZimmetKaydet        = stokZimmetKaydet;
window.stokSil                 = stokSil;
window.stokExcelIndir          = stokExcelIndir;
window.stokPersonelDetay       = stokPersonelDetay;
window.stokAyarlarMalzemeEkle  = stokAyarlarMalzemeEkle;
window.stokAyarlarMalzemeSil   = stokAyarlarMalzemeSil;
window.stokAyarlarPersonelEkle = stokAyarlarPersonelEkle;
window.stokAyarlarPersonelSil  = stokAyarlarPersonelSil;
