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

// Firestore'dan yüklenen hareketler (her kategori için ayrı)
const _stokData = { temizlik: [], medikal: [] };
let _stokAktifKategori = 'temizlik';
let _stokAktifSekme = 'ozet'; // 'ozet' | 'hareketler' | 'gelen' | 'zimmet'

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
  return (STOK_MALZEMELER[kategori] || []).find(m => m.ad === malzemeAd)?.tur || 'Adet';
}

// Kalan stok hesapla (MALZEME KALAN mantığı: başlangıç + gelen - çıkan)
function stokHesaplaKalan(kategori) {
  const hareketler = _stokData[kategori] || [];
  const kalan = {};
  STOK_MALZEMELER[kategori].forEach(m => { kalan[m.ad] = 0; });

  hareketler.forEach(h => {
    if (!kalan.hasOwnProperty(h.malzeme)) kalan[h.malzeme] = 0;
    if (h.tip === 'GELEN')  kalan[h.malzeme] += Number(h.miktar) || 0;
    if (h.tip === 'CIKAN')  kalan[h.malzeme] -= Number(h.miktar) || 0;
  });
  return kalan;
}

// ── Firestore yükle ───────────────────────────────────────
async function stokFirestoreYukle(kategori) {
  try {
    const snap = await firebase.firestore()
      .collection('stok_hareketler')
      .where('kategori', '==', kategori)
      .orderBy('tarih', 'desc')
      .get();
    _stokData[kategori] = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
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
  await stokFirestoreYukle(kategori);
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
    { id: 'gelen',      ikon: '📥', ad: 'Gelen Kayıt'   },
    { id: 'zimmet',     ikon: '📤', ad: 'Zimmet / Çıkış'},
  ];

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
  _stokAktifSekme = sekme;
  stokRenderIc(kategori);
}

function stokSekmeIcerik(kategori, sekme) {
  const el = document.getElementById('stok-sekme-icerik');
  if (!el) return;
  if (sekme === 'ozet')       el.innerHTML = stokOzetHTML(kategori);
  if (sekme === 'hareketler') el.innerHTML = stokHareketlerHTML(kategori);
  if (sekme === 'gelen')      el.innerHTML = stokGelenFormHTML(kategori);
  if (sekme === 'zimmet')     el.innerHTML = stokZimmetFormHTML(kategori);
}

// ── SEKME 1: STOK ÖZETİ ──────────────────────────────────
function stokOzetHTML(kategori) {
  const kalan = stokHesaplaKalan(kategori);
  const renk  = kategori === 'temizlik' ? '#059669' : '#2563eb';
  const malzemeler = STOK_MALZEMELER[kategori];

  // Kritik eşik (0 veya az): kırmızı
  const rows = malzemeler.map(m => {
    const adet = kalan[m.ad] ?? 0;
    const durum = adet <= 0 ? 'kritik' : adet <= 5 ? 'az' : 'ok';
    return { ...m, adet, durum };
  }).sort((a, b) => a.adet - b.adet); // azdan çoğa

  const toplamMalzeme = malzemeler.length;
  const kritikSayisi  = rows.filter(r => r.durum === 'kritik').length;
  const azSayisi      = rows.filter(r => r.durum === 'az').length;

  return `
    <!-- Özet kartları -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
      <div class="table-card" style="padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:${renk}">${toplamMalzeme}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Toplam Malzeme</div>
      </div>
      <div class="table-card" style="padding:16px;text-align:center;border-color:#fca5a5">
        <div style="font-size:28px;font-weight:900;color:#dc2626">${kritikSayisi}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Stok Tükendi</div>
      </div>
      <div class="table-card" style="padding:16px;text-align:center;border-color:#fde68a">
        <div style="font-size:28px;font-weight:900;color:#d97706">${azSayisi}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Az Stok (≤5)</div>
      </div>
    </div>

    <!-- Stok tablosu -->
    <div class="table-card" style="padding:0;overflow:hidden">
      <div class="table-header" style="background:linear-gradient(135deg,${renk}18,${renk}08)">
        <span class="table-title">📦 Mevcut Stok Durumu</span>
        <span style="font-size:11px;color:var(--text-soft)">Kalan = Gelen − Çıkan</span>
      </div>
      <div class="scroll-table">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:${renk};color:#fff">
              <th style="padding:10px 12px;text-align:left">Malzeme</th>
              <th style="padding:10px 8px;text-align:center">Tür</th>
              <th style="padding:10px 12px;text-align:center">Kalan</th>
              <th style="padding:10px 8px;text-align:center">Durum</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const bg = r.durum==='kritik' ? 'rgba(239,68,68,0.06)' : r.durum==='az' ? 'rgba(251,191,36,0.08)' : '';
              const renk2 = r.durum==='kritik' ? '#dc2626' : r.durum==='az' ? '#d97706' : '#16a34a';
              const badge = r.durum==='kritik' ? '🔴 Tükendi' : r.durum==='az' ? '🟡 Az' : '🟢 Yeterli';
              return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
                <td style="padding:9px 12px;font-weight:600">${r.ad}</td>
                <td style="padding:9px 8px;text-align:center;font-size:11px;color:var(--text-soft)">${r.tur}</td>
                <td style="padding:9px 12px;text-align:center;font-size:18px;font-weight:900;color:${renk2}">${stokFmt(r.adet)}</td>
                <td style="padding:9px 8px;text-align:center;font-size:11px;font-weight:700;color:${renk2}">${badge}</td>
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
            <input id="stok-g-personel" readonly value="Ayşegül Tulğan"
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
            <input id="stok-z-zimmetpersonel" readonly value="Ayşegül Tulğan"
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

// ── SİL ──────────────────────────────────────────────────
async function stokSil(id, kategori) {
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
  const hareketler = _stokData[kategori] || [];
  const kalan = stokHesaplaKalan(kategori);
  const malzemeler = STOK_MALZEMELER[kategori];
  const baslik = kategori === 'temizlik' ? 'TEMİZLİK MALZEMESİ' : 'MEDİKAL MALZEME';

  const esc = s => (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let sharedStrs = [];
  const si = s => { s = String(s ?? ''); let i = sharedStrs.indexOf(s); if(i===-1){i=sharedStrs.length;sharedStrs.push(s);} return i; };

  // Sayfa 1: Stok Özeti
  const ozetRows = [
    ['MALZEME', 'TÜR', 'KALAN'],
    ...malzemeler.map(m => [m.ad, m.tur, kalan[m.ad] ?? 0]),
  ].map(row => '<row>' + row.map((v, ci) =>
    ci === 2 ? `<c t="n"><v>${v}</v></c>` : `<c t="s"><v>${si(v)}</v></c>`
  ).join('') + '</row>').join('');

  // Sayfa 2: Hareketler
  const hareketRows = [
    ['TİP','MALZEME','TÜR','MİKTAR','PERSONEL','TARİH','AÇIKLAMA'],
    ...hareketler.map(h => [
      h.tip, h.malzeme, h.tur, h.miktar, h.personel, stokTarihTR(h.tarih), h.aciklama||''
    ]),
  ].map(row => '<row>' + row.map((v, ci) =>
    ci === 3 ? `<c t="n"><v>${Number(v)||0}</v></c>` : `<c t="s"><v>${si(v)}</v></c>`
  ).join('') + '</row>').join('');

  const ssXml = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrs.length}" uniqueCount="${sharedStrs.length}">${sharedStrs.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`;
  const wbXml = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Stok Özeti" sheetId="1" r:id="rId1"/><sheet name="Hareketler" sheetId="2" r:id="rId2"/></sheets></workbook>`;
  const s1Xml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${ozetRows}</sheetData></worksheet>`;
  const s2Xml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${hareketRows}</sheetData></worksheet>`;
  const CT = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;
  const RELS = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
  const APPRELS = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const e = s => new TextEncoder().encode(s);
  const zip = await buildZip([
    ['[Content_Types].xml',          e(CT),      true],
    ['_rels/.rels',                  e(APPRELS), true],
    ['xl/workbook.xml',              e(wbXml),   false],
    ['xl/_rels/workbook.xml.rels',   e(RELS),    true],
    ['xl/worksheets/sheet1.xml',     e(s1Xml),   false],
    ['xl/worksheets/sheet2.xml',     e(s2Xml),   false],
    ['xl/sharedStrings.xml',         e(ssXml),   false],
  ]);

  const blob = new Blob([zip], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stok_${kategori}_${stokTodayISO()}.xlsx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast(`✅ ${baslik} stok raporu indirildi`);
}

// Global olarak aç
window.stokRender             = stokRender;
window.stokSekme              = stokSekme;
window.stokHareketlerFiltrele = stokHareketlerFiltrele;
window.stokGelenMalzemeSecildi= stokGelenMalzemeSecildi;
window.stokGelenKaydet        = stokGelenKaydet;
window.stokZimmetMalzemeSecildi= stokZimmetMalzemeSecildi;
window.stokZimmetKaydet       = stokZimmetKaydet;
window.stokSil                = stokSil;
window.stokExcelIndir         = stokExcelIndir;
