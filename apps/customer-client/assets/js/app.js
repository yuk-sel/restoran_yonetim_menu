// Sofra müşteri arayüzü — QR menü, sepet, sipariş takibi, garson çağırma
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) => "₺" + Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const DEMO_QR = "qr_table_12_x89f";
  const store = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* gizli sekme vb. */ } }
  };

  const state = {
    qrCode: null,
    menu: null,
    products: {},            // id -> ürün
    cart: store.get("sofra_cart", []),
    orders: store.get("sofra_orders", []),   // [{orderId, orderNumber, status}]
    query: "",
    pollTimer: null
  };

  // ---------- 1. QR ve masa oturumu ----------
  function readQrCode() {
    const url = new URL(location.href);
    const fromQuery = url.searchParams.get("qr") || url.searchParams.get("table");
    const m = location.pathname.match(/\/m\/([^/]+)/);   // /m/table-12 biçimi
    const fromPath = m ? decodeURIComponent(m[1]) : null;
    const saved = store.get("sofra_session", null);
    return fromQuery || fromPath || (saved && saved.qrCode) || (USE_MOCK_DEMO() ? DEMO_QR : null);
  }
  function USE_MOCK_DEMO() { return typeof USE_MOCK !== "undefined" && USE_MOCK; }

  async function boot() {
    show("loading");
    state.qrCode = readQrCode();
    try {
      if (!state.qrCode) throw new Error("Bu sayfayı açmak için masanızdaki QR kodu okutun.");
      const menu = await Api.getMenu(state.qrCode);
      state.menu = menu;
      menu.categories.sort((a, b) => a.order - b.order);
      menu.categories.forEach((c) => c.products.forEach((p) => (state.products[p.id] = p)));

      // Farklı bir masaya geçildiyse eski sepeti temizle
      const prev = store.get("sofra_session", null);
      if (prev && prev.tableId !== menu.table.id) { state.cart = []; state.orders = []; }
      store.set("sofra_session", { qrCode: state.qrCode, tableId: menu.table.id, sessionId: menu.table.sessionId });
      state.cart = state.cart.filter((l) => state.products[l.productId]);
      saveCart();

      $("#tableNum").textContent = menu.table.number;
      $("#tableSection").textContent = menu.table.section || "Salon";
      document.title = `Masa ${menu.table.number} | Sofra Menü`;
      renderCats();
      renderMenu();
      renderCartBar();
      renderTrackPill();
      show("app");
      if (activeOrder()) startPolling();
    } catch (err) {
      $("#errorText").textContent = err.message || "Masanızdaki QR kodu tekrar okutun.";
      show("error");
    }
  }

  function show(which) {
    $("#loadingScreen").hidden = which !== "loading";
    $("#errorScreen").hidden = which !== "error";
    $("#app").hidden = which !== "app";
  }

  // ---------- 2. Menü ----------
  function renderCats() {
    const nav = $("#cats");
    nav.innerHTML = state.menu.categories
      .map((c, i) => `<button type="button" data-cat="${esc(c.id)}" ${i === 0 ? 'aria-current="true"' : ""}>${esc(c.name)}</button>`)
      .join("");
    nav.onclick = (e) => {
      const b = e.target.closest("button[data-cat]");
      if (!b) return;
      const sec = document.getElementById("sec-" + b.dataset.cat);
      if (sec) sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    setupScrollSpy();
  }

  function setupScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id.replace("sec-", "");
        document.querySelectorAll("#cats button").forEach((b) => {
          const on = b.dataset.cat === id;
          b.toggleAttribute("aria-current", on);
          if (on) b.setAttribute("aria-current", "true"), b.scrollIntoView({ inline: "center", block: "nearest" });
        });
      });
    }, { rootMargin: "-70px 0px -70% 0px" });
    state.spy && state.spy.disconnect();
    state.spy = io;
    document.querySelectorAll(".cat-sec").forEach((s) => io.observe(s));
  }

  function qtyInCart(pid) { return state.cart.filter((l) => l.productId === pid).reduce((s, l) => s + l.quantity, 0); }

  function thumbHtml(p, cls) {
    const initial = esc((p.name || "?").trim().charAt(0));
    if (p.imageUrl) {
      return `<img class="${cls}" src="${esc(p.imageUrl)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;${cls}&quot; aria-hidden=&quot;true&quot;>${initial}</div>'">`;
    }
    return `<div class="${cls}" aria-hidden="true">${initial}</div>`;
  }

  function renderMenu() {
    const q = state.query.trim().toLocaleLowerCase("tr");
    const html = state.menu.categories.map((c) => {
      const list = c.products.filter((p) => !q || (p.name + " " + (p.description || "")).toLocaleLowerCase("tr").includes(q));
      if (!list.length) return "";
      return `<section class="cat-sec" id="sec-${esc(c.id)}">
        <h2>${esc(c.name)}</h2>
        <p class="cat-count">${list.length} ürün</p>
        ${list.map(productRow).join("")}
      </section>`;
    }).join("");
    $("#menu").innerHTML = html || `<p class="empty">"${esc(state.query)}" ile eşleşen ürün yok. Başka bir kelime deneyin.</p>`;
    $("#cats").hidden = !!q;
    if (!q) setupScrollSpy();
  }

  function productRow(p) {
    const n = qtyInCart(p.id);
    const off = !p.isAvailable;
    const allergens = (p.allergens || []).map((a) => `<span class="allergen">${esc(a)}</span>`).join("");
    return `<button type="button" class="prod ${off ? "off" : ""}" data-pid="${esc(p.id)}" ${off ? 'aria-disabled="true"' : ""}>
      <div class="prod-info">
        <span class="prod-name">${esc(p.name)}</span>
        ${p.description ? `<span class="prod-desc">${esc(p.description)}</span>` : ""}
        <span class="prod-foot">
          <span class="price">${fmt(p.price)}</span>
          ${off ? '<span class="soldout">Tükendi</span>' : ""}
          ${n ? `<span class="in-cart">Sepette ${n}</span>` : ""}
        </span>
        ${allergens ? `<span class="allergens" aria-label="Alerjenler">${allergens}</span>` : ""}
      </div>
      <div class="prod-media">
        ${thumbHtml(p, "thumb")}
        ${off ? "" : '<span class="add" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>'}
      </div>
    </button>`;
  }

  $("#menu").addEventListener("click", (e) => {
    const b = e.target.closest(".prod");
    if (!b || b.classList.contains("off")) return;
    openProduct(state.products[b.dataset.pid]);
  });

  let searchT;
  $("#searchInput").addEventListener("input", (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { state.query = e.target.value; renderMenu(); }, 120);
  });

  // ---------- Sheet (alttan açılan panel) ----------
  let lastFocus = null;
  function openSheet(html, label) {
    lastFocus = document.activeElement;
    $("#sheetBody").innerHTML = html;
    $("#sheet").setAttribute("aria-label", label);
    $("#sheet").hidden = false;
    $("#scrim").hidden = false;
    document.body.style.overflow = "hidden";
    $("#sheetBody").scrollTop = 0;
    $("#sheetClose").focus();
  }
  function closeSheet() {
    $("#sheet").hidden = true;
    $("#scrim").hidden = true;
    document.body.style.overflow = "";
    state.sheetView = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $("#sheetClose").onclick = closeSheet;
  $("#scrim").onclick = closeSheet;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

  // ---------- Ürün opsiyon modalı ----------
  function openProduct(p) {
    state.sheetView = "product";
    const groups = p.optionGroups || [];
    const groupsHtml = groups.map((g) => {
      const type = g.selectionType === "multiple" ? "checkbox" : "radio";
      return `<fieldset class="opt-group" data-gid="${esc(g.id)}" data-required="${g.isRequired ? 1 : 0}" data-type="${g.selectionType}">
        <legend>${esc(g.title)}
          ${g.isRequired ? '<span class="req">Zorunlu</span>' : ""}
          <span class="opt-hint">${type === "checkbox" ? "Birden fazla seçebilirsiniz" : "Birini seçin"}</span>
        </legend>
        ${g.options.map((o) => `<label class="opt">
          <input type="${type}" name="${esc(g.id)}" value="${esc(o.id)}" data-price="${o.price}">
          <span>${esc(o.name)}</span>
          <em>${o.price ? "+" + fmt(o.price) : ""}</em>
        </label>`).join("")}
      </fieldset>`;
    }).join("");

    openSheet(`
      ${thumbHtml(p, "hero-img")}
      <h2>${esc(p.name)}</h2>
      ${p.description ? `<p class="lead">${esc(p.description)}</p>` : ""}
      ${(p.allergens || []).length ? `<p class="small-note" style="margin-top:8px">Alerjenler: ${p.allergens.map(esc).join(", ")}</p>` : ""}
      <form id="prodForm">
        ${groupsHtml}
        <label class="field-label" for="itemNote">Not ekle <span class="muted" style="font-weight:400">(isteğe bağlı)</span></label>
        <textarea id="itemNote" maxlength="200" placeholder="Örneğin: soğan olmasın"></textarea>
        <div class="sheet-foot">
          <div class="stepper" role="group" aria-label="Adet">
            <button type="button" data-step="-1" aria-label="Azalt">−</button>
            <output id="qty">1</output>
            <button type="button" data-step="1" aria-label="Artır">+</button>
          </div>
          <button class="btn primary" type="submit" id="addBtn">Sepete ekle</button>
        </div>
      </form>`, p.name);

    let qty = 1;
    const form = $("#prodForm");
    const update = () => {
      let unit = p.price;
      form.querySelectorAll("input:checked").forEach((i) => (unit += Number(i.dataset.price)));
      let missing = 0;
      form.querySelectorAll(".opt-group").forEach((fs) => {
        const ok = fs.dataset.required !== "1" || fs.querySelector("input:checked");
        const tag = fs.querySelector(".req");
        if (tag) { tag.classList.toggle("ok", !!ok); tag.textContent = ok ? "Seçildi" : "Zorunlu"; }
        if (!ok) missing++;
      });
      $("#qty").textContent = qty;
      form.querySelector('[data-step="-1"]').disabled = qty <= 1;
      const btn = $("#addBtn");
      btn.disabled = missing > 0;
      btn.textContent = missing ? "Zorunlu seçimleri yapın" : `Sepete ekle   ${fmt(unit * qty)}`;
    };
    form.addEventListener("change", update);
    form.addEventListener("click", (e) => {
      const s = e.target.closest("[data-step]");
      if (!s) return;
      qty = Math.max(1, Math.min(20, qty + Number(s.dataset.step)));
      update();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const selectedOptionIds = [...form.querySelectorAll("input:checked")].map((i) => i.value);
      addToCart(p.id, qty, selectedOptionIds, $("#itemNote").value.trim());
      closeSheet();
      toast(`${p.name} sepete eklendi`);
    });
    update();
  }

  // ---------- 3. Sepet ----------
  function optionObjs(p, ids) {
    const out = [];
    (p.optionGroups || []).forEach((g) => g.options.forEach((o) => { if (ids.includes(o.id)) out.push(o); }));
    return out;
  }
  function unitPrice(line) {
    const p = state.products[line.productId];
    return p.price + optionObjs(p, line.selectedOptionIds).reduce((s, o) => s + o.price, 0);
  }
  function cartTotal() { return state.cart.reduce((s, l) => s + unitPrice(l) * l.quantity, 0); }
  function cartCount() { return state.cart.reduce((s, l) => s + l.quantity, 0); }
  function saveCart() { store.set("sofra_cart", state.cart); }

  function addToCart(productId, quantity, selectedOptionIds, note) {
    const key = productId + "|" + [...selectedOptionIds].sort().join(",") + "|" + note;
    const existing = state.cart.find((l) => l.key === key);
    if (existing) existing.quantity += quantity;
    else state.cart.push({ key, productId, quantity, selectedOptionIds, note });
    saveCart();
    renderCartBar(true);
    renderMenu();
  }

  function renderCartBar(bump) {
    const n = cartCount();
    $("#cartBar").hidden = n === 0;
    $("#cartCount").textContent = n;
    $("#cartBarTotal").textContent = fmt(cartTotal());
    if (bump) {
      const b = $("#openCartBtn");
      b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    }
  }

  $("#openCartBtn").onclick = openCart;

  function openCart() {
    state.sheetView = "cart";
    if (!state.cart.length) { closeSheet(); return; }
    const lines = state.cart.map((l, i) => {
      const p = state.products[l.productId];
      const opts = optionObjs(p, l.selectedOptionIds).map((o) => o.name).join(", ");
      return `<div class="line" data-i="${i}">
        <div class="line-info">
          <div class="line-name">${esc(p.name)}</div>
          ${opts ? `<div class="line-opts">${esc(opts)}</div>` : ""}
          ${l.note ? `<div class="line-note">${esc(l.note)}</div>` : ""}
        </div>
        <div class="line-side">
          <span class="price">${fmt(unitPrice(l) * l.quantity)}</span>
          <div class="stepper sm" role="group" aria-label="${esc(p.name)} adedi">
            <button type="button" data-act="dec" aria-label="${l.quantity === 1 ? "Sepetten çıkar" : "Azalt"}">${l.quantity === 1 ? "×" : "−"}</button>
            <output>${l.quantity}</output>
            <button type="button" data-act="inc" aria-label="Artır">+</button>
          </div>
        </div>
      </div>`;
    }).join("");

    openSheet(`
      <h2>Sepetiniz</h2>
      <p class="lead">Masa ${esc(state.menu.table.number)}, ${esc(state.menu.table.section || "Salon")}</p>
      <div id="cartLines">${lines}</div>
      <label class="field-label" for="orderNote">Mutfağa not <span class="muted" style="font-weight:400">(isteğe bağlı)</span></label>
      <textarea id="orderNote" maxlength="200" placeholder="Örneğin: içecekler yemekle birlikte gelsin">${esc(store.get("sofra_order_note", ""))}</textarea>
      <div class="totals"><span>Toplam</span><strong>${fmt(cartTotal())}</strong></div>
      <p class="small-note">Son tutar sipariş onaylanınca restoran tarafından hesaplanır.</p>
      <div class="sheet-foot">
        <button class="btn primary" type="button" id="sendOrderBtn">Siparişi gönder</button>
      </div>`, "Sepet");

    $("#cartLines").onclick = (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const i = Number(b.closest(".line").dataset.i);
      const line = state.cart[i];
      if (b.dataset.act === "inc") line.quantity = Math.min(20, line.quantity + 1);
      else if (line.quantity > 1) line.quantity--;
      else state.cart.splice(i, 1);
      saveCart(); renderCartBar(); renderMenu();
      openCart();
    };
    $("#orderNote").oninput = (e) => store.set("sofra_order_note", e.target.value);
    $("#sendOrderBtn").onclick = sendOrder;
  }

  async function sendOrder() {
    const btn = $("#sendOrderBtn");
    btn.disabled = true;
    btn.textContent = "Gönderiliyor…";
    const orderNote = ($("#orderNote").value || "").trim();
    const items = state.cart.map((l, i) => ({
      productId: l.productId,
      quantity: l.quantity,
      selectedOptionIds: l.selectedOptionIds,
      note: [l.note, i === 0 ? orderNote : ""].filter(Boolean).join(" / ")
    }));
    try {
      const res = await Api.createOrder({ tableId: state.menu.table.id, sessionId: state.menu.table.sessionId, items });
      state.orders.unshift({ orderId: res.orderId, orderNumber: res.orderNumber, status: res.status });
      store.set("sofra_orders", state.orders);
      state.cart = []; saveCart(); store.set("sofra_order_note", "");
      renderCartBar(); renderMenu(); renderTrackPill();
      openTracking();
      startPolling();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Siparişi gönder";
      toast("Sipariş gönderilemedi: " + err.message, true);
    }
  }

  // ---------- 4. Canlı sipariş takibi ----------
  // Not: WebSocket (order_status_updated) hazır olunca polling yerine kullanılabilir.
  const STEP_DESC = {
    pending: "Siparişiniz restorana ulaştı.",
    confirmed: "Restoran siparişinizi onayladı.",
    preparing: "Mutfakta hazırlanıyor.",
    ready: "Hazır, birazdan masanızda.",
    delivered: "Afiyet olsun!"
  };
  const STATUS_COLOR = { pending: "pending", confirmed: "confirmed", preparing: "preparing", ready: "ready", delivered: "delivered" };

  function activeOrder() { return state.orders.find((o) => o.status !== "delivered") || state.orders[0]; }

  function renderTrackPill() {
    const o = activeOrder();
    const pill = $("#trackPill");
    pill.hidden = !o;
    if (o) $("#trackPillTxt").textContent = `${o.orderNumber} ${Api.STATUS_LABELS[o.status] || ""}`.trim();
    pill.querySelector(".dot").classList.toggle("pulse", !!o && o.status !== "delivered");
  }
  $("#trackPill").onclick = openTracking;

  function trackingHtml(o) {
    const idx = Api.STATUS_FLOW.indexOf(o.status);
    const c = STATUS_COLOR[o.status] || "pending";
    return `
      <div class="track-head">
        <span class="ord">${esc(o.orderNumber)}</span>
        <span class="status-tag" style="background:var(--s-${c}-bg);color:var(--s-${c})">${esc(Api.STATUS_LABELS[o.status])}</span>
      </div>
      <p class="lead">Masa ${esc(state.menu.table.number)} siparişi. Bu sayfa kendiliğinden güncellenir.</p>
      <ol class="steps">
        ${Api.STATUS_FLOW.map((s, i) => `<li class="step ${i < idx || o.status === "delivered" ? "done" : i === idx ? "now" : ""}" ${i === idx ? 'aria-current="step"' : ""}>
          <span class="step-n">${i < idx || o.status === "delivered" ? "✓" : i + 1}</span>
          <div><div class="step-t">${esc(Api.STATUS_LABELS[s])}</div>${i === idx ? `<div class="step-d">${STEP_DESC[s]}</div>` : ""}</div>
        </li>`).join("")}
      </ol>
      <div class="sheet-foot">
        <button class="btn" type="button" id="trackService">Garson çağır</button>
        <button class="btn primary" type="button" id="trackBack">Menüye dön</button>
      </div>`;
  }

  function openTracking() {
    const o = activeOrder();
    if (!o) return;
    state.sheetView = "tracking";
    openSheet(trackingHtml(o), "Sipariş takibi");
    bindTracking();
  }
  function bindTracking() {
    $("#trackBack").onclick = closeSheet;
    $("#trackService").onclick = openService;
  }

  function startPolling() {
    clearInterval(state.pollTimer);
    const tick = async () => {
      const o = activeOrder();
      if (!o || o.status === "delivered") { clearInterval(state.pollTimer); return; }
      try {
        const res = await Api.getOrderStatus(o.orderId);
        if (res.status !== o.status) {
          o.status = res.status;
          store.set("sofra_orders", state.orders);
          renderTrackPill();
          if (state.sheetView === "tracking") { $("#sheetBody").innerHTML = trackingHtml(o); bindTracking(); }
          if (res.status === "ready") toast("Siparişiniz hazır, birazdan masanızda.");
        }
      } catch { /* bağlantı geçici olarak koptu, sonraki denemede tekrar */ }
    };
    state.pollTimer = setInterval(tick, 4000);
    tick();
  }

  // ---------- 5. Masa hizmetleri ----------
  $("#serviceBtn").onclick = openService;

  function openService() {
    state.sheetView = "service";
    openSheet(`
      <h2>Nasıl yardımcı olalım?</h2>
      <p class="lead">Masa ${esc(state.menu.table.number)} için personele bildirim gider.</p>
      <div class="svc" role="radiogroup" aria-label="İstek türü">
        <button type="button" class="svc-opt" data-type="waiter" aria-pressed="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <b>Garson çağır</b><small>Su, peçete ya da bir sorunuz için</small>
        </button>
        <button type="button" class="svc-opt" data-type="bill" aria-pressed="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>
          <b>Hesap iste</b><small>Hesap masanıza getirilir</small>
        </button>
      </div>
      <label class="field-label" for="svcNote">Not <span class="muted" style="font-weight:400">(isteğe bağlı)</span></label>
      <textarea id="svcNote" maxlength="140" placeholder="Örneğin: su ve peçete rica ederiz"></textarea>
      <div class="sheet-foot">
        <button class="btn primary" type="button" id="svcSend">Garson çağır</button>
      </div>`, "Garson çağır veya hesap iste");

    let type = "waiter";
    $(".svc").onclick = (e) => {
      const b = e.target.closest(".svc-opt");
      if (!b) return;
      type = b.dataset.type;
      document.querySelectorAll(".svc-opt").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      $("#svcSend").textContent = type === "bill" ? "Hesap iste" : "Garson çağır";
    };
    $("#svcSend").onclick = async () => {
      const btn = $("#svcSend");
      btn.disabled = true; btn.textContent = "Gönderiliyor…";
      try {
        const res = await Api.callStaff(state.menu.table.id, type, $("#svcNote").value.trim());
        closeSheet();
        toast(res.message || (type === "bill" ? "Hesap isteğiniz iletildi." : "Garsonunuza haber verildi."));
      } catch (err) {
        btn.disabled = false; btn.textContent = type === "bill" ? "Hesap iste" : "Garson çağır";
        toast("İstek gönderilemedi: " + err.message, true);
      }
    };
  }

  // ---------- Bildirim ----------
  let toastT;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.hidden = true), isErr ? 4500 : 2600);
  }

  $("#retryBtn").onclick = boot;
  boot();
})();
