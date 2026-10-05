// API katmanı — docs/api-spec.json sözleşmesine göre yazıldı.
// Backend hazır olduğunda USE_MOCK = false yapın ve API_BASE'i kontrol edin.

const USE_MOCK = true;
const API_BASE = "http://localhost:3000/api/v1";

const STATUS_FLOW = ["pending", "confirmed", "preparing", "ready", "delivered"];
const STATUS_LABELS = {
  pending: "Sipariş alındı",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim edildi"
};

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function request(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Sunucuya ulaşılamadı.");
  return data;
}

// ---- Mock sipariş durumu: her ~8 saniyede bir sonraki aşamaya geçer ----
const mockOrders = {};
let mockOrderCounter = 1042;

function priceOf(menu, item) {
  for (const c of menu.categories) {
    const p = c.products.find(p => p.id === item.productId);
    if (!p) continue;
    let unit = p.price;
    for (const g of p.optionGroups || []) {
      for (const o of g.options) if (item.selectedOptionIds.includes(o.id)) unit += o.price;
    }
    return unit * item.quantity;
  }
  return 0;
}

const Api = {
  STATUS_FLOW,
  STATUS_LABELS,

  // GET /tables/{qrCode}/menu
  async getMenu(qrCode) {
    if (USE_MOCK) {
      await wait(400);
      if (!qrCode || qrCode === "gecersiz") throw new Error("Bu QR koduna ait masa bulunamadı.");
      return JSON.parse(JSON.stringify(window.MOCK_MENU));
    }
    return request(`/tables/${encodeURIComponent(qrCode)}/menu`);
  },

  // POST /orders — fiyat gönderilmez, backend hesaplar
  async createOrder(payload) {
    if (USE_MOCK) {
      await wait(900);
      const n = mockOrderCounter++;
      const total = payload.items.reduce((s, it) => s + priceOf(window.MOCK_MENU, it), 0);
      const order = {
        orderId: "ord_" + n, orderNumber: "#" + n, status: "pending",
        totalPrice: total, createdAt: new Date().toISOString(),
        message: "Siparişiniz alındı, mutfağa iletiliyor."
      };
      mockOrders[order.orderId] = { ...order, startedAt: Date.now() };
      return order;
    }
    return request("/orders", { method: "POST", body: JSON.stringify(payload) });
  },

  // GET /orders/{orderId}/status
  async getOrderStatus(orderId) {
    if (USE_MOCK) {
      await wait(150);
      const o = mockOrders[orderId];
      if (!o) throw new Error("Sipariş bulunamadı.");
      const step = Math.min(STATUS_FLOW.length - 1, Math.floor((Date.now() - o.startedAt) / 8000));
      const status = STATUS_FLOW[step];
      return { orderId, orderNumber: o.orderNumber, status, statusLabel: STATUS_LABELS[status], updatedAt: new Date().toISOString() };
    }
    return request(`/orders/${encodeURIComponent(orderId)}/status`);
  },

  // POST /tables/{tableId}/waiter-call  — type: "waiter" | "bill"
  async callStaff(tableId, type, note) {
    if (USE_MOCK) {
      await wait(600);
      return { success: true, message: type === "bill" ? "Hesap isteğiniz iletildi." : "Garsonunuza bildirim iletildi." };
    }
    return request(`/tables/${encodeURIComponent(tableId)}/waiter-call`, {
      method: "POST", body: JSON.stringify({ type, note })
    });
  }
};

window.Api = Api;
