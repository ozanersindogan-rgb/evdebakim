// ══════════════════════════════════════════════════════════
//  MEDİKAL MALZEME MODÜLÜ
//  Firestore koleksiyonları:
//    medikal_malzemeler  — malzeme listesi { ad, tur, stok }
//    medikal_teslim      — teslim edilen { malzeme, adet, kisi, basvuruNo, tel, mahalle, tarih, iade?, iadeTarih? }
//    medikal_alinan      — iade alınan (ayrı koleksiyon, teslim kaydından otomatik)
// ══════════════════════════════════════════════════════════

// ── Seed malzeme listesi ─────────────────────────────────
const MEDIKAL_SEED = [
  { ad: 'Akülü Sandalye',       tur: 'Adet' },
  { ad: 'Baston',               tur: 'Adet' },
  { ad: 'Hasta Bezi L Beden',   tur: 'Paket' },
  { ad: 'Hasta Bezi M Beden',   tur: 'Paket' },
  { ad: 'Hasta Bezi XL Beden',  tur: 'Paket' },
  { ad: 'Hasta Yatağı',         tur: 'Adet' },
  { ad: 'Havalı Yatak',         tur: 'Adet' },
  { ad: 'Kol Değneği',          tur: 'Adet' },
  { ad: 'Koltuk Değneği',       tur: 'Adet' },
  { ad: 'Oksijen Cihazı',       tur: 'Adet' },
  { ad: 'Tekerlekli Sandalye',  tur: 'Adet' },
  { ad: 'Tuvalet Sandalyesi',   tur: 'Adet' },
  { ad: 'Walker',               tur: 'Adet' },
];

// ── State ────────────────────────────────────────────────
const _mData = {
  malzemeler: [],   // { _id, ad, tur, stok }
  teslimler:  [],   // teslim edilen kayıtlar
  alinanlar:  [],   // iade alınan kayıtlar
};
let _mSekme = 'ozet'; // ozet | teslim | alinan | ayarlar

// ── Yardımcılar ──────────────────────────────────────────
function mIsAdmin() {
  const u = firebase.auth().currentUser;
  return u && u.email === 'ozan.ersin@kusadasi.bel.tr';
}
function mFmt(n) { return (n ?? 0).toLocaleString('tr-TR'); }
function mBugün() { return new Date().toISOString().split('T')[0]; }
function mTarihTR(d) {
  if (!d) return '—';
  if (typeof d === 'string' && d.includes('-')) {
    const [y,m,g] = d.split('-');
    return `${g}.${m}.${y}`;
  }
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function mToTimestamp(iso) {
  return firebase.firestore.Timestamp.fromDate(new Date(iso + 'T00:00:00'));
}

// ── Firestore yükle ──────────────────────────────────────
async function mYukle() {
  const db = firebase.firestore();

  // Malzeme listesi
  const mSnap = await db.collection('medikal_malzemeler').get();
  if (mSnap.empty) {
    // Seed
    const b = db.batch();
    MEDIKAL_SEED.forEach(m => {
      b.set(db.collection('medikal_malzemeler').doc(), { ...m, stok: 0 });
    });
    await b.commit();
    const mSnap2 = await db.collection('medikal_malzemeler').get();
    _mData.malzemeler = mSnap2.docs.map(d => ({ _id: d.id, ...d.data() }));
  } else {
    _mData.malzemeler = mSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  }
  _mData.malzemeler.sort((a,b) => a.ad.localeCompare(b.ad,'tr'));

  // Teslimler
  const tSnap = await db.collection('medikal_teslim').get();
  _mData.teslimler = tSnap.docs.map(d => ({ _id: d.id, ...d.data() }))
    .sort((a,b) => {
      const ta = a.tarih?.toDate ? a.tarih.toDate() : new Date(a.tarih||0);
      const tb = b.tarih?.toDate ? b.tarih.toDate() : new Date(b.tarih||0);
      return tb - ta;
    });

  // Alinanlar
  const aSnap = await db.collection('medikal_alinan').get();
  _mData.alinanlar = aSnap.docs.map(d => ({ _id: d.id, ...d.data() }))
    .sort((a,b) => {
      const ta = a.tarih?.toDate ? a.tarih.toDate() : new Date(a.tarih||0);
      const tb = b.tarih?.toDate ? b.tarih.toDate() : new Date(b.tarih||0);
      return tb - ta;
    });
}

// ── Ana render ────────────────────────────────────────────
async function medikalRender() {
  const root = document.getElementById('stok-medikal-root');
  if (!root) return;
  root.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-soft)">⏳ Yükleniyor...</div>`;
  try {
    await mYukle();
  } catch(e) {
    root.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626">❌ Yükleme hatası: ${e.message}</div>`;
    return;
  }
  _mSekme = 'ozet';
  mRenderIc();
}

function mRenderIc() {
  const root = document.getElementById('stok-medikal-root');
  if (!root) return;

  const sekmeler = [
    { id:'ozet',    ikon:'📊', ad:'Stok Özeti'        },
    { id:'teslim',  ikon:'📤', ad:'Teslim Edilen'     },
    { id:'alinan',  ikon:'📥', ad:'İade Alınan'       },
    { id:'ayarlar', ikon:'⚙️', ad:'Ayarlar'            },
  ];

  const renk = '#2563eb';

  // Toplam teslimde olan (iade edilmemiş)
  const aktifTeslim = _mData.teslimler.filter(t => !t.iade).length;

  root.innerHTML = `
    <div style="margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:20px;font-weight:900;color:var(--text)">🏥 Medikal Malzeme Yönetimi</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:2px">
          ${_mData.malzemeler.length} malzeme çeşidi · ${aktifTeslim} aktif teslim
        </div>
      </div>
    </div>

    <!-- Sekmeler -->
    <div style="display:flex;gap:4px;border-bottom:2px solid var(--border);margin-bottom:20px;overflow-x:auto">
      ${sekmeler.map(s => `
        <button id="m-tab-${s.id}" onclick="mSekme('${s.id}')"
          style="padding:10px 16px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;
                 border-bottom:3px solid ${_mSekme===s.id?renk:'transparent'};
                 color:${_mSekme===s.id?renk:'var(--text-soft)'};transition:all .15s;white-space:nowrap">
          ${s.ikon} ${s.ad}
        </button>`).join('')}
    </div>

    <div id="m-sekme-icerik"></div>`;

  mSekmeIcerik(_mSekme);
}

function mSekme(sekme) {
  _mSekme = sekme;
  mRenderIc();
}

function mSekmeIcerik(sekme) {
  const el = document.getElementById('m-sekme-icerik');
  if (!el) return;
  if (sekme === 'ozet')    el.innerHTML = mOzetHTML();
  if (sekme === 'teslim')  el.innerHTML = mTeslimHTML();
  if (sekme === 'alinan')  el.innerHTML = mAlinanHTML();
  if (sekme === 'ayarlar') el.innerHTML = mAyarlarHTML();
}

// ── SEKME 1: STOK ÖZETİ ─────────────────────────────────
function mOzetHTML() {
  const renk = '#2563eb';

  // Stok = toplam alinan (iade) - toplam teslim edilen (aktif)
  const stokMap = {};
  _mData.malzemeler.forEach(m => { stokMap[m.ad] = { ...m, teslimde: 0, iadede: 0 }; });

  _mData.teslimler.forEach(t => {
    if (!stokMap[t.malzeme]) stokMap[t.malzeme] = { ad: t.malzeme, tur: 'Adet', teslimde: 0, iadede: 0 };
    if (!t.iade) stokMap[t.malzeme].teslimde += Number(t.adet||0);
  });
  _mData.alinanlar.forEach(a => {
    if (!stokMap[a.malzeme]) stokMap[a.malzeme] = { ad: a.malzeme, tur: 'Adet', teslimde: 0, iadede: 0 };
    stokMap[a.malzeme].iadede += Number(a.adet||0);
  });

  const rows = Object.values(stokMap).sort((a,b) => a.ad.localeCompare(b.ad,'tr'));
  const aktif = rows.filter(r => r.teslimde > 0).length;
  const bosta = rows.filter(r => r.teslimde === 0).length;

  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
      <div class="table-card" style="padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:${renk}">${rows.length}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Toplam Çeşit</div>
      </div>
      <div class="table-card" style="padding:14px;text-align:center;border-color:#fca5a5">
        <div style="font-size:26px;font-weight:900;color:#dc2626">${aktif}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Teslimde</div>
      </div>
      <div class="table-card" style="padding:14px;text-align:center;border-color:#bbf7d0">
        <div style="font-size:26px;font-weight:900;color:#16a34a">${bosta}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:4px">Depoda</div>
      </div>
    </div>

    <div class="table-card" style="padding:0;overflow:hidden">
      <div class="table-header" style="background:linear-gradient(135deg,${renk}18,${renk}08)">
        <span class="table-title">📦 Malzeme Durumu</span>
        <span style="font-size:11px;color:var(--text-soft)">Teslimde olanlar kırmızı</span>
      </div>
      <div class="scroll-table">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:${renk};color:#fff">
              <th style="padding:10px 14px;text-align:left">Malzeme</th>
              <th style="padding:10px 8px;text-align:center">Tür</th>
              <th style="padding:10px 8px;text-align:center">📤 Teslimde</th>
              <th style="padding:10px 8px;text-align:center">📥 İade Alınan</th>
              <th style="padding:10px 8px;text-align:center">🏬 Depoda</th>
              <th style="padding:10px 8px;text-align:center">Durum</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i) => {
              const bg = i%2===0?'':'rgba(0,0,0,0.02)';
              const stokMiktar = (r.stok||0) - r.teslimde;
              const durum = r.teslimde > 0
                ? `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;padding:2px 10px;font-size:11px;font-weight:800">📤 Teslimde (${r.teslimde})</span>`
                : `<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:8px;padding:2px 10px;font-size:11px;font-weight:800">✅ Depoda</span>`;
              const depodaRenk = stokMiktar > 0 ? '#16a34a' : stokMiktar < 0 ? '#dc2626' : '#94a3b8';
              return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
                <td style="padding:10px 14px;font-weight:700">${r.ad}</td>
                <td style="padding:10px 8px;text-align:center;font-size:11px;color:var(--text-soft)">${r.tur}</td>
                <td style="padding:10px 8px;text-align:center;font-weight:900;color:${r.teslimde>0?'#dc2626':'#ccc'}">${r.teslimde>0?r.teslimde:'—'}</td>
                <td style="padding:10px 8px;text-align:center;font-weight:700;color:#16a34a">${r.iadede>0?r.iadede:'—'}</td>
                <td style="padding:10px 8px;text-align:center;font-weight:900;color:${depodaRenk}">${(r.stok||0) > 0 ? stokMiktar : '—'}</td>
                <td style="padding:10px 8px;text-align:center">${durum}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── SEKME 2: TESLİM EDİLEN ──────────────────────────────
function mTeslimHTML() {
  const renk = '#2563eb';
  const malzemeler = _mData.malzemeler;

  return `
    <!-- Form -->
    <div class="table-card" style="padding:20px;margin-bottom:20px">
      <div class="table-header" style="padding:0 0 16px;border:none;background:none">
        <span class="table-title">📤 Yeni Teslim Kaydı</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">MALZEME *</label>
          <select id="m-t-malzeme" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
            <option value="">— Seçin —</option>
            ${malzemeler.map(m=>`<option value="${m.ad}">${m.ad}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">ADET *</label>
          <input id="m-t-adet" type="number" min="1" placeholder="1"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TESLİM EDİLEN KİŞİ *</label>
          <input id="m-t-kisi" placeholder="Ad Soyad"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">BAŞVURU NO</label>
          <input id="m-t-basvuru" placeholder="Başvuru numarası"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TELEFON</label>
          <input id="m-t-tel" placeholder="05xx xxx xx xx" type="tel"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">MAHALLE</label>
          <input id="m-t-mahalle" placeholder="Mahalle adı"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:4px">TARİH *</label>
          <input id="m-t-tarih" type="date" value="${mBugün()}"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        </div>
        <div style="display:flex;align-items:flex-end">
          <button onclick="mTeslimKaydet()"
            style="width:100%;padding:10px;background:${renk};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer">
            💾 Kaydet
          </button>
        </div>
      </div>
    </div>

    <!-- Arama -->
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input id="m-t-ara" placeholder="🔍 Kişi, malzeme veya mahalle ara..."
        oninput="mTeslimFiltrele()"
        style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
      <select id="m-t-durum" onchange="mTeslimFiltrele()"
        style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
        <option value="">Tümü</option>
        <option value="aktif">Teslimde</option>
        <option value="iade">İade Edildi</option>
      </select>
      <span id="m-t-sayi" style="font-size:12px;color:var(--text-soft);font-weight:700;align-self:center">${_mData.teslimler.length} kayıt</span>
    </div>

    <!-- Tablo -->
    <div class="table-card" style="padding:0;overflow:hidden">
      <div class="scroll-table">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:${renk};color:#fff">
              <th style="padding:10px 12px;text-align:left">Tarih</th>
              <th style="padding:10px 12px;text-align:left">Malzeme</th>
              <th style="padding:10px 8px;text-align:center">Adet</th>
              <th style="padding:10px 12px;text-align:left">Teslim Edilen</th>
              <th style="padding:10px 8px;text-align:center">Baş.No</th>
              <th style="padding:10px 8px;text-align:left">Tel</th>
              <th style="padding:10px 8px;text-align:left">Mahalle</th>
              <th style="padding:10px 10px;text-align:center">Durum</th>
              ${mIsAdmin() ? `<th style="padding:10px 8px;text-align:center">🗑️</th>` : ''}
            </tr>
          </thead>
          <tbody id="m-t-body">
            ${mTeslimSatirlar(_mData.teslimler)}
          </tbody>
        </table>
      </div>
    </div>`;
}

function mTeslimSatirlar(liste) {
  const admin = mIsAdmin();
  const colspan = admin ? 9 : 8;
  if (!liste.length) return `<tr><td colspan="${colspan}" style="text-align:center;padding:40px;color:var(--text-soft)">Kayıt bulunamadı</td></tr>`;
  return liste.map((t,i) => {
    const bg = i%2===0?'':'rgba(0,0,0,0.02)';
    const iadeBadge = t.iade
      ? `<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:800">✅ İade ${mTarihTR(t.iadeTarih)}</span>`
      : `<button onclick="mIadeModal('${t._id}')"
           style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:8px;
                  padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap">
           📥 Teslim Alındı
         </button>`;
    const silBtn = admin
      ? `<td style="padding:9px 8px;text-align:center">
           <button onclick="mTeslimSil('${t._id}')"
             style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;
                    padding:4px 8px;font-size:11px;cursor:pointer;font-weight:700">🗑️</button>
         </td>`
      : '';
    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px;font-size:12px;white-space:nowrap">${mTarihTR(t.tarih)}</td>
      <td style="padding:9px 12px;font-weight:700">${t.malzeme||'—'}</td>
      <td style="padding:9px 8px;text-align:center;font-weight:900;color:#2563eb">${t.adet||'—'}</td>
      <td style="padding:9px 12px">${t.kisi||'—'}</td>
      <td style="padding:9px 8px;text-align:center;font-size:12px;color:var(--text-soft)">${t.basvuruNo||'—'}</td>
      <td style="padding:9px 8px;font-size:12px">${t.tel||'—'}</td>
      <td style="padding:9px 8px;font-size:12px">${t.mahalle||'—'}</td>
      <td style="padding:9px 10px;text-align:center">${iadeBadge}</td>
      ${silBtn}
    </tr>`;
  }).join('');
}

function mTeslimFiltrele() {
  const ara    = (document.getElementById('m-t-ara')?.value||'').toLowerCase();
  const durum  = document.getElementById('m-t-durum')?.value||'';
  let liste = [..._mData.teslimler];
  if (durum==='aktif') liste = liste.filter(t=>!t.iade);
  if (durum==='iade')  liste = liste.filter(t=>t.iade);
  if (ara) liste = liste.filter(t =>
    (t.kisi||'').toLowerCase().includes(ara) ||
    (t.malzeme||'').toLowerCase().includes(ara) ||
    (t.mahalle||'').toLowerCase().includes(ara) ||
    (t.basvuruNo||'').toLowerCase().includes(ara)
  );
  const body = document.getElementById('m-t-body');
  if (body) body.innerHTML = mTeslimSatirlar(liste);
  const sayi = document.getElementById('m-t-sayi');
  if (sayi) sayi.textContent = liste.length + ' kayıt';
}

// İade modal
function mIadeModal(teslimId) {
  // Modal zaten varsa kaldır
  document.getElementById('m-iade-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'm-iade-modal';
  modal.onclick = e => { if (e.target===modal) modal.remove(); };
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';

  const kayit = _mData.teslimler.find(t => t._id === teslimId);
  if (!kayit) return;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:400px;
                box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden">
      <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 20px;color:#fff">
        <div style="font-size:11px;opacity:.8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">İade / Teslim Alındı</div>
        <div style="font-size:17px;font-weight:900">${kayit.malzeme}</div>
        <div style="font-size:12px;opacity:.85;margin-top:4px">${kayit.kisi} · ${kayit.adet} adet</div>
      </div>
      <div style="padding:20px">
        <label style="font-size:12px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:6px">İADE TARİHİ *</label>
        <input id="m-iade-tarih" type="date" value="${mBugün()}"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none;margin-bottom:16px">
        <label style="font-size:12px;font-weight:800;color:var(--text-soft);display:block;margin-bottom:6px">TESLİM ALAN KİŞİ</label>
        <input id="m-iade-alan" placeholder="İadeyi alan personel adı"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none;margin-bottom:20px">
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('m-iade-modal').remove()"
            style="flex:1;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:#f8fafc;font-size:13px;font-weight:700;cursor:pointer;color:#475569">
            İptal
          </button>
          <button onclick="mIadeKaydet('${teslimId}')"
            style="flex:2;padding:10px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13px;font-weight:800;cursor:pointer">
            ✅ Stoka İade Et
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

async function mIadeKaydet(teslimId) {
  const tarih = document.getElementById('m-iade-tarih')?.value;
  const alan  = document.getElementById('m-iade-alan')?.value?.trim();
  if (!tarih) { showToast('⚠️ Tarih girin'); return; }

  const kayit = _mData.teslimler.find(t => t._id === teslimId);
  if (!kayit) return;

  const db = firebase.firestore();
  try {
    // Teslim kaydını iade olarak güncelle
    await db.collection('medikal_teslim').doc(teslimId).update({
      iade: true,
      iadeTarih: mToTimestamp(tarih),
      iadeAlan: alan || '',
    });

    // Alinan koleksiyonuna kayıt ekle
    await db.collection('medikal_alinan').add({
      malzeme:   kayit.malzeme,
      adet:      kayit.adet,
      kisi:      kayit.kisi,
      tel:       kayit.tel || '',
      mahalle:   kayit.mahalle || '',
      tarih:     mToTimestamp(tarih),
      iadeAlan:  alan || '',
      teslimId:  teslimId,
    });

    // Local state güncelle
    const t = _mData.teslimler.find(t => t._id === teslimId);
    if (t) { t.iade = true; t.iadeTarih = tarih; t.iadeAlan = alan; }
    _mData.alinanlar.unshift({
      malzeme: kayit.malzeme, adet: kayit.adet, kisi: kayit.kisi,
      tel: kayit.tel, mahalle: kayit.mahalle, tarih, iadeAlan: alan,
    });

    document.getElementById('m-iade-modal')?.remove();
    showToast(`✅ ${kayit.malzeme} iade alındı, stoka girdi`);
    mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

async function mTeslimKaydet() {
  const malzeme  = document.getElementById('m-t-malzeme')?.value;
  const adet     = parseInt(document.getElementById('m-t-adet')?.value);
  const kisi     = document.getElementById('m-t-kisi')?.value?.trim();
  const basvuruNo= document.getElementById('m-t-basvuru')?.value?.trim();
  const tel      = document.getElementById('m-t-tel')?.value?.trim();
  const mahalle  = document.getElementById('m-t-mahalle')?.value?.trim();
  const tarih    = document.getElementById('m-t-tarih')?.value;

  if (!malzeme) { showToast('⚠️ Malzeme seçin'); return; }
  if (!adet || adet < 1) { showToast('⚠️ Adet girin'); return; }
  if (!kisi) { showToast('⚠️ Teslim edilen kişiyi girin'); return; }
  if (!tarih) { showToast('⚠️ Tarih girin'); return; }

  const kayit = {
    malzeme, adet, kisi, basvuruNo: basvuruNo||'', tel: tel||'',
    mahalle: mahalle||'', tarih: mToTimestamp(tarih),
    iade: false, iadeTarih: null, iadeAlan: '',
    olusturma: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const ref = await firebase.firestore().collection('medikal_teslim').add(kayit);
    _mData.teslimler.unshift({ _id: ref.id, ...kayit, tarih });
    showToast(`✅ ${malzeme} — ${kisi} adına teslim kaydedildi`);
    // Formu temizle
    ['m-t-malzeme','m-t-adet','m-t-kisi','m-t-basvuru','m-t-tel','m-t-mahalle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = el.tagName==='SELECT' ? '' : '';
    });
    document.getElementById('m-t-tarih').value = mBugün();
    mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── SEKME 3: İADE ALINAN ────────────────────────────────
function mAlinanHTML() {
  const renk = '#059669';

  return `
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input id="m-a-ara" placeholder="🔍 Kişi, malzeme veya mahalle ara..."
        oninput="mAlinanFiltrele()"
        style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
      <span id="m-a-sayi" style="font-size:12px;color:var(--text-soft);font-weight:700;align-self:center">${_mData.alinanlar.length} kayıt</span>
    </div>

    <div class="table-card" style="padding:0;overflow:hidden">
      <div class="scroll-table">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:${renk};color:#fff">
              <th style="padding:10px 12px;text-align:left">İade Tarihi</th>
              <th style="padding:10px 12px;text-align:left">Malzeme</th>
              <th style="padding:10px 8px;text-align:center">Adet</th>
              <th style="padding:10px 12px;text-align:left">Teslim Alan Kişi</th>
              <th style="padding:10px 8px;text-align:left">Telefon</th>
              <th style="padding:10px 8px;text-align:left">Mahalle</th>
              <th style="padding:10px 8px;text-align:left">İadeyi Alan</th>
              ${mIsAdmin() ? `<th style="padding:10px 8px;text-align:center">🗑️</th>` : ''}
            </tr>
          </thead>
          <tbody id="m-a-body">
            ${mAlinanSatirlar(_mData.alinanlar)}
          </tbody>
        </table>
      </div>
    </div>`;
}

function mAlinanSatirlar(liste) {
  const admin = mIsAdmin();
  const colspan = admin ? 8 : 7;
  if (!liste.length) return `<tr><td colspan="${colspan}" style="text-align:center;padding:40px;color:var(--text-soft)">Henüz iade alınan kayıt yok</td></tr>`;
  return liste.map((a,i) => {
    const bg = i%2===0?'':'rgba(0,0,0,0.02)';
    const silBtn = admin
      ? `<td style="padding:9px 8px;text-align:center">
           <button onclick="mAlinanSil('${a._id}')"
             style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;
                    padding:4px 8px;font-size:11px;cursor:pointer;font-weight:700">🗑️</button>
         </td>`
      : '';
    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px;font-size:12px;white-space:nowrap">${mTarihTR(a.tarih)}</td>
      <td style="padding:9px 12px;font-weight:700">${a.malzeme||'—'}</td>
      <td style="padding:9px 8px;text-align:center;font-weight:900;color:#059669">${a.adet||'—'}</td>
      <td style="padding:9px 12px">${a.kisi||'—'}</td>
      <td style="padding:9px 8px;font-size:12px">${a.tel||'—'}</td>
      <td style="padding:9px 8px;font-size:12px">${a.mahalle||'—'}</td>
      <td style="padding:9px 8px;font-size:12px;color:var(--text-soft)">${a.iadeAlan||'—'}</td>
      ${silBtn}
    </tr>`;
  }).join('');
}

function mAlinanFiltrele() {
  const ara = (document.getElementById('m-a-ara')?.value||'').toLowerCase();
  let liste = [..._mData.alinanlar];
  if (ara) liste = liste.filter(a =>
    (a.kisi||'').toLowerCase().includes(ara) ||
    (a.malzeme||'').toLowerCase().includes(ara) ||
    (a.mahalle||'').toLowerCase().includes(ara)
  );
  const body = document.getElementById('m-a-body');
  if (body) body.innerHTML = mAlinanSatirlar(liste);
  const sayi = document.getElementById('m-a-sayi');
  if (sayi) sayi.textContent = liste.length + ' kayıt';
}

// ── SEKME 4: AYARLAR ────────────────────────────────────
function mAyarlarHTML() {
  const renk = '#2563eb';
  const malzemeler = _mData.malzemeler;

  return `
    <div style="display:flex;flex-direction:column;gap:20px">

      <!-- Stok Miktarları -->
      <div class="table-card" style="padding:20px">
        <div class="table-header" style="padding:0 0 16px;border:none;background:none">
          <span class="table-title">🏬 Elde Olan Malzeme Miktarları</span>
          <span style="font-size:11px;color:var(--text-soft)">Depodaki toplam adet</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${malzemeler.map(m => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                        background:var(--bg-soft);border-radius:10px;border:1px solid var(--border)">
              <span style="flex:1;font-size:13px;font-weight:700">${m.ad}</span>
              <span style="font-size:11px;color:var(--text-soft);margin-right:4px">${m.tur}</span>
              <input type="number" min="0" value="${m.stok||0}"
                id="stok-${m._id}"
                style="width:70px;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;
                       font-size:13px;font-weight:900;text-align:center;outline:none;color:#2563eb">
              <button onclick="mStokGuncelle('${m._id}')"
                style="background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb;border-radius:8px;
                       padding:6px 12px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap">
                💾
              </button>
            </div>`).join('')}
        </div>
      </div>

      <!-- Malzeme Listesi -->
      <div class="table-card" style="padding:20px">
        <div class="table-header" style="padding:0 0 16px;border:none;background:none">
          <span class="table-title">📦 Malzeme Listesi</span>
          <span style="font-size:12px;color:var(--text-soft);background:var(--bg-soft);padding:3px 10px;border-radius:10px;font-weight:700">${malzemeler.length} malzeme</span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          <input id="m-ay-ad" placeholder="Malzeme adı..."
            style="flex:1;min-width:160px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
          <input id="m-ay-tur" placeholder="Birim (Adet, Paket...)"
            style="width:140px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;outline:none">
          <button onclick="mMalzemeEkle()"
            style="background:${renk};color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:800;cursor:pointer">
            ➕ Ekle
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;max-height:400px;overflow-y:auto">
          ${malzemeler.map((m,i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;
                        background:${i%2===0?'var(--bg-soft)':'#fff'};border-radius:8px;border:1px solid var(--border)">
              <span style="flex:1;font-size:13px;font-weight:600">${m.ad}</span>
              <span style="font-size:11px;color:var(--text-soft);background:#e5e7eb;padding:2px 8px;border-radius:8px">${m.tur}</span>
              <button onclick="mMalzemeSil('${m._id}','${m.ad.replace(/'/g,"\\'").replace(/"/g,'\\"')}')"
                style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;
                       padding:4px 8px;font-size:11px;cursor:pointer;font-weight:700">🗑️</button>
            </div>`).join('')}
        </div>
      </div>

    </div>`;
}

async function mMalzemeEkle() {
  const adEl  = document.getElementById('m-ay-ad');
  const turEl = document.getElementById('m-ay-tur');
  const ad  = adEl?.value?.trim();
  const tur = turEl?.value?.trim() || 'Adet';
  if (!ad) { showToast('⚠️ Malzeme adı girin'); return; }
  if (_mData.malzemeler.find(m => m.ad.toLowerCase()===ad.toLowerCase())) {
    showToast('⚠️ Bu malzeme zaten mevcut'); return;
  }
  try {
    const ref = await firebase.firestore().collection('medikal_malzemeler').add({ ad, tur, stok: 0 });
    _mData.malzemeler.push({ _id: ref.id, ad, tur, stok: 0 });
    _mData.malzemeler.sort((a,b) => a.ad.localeCompare(b.ad,'tr'));
    if (adEl) adEl.value = '';
    if (turEl) turEl.value = '';
    showToast(`✅ "${ad}" eklendi`);
    mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

async function mMalzemeSil(fbId, ad) {
  if (!confirm(`"${ad}" malzemesini listeden kaldırmak istiyor musunuz?`)) return;
  try {
    await firebase.firestore().collection('medikal_malzemeler').doc(fbId).delete();
    _mData.malzemeler = _mData.malzemeler.filter(m => m._id !== fbId);
    showToast(`🗑️ "${ad}" kaldırıldı`);
    mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── Stok güncelle ────────────────────────────────────────
async function mStokGuncelle(fbId) {
  const el = document.getElementById('stok-' + fbId);
  const yeniStok = parseInt(el?.value);
  if (isNaN(yeniStok) || yeniStok < 0) { showToast('⚠️ Geçerli bir miktar girin'); return; }
  try {
    await firebase.firestore().collection('medikal_malzemeler').doc(fbId).update({ stok: yeniStok });
    const m = _mData.malzemeler.find(m => m._id === fbId);
    if (m) m.stok = yeniStok;
    showToast(`✅ Stok güncellendi: ${yeniStok} adet`);
    // Özet sekmesini de güncelle
    if (_mSekme === 'ozet') mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── Teslim kaydı sil (sadece admin) ──────────────────────
async function mTeslimSil(fbId) {
  if (!mIsAdmin()) { showToast('⛔ Yetkiniz yok'); return; }
  const kayit = _mData.teslimler.find(t => t._id === fbId);
  if (!confirm(`"${kayit?.malzeme||fbId}" teslim kaydını silmek istiyor musunuz?\nBu işlem geri alınamaz.`)) return;
  try {
    await firebase.firestore().collection('medikal_teslim').doc(fbId).delete();
    _mData.teslimler = _mData.teslimler.filter(t => t._id !== fbId);
    showToast(`🗑️ Teslim kaydı silindi`);
    mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── İade kaydı sil (sadece admin) ────────────────────────
async function mAlinanSil(fbId) {
  if (!mIsAdmin()) { showToast('⛔ Yetkiniz yok'); return; }
  const kayit = _mData.alinanlar.find(a => a._id === fbId);
  if (!confirm(`"${kayit?.malzeme||fbId}" iade kaydını silmek istiyor musunuz?\nBu işlem geri alınamaz.`)) return;
  try {
    await firebase.firestore().collection('medikal_alinan').doc(fbId).delete();
    _mData.alinanlar = _mData.alinanlar.filter(a => a._id !== fbId);
    showToast(`🗑️ İade kaydı silindi`);
    mRenderIc();
  } catch(e) {
    showToast('❌ Hata: ' + e.message);
  }
}

// ── Global ────────────────────────────────────────────────
window.medikalRender      = medikalRender;
window.mSekme             = mSekme;
window.mTeslimKaydet      = mTeslimKaydet;
window.mTeslimFiltrele    = mTeslimFiltrele;
window.mIadeModal         = mIadeModal;
window.mIadeKaydet        = mIadeKaydet;
window.mAlinanFiltrele    = mAlinanFiltrele;
window.mMalzemeEkle       = mMalzemeEkle;
window.mMalzemeSil        = mMalzemeSil;
window.mStokGuncelle      = mStokGuncelle;
window.mTeslimSil         = mTeslimSil;
window.mAlinanSil         = mAlinanSil;
