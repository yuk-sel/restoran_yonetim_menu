// Sofra yönetim paneli — sunucu bağlantısı
// Gerçek sunucu: server/src/app.js (node src/app.js ile çalışır, port 3000)
// Sunucu kapalıyken "örnek verilerle göz at" seçilirse aynı fonksiyonlar örnek veriyle çalışır.

const CONFIG = {
  API_BASE: "http://localhost:3000/api",
  // Masa QR kodlarının açacağı müşteri sayfası
  CUSTOMER_APP: new URL("../customer-client/index.html", location.href).href
};

const STATUS = {
  PENDING:   { label: "Yeni",          next: "APPROVED",  action: "Onayla" },
  APPROVED:  { label: "Onaylandı",     next: "PREPARING", action: "Hazırlamaya başla" },
  PREPARING: { label: "Hazırlanıyor",  next: "READY",     action: "Hazır" },
  READY:     { label: "Hazır",         next: "DELIVERED", action: "Teslim edildi" },
  DELIVERED: { label: "Teslim edildi", next: null },
  CANCELLED: { label: "İptal",         next: null }
};

const Auth = {
  get token() { return localStorage.getItem("token"); },
  get user() { try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; } },
  get demo() { return localStorage.getItem("demo") === "1"; },
  // Token içindeki restaurant_id (sunucu login'de token'a koyuyor)
  get restaurantId() {
    try {
      const p = JSON.parse(atob(this.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p.restaurant_id;
    } catch { return 1; }
  },
  save(token, user, demo) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    if (demo) localStorage.setItem("demo", "1"); else localStorage.removeItem("demo");
  },
  clear() { ["token", "user", "demo"].forEach((k) => localStorage.removeItem(k)); }
};

class NetworkError extends Error {}

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(CONFIG.API_BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(Auth.token ? { Authorization: "Bearer " + Auth.token } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new NetworkError("Sunucuya ulaşılamadı. Sunucunun açık olduğundan emin olun.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login") {
    Auth.clear();
    location.href = "login.html?expired=1";
    throw new Error("Oturum süresi doldu.");
  }
  if (res.status === 404 && !data.error) throw new Error("Sunucuda bu özellik henüz yok.");
  if (!res.ok) throw new Error(data.error || "İşlem tamamlanamadı.");
  return data;
}

/* ------------------------------------------------------------------ */
/* Örnek veri (sunucu yokken tasarımı görmek için)                     */
/* ------------------------------------------------------------------ */
const Demo = (() => {
  const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
  const daysAgo = (d, h) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, Math.floor(Math.random() * 60), 0, 0); return x.toISOString(); };

  const categories = [
    { id: 1, name: "Burgerler", sort_order: 1 },
    { id: 2, name: "Ana Yemekler", sort_order: 2 },
    { id: 3, name: "Salatalar", sort_order: 3 },
    { id: 4, name: "İçecekler", sort_order: 4 },
    { id: 5, name: "Tatlılar", sort_order: 5 }
  ];
  const products = [
    [1, "Cheeseburger", "200g dana köfte, cheddar, karamelize soğan", 280],
    [1, "Mantarlı Burger", "180g dana köfte, kestane mantarı, İsviçre peyniri", 310],
    [1, "Tavuk Burger", "Çıtır tavuk göğsü, coleslaw, turşu", 240, "OUT_OF_STOCK"],
    [2, "Izgara Köfte", "Közlenmiş biber ve domates, tereyağlı pilav", 295],
    [2, "Tavuk Şiş", "Yoğurtlu marine tavuk, lavaş, közlenmiş sebze", 260],
    [2, "Fırın Mantı", "Sarımsaklı yoğurt, kızdırılmış tereyağı", 230],
    [3, "Çoban Salata", "Domates, salatalık, biber, kuru soğan", 120],
    [3, "Hellim Salata", "Izgara hellim, roka, nar ekşisi", 190],
    [4, "Ayran", "Yayık ayranı", 45],
    [4, "Ev Yapımı Limonata", "Taze nane ile", 75],
    [4, "Türk Kahvesi", "Lokum ile", 70],
    [4, "Çay", "Demlik çay", 25],
    [5, "Künefe", "Hatay usulü, Antep fıstıklı", 180],
    [5, "Sütlaç", "Fırında, karamelize", 110]
  ].map(([category_id, name, description, price, status], i) => ({
    id: 101 + i, category_id, name, description, price, image_url: null, status: status || "AVAILABLE"
  }));

  const tables = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, table_number: String(i + 1),
    qr_code: "qr_table_" + (i + 1) + "_" + Math.random().toString(36).slice(2, 6),
    current_session_id: [2, 4, 5, 7, 9, 12].includes(i + 1) ? "sess-" + (i + 1) : null
  }));

  const pick = (pid, q, extra) => {
    const p = products.find((x) => x.id === pid);
    return { name: p.name, quantity: q, unit_price: p.price, ...(extra || {}) };
  };
  const mk = (id, table_id, status, created_at, items) => ({
    id, table_id, status, created_at, items,
    total_price: items.reduce((s, it) => s + it.unit_price * it.quantity, 0)
  });

  let orderSeq = 1060;
  const orders = [
    mk(1059, 7, "PENDING", minsAgo(1), [pick(101, 2, { options: "İyi pişmiş, Ekstra cheddar", note: "Soğan olmasın" }), pick(109, 2)]),
    mk(1058, 2, "PENDING", minsAgo(3), [pick(113, 1, { options: "Kaymak" }), pick(111, 2, { options: "Az şekerli" })]),
    mk(1057, 12, "APPROVED", minsAgo(6), [pick(104, 1, { options: "1,5 porsiyon" }), pick(107, 1)]),
    mk(1056, 5, "PREPARING", minsAgo(11), [pick(102, 1, { options: "Orta, Tatlı patates" }), pick(110, 1, { options: "Büyük" })]),
    mk(1055, 9, "PREPARING", minsAgo(19), [pick(106, 2, { note: "Biri sarımsaksız" }), pick(108, 1)]),
    mk(1054, 4, "READY", minsAgo(24), [pick(105, 2), pick(109, 2)]),
    mk(1053, 1, "DELIVERED", minsAgo(48), [pick(101, 1, { options: "Orta" }), pick(112, 2)]),
    mk(1052, 3, "DELIVERED", minsAgo(70), [pick(114, 2), pick(111, 2)]),
    mk(1051, 8, "CANCELLED", minsAgo(85), [pick(108, 1)]),
    mk(1050, 6, "DELIVERED", minsAgo(130), [pick(104, 2), pick(107, 1), pick(110, 2)]),
    mk(1049, 10, "DELIVERED", minsAgo(190), [pick(102, 2), pick(109, 3)]),
    mk(1048, 11, "DELIVERED", minsAgo(240), [pick(105, 1), pick(112, 1)]),
    mk(1047, 2, "DELIVERED", minsAgo(300), [pick(101, 3), pick(110, 3), pick(113, 1)])
  ];
  // Geçmiş günler (raporlar için)
  let hist = 900;
  for (let d = 1; d <= 30; d++) {
    const n = 8 + Math.floor(Math.random() * 14);
    for (let k = 0; k < n; k++) {
      const pid = products[Math.floor(Math.random() * products.length)].id;
      const st = Math.random() < 0.05 ? "CANCELLED" : "DELIVERED";
      orders.push(mk(hist++, 1 + Math.floor(Math.random() * 12), st, daysAgo(d, 11 + Math.floor(Math.random() * 11)),
        [pick(pid, 1 + Math.floor(Math.random() * 3)), pick(109 + Math.floor(Math.random() * 4), 1 + Math.floor(Math.random() * 2))]));
    }
  }

  const calls = [
    { id: 1, table_id: 9, call_type: "CALL_WAITER", created_at: minsAgo(2), is_resolved: false },
    { id: 2, table_id: 4, call_type: "REQUEST_BILL", created_at: minsAgo(4), is_resolved: false }
  ];
  let callSeq = 3, catSeq = 6, prodSeq = 200, tableSeq = 13;

  // Örnek modda arada bir yeni sipariş / çağrı gelsin ki bildirimler görülsün
  let lastSim = Date.now();
  function simulate() {
    if (Date.now() - lastSim < 50000) return;
    lastSim = Date.now();
    const t = tables[Math.floor(Math.random() * tables.length)];
    if (Math.random() < 0.7) {
      const a = products.filter((p) => p.status === "AVAILABLE");
      orders.unshift(mk(orderSeq++, t.id, "PENDING", new Date().toISOString(),
        [pick(a[Math.floor(Math.random() * a.length)].id, 1 + Math.floor(Math.random() * 2)), pick(109, 1)]));
    } else {
      calls.push({ id: callSeq++, table_id: t.id, call_type: Math.random() < 0.5 ? "CALL_WAITER" : "REQUEST_BILL", created_at: new Date().toISOString(), is_resolved: false });
    }
  }
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  return {
    async getOrders() { simulate(); await wait(120); return clone(orders); },
    async setOrderStatus(id, status) { await wait(150); const o = orders.find((x) => x.id == id); o.status = status; return clone(o); },
    async getTables() { await wait(100); return clone(tables); },
    async createTable(table_number) {
      await wait(150);
      if (tables.some((t) => t.table_number === String(table_number))) throw new Error(`${table_number} numaralı masa zaten var.`);
      const t = { id: tableSeq++, table_number: String(table_number), qr_code: "qr_table_" + table_number + "_" + Math.random().toString(36).slice(2, 6), current_session_id: null };
      tables.push(t); return clone(t);
    },
    async startSession(id) { await wait(120); const t = tables.find((x) => x.id == id); t.current_session_id = t.current_session_id || "sess-" + Date.now(); return clone(t); },
    async getCategories() { await wait(80); return clone(categories); },
    async getProducts(catId) { return clone(products.filter((p) => p.category_id == catId)); },
    async createCategory(name) { await wait(120); const c = { id: catSeq++, name, sort_order: categories.length + 1 }; categories.push(c); return clone(c); },
    async createProduct(p) { await wait(150); const n = { id: prodSeq++, status: "AVAILABLE", image_url: null, ...p }; products.push(n); return clone(n); },
    async setProductStatus(id, status) { await wait(100); products.find((x) => x.id == id).status = status; return true; },
    async getCalls() { await wait(80); return clone(calls.filter((c) => !c.is_resolved)); },
    async resolveCall(id) { await wait(100); const c = calls.find((x) => x.id == id); c.is_resolved = true; return clone(c); }
  };
})();

/* ------------------------------------------------------------------ */
/* Gerçek sunucu — server/src/routes/* ile birebir                     */
/* ------------------------------------------------------------------ */
const Live = {
  getOrders: () => request("/order/orders"),
  setOrderStatus: (id, status) => request(`/order/orders/${id}/status`, { method: "PATCH", body: { status } }),
  getTables: () => request("/table/tables"),
  createTable: (table_number) => request("/table/tables", {
    method: "POST",
    body: { restaurant_id: Auth.restaurantId, table_number: String(table_number), qr_code: "qr_table_" + table_number + "_" + Math.random().toString(36).slice(2, 8) }
  }),
  startSession: (id) => request(`/table/tables/${id}/start-session`, { method: "POST" }),
  getCategories: () => request("/menu/categories"),
  getProducts: (catId) => request(`/menu/categories/${catId}/products`),
  createCategory: (name) => request("/menu/categories", { method: "POST", body: { restaurant_id: Auth.restaurantId, name } }),
  createProduct: (p) => request("/menu/products", { method: "POST", body: p }),
  // Not: sunucuda henüz yok. Eklenince çalışır: PATCH /api/menu/products/:id/status { status }
  setProductStatus: (id, status) => request(`/menu/products/${id}/status`, { method: "PATCH", body: { status } }),
  getCalls: () => request("/waiter/active-calls"),
  resolveCall: (id) => request(`/waiter/calls/${id}/resolve`, { method: "PATCH" })
};

const Api = {
  get demo() { return Auth.demo; },
  src() { return Auth.demo ? Demo : Live; },
  async login(email, password) { return request("/auth/login", { method: "POST", body: { email, password } }); },
  async getAllProducts(categories) {
    const lists = await Promise.all(categories.map((c) => this.src().getProducts(c.id)));
    return lists.flat();
  }
};
["getOrders", "setOrderStatus", "getTables", "createTable", "startSession", "getCategories", "getProducts",
 "createCategory", "createProduct", "setProductStatus", "getCalls", "resolveCall"]
  .forEach((fn) => { Api[fn] = (...a) => Api.src()[fn](...a); });

window.CONFIG = CONFIG; window.STATUS = STATUS; window.Auth = Auth; window.Api = Api; window.NetworkError = NetworkError;
