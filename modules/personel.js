// ── PERSONEL YÖNETİMİ ──
// Firestore koleksiyonu: "personeller"
// Her doküman: { ad, hizmet, aktif }

const PERSONEL_SEED = [
  { ad: 'Perihan Taş',              hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Seher Işık',               hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Emine Abdülkerimoğlu',     hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Yasemin Kapusuz',          hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Sezgin Alkan',             hizmet: 'KADIN BANYO', aktif: true },
  { ad: 'Ecevit Çakır',             hizmet: 'ERKEK BANYO', aktif: true },
  { ad: 'Talat Duman',              hizmet: 'ERKEK BANYO', aktif: true },
  { ad: 'Sibel Can',                hizmet: 'KUAFÖR',      aktif: true },
  { ad: 'Nihal Erkivaç',            hizmet: 'TEMİZLİK',   aktif: true },
  { ad: 'Hava Aybuğa',              hizmet: 'TEMİZLİK',   aktif: true },
  { ad: 'Gülin Çetindağ',           hizmet: 'TEMİZLİK',   aktif: true },
];

window.PERSONEL_DATA = window.PERSONEL_DATA || [];

async function personelYukle() {
  try {
    const snap = await firebase.firestore().collection('personeller').orderBy('hizmet').get();
    if (snap.empty) {
      await Promise.all(PERSONEL_SEED.map(p =>
        firebase.firestore().collection('personeller').add(p)
      ));
      const snap2 = await firebase.firestore().collection('personeller').orderBy('hizmet').get();
      window.PERSONEL_DATA = snap2.docs.map(d => ({ _fbId: d.id, ...d.data() }));
    } else {
      window.PERSONEL_DATA = snap.docs.map(d => ({ _fbId: d.id, ...d.data() }));
    }
  } catch(e) {
    console.warn('[Personel] Yükleme hatası:', e.message);
    window.PERSONEL_DATA = [];
  }
}

function personelListesi(hizmet) {
  return (window.PERSONEL_DATA || []).filter(p => p.hizmet === hizmet && p.aktif !== false);
}

// ─── AYARLAR: Personel CRUD ───
async function ayarlarPersonelRender() {
  const el = document.getElementById('ayarlar-personel-liste');
  if (!el) return;
  await personelYukle();

  const hizmetler = ['KADIN BANYO','ERKEK BANYO','KUAFÖR','TEMİZLİK'];
  const renkler   = { 'KADIN BANYO':'#C2185B','ERKEK BANYO':'#1565C0','KUAFÖR':'#2E7D32','TEMİZLİK':'#E65100' };

  el.innerHTML = hizmetler.map(h => {
    const liste = (window.PERSONEL_DATA || []).filter(p => p.hizmet === h);
    return `
      <div style="margin-bottom:24px">
        <div style="font-weight:900;font-size:13px;color:${renkler[h]};margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">
          ${h} <span style="font-weight:600;color:#94a3b8;font-size:11px">(${liste.filter(p=>p.aktif!==false).length} aktif)</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${liste.map(p => `
            <div style="display:flex;align-items:center;gap:10px;background:#fff;
                        border:1.5px solid ${p.aktif===false ? '#e2e8f0' : renkler[h]+'44'};
                        border-radius:10px;padding:10px 14px;opacity:${p.aktif===false ? '.55' : '1'}">
              <span style="flex:1;font-weight:700;font-size:13px;color:#1e293b">${p.ad}</span>
              <span style="font-size:11px;font-weight:700;color:${p.aktif===false ? '#94a3b8' : '#16a34a'}">
                ${p.aktif===false ? 'Pasif' : 'Aktif'}
              </span>
              <button onclick="ayarlarPersonelToggle('${p._fbId}',${p.aktif!==false})"
                style="background:${p.aktif===false ? '#f0fdf4' : '#fff7ed'};border:1px solid ${p.aktif===false ? '#bbf7d0' : '#fed7aa'};
                       border-radius:7px;padding:4px 10px;font-size:11px;font-weight:700;
                       color:${p.aktif===false ? '#15803d' : '#c2410c'};cursor:pointer">
                ${p.aktif===false ? '✅ Aktif Et' : '⏸ Pasif'}
              </button>
              <button onclick="ayarlarPersonelSil('${p._fbId}','${p.ad.replace(/'/g,"\\'")}')"
                style="background:#fef2f2;border:1px solid #fecaca;border-radius:7px;
                       padding:4px 10px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer">🗑️</button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <input id="yeni-personel-${h.replace(/ /g,'-')}" type="text" placeholder="Yeni personel adı..."
            style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
          <button onclick="ayarlarPersonelEkle('${h}')"
            style="background:${renkler[h]};color:#fff;border:none;border-radius:8px;
                   padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer">+ Ekle</button>
        </div>
      </div>`;
  }).join('');
}
window.ayarlarPersonelRender = ayarlarPersonelRender;

async function ayarlarPersonelEkle(hizmet) {
  const inputId = 'yeni-personel-' + hizmet.replace(/ /g, '-');
  const input = document.getElementById(inputId);
  if (!input) return;
  const ad = input.value.trim();
  if (!ad) { showToast('⚠️ Ad boş olamaz'); return; }
  const yeni = { ad, hizmet, aktif: true };
  const ref = await firebase.firestore().collection('personeller').add(yeni);
  window.PERSONEL_DATA.push({ _fbId: ref.id, ...yeni });
  input.value = '';
  showToast(`✅ ${ad} eklendi`);
  ayarlarPersonelRender();
}
window.ayarlarPersonelEkle = ayarlarPersonelEkle;

async function ayarlarPersonelToggle(fbId, mevcutAktif) {
  const yeniAktif = !mevcutAktif;
  await firebase.firestore().collection('personeller').doc(fbId).update({ aktif: yeniAktif });
  const p = window.PERSONEL_DATA.find(x => x._fbId === fbId);
  if (p) p.aktif = yeniAktif;
  ayarlarPersonelRender();
  showToast(yeniAktif ? 'Aktif edildi' : 'Pasif edildi');
}
window.ayarlarPersonelToggle = ayarlarPersonelToggle;

async function ayarlarPersonelSil(fbId, ad) {
  if (!confirm(`"${ad}" personelini silmek istiyor musunuz?`)) return;
  await firebase.firestore().collection('personeller').doc(fbId).delete();
  window.PERSONEL_DATA = window.PERSONEL_DATA.filter(p => p._fbId !== fbId);
  showToast(`🗑️ ${ad} silindi`);
  ayarlarPersonelRender();
}
window.ayarlarPersonelSil = ayarlarPersonelSil;
