/* =========================================================================
 * Sofra · Müşteri (QR) İstemcisi — apps/customer-client
 * -------------------------------------------------------------------------
 * - Masa kodu URL'den okunur:  /m/table-7  |  ?table=table-7  |  ?qr=<token>  |  #/m/table-7
 * - Backend hazırsa gerçek API'yi kullanır; ulaşılamazsa mock veriyle çalışır.
 * - Fiyat backend'e GÖNDERİLMEZ; sepet toplamı sadece gösterim içindir.
 * ========================================================================= */
(() => {
  "use strict";

  /* ---------------------------------------------------------------- Config */
  const CONFIG = Object.assign(
    {
      API_BASE: "/api/v1",
      WS_URL: null,          // örn. "ws://localhost:3000" — null ise API_BASE'in host'u kullanılır
      USE_MOCK: "auto",      // true | false | "auto" (API'ye ulaşılamazsa mock'a düşer)
      REQUEST_TIMEOUT: 6000,
      POLL_INTERVAL: 8000,
    },
    window.APP_CONFIG || {}
  );

  const STATUS = {
    new:       { label: "Sipariş alındı", step: 1 },
    confirmed: { label: "Onaylandı",      step: 2 },
    preparing: { label: "Hazırlanıyor",   step: 3 },
    ready:     { label: "Hazır",          step: 4 },
    delivered: { label: "Teslim edildi",  step: 5 },
    cancelled: { label: "İptal edildi",   step: 0 },
  };
  const STEP_LABELS = ["Alındı", "Onaylandı", "Hazırlanıyor", "Hazır", "Teslim"];

  /* ------------------------------------------------------------- Mock data */
  // GET /api/v1/tables/{qrCode}/menu yanıt formatı (docs/api-spec.json ile uyumlu tutun)
  const MOCK_MENU = {
    restaurant: { id: 1, name: "Sofra", currency: "TRY" },
    categories: [
      { id: "fish", name: "Balıklar" },
      { id: "hot", name: "Ara Sıcaklar" },
      { id: "meze", name: "Mezeler" },
      { id: "salad", name: "Salatalar" },
      { id: "dessert", name: "Tatlılar" },
      { id: "drink", name: "İçecekler" },
    ],
    products: [
      {
        id: 101, categoryId: "fish", name: "Izgara Levrek", art: "fish", badge: "Şefin önerisi",
        description: "Zeytinyağı, taze kekik ve limon eşliğinde. Mevsim yeşillikleriyle servis edilir.",
        price: 620, portion: "1 porsiyon · 350–400 g", allergens: ["Balık"], vegetarian: false, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Hazırlama tercihi", type: "single", required: true,
            options: [{ id: 1011, name: "Izgara", price: 0, default: true }, { id: 1012, name: "Fırın", price: 0 }] },
          { id: "g2", name: "Yanına ne istersiniz?", type: "multiple", required: false,
            options: [{ id: 1013, name: "Ekstra mevsim yeşilliği", price: 60 }, { id: 1014, name: "Fırın patates", price: 80 }] },
        ],
      },
      {
        id: 102, categoryId: "fish", name: "Limonlu Somon", art: "salmon",
        description: "Hafif kızarmış somon, limonlu sos ve taze otlarla.",
        price: 680, portion: "1 porsiyon · 250 g", allergens: ["Balık", "Süt"], vegetarian: false, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Pişirme derecesi", type: "single", required: true,
            options: [{ id: 1021, name: "Orta", price: 0, default: true }, { id: 1022, name: "İyi pişmiş", price: 0 }] },
          { id: "g2", name: "Yanına ne istersiniz?", type: "multiple", required: false,
            options: [{ id: 1023, name: "Tereyağlı pilav", price: 70 }, { id: 1024, name: "Buharda sebze", price: 70 }] },
        ],
      },
      {
        id: 103, categoryId: "hot", name: "Çıtır Kalamar", art: "calamari", badge: "Sofranın favorisi",
        description: "Altın rengi kalamar halkaları, ev yapımı tarator sosla.",
        price: 390, portion: "Paylaşmalık · 220 g", allergens: ["Yumuşakça", "Gluten", "Kuruyemiş"], vegetarian: false, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Sos tercihi", type: "multiple", required: false,
            options: [{ id: 1031, name: "Ekstra tarator", price: 40 }, { id: 1032, name: "Acılı sos", price: 30 }] },
        ],
      },
      {
        id: 104, categoryId: "hot", name: "Tereyağlı Karides", art: "shrimp",
        description: "Sarımsak, pul biber ve tereyağında, güveçte cızırdayarak gelir.",
        price: 460, portion: "Paylaşmalık · 200 g", allergens: ["Kabuklu", "Süt"], vegetarian: false, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Acı seviyesi", type: "single", required: true,
            options: [{ id: 1041, name: "Acısız", price: 0 }, { id: 1042, name: "Az acılı", price: 0, default: true }, { id: 1043, name: "Acılı", price: 0 }] },
        ],
      },
      {
        id: 105, categoryId: "meze", name: "Haydari", art: "dip",
        description: "Süzme yoğurt, taze nane ve dereotu; üzerinde zeytinyağı.",
        price: 180, portion: "Meze tabağı", allergens: ["Süt"], vegetarian: true, isAvailable: true, optionGroups: [],
      },
      {
        id: 106, categoryId: "meze", name: "Deniz Börülcesi", art: "greens",
        description: "Sarımsaklı zeytinyağı ve limonla, kıtır kıtır.",
        price: 210, portion: "Meze tabağı", allergens: [], vegetarian: true, isAvailable: true, optionGroups: [],
      },
      {
        id: 107, categoryId: "salad", name: "Akdeniz Salatası", art: "salad",
        description: "Roka, cherry domates, nar ekşisi ve ezine peyniri.",
        price: 240, portion: "1 porsiyon", allergens: ["Süt"], vegetarian: true, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Ekstra", type: "multiple", required: false,
            options: [{ id: 1071, name: "Ceviz", price: 35 }, { id: 1072, name: "Izgara hellim", price: 70 }] },
        ],
      },
      {
        id: 108, categoryId: "dessert", name: "Fırın Sütlaç", art: "pudding",
        description: "Toprak kapta, üzeri kızarmış; tarçın dilerseniz.",
        price: 190, portion: "1 kase", allergens: ["Süt"], vegetarian: true, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Üzerine", type: "multiple", required: false,
            options: [{ id: 1081, name: "Fındık", price: 25 }, { id: 1082, name: "Dondurma topu", price: 50 }] },
        ],
      },
      {
        id: 109, categoryId: "drink", name: "Ev Yapımı Limonata", art: "drink",
        description: "Taze sıkılmış limon, nane ve bir tutam şeker.",
        price: 120, portion: "400 ml", allergens: [], vegetarian: true, isAvailable: true,
        optionGroups: [
          { id: "g1", name: "Boyut", type: "single", required: true,
            options: [{ id: 1091, name: "Normal", price: 0, default: true }, { id: 1092, name: "Büyük", price: 40 }] },
        ],
      },
    ],
  };
  const MOCK_TABLES = { "table-1": "Masa 1", "table-2": "Masa 2", "table-3": "Masa 3", "table-4": "Masa 4",
    "table-5": "Masa 5", "table-6": "Masa 6", "table-7": "Masa 7", "table-8": "Masa 8", "table-9": "Masa 9",
    "table-10": "Masa 10", "table-11": "Masa 11", "table-12": "Masa 12" };

  /* --------------------------------------------------------------- Helpers */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "₺" + Math.round(Number(n) || 0).toLocaleString("tr-TR");
  const norm = (s) => String(s || "").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const pad = (n) => String(n).padStart(2, "0");
  const fmtDate = (iso) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const store = {
    get(k, fb, s = localStorage) { try { const v = s.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
    set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } },
  };

  /* ----------------------------------------------------------- Plate art */
  let artSeq = 0;
  const LEAF = "#5f7d4f", INK = "#1d4a52";
  const leaf = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0C9-20 32-25 48-2C31 14 11 13 0 0Z" fill="${LEAF}"/><path d="M3 0L45-3M15-1l7-9M27-2l7-9M15 0l7 7M28-2l7 6" stroke="#dfe8d0" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`;
  const lemon = (x, y, r) => {
    let seg = "";
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; seg += `<line x1="${x}" y1="${y}" x2="${(x + Math.cos(a) * r * 0.78).toFixed(1)}" y2="${(y + Math.sin(a) * r * 0.78).toFixed(1)}"/>`; }
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#f2cf3d"/><circle cx="${x}" cy="${y}" r="${r * 0.84}" fill="#fbe58a"/><g stroke="#f2cf3d" stroke-width="1.6">${seg}</g>`;
  };
  const ARTS = {
    fish: (id) => `
      <defs><linearGradient id="fg${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9aa98f"/><stop offset=".55" stop-color="#b9bf9c"/><stop offset="1" stop-color="#e2dbab"/></linearGradient></defs>
      ${leaf(52, 150, -20, 1.15)}${leaf(232, 92, -60, 1.05)}
      <g transform="rotate(-28 150 112)">
        <path d="M78 114L36 86L48 114L36 146Z" fill="#5e7780"/>
        <path d="M70 114C104 70 196 66 248 108C200 156 112 158 70 114Z" fill="url(#fg${id})"/>
        <path d="M128 84C140 68 166 64 184 74L170 86Z" fill="#7f9584"/>
        <path d="M150 122L160 148L168 122Z" fill="#6c8478"/>
        <path d="M212 84C222 98 222 120 212 134" stroke="${INK}" stroke-width="2" fill="none"/>
        <path d="M96 112C140 104 178 104 206 110" stroke="#eef0d8" stroke-width="2" fill="none" opacity=".8"/>
        <circle cx="230" cy="104" r="3" fill="${INK}"/>
      </g>
      ${leaf(56, 168, 20, 1)}${leaf(228, 160, -140, 1.05)}
      ${lemon(210, 46, 24)}`,
    salmon: () => `
      ${leaf(50, 140, -20, 1.1)}${leaf(236, 96, -60, 1)}
      <g transform="rotate(-24 150 112)">
        <rect x="70" y="72" width="160" height="86" rx="22" fill="#e9876a"/>
        <path d="M70 140C110 168 190 168 230 140V136C190 160 110 160 70 136Z" fill="#3f5a5c"/>
        <g stroke="#fbd6c4" stroke-width="3" fill="none" stroke-linecap="round">
          <path d="M100 80C88 104 92 132 106 150"/><path d="M126 78C114 104 118 132 132 152"/><path d="M152 78C140 104 144 132 158 152"/><path d="M178 78C166 104 170 132 184 150"/><path d="M204 82C192 104 196 128 208 146"/>
        </g>
      </g>
      ${leaf(56, 166, 20, 1)}${leaf(226, 164, -140, 1.05)}
      ${lemon(206, 52, 22)}`,
    calamari: () => {
      const rings = [[118, 74], [150, 70], [182, 76], [104, 104], [138, 102], [170, 104], [200, 108], [120, 134], [154, 136], [186, 138]];
      return `${leaf(50, 136, -20, 1.1)}${leaf(232, 92, -60, 1)}
        <g fill="none">${rings.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" stroke="#c88a3a" stroke-width="10"/><circle cx="${x}" cy="${y}" r="15" stroke="#efc373" stroke-width="7"/>`).join("")}</g>
        ${leaf(58, 166, 20, 1)}${leaf(228, 164, -140, 1.05)}${lemon(212, 148, 20)}`;
    },
    shrimp: () => {
      const s = [[110, 92, -20], [160, 84, 10], [124, 132, 30], [176, 128, -10]];
      return `${leaf(50, 136, -20, 1.05)}${leaf(232, 92, -60, 1)}
        <ellipse cx="150" cy="112" rx="88" ry="62" fill="#b5653e"/><ellipse cx="150" cy="108" rx="80" ry="54" fill="#e7a55c"/>
        ${s.map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-22 6C-24-18 14-26 22-4" stroke="#ee7f55" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M-22 6C-24-18 14-26 22-4" stroke="#f7b08d" stroke-width="4" fill="none" stroke-dasharray="4 5"/></g>`).join("")}
        <g fill="${LEAF}"><circle cx="132" cy="112" r="3"/><circle cx="190" cy="104" r="3"/><circle cx="150" cy="146" r="3"/></g>
        ${leaf(60, 166, 20, 1)}${leaf(228, 164, -140, 1)}`;
    },
    dip: () => `${leaf(52, 140, -20, 1.05)}${leaf(232, 94, -60, 1)}
      <ellipse cx="150" cy="112" rx="82" ry="60" fill="#fbf8ee" stroke="#e6e1cf" stroke-width="2"/>
      <path d="M150 112m-50 0a50 36 0 1 0 100 0a40 28 0 1 0-80 0a30 20 0 1 0 60 0" fill="none" stroke="#e8dfc4" stroke-width="3"/>
      <path d="M120 106c18 8 42 8 64-2" stroke="#c9b24a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
      <g fill="${LEAF}">${[[120, 92], [140, 128], [168, 96], [182, 124], [150, 108], [128, 116]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.4" transform="rotate(30 ${x} ${y})"/>`).join("")}</g>
      ${leaf(58, 166, 20, 1)}${leaf(228, 162, -140, 1)}`,
    greens: () => {
      let g = "";
      for (let i = 0; i < 22; i++) { const x = 90 + ((i * 37) % 120), y = 70 + ((i * 23) % 80), r = -40 + ((i * 29) % 80); g += `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0l10 -5 8 4 10-6 10 5" stroke="${i % 3 ? "#6f8f52" : "#8aa86a"}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
      return `${leaf(52, 140, -20, 1.05)}${leaf(232, 94, -60, 1)}${g}${lemon(206, 148, 18)}${leaf(58, 166, 20, 1)}${leaf(228, 162, -140, 1)}`;
    },
    salad: () => {
      let l = "";
      [[100, 100, -30], [140, 80, 10], [180, 96, 40], [120, 130, 60], [170, 130, -60], [150, 110, 90]].forEach(([x, y, r]) => (l += leaf(x - 20, y, r, 0.9)));
      const t = [[128, 98], [168, 118], [146, 136], [186, 92], [112, 122]];
      return `${leaf(52, 140, -20, 1.05)}${leaf(232, 94, -60, 1)}${l}
        ${t.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#d9573b"/><circle cx="${x - 3}" cy="${y - 3}" r="2.4" fill="#f39b85"/>`).join("")}
        <g fill="#f4efdc" stroke="#e1d9bf">${[[150, 92], [136, 118], [180, 106]].map(([x, y]) => `<rect x="${x}" y="${y}" width="13" height="11" rx="2"/>`).join("")}</g>
        <g fill="#9b2741">${[[160, 100], [124, 140], [194, 126], [142, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join("")}</g>`;
    },
    pudding: () => `${leaf(52, 140, -20, 1.05)}${leaf(232, 94, -60, 1)}
      <ellipse cx="150" cy="112" rx="78" ry="58" fill="#b8673b"/><ellipse cx="150" cy="108" rx="66" ry="47" fill="#f1dcae"/>
      <g fill="#b9763a" opacity=".85"><ellipse cx="130" cy="96" rx="18" ry="10"/><ellipse cx="166" cy="116" rx="22" ry="12"/><ellipse cx="148" cy="88" rx="9" ry="6"/><ellipse cx="124" cy="122" rx="10" ry="6"/></g>
      <g fill="#7a4520" opacity=".5"><circle cx="134" cy="96" r="3"/><circle cx="170" cy="114" r="4"/><circle cx="160" cy="122" r="2"/></g>
      ${leaf(58, 166, 20, 1)}${leaf(228, 162, -140, 1)}`,
    drink: (id) => `
      <defs><linearGradient id="dg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbeaa0"/><stop offset="1" stop-color="#f0cf55"/></linearGradient></defs>
      ${leaf(52, 140, -20, 1.05)}${leaf(232, 94, -60, 1)}
      <circle cx="150" cy="112" r="58" fill="#e8eee4" stroke="#c9d3c4" stroke-width="3"/>
      <circle cx="150" cy="112" r="48" fill="url(#dg${id})"/>
      <g fill="#fff" opacity=".75"><rect x="126" y="96" width="16" height="16" rx="3" transform="rotate(14 134 104)"/><rect x="156" y="120" width="15" height="15" rx="3" transform="rotate(-18 163 127)"/><rect x="150" y="90" width="12" height="12" rx="3"/></g>
      ${leaf(120, 128, -30, 0.55)}${leaf(136, 118, 40, 0.5)}
      <rect x="172" y="66" width="6" height="58" rx="3" transform="rotate(30 175 95)" fill="${INK}"/>
      ${lemon(196, 64, 20)}${leaf(58, 166, 20, 1)}${leaf(228, 162, -140, 1)}`,
  };
  function plateSVG(kind) {
    const id = ++artSeq;
    const inner = (ARTS[kind] || ARTS.dip)(id);
    return `<svg viewBox="0 0 300 224" aria-hidden="true">
      <defs><radialGradient id="pl${id}" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#f6f2dc"/><stop offset="1" stop-color="#e9e6cc"/></radialGradient></defs>
      <ellipse cx="150" cy="118" rx="134" ry="100" fill="#000" opacity=".05"/>
      <ellipse cx="150" cy="112" rx="134" ry="100" fill="url(#pl${id})" stroke="#dedcc4" stroke-width="2"/>
      <ellipse cx="150" cy="112" rx="114" ry="82" fill="none" stroke="${INK}" stroke-width="2"/>
      <ellipse cx="150" cy="112" rx="108" ry="77" fill="none" stroke="${INK}" stroke-width=".8" opacity=".5"/>
      ${inner}</svg>`;
  }

  /* ---------------------------------------------------------------- State */
  const state = {
    table: null,             // { code, name }
    menu: null,
    category: "all",
    query: "",
    vegOnly: false,
    cart: [],                // { key, productId, quantity, optionIds[], note }
    orders: [],              // { id, number, status, createdAt, items, total, tableName }
    mock: CONFIG.USE_MOCK === true,
  };
  const cartKey = () => `sofra_cart_${state.table.code}`;
  const ordersKey = () => `sofra_orders_${state.table.code}`;
  const saveCart = () => store.set(cartKey(), state.cart, sessionStorage);
  const saveOrders = () => store.set(ordersKey(), state.orders);

  /* ------------------------------------------------------------------ API */
  async function http(path, opts = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.REQUEST_TIMEOUT);
    try {
      const res = await fetch(CONFIG.API_BASE + path, {
        ...opts,
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(opts.headers || {}) },
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) { const e = new Error("API yanıtı JSON değil"); e.network = true; throw e; }
      const body = await res.json();
      if (!res.ok) { const e = new Error(body?.message || `İstek başarısız (${res.status})`); e.status = res.status; throw e; }
      return body?.data !== undefined ? body.data : body;
    } catch (err) {
      if (err.name === "AbortError" || err instanceof TypeError) err.network = true;
      throw err;
    } finally { clearTimeout(t); }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const api = {
    async getMenu(code) {
      if (!state.mock) {
        try { return await http(`/tables/${encodeURIComponent(code)}/menu`); }
        catch (err) { if (!(err.network && CONFIG.USE_MOCK === "auto")) throw err; state.mock = true; console.info("[sofra] API'ye ulaşılamadı, mock veri kullanılıyor."); }
      }
      await wait(250);
      if (!MOCK_TABLES[code]) { const e = new Error("Masa bulunamadı"); e.status = 404; throw e; }
      return { ...MOCK_MENU, table: { code, name: MOCK_TABLES[code] } };
    },
    async createOrder(payload) {
      if (!state.mock) return http("/orders", { method: "POST", body: JSON.stringify(payload) });
      await wait(700);
      // Mock: fiyatı (backend'in yapacağı gibi) menüden hesapla
      const items = payload.items.map((it) => {
        const p = findProduct(it.productId);
        const opts = allOptions(p).filter((o) => it.optionIds.includes(o.id));
        const unit = p.price + opts.reduce((s, o) => s + o.price, 0);
        return { productId: p.id, name: p.name, quantity: it.quantity, options: opts.map((o) => o.name), note: it.note, unitPrice: unit, lineTotal: unit * it.quantity };
      });
      return {
        id: "mock-" + Date.now(), number: Math.floor(10000 + Math.random() * 89999), status: "new",
        createdAt: new Date().toISOString(), tableName: state.table.name, note: payload.note,
        items, total: items.reduce((s, i) => s + i.lineTotal, 0),
      };
    },
    async getOrder(id) { return http(`/orders/${encodeURIComponent(id)}`); },
    async serviceCall(type) {
      if (!state.mock) return http(`/tables/${encodeURIComponent(state.table.code)}/calls`, { method: "POST", body: JSON.stringify({ type }) });
      await wait(450); return { ok: true };
    },
  };

  /* ------------------------------------------------------ Live order updates */
  let socket = null, pollTimer = null;
  function applyStatus(orderId, status) {
    const o = state.orders.find((x) => String(x.id) === String(orderId));
    if (!o || o.status === status || !STATUS[status]) return;
    o.status = status; saveOrders(); renderTrack();
    toast(`Sipariş #${o.number}: ${STATUS[status].label}`);
  }
  function startLiveUpdates() {
    stopPolling();
    const active = state.orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    if (!active.length) return;
    if (state.mock) { active.forEach(simulateProgress); return; }
    if (!socket && "WebSocket" in window) {
      try {
        const base = CONFIG.WS_URL || new URL(CONFIG.API_BASE, location.href).origin.replace(/^http/, "ws");
        socket = new WebSocket(`${base}/ws?table=${encodeURIComponent(state.table.code)}`);
        socket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const evt = msg.event || msg.type, data = msg.data || msg.payload || msg;
            if (evt === "order_status_updated") applyStatus(data.orderId ?? data.id, data.status);
          } catch { /* yoksay */ }
        };
        socket.onclose = () => { socket = null; startPolling(); };
        socket.onerror = () => { try { socket.close(); } catch {} };
      } catch { startPolling(); }
    }
    startPolling(); // WS olsa da güvenlik ağı olarak seyrek polling
  }
  function startPolling() {
    if (pollTimer || state.mock) return;
    pollTimer = setInterval(async () => {
      const active = state.orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
      if (!active.length) return stopPolling();
      for (const o of active) { try { const r = await api.getOrder(o.id); applyStatus(o.id, r.status); } catch { /* sessiz */ } }
    }, CONFIG.POLL_INTERVAL);
  }
  function stopPolling() { clearInterval(pollTimer); pollTimer = null; }
  const simulated = new Set();
  function simulateProgress(order) {
    if (simulated.has(order.id)) return;
    simulated.add(order.id);
    const flow = ["new", "confirmed", "preparing", "ready", "delivered"];
    const tick = () => {
      const i = flow.indexOf(order.status);
      if (i < 0 || i >= flow.length - 1) return;
      setTimeout(() => { applyStatus(order.id, flow[i + 1]); tick(); }, i === 0 ? 8000 : 14000);
    };
    tick();
  }

  /* --------------------------------------------------------- Menu helpers */
  const findProduct = (id) => state.menu.products.find((p) => String(p.id) === String(id));
  const allOptions = (p) => (p?.optionGroups || []).flatMap((g) => g.options);
  const catName = (id) => state.menu.categories.find((c) => c.id === id)?.name || "";
  function unitPrice(item) {
    const p = findProduct(item.productId); if (!p) return 0;
    return p.price + allOptions(p).filter((o) => item.optionIds.includes(o.id)).reduce((s, o) => s + o.price, 0);
  }
  const cartTotal = () => state.cart.reduce((s, it) => s + unitPrice(it) * it.quantity, 0);
  const cartCount = () => state.cart.reduce((s, it) => s + it.quantity, 0);
  const needsOptions = (p) => (p.optionGroups || []).some((g) => g.required && !g.options.some((o) => o.default));
  const defaultOptionIds = (p) => (p.optionGroups || []).flatMap((g) => (g.type === "single" ? g.options.filter((o) => o.default).slice(0, 1) : [])).map((o) => o.id);

  /* --------------------------------------------------------------- Render */
  function renderChips() {
    const cats = [{ id: "all", name: "Tümü" }, ...state.menu.categories];
    $("#chips").innerHTML = cats.map((c) => `<button class="chip ${state.category === c.id ? "is-active" : ""}" role="tab" aria-selected="${state.category === c.id}" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join("");
  }
  function filtered() {
    const q = norm(state.query.trim());
    return state.menu.products.filter((p) =>
      (state.category === "all" || p.categoryId === state.category) &&
      (!state.vegOnly || p.vegetarian) &&
      (!q || norm(`${p.name} ${p.description} ${catName(p.categoryId)}`).includes(q)));
  }
  function renderGrid() {
    const list = filtered();
    $("#result-count").textContent = `${list.length} lezzet keşfedilmeyi bekliyor`;
    $("#empty").hidden = list.length > 0;
    $("#grid").innerHTML = list.map((p, i) => {
      const out = p.isAvailable === false;
      return `<article class="card ${out ? "is-soldout" : ""}" data-id="${p.id}" style="animation-delay:${i * 40}ms" tabindex="${out ? -1 : 0}">
        <div class="card__art">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}${out ? `<span class="badge badge--out">Tükendi</span>` : ""}${plateSVG(p.art)}</div>
        <div class="card__body">
          <span class="card__cat">${esc(catName(p.categoryId))}</span>
          <h3 class="card__title serif">${esc(p.name)}</h3>
          <p class="card__desc">${esc(p.description)}</p>
          ${(p.allergens?.length || p.vegetarian) ? `<div class="allergens">${p.vegetarian ? `<span class="allergen allergen--veg">🌿 Vejetaryen</span>` : ""}${(p.allergens || []).map((a) => `<span class="allergen">${esc(a)}</span>`).join("")}</div>` : ""}
          <div class="card__foot"><span class="price">${money(p.price)}</span>${out ? "" : `<button class="add" data-add="${p.id}" aria-label="${esc(p.name)} sepete ekle">+</button>`}</div>
        </div></article>`;
    }).join("");
  }
  function renderCartBadge() {
    const n = cartCount();
    $("#cart-count").textContent = n;
    $("#cart-count").hidden = n === 0;
  }
  function renderCart() {
    renderCartBadge();
    const empty = state.cart.length === 0;
    $("#cart-empty").hidden = !empty;
    $("#cart-footer").hidden = empty;
    $("#cart-items").innerHTML = state.cart.map((it) => {
      const p = findProduct(it.productId); if (!p) return "";
      const opts = allOptions(p).filter((o) => it.optionIds.includes(o.id)).map((o) => o.name);
      return `<div class="cart-item" data-key="${esc(it.key)}">
        <div class="cart-item__art">${plateSVG(p.art)}</div>
        <div>
          <p class="cart-item__name">${esc(p.name)}</p>
          ${opts.length ? `<p class="cart-item__opts">${esc(opts.join(" · "))}</p>` : ""}
          <p class="cart-item__price">${money(unitPrice(it) * it.quantity)}</p>
          <div class="cart-item__row">
            <div class="qty qty--sm"><button data-cq="-1" aria-label="Azalt">−</button><span>${it.quantity}</span><button data-cq="1" aria-label="Artır">+</button></div>
            <div class="cart-item__actions"><button class="text-link" data-note>${it.note ? "Notu düzenle" : "Not ekle"}</button><button class="text-link" data-remove>Kaldır</button></div>
          </div>
          <textarea class="cart-item__note" rows="2" placeholder="Bu ürün için notunuz" ${it.note ? "" : "hidden"}>${esc(it.note || "")}</textarea>
        </div></div>`;
    }).join("");
    $("#cart-total").textContent = money(cartTotal());
  }
  function renderTrack() {
    $("#track-btn").hidden = state.orders.length === 0;
    $("#track-list").innerHTML = [...state.orders].reverse().map((o) => {
      const st = STATUS[o.status] || STATUS.new;
      return `<div class="order-card">
        <h3 class="serif">Sipariş #${esc(o.number)}</h3>
        <span class="status-pill ${o.status === "ready" ? "status-pill--ready" : ""}">${esc(st.label)}</span>
        <div class="steps">${STEP_LABELS.map((_, i) => `<i class="${i < st.step ? "on" : ""}"></i>`).join("")}</div>
        <div class="steps-labels">${STEP_LABELS.map((l) => `<span>${l}</span>`).join("")}</div>
        <p class="order-meta">${fmtDate(o.createdAt)} · ${esc(o.tableName || state.table.name)}</p>
        <ul class="order-lines">${(o.items || []).map((i) => `<li>${i.quantity} × ${esc(i.name)}${i.options?.length ? `<small>${esc(i.options.join(" · "))}</small>` : ""}${i.note ? `<small>Not: ${esc(i.note)}</small>` : ""}</li>`).join("")}</ul>
        <div class="order-total">${money(o.total)}</div>
      </div>`;
    }).join("");
  }

  /* ------------------------------------------------------------ Overlays */
  const openStack = [];
  function openOverlay(id) {
    const el = $(id); el.hidden = false; openStack.push(el); document.body.classList.add("lock");
    setTimeout(() => el.querySelector("[data-close], button")?.focus({ preventScroll: true }), 30);
  }
  function closeOverlay(el = openStack[openStack.length - 1]) {
    if (!el) return; el.hidden = true;
    const i = openStack.indexOf(el); if (i > -1) openStack.splice(i, 1);
    if (!openStack.length) document.body.classList.remove("lock");
  }
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* --------------------------------------------------------- Product modal */
  const pm = { product: null, qty: 1 };
  function openProduct(id) {
    const p = findProduct(id); if (!p || p.isAvailable === false) return;
    pm.product = p; pm.qty = 1;
    $("#pm-art").innerHTML = plateSVG(p.art);
    $("#pm-cat").textContent = catName(p.categoryId);
    $("#pm-title").textContent = p.name;
    $("#pm-desc").textContent = p.description;
    $("#pm-info").innerHTML = [p.portion && esc(p.portion), p.allergens?.length ? `Alerjen bilgisi: ${esc(p.allergens.join(", "))}` : null].filter(Boolean).join("<br>");
    $("#pm-options").innerHTML = (p.optionGroups || []).map((g) => `
      <fieldset class="opt-group" data-group="${esc(g.id)}" style="border:0;padding:0;margin:18px 0 8px">
        <legend class="opt-group__title">${esc(g.name)} · <span>${g.required ? "Zorunlu" : "İsteğe bağlı"}</span></legend>
        ${g.options.map((o) => `<label class="opt">
          <input type="${g.type === "single" ? "radio" : "checkbox"}" name="g-${esc(g.id)}" value="${o.id}" ${o.default ? "checked" : ""} />
          ${esc(o.name)} ${o.price ? `<span class="opt__price">+${money(o.price)}</span>` : ""}</label>`).join("")}
      </fieldset>`).join("");
    $("#pm-note").value = "";
    updatePm();
    openOverlay("#product-overlay");
    $("#product-overlay .modal").scrollTop = 0;
  }
  const pmSelected = () => $$("#pm-options input:checked").map((i) => Number(i.value));
  function updatePm() {
    $("#pm-qty span").textContent = pm.qty;
    $("#pm-total").textContent = money(unitPrice({ productId: pm.product.id, optionIds: pmSelected() }) * pm.qty);
  }
  function addToCart(productId, optionIds, quantity, note = "") {
    const sorted = [...optionIds].sort((a, b) => a - b);
    const key = `${productId}|${sorted.join(",")}|${note.trim()}`;
    const existing = state.cart.find((c) => c.key === key);
    if (existing) existing.quantity += quantity;
    else state.cart.push({ key, productId, optionIds: sorted, quantity, note: note.trim() });
    saveCart(); renderCart();
    const btn = $("#cart-open"); btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
    toast(`${findProduct(productId).name} sofranıza eklendi`);
  }

  /* ---------------------------------------------------------- Send order */
  let sending = false;
  async function sendOrder() {
    if (sending || !state.cart.length) return;
    const btn = $("#send-order"), err = $("#order-error");
    sending = true; err.hidden = true; btn.disabled = true;
    btn.innerHTML = `<span class="btn__label">Gönderiliyor…</span><span class="spinner"></span>`;
    const payload = {
      tableCode: state.table.code,
      note: $("#order-note").value.trim(),
      items: state.cart.map((c) => ({ productId: c.productId, quantity: c.quantity, optionIds: c.optionIds, note: c.note })),
      clientRequestId: (crypto.randomUUID?.() || String(Date.now())), // çift gönderime karşı
    };
    try {
      const res = await api.createOrder(payload);
      const order = {
        id: res.id, number: res.number ?? res.orderNumber ?? res.id, status: res.status || "new",
        createdAt: res.createdAt || new Date().toISOString(), tableName: res.tableName || state.table.name,
        items: res.items?.length ? res.items.map((i) => ({ name: i.name ?? i.productName ?? findProduct(i.productId)?.name, quantity: i.quantity, options: i.options || [], note: i.note }))
          : state.cart.map((c) => ({ name: findProduct(c.productId).name, quantity: c.quantity, options: allOptions(findProduct(c.productId)).filter((o) => c.optionIds.includes(o.id)).map((o) => o.name), note: c.note })),
        total: res.total ?? res.totalAmount ?? cartTotal(),
      };
      state.orders.push(order); saveOrders();
      state.cart = []; saveCart(); $("#order-note").value = "";
      renderCart(); renderTrack();
      closeOverlay($("#cart-overlay"));
      openOverlay("#track-overlay");
      startLiveUpdates();
    } catch (e) {
      err.textContent = e.network ? "Bağlantı kurulamadı. Lütfen tekrar deneyin." : (e.message || "Sipariş gönderilemedi.");
      err.hidden = false;
    } finally {
      sending = false; btn.disabled = false;
      btn.innerHTML = `<span class="btn__label">Siparişi gönder</span><span class="arrow">↗</span>`;
    }
  }

  /* ------------------------------------------------------ Table services */
  let pendingCall = null;
  const lastCall = {};
  function askService(type) {
    pendingCall = type;
    const waiter = type === "waiter";
    $("#cf-eyebrow").textContent = state.table.name;
    $("#cf-title").textContent = waiter ? "Garson çağıralım mı?" : "Hesabı isteyelim mi?";
    $("#cf-text").textContent = waiter ? "Bir arkadaşımız birazdan masanıza gelecek." : "Hesabınız masanıza getirilecek. Ödeme restoran içerisinde yapılır.";
    $("#cf-ok").textContent = waiter ? "Evet, çağır" : "Evet, iste";
    openOverlay("#confirm-overlay");
  }
  async function confirmService() {
    const type = pendingCall; if (!type) return;
    if (lastCall[type] && Date.now() - lastCall[type] < 30000) { closeOverlay(); toast("İsteğiniz zaten iletildi, birazdan yanınızdayız."); return; }
    const ok = $("#cf-ok"); ok.disabled = true;
    try {
      await api.serviceCall(type === "waiter" ? "waiter_call" : "bill_request");
      lastCall[type] = Date.now(); closeOverlay();
      toast(type === "waiter" ? "🔔 Garson çağrınız iletildi." : "💳 Hesap isteğiniz iletildi.");
    } catch { toast("İstek iletilemedi, lütfen tekrar deneyin."); }
    finally { ok.disabled = false; }
  }

  /* --------------------------------------------------------------- Events */
  function bind() {
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      state.category = b.dataset.cat; renderChips(); renderGrid();
    });
    let st; $("#search").addEventListener("input", (e) => { clearTimeout(st); st = setTimeout(() => { state.query = e.target.value; renderGrid(); }, 120); });
    $("#veg").addEventListener("change", (e) => { state.vegOnly = e.target.checked; renderGrid(); });

    $("#grid").addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        e.stopPropagation();
        const p = findProduct(add.dataset.add);
        if (needsOptions(p)) openProduct(p.id); else addToCart(p.id, defaultOptionIds(p), 1);
        return;
      }
      const card = e.target.closest(".card"); if (card) openProduct(card.dataset.id);
    });
    $("#grid").addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) { e.preventDefault(); openProduct(e.target.dataset.id); }
    });

    $("#pm-options").addEventListener("change", () => { $$(".opt-group.is-invalid").forEach((g) => g.classList.remove("is-invalid")); updatePm(); });
    $("#pm-qty").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; pm.qty = Math.max(1, Math.min(20, pm.qty + Number(b.dataset.q))); updatePm(); });
    $("#pm-add").addEventListener("click", () => {
      const sel = pmSelected();
      const missing = pm.product.optionGroups.filter((g) => g.required && !g.options.some((o) => sel.includes(o.id)));
      if (missing.length) {
        missing.forEach((g) => $(`.opt-group[data-group="${CSS.escape(g.id)}"]`).classList.add("is-invalid"));
        $(`.opt-group[data-group="${CSS.escape(missing[0].id)}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
        toast("Lütfen zorunlu seçimleri yapın."); return;
      }
      addToCart(pm.product.id, sel, pm.qty, $("#pm-note").value);
      closeOverlay($("#product-overlay"));
    });

    $("#cart-open").addEventListener("click", () => { renderCart(); openOverlay("#cart-overlay"); });
    $("#cart-items").addEventListener("click", (e) => {
      const row = e.target.closest(".cart-item"); if (!row) return;
      const item = state.cart.find((c) => c.key === row.dataset.key); if (!item) return;
      if (e.target.closest("[data-cq]")) {
        item.quantity += Number(e.target.closest("[data-cq]").dataset.cq);
        if (item.quantity <= 0) state.cart = state.cart.filter((c) => c !== item);
      } else if (e.target.closest("[data-remove]")) {
        state.cart = state.cart.filter((c) => c !== item);
      } else if (e.target.closest("[data-note]")) {
        const ta = $(".cart-item__note", row); ta.hidden = false; ta.focus(); return;
      } else return;
      saveCart(); renderCart();
    });
    $("#cart-items").addEventListener("input", (e) => {
      if (!e.target.classList.contains("cart-item__note")) return;
      const item = state.cart.find((c) => c.key === e.target.closest(".cart-item").dataset.key);
      if (item) { item.note = e.target.value; saveCart(); }
    });
    $("#order-note").addEventListener("input", (e) => store.set(`sofra_note_${state.table.code}`, e.target.value, sessionStorage));
    $("#send-order").addEventListener("click", sendOrder);

    document.addEventListener("click", (e) => {
      const act = e.target.closest("[data-action]");
      if (act) {
        const a = act.dataset.action;
        if (a === "track") { renderTrack(); openOverlay("#track-overlay"); }
        else askService(a);
        return;
      }
      if (e.target.closest("[data-close]")) { closeOverlay(e.target.closest(".overlay")); return; }
      if (e.target.classList.contains("overlay")) closeOverlay(e.target);
    });
    $("#cf-ok").addEventListener("click", confirmService);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openStack.length) closeOverlay(); });
  }

  /* --------------------------------------------------------- Table session */
  function readTableCode() {
    const url = new URL(location.href);
    const fromPath = url.pathname.match(/\/m\/([^/?#]+)/)?.[1];
    const fromHash = url.hash.match(/\/m\/([^/?#]+)/)?.[1];
    const fromQuery = url.searchParams.get("table") || url.searchParams.get("qr") || url.searchParams.get("qrCode");
    const raw = fromPath || fromHash || fromQuery;
    if (raw) return decodeURIComponent(raw).trim();
    // QR olmadan açıldıysa önceki oturumu kullan
    const sess = store.get("sofra_session", null);
    if (sess?.code && Date.now() - sess.startedAt < 6 * 3600 * 1000) return sess.code;
    // Yerel geliştirmede kolaylık: varsayılan masa
    if (["localhost", "127.0.0.1", ""].includes(location.hostname) || location.protocol === "file:") return "table-7";
    return null;
  }
  const isValidCode = (c) => typeof c === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(c);

  function showInvalid() { $("#app").hidden = true; $("#invalid-qr").hidden = false; }

  async function init() {
    const code = readTableCode();
    if (!isValidCode(code)) return showInvalid();
    try {
      const menu = await api.getMenu(code);
      state.menu = {
        categories: menu.categories || [],
        products: (menu.products || []).map((p) => ({ optionGroups: [], allergens: [], isAvailable: true, art: "dip", ...p, price: Number(p.price) })),
      };
      state.table = { code, name: menu.table?.name || `Masa ${code.replace(/\D/g, "") || code}` };
    } catch (e) {
      console.warn("[sofra] Menü yüklenemedi:", e);
      return showInvalid();
    }
    const prev = store.get("sofra_session", null);
    store.set("sofra_session", { code, name: state.table.name, startedAt: prev?.code === code ? prev.startedAt : Date.now() });

    state.cart = store.get(cartKey(), [], sessionStorage).filter((c) => findProduct(c.productId));
    state.orders = store.get(ordersKey(), []).filter((o) => Date.now() - new Date(o.createdAt) < 12 * 3600 * 1000);
    $("#order-note").value = store.get(`sofra_note_${code}`, "", sessionStorage);

    $("#table-chip").textContent = state.table.name;
    document.title = `Sofra · ${state.table.name}`;
    $(".hero__plate").innerHTML = plateSVG("fish");
    renderChips(); renderGrid(); renderCart(); renderTrack(); bind();
    $("#app").hidden = false;
    startLiveUpdates();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
