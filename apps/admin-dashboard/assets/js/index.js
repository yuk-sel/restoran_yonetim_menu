// Sofra yönetim paneli — tek sayfa: Genel Bakış, Siparişler, Menü, Masalar & QR, Mutfak, Raporlar
(function () {
  "use strict";

  /* ================= Yardımcılar ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "₺" + Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const minsSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const ago = (iso) => { const m = minsSince(iso); return m < 1 ? "şimdi" : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.floor(m / 60)} sa önce` : new Date(iso).toLocaleDateString("tr-TR"); };
  const clock = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (daysBack = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - daysBack); return d; };
  const isToday = (iso) => new Date(iso) >= startOfDay(0);
  const ACTIVE = ["PENDING", "APPROVED", "PREPARING", "READY"];
  const LATE_MIN = 15;

  const ICON = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/></svg>'
  };

  /* ================= Durum ================= */
  const state = {
    view: "genel",
    orders: [], tables: [], calls: [], categories: [], products: [],
    loaded: false, menuLoaded: false, online: null,
    orderFilter: "aktif", menuCat: "all", menuQuery: "", range: "today",
    sound: localStorage.getItem("sound") !== "off",
    knownOrders: null, knownCalls: null
  };

  const tableNo = (id) => { const t = state.tables.find((x) => x.id == id); return t ? t.table_number : id; };
  const normOrder = (o) => ({ ...o, status: String(o.status || "PENDING").toUpperCase(), total_price: Number(o.total_price) || 0 });
  const itemsText = (o) => (o.items || []).map((i) => `${i.quantity}× ${i.name}`).join(", ");

  /* ================= Kabuk ================= */
  const VIEWS = {
    genel:      { title: "Genel Bakış",  sub: () => new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }), render: renderOverview },
    siparisler: { title: "Siparişler",   sub: () => "Bugün gelen siparişler. Durumu değiştirdiğinizde müşteri ekranı da güncellenir.", render: renderOrders },
    menu:       { title: "Menü",         sub: () => "Kategoriler, ürünler ve stok durumu", render: renderMenu },
    masalar:    { title: "Masalar & QR", sub: () => "Her masanın QR kodu müşteriyi doğrudan o masanın menüsüne götürür.", render: renderTables },
    mutfak:     { title: "Mutfak Ekranı",sub: () => `${LATE_MIN} dakikayı geçen siparişler kırmızıyla işaretlenir.`, render: renderKitchen },
    raporlar:   { title: "Raporlar",     sub: () => "İptal edilen siparişler ciroya dahil edilmez.", render: renderReports }
  };

  function setupShell() {
    const u = Auth.user || {};
    const roleNames = { ADMIN: "Admin", YONETICI: "Yönetici", GARSON: "Garson", MUTFAK: "Mutfak" };
    $("#userName").textContent = u.full_name || "Kullanıcı";
    $("#userRole").textContent = roleNames[u.role] || u.role || "";
    $("#avatar").textContent = (u.full_name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toLocaleUpperCase("tr");
    $("#demoBanner").hidden = !Api.demo;

    $("#logoutBtn").onclick = () => { Auth.clear(); location.href = "login.html"; };

    const themes = ["auto", "light", "dark"], names = { auto: "Otomatik", light: "Açık", dark: "Koyu" };
    let theme = localStorage.getItem("theme") || "auto";
    const applyTheme = () => {
      if (theme === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
      $("#themeBtn").textContent = "Tema: " + names[theme];
    };
    $("#themeBtn").onclick = () => { theme = themes[(themes.indexOf(theme) + 1) % 3]; localStorage.setItem("theme", theme); applyTheme(); };
    applyTheme();

    const applySound = () => {
      $("#soundBtn").setAttribute("aria-pressed", state.sound);
      $("#soundBtn span").textContent = state.sound ? "Ses açık" : "Ses kapalı";
    };
    $("#soundBtn").onclick = () => { state.sound = !state.sound; localStorage.setItem("sound", state.sound ? "on" : "off"); applySound(); if (state.sound) beep(); };
    applySound();

    window.addEventListener("hashchange", route);
  }

  function route() {
    const v = location.hash.replace("#", "") || "genel";
    state.view = VIEWS[v] ? v : "genel";
    $$(".nav a").forEach((a) => { if (a.dataset.view === state.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.body.classList.remove("kds-full");
    $("#title").textContent = VIEWS[state.view].title;
    $("#subtitle").textContent = VIEWS[state.view].sub();
    document.title = VIEWS[state.view].title + " | Sofra Yönetim";
    $("#viewActions").innerHTML = "";
    if (state.view === "menu" && !state.menuLoaded) loadMenu();
    render();
  }

  function render() {
    if (!state.loaded) {
      $("#view").innerHTML = state.online === false ? offlineHtml() : '<p class="empty">Yükleniyor…</p>';
      bindOffline();
      return;
    }
    VIEWS[state.view].render();
  }

  function offlineHtml() {
    return `<div class="panel" style="max-width:560px">
      <h2 style="font-size:20px">Sunucuya ulaşılamadı</h2>
      <p class="muted">Panel verileri <code>${esc(CONFIG.API_BASE)}</code> adresinden alıyor. Terminalde <code>cd server</code> ve <code>node src/app.js</code> komutlarıyla sunucuyu başlatın, sayfa kendiliğinden bağlanacak.</p>
      <div class="actions"><button class="btn primary" id="retry">Tekrar dene</button><button class="btn" id="goDemo">Örnek verilerle göz at</button></div>
    </div>`;
  }
  function bindOffline() {
    const r = $("#retry"), d = $("#goDemo");
    if (r) r.onclick = refresh;
    if (d) d.onclick = () => { Auth.save("demo", { id: 0, full_name: "Örnek Yönetici", role: "ADMIN" }, true); location.reload(); };
  }

  /* ================= Veri yenileme ve bildirim ================= */
  async function refresh() {
    try {
      const [orders, calls, tables] = await Promise.all([Api.getOrders(), Api.getCalls(), Api.getTables()]);
      state.orders = orders.map(normOrder).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      state.calls = calls.filter((c) => !c.is_resolved);
      state.tables = tables.sort((a, b) => String(a.table_number).localeCompare(String(b.table_number), "tr", { numeric: true }));
      setOnline(true);
      notifyNew();
      updateBadges();
      const first = !state.loaded;
      state.loaded = true;
      // Kullanıcı bir şey yazarken ya da pencere açıkken ekranı yeniden çizme
      const busy = $("#modalRoot").childElementCount || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
      if (first || (!busy && ["genel", "siparisler", "mutfak", "masalar"].includes(state.view))) render();
    } catch (e) {
      setOnline(false);
      if (!state.loaded) render();
      else if (!(e instanceof NetworkError)) toast(e.message, "err");
    }
  }

  function setOnline(on) {
    state.online = on;
    const live = $("#live");
    live.classList.toggle("demo", Api.demo);
    live.classList.toggle("off", !on);
    $("#liveTxt").textContent = !on ? "Bağlantı yok" : Api.demo ? "Örnek veri" : "Canlı bağlantı";
  }

  function notifyNew() {
    const oIds = new Set(state.orders.map((o) => o.id));
    const cIds = new Set(state.calls.map((c) => c.id));
    if (state.knownOrders) {
      const fresh = state.orders.filter((o) => !state.knownOrders.has(o.id) && o.status === "PENDING");
      const freshCalls = state.calls.filter((c) => !state.knownCalls.has(c.id));
      fresh.forEach((o) => toast(`Yeni sipariş: Masa ${tableNo(o.table_id)}, ${money(o.total_price)}`, "alert"));
      freshCalls.forEach((c) => toast(`Masa ${tableNo(c.table_id)} ${c.call_type === "REQUEST_BILL" ? "hesap istiyor" : "garson çağırıyor"}`, "alert"));
      if ((fresh.length || freshCalls.length) && state.sound) beep();
    }
    state.knownOrders = oIds;
    state.knownCalls = cIds;
  }

  function updateBadges() {
    const n = state.orders.filter((o) => o.status === "PENDING").length;
    const b = $("#badge-orders"); b.hidden = !n; b.textContent = n;
    const c = state.calls.length;
    const bc = $("#badge-calls"); bc.hidden = !c; bc.textContent = c;
    document.title = (n + c ? `(${n + c}) ` : "") + VIEWS[state.view].title + " | Sofra Yönetim";
  }

  let audio;
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1175, 0.14]].forEach(([f, t]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = f; o.type = "sine";
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.22);
        o.connect(g).connect(audio.destination);
        o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.25);
      });
    } catch { /* tarayıcı ses izni vermediyse sessiz geç */ }
  }

  function toast(msg, type) {
    const t = document.createElement("div");
    t.className = "toast " + (type || "");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), type === "alert" ? 6000 : type === "err" ? 5000 : 2800);
  }

  /* ================= Pencere ================= */
  function openModal(html, onMount) {
    const root = $("#modalRoot");
    const prev = document.activeElement;
    root.innerHTML = `<div class="scrim"><div class="dialog" role="dialog" aria-modal="true">${html}</div></div>`;
    const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); prev && prev.focus && prev.focus(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    $(".scrim", root).addEventListener("mousedown", (e) => { if (e.target.classList.contains("scrim")) close(); });
    $$("[data-close]", root).forEach((b) => (b.onclick = close));
    const f = $("input,select,textarea,button", $(".dialog", root)); f && f.focus();
    onMount && onMount($(".dialog", root), close);
  }

  /* ================= Sipariş işlemleri ================= */
  async function changeStatus(id, status, btn) {
    if (btn) { btn.disabled = true; }
    try {
      await Api.setOrderStatus(id, status);
      const o = state.orders.find((x) => x.id == id);
      if (o) o.status = status;
      updateBadges();
      toast(`#${id}: ${STATUS[status].label}`);
      render();
    } catch (e) {
      toast(e.message, "err");
      if (btn) btn.disabled = false;
    }
  }

  // İptal iki adımlı: ilk tık "Emin misiniz?" olur, 3 sn içinde ikinci tık iptal eder
  function armCancel(btn, id) {
    if (btn.classList.contains("armed")) { changeStatus(id, "CANCELLED", btn); return; }
    btn.classList.add("armed"); btn.textContent = "Emin misiniz?";
    setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.textContent = "İptal"; } }, 3000);
  }

  function bindOrderActions(scope) {
    scope.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.act === "status") changeStatus(id, b.dataset.status, b);
      if (b.dataset.act === "cancel") armCancel(b, id);
    });
  }

  /* ================= 1. Genel Bakış ================= */
  function renderOverview() {
    const today = state.orders.filter((o) => isToday(o.created_at));
    const by = (s) => state.orders.filter((o) => s.includes(o.status));
    const fresh = by(["PENDING", "APPROVED"]), prep = by(["PREPARING"]), ready = by(["READY"]);
    const revenue = today.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total_price, 0);
    const lateCount = state.orders.filter((o) => ["PENDING", "APPROVED", "PREPARING"].includes(o.status) && minsSince(o.created_at) >= LATE_MIN).length;

    const active = state.orders.filter((o) => ACTIVE.includes(o.status)).slice(0, 7);

    $("#view").innerHTML = `
      <div class="stats">
        <a class="stat ${fresh.length ? "hot" : ""}" href="#siparisler" data-filter="yeni">
          <span class="k"><i style="background:var(--s-pending)"></i>Onay bekleyen</span>
          <span class="v num">${fresh.length}</span>
          <span class="s">${fresh.length ? "En eskisi " + ago(fresh[fresh.length - 1].created_at) : "Bekleyen sipariş yok"}</span>
        </a>
        <a class="stat" href="#mutfak">
          <span class="k"><i style="background:var(--s-preparing)"></i>Mutfakta</span>
          <span class="v num">${prep.length}</span>
          <span class="s">${lateCount ? `<span class="late">${lateCount} sipariş gecikti</span>` : "Gecikme yok"}</span>
        </a>
        <a class="stat" href="#siparisler" data-filter="READY">
          <span class="k"><i style="background:var(--s-ready)"></i>Servis bekleyen</span>
          <span class="v num">${ready.length}</span>
          <span class="s">Hazır, masaya götürülecek</span>
        </a>
        <a class="stat" href="#raporlar">
          <span class="k"><i style="background:var(--accent)"></i>Bugünkü ciro</span>
          <span class="v num">${money(revenue)}</span>
          <span class="s">${today.filter((o) => o.status !== "CANCELLED").length} sipariş</span>
        </a>
      </div>

      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h2>Aktif siparişler</h2><a class="btn ghost" href="#siparisler">Tümünü gör</a></div>
          <div class="rows" id="ovOrders">
            ${active.length ? active.map((o) => `
              <div class="row">
                <span class="t-num" title="Masa">${esc(tableNo(o.table_id))}</span>
                <div class="grow"><b>#${esc(o.id)}</b> · ${money(o.total_price)}<small>${esc(itemsText(o)) || "Masa " + esc(tableNo(o.table_id))} · ${ago(o.created_at)}</small></div>
                <span class="tag ${o.status}">${STATUS[o.status].label}</span>
                ${STATUS[o.status].next ? `<button class="btn" data-act="status" data-id="${o.id}" data-status="${STATUS[o.status].next}">${STATUS[o.status].action}</button>` : ""}
              </div>`).join("") : '<p class="empty">Şu an aktif sipariş yok. Yeni siparişler burada ve sesli bildirimle görünür.</p>'}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Masa çağrıları</h2><span class="muted">${state.calls.length ? state.calls.length + " bekliyor" : ""}</span></div>
          <div class="rows" id="ovCalls">
            ${state.calls.length ? state.calls.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((c) => {
              const bill = c.call_type === "REQUEST_BILL";
              return `<div class="row">
                <span class="call-ico ${bill ? "bill" : ""}">${bill ? ICON.card : ICON.bell}</span>
                <div class="grow"><b>Masa ${esc(tableNo(c.table_id))}</b><small>${bill ? "Hesap istiyor" : c.call_type === "REQUEST_WATER_NAPKIN" ? "Su / peçete istiyor" : "Garson çağırıyor"} · ${ago(c.created_at)}</small></div>
                <button class="btn" data-call="${c.id}">Tamamlandı</button>
              </div>`;
            }).join("") : '<p class="empty">Bekleyen çağrı yok.</p>'}
          </div>
        </section>
      </div>`;

    $$(".stat[data-filter]").forEach((a) => a.addEventListener("click", () => (state.orderFilter = a.dataset.filter)));
    bindOrderActions($("#ovOrders"));
    $("#ovCalls").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-call]");
      if (!b) return;
      b.disabled = true;
      try {
        await Api.resolveCall(b.dataset.call);
        state.calls = state.calls.filter((c) => c.id != b.dataset.call);
        updateBadges(); render();
      } catch (err) { toast(err.message, "err"); b.disabled = false; }
    });
  }

  /* ================= 2. Siparişler ================= */
  function renderOrders() {
    const today = state.orders.filter((o) => isToday(o.created_at) || ACTIVE.includes(o.status));
    const filters = [
      ["aktif", "Aktif", (o) => ACTIVE.includes(o.status)],
      ["yeni", "Yeni", (o) => ["PENDING", "APPROVED"].includes(o.status)],
      ["PREPARING", "Hazırlanıyor", (o) => o.status === "PREPARING"],
      ["READY", "Hazır", (o) => o.status === "READY"],
      ["DELIVERED", "Teslim edildi", (o) => o.status === "DELIVERED"],
      ["CANCELLED", "İptal", (o) => o.status === "CANCELLED"],
      ["tumu", "Tümü", () => true]
    ];
    const cur = filters.find((f) => f[0] === state.orderFilter) || filters[0];
    const list = today.filter(cur[2]);

    $("#view").innerHTML = `
      <div class="chips" role="group" aria-label="Duruma göre filtrele">
        ${filters.map(([k, label, fn]) => `<button class="chip" data-f="${k}" aria-pressed="${k === cur[0]}">${label} <span>${today.filter(fn).length}</span></button>`).join("")}
      </div>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Sipariş</th><th>Masa</th><th>Ürünler</th><th>Zaman</th><th class="r">Tutar</th><th>Durum</th><th class="r"><span class="muted" style="font-weight:400">İşlem</span></th></tr></thead>
        <tbody id="orderRows">
          ${list.map((o) => {
            const late = ["PENDING", "APPROVED", "PREPARING"].includes(o.status) && minsSince(o.created_at) >= LATE_MIN;
            return `<tr>
              <td class="ord">#${esc(o.id)}</td>
              <td class="tno">Masa ${esc(tableNo(o.table_id))}</td>
              <td class="items">${esc(itemsText(o)) || "—"}</td>
              <td class="num when"><span title="${new Date(o.created_at).toLocaleString("tr-TR")}">${clock(o.created_at)}</span> <small class="${late ? "late" : "muted"}">${ago(o.created_at)}</small></td>
              <td class="r num">${money(o.total_price)}</td>
              <td><span class="tag ${o.status}">${STATUS[o.status].label}</span></td>
              <td><div class="row-actions">
                ${STATUS[o.status].next ? `<button class="btn primary" data-act="status" data-id="${o.id}" data-status="${STATUS[o.status].next}">${STATUS[o.status].action}</button>` : ""}
                ${ACTIVE.includes(o.status) ? `<button class="btn danger" data-act="cancel" data-id="${o.id}">İptal</button>` : ""}
              </div></td>
            </tr>`;
          }).join("")}
        </tbody></table></div>`
      : `<div class="panel"><p class="empty">${cur[0] === "aktif" ? "Şu an aktif sipariş yok." : "Bu durumda sipariş yok."}</p></div>`}`;

    $$(".chip").forEach((c) => (c.onclick = () => { state.orderFilter = c.dataset.f; render(); }));
    const rows = $("#orderRows"); if (rows) bindOrderActions(rows);
  }

  /* ================= 3. Menü ================= */
  async function loadMenu() {
    try {
      state.categories = (await Api.getCategories()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      state.products = await Api.getAllProducts(state.categories);
      state.menuLoaded = true;
      if (state.view === "menu") render();
    } catch (e) {
      if (state.view === "menu") $("#view").innerHTML = `<div class="panel"><p class="empty">Menü yüklenemedi: ${esc(e.message)}</p></div>`;
    }
  }

  function renderMenu() {
    $("#viewActions").innerHTML = `<button class="btn primary" id="addProd">${ICON.plus}Ürün ekle</button>`;
    $("#addProd").onclick = () => productModal();
    if (!state.menuLoaded) { $("#view").innerHTML = '<p class="empty">Menü yükleniyor…</p>'; return; }

    const q = state.menuQuery.trim().toLocaleLowerCase("tr");
    const inCat = state.products.filter((p) => state.menuCat === "all" || p.category_id == state.menuCat);
    const list = inCat.filter((p) => !q || (p.name + " " + (p.description || "")).toLocaleLowerCase("tr").includes(q));
    const catName = (id) => (state.categories.find((c) => c.id == id) || {}).name || "";
    const outCount = state.products.filter((p) => p.status === "OUT_OF_STOCK").length;

    $("#view").innerHTML = `
      <div class="menu-layout">
        <div>
          <div class="cat-list" role="group" aria-label="Kategoriler">
            <button data-cat="all" aria-current="${state.menuCat === "all"}">Tüm ürünler <span>${state.products.length}</span></button>
            ${state.categories.map((c) => `<button data-cat="${c.id}" aria-current="${state.menuCat == c.id}">${esc(c.name)} <span>${state.products.filter((p) => p.category_id == c.id).length}</span></button>`).join("")}
          </div>
          <form class="cat-add" id="catForm">
            <input class="input" id="catName" placeholder="Yeni kategori" maxlength="100" aria-label="Yeni kategori adı">
            <button class="btn" type="submit">Ekle</button>
          </form>
        </div>
        <div>
          <div class="toolbar">
            <input class="input" type="search" id="menuSearch" placeholder="Ürün ara" value="${esc(state.menuQuery)}" aria-label="Ürün ara">
            <span class="spacer"></span>
            <span class="muted" style="font-size:14px">${outCount ? `${outCount} ürün tükendi olarak işaretli` : "Tüm ürünler satışta"}</span>
          </div>
          ${list.length ? `<div class="prod-list" id="prodList">
            ${list.map((p) => {
              const on = p.status !== "OUT_OF_STOCK";
              return `<div class="prod-row ${on ? "" : "off"}">
                ${p.image_url ? `<img class="p-thumb" src="${esc(p.image_url)}" alt="">` : `<div class="p-thumb" aria-hidden="true">${esc(p.name.charAt(0))}</div>`}
                <div style="min-width:0"><b>${esc(p.name)}</b><small>${state.menuCat === "all" ? esc(catName(p.category_id)) + " · " : ""}${esc(p.description || "")}</small></div>
                <span class="price num">${money(p.price)}</span>
                <label class="switch"><input type="checkbox" data-pid="${p.id}" ${on ? "checked" : ""}><span class="track"></span><span>${on ? "Satışta" : "Tükendi"}</span></label>
              </div>`;
            }).join("")}
          </div>` : `<div class="panel"><p class="empty">${q ? `"${esc(state.menuQuery)}" ile eşleşen ürün yok.` : "Bu kategoride ürün yok. Sağ üstteki “Ürün ekle” ile ekleyin."}</p></div>`}
        </div>
      </div>`;

    $$(".cat-list button").forEach((b) => (b.onclick = () => { state.menuCat = b.dataset.cat; render(); }));
    const s = $("#menuSearch");
    s.oninput = () => { state.menuQuery = s.value; const pos = s.selectionStart; render(); const n = $("#menuSearch"); n.focus(); n.setSelectionRange(pos, pos); };
    $("#catForm").onsubmit = async (e) => {
      e.preventDefault();
      const name = $("#catName").value.trim();
      if (!name) return;
      try {
        const c = await Api.createCategory(name);
        state.categories.push(c); state.menuCat = String(c.id);
        toast(`“${name}” kategorisi eklendi`); render();
      } catch (err) { toast(err.message, "err"); }
    };
    const pl = $("#prodList");
    if (pl) pl.addEventListener("change", async (e) => {
      const cb = e.target.closest("input[data-pid]");
      if (!cb) return;
      const p = state.products.find((x) => x.id == cb.dataset.pid);
      const status = cb.checked ? "AVAILABLE" : "OUT_OF_STOCK";
      try {
        await Api.setProductStatus(p.id, status);
        p.status = status;
        toast(`${p.name}: ${cb.checked ? "satışta" : "tükendi"}`);
        render();
      } catch (err) { cb.checked = !cb.checked; toast(err.message, "err"); }
    });
  }

  function productModal() {
    if (!state.categories.length) { toast("Önce soldan bir kategori ekleyin.", "err"); return; }
    const pre = state.menuCat !== "all" ? state.menuCat : state.categories[0].id;
    openModal(`
      <h2>Ürün ekle</h2>
      <form id="prodForm" style="display:flex;flex-direction:column;gap:14px">
        <div class="field"><label for="pName">Ürün adı</label><input class="input" id="pName" required maxlength="150" placeholder="Örneğin: Izgara Köfte"></div>
        <div class="two">
          <div class="field"><label for="pCat">Kategori</label>
            <select class="input" id="pCat">${state.categories.map((c) => `<option value="${c.id}" ${c.id == pre ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="pPrice">Fiyat (₺)</label><input class="input" id="pPrice" type="number" min="0" step="0.5" required inputmode="decimal"></div>
        </div>
        <div class="field"><label for="pDesc">Açıklama</label><textarea class="input" id="pDesc" maxlength="300" placeholder="İçindekiler, porsiyon bilgisi"></textarea><small>Müşteri menüsünde ürün adının altında görünür.</small></div>
        <p class="form-error" id="pErr" hidden></p>
        <div class="foot"><button class="btn" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">Ürünü ekle</button></div>
      </form>`, (dlg, close) => {
      $("#prodForm", dlg).onsubmit = async (e) => {
        e.preventDefault();
        const body = {
          category_id: Number($("#pCat", dlg).value),
          name: $("#pName", dlg).value.trim(),
          price: Number($("#pPrice", dlg).value),
          description: $("#pDesc", dlg).value.trim()
        };
        const err = $("#pErr", dlg);
        if (!body.name || !(body.price >= 0) || $("#pPrice", dlg).value === "") { err.textContent = "Ürün adı ve fiyat gerekli."; err.hidden = false; return; }
        const btn = e.submitter; btn.disabled = true; btn.textContent = "Ekleniyor…";
        try {
          const p = await Api.createProduct(body);
          state.products.push({ status: "AVAILABLE", ...body, ...p });
          close(); toast(`${body.name} menüye eklendi`); render();
        } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = "Ürünü ekle"; }
      };
    });
  }

  /* ================= 4. Masalar & QR ================= */
  const tableUrl = (t) => CONFIG.CUSTOMER_APP + "?qr=" + encodeURIComponent(t.qr_code);
  function qrSvg(text) {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text); qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: "QR kodu" });
    } catch { return '<p class="muted">QR oluşturulamadı</p>'; }
  }

  function renderTables() {
    $("#viewActions").innerHTML = `<button class="btn" id="printAll">${ICON.print}Tümünü yazdır</button><button class="btn primary" id="addTable">${ICON.plus}Masa ekle</button>`;
    $("#printAll").onclick = () => printTables();
    $("#addTable").onclick = tableModal;

    const occupied = state.tables.filter((t) => t.current_session_id).length;
    $("#view").innerHTML = state.tables.length ? `
      <p class="muted no-print" style="margin:-8px 0 14px">${state.tables.length} masa · ${occupied} masada açık oturum</p>
      <div class="tables-grid" id="tablesGrid">
        ${state.tables.map((t) => {
          const active = state.orders.filter((o) => o.table_id == t.id && ACTIVE.includes(o.status)).length;
          return `<article class="tcard" data-tid="${t.id}">
            <div class="tcard-head">
              <div class="big">${esc(t.table_number)}<small>Masa<span class="no-print">${active ? ` · ${active} aktif sipariş` : ""}</span></small></div>
              <span class="occ ${t.current_session_id ? "on" : ""}">${t.current_session_id ? "Dolu" : "Boş"}</span>
            </div>
            <div class="qr">${qrSvg(tableUrl(t))}</div>
            <span class="print-note">Menü ve sipariş için okutun</span>
            <span class="code">${esc(t.qr_code)}</span>
            <div class="tcard-actions">
              <button class="btn" data-a="print">Yazdır</button>
              <button class="btn" data-a="copy">Bağlantı</button>
              ${t.current_session_id ? "" : '<button class="btn" data-a="session">Oturum aç</button>'}
            </div>
          </article>`;
        }).join("")}
      </div>` : `<div class="panel"><p class="empty">Henüz masa yok. Sağ üstteki “Masa ekle” ile ilk masanızı oluşturun, QR kodu hemen hazır olur.</p></div>`;

    const grid = $("#tablesGrid");
    if (grid) grid.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      const t = state.tables.find((x) => x.id == b.closest(".tcard").dataset.tid);
      if (b.dataset.a === "print") printTables(t.id);
      if (b.dataset.a === "copy") {
        try { await navigator.clipboard.writeText(tableUrl(t)); toast(`Masa ${t.table_number} bağlantısı kopyalandı`); }
        catch { toast(tableUrl(t)); }
      }
      if (b.dataset.a === "session") {
        b.disabled = true;
        try { const r = await Api.startSession(t.id); Object.assign(t, r); toast(`Masa ${t.table_number} için oturum açıldı`); render(); }
        catch (err) { toast(err.message, "err"); b.disabled = false; }
      }
    });
  }

  function printTables(onlyId) {
    $$(".tcard").forEach((c) => c.classList.toggle("skip-print", !!onlyId && c.dataset.tid != onlyId));
    window.print();
    setTimeout(() => $$(".tcard").forEach((c) => c.classList.remove("skip-print")), 500);
  }

  function tableModal() {
    const nums = state.tables.map((t) => parseInt(t.table_number, 10)).filter((n) => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    openModal(`
      <h2>Masa ekle</h2>
      <form id="tForm" style="display:flex;flex-direction:column;gap:14px">
        <div class="field"><label for="tNum">Masa numarası</label><input class="input" id="tNum" required maxlength="20" value="${next}"><small>Masanın üzerinde yazan numara. QR kodu otomatik oluşturulur.</small></div>
        <p class="form-error" id="tErr" hidden></p>
        <div class="foot"><button class="btn" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">Masayı ekle</button></div>
      </form>`, (dlg, close) => {
      $("#tNum", dlg).select();
      $("#tForm", dlg).onsubmit = async (e) => {
        e.preventDefault();
        const n = $("#tNum", dlg).value.trim();
        const err = $("#tErr", dlg);
        if (!n) return;
        if (state.tables.some((t) => String(t.table_number) === n)) { err.textContent = `${n} numaralı masa zaten var.`; err.hidden = false; return; }
        try {
          const t = await Api.createTable(n);
          state.tables.push(t);
          state.tables.sort((a, b) => String(a.table_number).localeCompare(String(b.table_number), "tr", { numeric: true }));
          close(); toast(`Masa ${n} eklendi`); render();
        } catch (ex) { err.textContent = ex.message; err.hidden = false; }
      };
    });
  }

  /* ================= 5. Mutfak ================= */
  function renderKitchen() {
    $("#viewActions").innerHTML = `<button class="btn" id="fullBtn">${ICON.full}<span>${document.body.classList.contains("kds-full") ? "Paneli göster" : "Tam ekran"}</span></button>`;
    $("#fullBtn").onclick = () => {
      const on = document.body.classList.toggle("kds-full");
      try { if (on) document.documentElement.requestFullscreen?.(); else if (document.fullscreenElement) document.exitFullscreen(); } catch { /* izin yoksa sadece paneli gizle */ }
      render();
    };

    const old = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    const cols = [
      ["Yeni", ["PENDING", "APPROVED"], "PREPARING", "Hazırlamaya başla"],
      ["Hazırlanıyor", ["PREPARING"], "READY", "Hazır"],
      ["Hazır, servis bekliyor", ["READY"], "DELIVERED", "Servis edildi"]
    ];
    $("#view").innerHTML = `<div class="kds" id="kds">
      ${cols.map(([title, sts, next, action]) => {
        const list = state.orders.filter((o) => sts.includes(o.status)).sort(old);
        return `<section class="kds-col">
          <h2>${title} <span class="count">${list.length}</span></h2>
          <div class="kds-list">
            ${list.length ? list.map((o) => {
              const m = minsSince(o.created_at);
              const late = o.status !== "READY" && m >= LATE_MIN;
              return `<article class="ticket ${o.status} ${late ? "overdue" : ""}">
                <div class="ticket-head">
                  <span class="tbl">Masa ${esc(tableNo(o.table_id))}</span>
                  <span class="meta">#${esc(o.id)}<b class="${late ? "late" : ""}">${m} dk</b></span>
                </div>
                ${(o.items || []).length ? `<ul>${o.items.map((i) => `<li><span class="q">${i.quantity}×</span><span>${esc(i.name)}${i.options ? `<small>${esc(i.options)}</small>` : ""}${i.note ? `<span class="note">${esc(i.note)}</span>` : ""}</span></li>`).join("")}</ul>` : '<p class="muted" style="margin:0;font-size:14px">Ürün listesi sunucudan gelmedi.</p>'}
                <button class="btn ${o.status === "READY" ? "" : "primary"}" data-act="status" data-id="${o.id}" data-status="${next}">${action}</button>
              </article>`;
            }).join("") : '<p class="empty">Boş</p>'}
          </div>
        </section>`;
      }).join("")}
    </div>`;
    bindOrderActions($("#kds"));
  }

  /* ================= 6. Raporlar ================= */
  function renderReports() {
    const ranges = [["today", "Bugün", 0], ["7", "Son 7 gün", 6], ["30", "Son 30 gün", 29]];
    const r = ranges.find((x) => x[0] === state.range);
    const from = startOfDay(r[2]);
    const inRange = state.orders.filter((o) => new Date(o.created_at) >= from);
    const ok = inRange.filter((o) => o.status !== "CANCELLED");
    const revenue = ok.reduce((s, o) => s + o.total_price, 0);
    const cancelled = inRange.length - ok.length;

    // Grafik: bugün için saatlik, diğerleri için günlük ciro
    let buckets;
    if (state.range === "today") {
      const hours = ok.map((o) => new Date(o.created_at).getHours());
      const lo = Math.min(10, ...hours), hi = Math.max(new Date().getHours(), 22, ...hours);
      buckets = [];
      for (let h = lo; h <= hi; h++) buckets.push({ label: String(h).padStart(2, "0"), tip: `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`, v: 0, n: 0, key: h });
      ok.forEach((o) => { const b = buckets.find((x) => x.key === new Date(o.created_at).getHours()); if (b) { b.v += o.total_price; b.n++; } });
    } else {
      buckets = [];
      for (let d = r[2]; d >= 0; d--) {
        const day = startOfDay(d);
        buckets.push({ label: r[2] > 7 ? (d % 5 === 0 ? String(day.getDate()) : "") : day.toLocaleDateString("tr-TR", { weekday: "short" }),
          tip: day.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" }), v: 0, n: 0, key: day.toDateString() });
      }
      ok.forEach((o) => { const b = buckets.find((x) => x.key === new Date(o.created_at).toDateString()); if (b) { b.v += o.total_price; b.n++; } });
    }
    const max = Math.max(1, ...buckets.map((b) => b.v));
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;

    // En çok satanlar (sipariş içeriği varsa) ve en yoğun masalar
    const prodMap = {};
    ok.forEach((o) => (o.items || []).forEach((i) => { prodMap[i.name] = (prodMap[i.name] || 0) + i.quantity; }));
    const topProd = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const tblMap = {};
    ok.forEach((o) => { const k = tableNo(o.table_id); tblMap[k] = (tblMap[k] || 0) + o.total_price; });
    const topTbl = Object.entries(tblMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    $("#view").innerHTML = `
      <div class="chips" role="group" aria-label="Zaman aralığı">
        ${ranges.map(([k, l]) => `<button class="chip" data-r="${k}" aria-pressed="${k === state.range}">${l}</button>`).join("")}
      </div>
      <div class="stats">
        <div class="stat"><span class="k">Ciro</span><span class="v num">${money(revenue)}</span><span class="s">${r[1]}</span></div>
        <div class="stat"><span class="k">Sipariş</span><span class="v num">${ok.length}</span><span class="s">Teslim edilen ve süren</span></div>
        <div class="stat"><span class="k">Ortalama sipariş</span><span class="v num">${money(ok.length ? revenue / ok.length : 0)}</span><span class="s">Sipariş başına</span></div>
        <div class="stat"><span class="k">İptal</span><span class="v num">${cancelled}</span><span class="s">${inRange.length ? "%" + Math.round((cancelled / inRange.length) * 100) + " oran" : "—"}</span></div>
      </div>

      <section class="panel" style="margin-bottom:16px">
        <div class="panel-head"><h2>${state.range === "today" ? "Saatlik ciro" : "Günlük ciro"}</h2></div>
        <div class="chart">
          <div class="bars" role="img" aria-label="${state.range === "today" ? "Saatlik" : "Günlük"} ciro grafiği, en yüksek ${money(max)}">
            ${[top / 2, top].map((g) => `<div class="gridline" style="bottom:${(g / top) * 100}%"><span>${money(g)}</span></div>`).join("")}
            ${buckets.map((b) => `<div class="bar-col" tabindex="0"><div class="bar" style="height:${(b.v / top) * 100}%"></div><span class="bar-tip">${esc(b.tip)}: ${money(b.v)} · ${b.n} sipariş</span></div>`).join("")}
          </div>
          <div class="bar-labels">${buckets.map((b) => `<span>${esc(b.label)}</span>`).join("")}</div>
        </div>
        <details style="margin-top:12px"><summary class="muted" style="cursor:pointer;font-size:14px">Tablo olarak gör</summary>
          <table class="data" style="margin-top:8px"><thead><tr><th>${state.range === "today" ? "Saat" : "Gün"}</th><th class="r">Sipariş</th><th class="r">Ciro</th></tr></thead>
          <tbody>${buckets.filter((b) => b.n).map((b) => `<tr><td>${esc(b.tip)}</td><td class="r num">${b.n}</td><td class="r num">${money(b.v)}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Bu aralıkta sipariş yok.</td></tr>'}</tbody></table>
        </details>
      </section>

      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>En çok satanlar</h2><span class="muted" style="font-size:13px">Adet</span></div>
          ${topProd.length ? topProd.map(([n, q]) => `<div class="rank"><span>${esc(n)}</span><b class="num">${q}</b><span class="meter"><i style="width:${(q / topProd[0][1]) * 100}%"></i></span></div>`).join("")
            : '<p class="empty">Sunucu sipariş içeriğini (ürünleri) göndermeye başlayınca burada görünecek.</p>'}
        </section>
        <section class="panel"><div class="panel-head"><h2>En çok harcama yapan masalar</h2><span class="muted" style="font-size:13px">Ciro</span></div>
          ${topTbl.length ? topTbl.map(([n, v]) => `<div class="rank"><span>Masa ${esc(n)}</span><b class="num">${money(v)}</b><span class="meter"><i style="width:${(v / topTbl[0][1]) * 100}%"></i></span></div>`).join("")
            : '<p class="empty">Bu aralıkta sipariş yok.</p>'}
        </section>
      </div>`;

    $$(".chip[data-r]").forEach((c) => (c.onclick = () => { state.range = c.dataset.r; render(); }));
  }

  function niceStep(max) {
    const raw = max / 2, p = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw;
  }

  /* ================= Başlat ================= */
  if (!Auth.token) return;
  setupShell();
  route();
  refresh();
  setInterval(refresh, Api.demo ? 5000 : 8000);
  // "x dk önce" yazıları için dakikada bir yeniden çiz
  setInterval(() => { if (state.loaded && ["genel", "siparisler", "mutfak"].includes(state.view) && !$("#modalRoot").childElementCount) render(); }, 60000);
})();
