// ══════════════════════════════════════════════════════════════
// DASHBOARD — Hemşire Sistemi
// ══════════════════════════════════════════════════════════════

let _dashCache = null;
let _dashCacheLen = -1;

function _dashCacheTemizle() { _dashCache = null; _dashCacheLen = -1; }

function renderDashboard() {
  if (window._dashIlkRender === undefined) {
    window._dashIlkRender = false;
    const _doRender = () => _renderDashboardIc();
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(_doRender, { timeout: 2000 });
    } else {
      setTimeout(_doRender, 50);
    }
    const grid = document.getElementById('stats-grid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px 0;font-size:14px">📊 Dashboard yükleniyor...</div>';
    return;
  }
  _renderDashboardIc();
}

async function _renderDashboardIc() {
  window._dashIlkRender = true;
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  // ── Vatandaş istatistikleri (allData'dan) ──
  const toplamVatandas = new Set(allData.map(r => (r.ISIM_SOYISIM||'').trim().toUpperCase()).filter(Boolean)).size;
  const aktifVatandas  = new Set(allData.filter(r => (r.DURUM||'').toUpperCase() === 'AKTİF').map(r => (r.ISIM_SOYISIM||'').trim().toUpperCase()).filter(Boolean)).size;
  const vefatVatandas  = new Set(allData.filter(r => (r.DURUM||'').toUpperCase() === 'VEFAT').map(r => (r.ISIM_SOYISIM||'').trim().toUpperCase()).filter(Boolean)).size;
  const pasifVatandas  = new Set(allData.filter(r => (r.DURUM||'').toUpperCase() === 'PASİF').map(r => (r.ISIM_SOYISIM||'').trim().toUpperCase()).filter(Boolean)).size;

  // ── Hemşire ziyaret istatistikleri ──
  let hmSonuc = { bugun: 0, buHafta: 0, buAy: 0, toplam: 0, sonZiyaretler: [], aylikTrend: {} };
  try {
    const snap = await firebase.firestore()
      .collection('hemsire_ziyaret')
      .orderBy('ziyaret_tarihi', 'desc')
      .limit(200)
      .get();

    const bugun = new Date(); bugun.setHours(0,0,0,0);
    const haftaBasi = new Date(bugun); haftaBasi.setDate(bugun.getDate() - bugun.getDay() + 1);
    const ayBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1);

    snap.forEach(d => {
      const z = { _fbId: d.id, ...d.data() };
      hmSonuc.toplam++;
      const tarih = z.ziyaret_tarihi?.toDate ? z.ziyaret_tarihi.toDate() : new Date(z.ziyaret_tarihi || '');
      if (tarih >= bugun) hmSonuc.bugun++;
      if (tarih >= haftaBasi) hmSonuc.buHafta++;
      if (tarih >= ayBasi) hmSonuc.buAy++;

      // Son 5 ziyaret
      if (hmSonuc.sonZiyaretler.length < 5) hmSonuc.sonZiyaretler.push(z);

      // Aylık trend (son 6 ay)
      const ay = tarih.toLocaleDateString('tr-TR', { month:'short', year:'numeric' });
      hmSonuc.aylikTrend[ay] = (hmSonuc.aylikTrend[ay] || 0) + 1;
    });
  } catch(e) {
    console.warn('[Dashboard] Hemşire verisi yüklenemedi:', e.message);
  }

  // ── Bugünün tarihi ──
  const bugunStr = new Date().toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // ── Stat kartları ──
  grid.innerHTML = `
    <!-- Tarih başlığı -->
    <div style="grid-column:1/-1;background:linear-gradient(135deg,#1A237E,#1565C0);border-radius:16px;padding:16px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;opacity:.8;font-weight:500">📅 Bugün</div>
        <div style="font-size:16px;font-weight:900;margin-top:2px">${bugunStr}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;opacity:.7">Kayıtlı Vatandaş</div>
        <div style="font-size:28px;font-weight:900">${toplamVatandas}</div>
      </div>
    </div>

    <!-- Vatandaş durumları -->
    <div class="stat-card" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;cursor:pointer" onclick="navTo('vatandaslar',null)">
      <div class="si">✅</div><div class="sv" style="color:#16a34a">${aktifVatandas}</div>
      <div class="sl" style="color:#15803d">Aktif Vatandaş</div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,#fafafa,#f1f5f9);border:1.5px solid #cbd5e1">
      <div class="si">😴</div><div class="sv" style="color:#64748b">${pasifVatandas}</div>
      <div class="sl" style="color:#475569">Pasif</div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1.5px solid #fecaca">
      <div class="si">🕊️</div><div class="sv" style="color:#dc2626">${vefatVatandas}</div>
      <div class="sl" style="color:#991b1b">Vefat</div>
    </div>

    <!-- Hemşire ziyaret kartları -->
    <div class="stat-card" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1.5px solid #93c5fd;cursor:pointer" onclick="navTo('hemsire-takip',null)">
      <div class="si">🏥</div><div class="sv" style="color:#1d4ed8">${hmSonuc.bugun}</div>
      <div class="sl" style="color:#1e40af">Bugünkü Ziyaret</div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd">
      <div class="si">📆</div><div class="sv" style="color:#7c3aed">${hmSonuc.buHafta}</div>
      <div class="sl" style="color:#6d28d9">Bu Hafta</div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,#fdf4ff,#fae8ff);border:1.5px solid #e879f9">
      <div class="si">📊</div><div class="sv" style="color:#a21caf">${hmSonuc.buAy}</div>
      <div class="sl" style="color:#86198f">Bu Ay Ziyaret</div>
    </div>
  `;

  // ── Son ziyaretler listesi ──
  const sonZiyEl = document.getElementById('ch-trend');
  if (sonZiyEl) {
    if (!hmSonuc.sonZiyaretler.length) {
      sonZiyEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:32px 0;font-size:13px">Henüz ziyaret kaydı yok</div>';
    } else {
      sonZiyEl.innerHTML = `
        <div style="font-size:12px;font-weight:900;color:#1e293b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Son Ziyaretler</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${hmSonuc.sonZiyaretler.map(z => {
            const tarih = z.ziyaret_tarihi?.toDate ? z.ziyaret_tarihi.toDate() : new Date(z.ziyaret_tarihi || '');
            const tarihStr = tarih.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' });
            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;flex-wrap:wrap">
              <div style="flex:1;min-width:120px">
                <div style="font-weight:800;font-size:13px;color:#1e293b">${z.vatandas_adi || '—'}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">${z.ziyaret_turu || '—'} · ${z.hemsire_adi || '—'}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:12px;font-weight:700;color:#3b82f6">${tarihStr}</div>
                ${z.bulgular ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${z.bulgular}</div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <button onclick="navTo('hemsire-takip',null)" style="width:100%;margin-top:12px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px;font-size:13px;font-weight:800;color:#1d4ed8;cursor:pointer">
          Tüm Ziyaretleri Gör →
        </button>`;
    }
  }

  // ── Aylık ziyaret trend grafiği ──
  const hizmetEl = document.getElementById('ch-hizmet');
  if (hizmetEl) {
    const aylar = Object.entries(hmSonuc.aylikTrend).slice(-6);
    if (!aylar.length) {
      hizmetEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:24px 0;font-size:13px">Henüz veri yok</div>';
    } else {
      const max = Math.max(...aylar.map(([,v]) => v), 1);
      hizmetEl.innerHTML = `
        <div style="font-size:12px;font-weight:900;color:#1e293b;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Aylık Ziyaret Trendi</div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:80px">
          ${aylar.map(([ay, sayi]) => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="font-size:10px;font-weight:800;color:#1d4ed8">${sayi}</div>
              <div style="width:100%;background:#3b82f6;border-radius:6px 6px 0 0;height:${Math.round(sayi/max*60)+8}px;transition:height .3s"></div>
              <div style="font-size:9px;color:#94a3b8;text-align:center;white-space:nowrap">${ay}</div>
            </div>`).join('')}
        </div>`;
    }
  }

  renderUzunSure();
}

// Bu fonksiyon artık boş — eski tarih panelleri kaldırıldı
function renderTarihPanels() {}
function renderKanban() {}
function renderUzunSure() {}
