/*!
 * finix-ui · finix-shop.js — storefront behaviors
 * Shared product catalog, fxShopCart (localStorage cart + drawer w/ free-
 * shipping meter), fxShopGrid (live PLP filtering/sort), fxShopCard renderer.
 */
(() => {
  "use strict";
  const money = (n) => "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0 });
  const FREE_SHIP = 150;

  const COLORS = {
    sage: "oklch(0.62 0.09 165)", graphite: "oklch(0.35 0.01 260)", cream: "oklch(0.9 0.04 90)",
    ocean: "oklch(0.55 0.14 245)", rust: "oklch(0.58 0.13 40)",
  };

  window.FX_PRODUCTS = [
    { id: "aurora-kb", name: "Aurora Mechanical Keyboard", cat: "Desk", price: 149, compareAt: 189, rating: 4.8, reviews: 214, colors: ["sage", "graphite", "cream"], h1: 160, h2: 210, glyph: "⌨️", badge: "Sale" },
    { id: "drift-mat", name: "Drift Desk Mat XL", cat: "Desk", price: 39, rating: 4.6, reviews: 128, colors: ["sage", "graphite"], h1: 120, h2: 170, glyph: "🖱️" },
    { id: "focus-lamp", name: "Focus Lamp", cat: "Desk", price: 89, rating: 4.7, reviews: 86, colors: ["cream", "graphite"], h1: 45, h2: 85, glyph: "💡" },
    { id: "mono-mug", name: "Monospace Mug", cat: "Goods", price: 24, rating: 4.9, reviews: 301, colors: ["cream", "sage"], h1: 25, h2: 60, glyph: "☕" },
    { id: "token-poster", name: "Token Grid Print", cat: "Goods", price: 32, rating: 4.5, reviews: 44, colors: ["sage", "ocean"], h1: 280, h2: 320, glyph: "🖼️" },
    { id: "terminal-tee", name: "Terminal Tee", cat: "Apparel", price: 34, rating: 4.4, reviews: 167, colors: ["graphite", "cream", "ocean"], h1: 200, h2: 245, glyph: "👕" },
    { id: "cable-trio", name: "Braided Cable Trio", cat: "Desk", price: 29, compareAt: 39, rating: 4.3, reviews: 98, colors: ["graphite", "rust"], h1: 85, h2: 125, glyph: "🔌", badge: "Sale" },
    { id: "alu-stand", name: "Laptop Stand", cat: "Desk", price: 79, rating: 4.6, reviews: 152, colors: ["graphite"], h1: 225, h2: 265, glyph: "💻" },
    { id: "shipit-cap", name: "Ship-It Cap", cat: "Apparel", price: 28, rating: 4.2, reviews: 63, colors: ["sage", "rust"], h1: 105, h2: 145, glyph: "🧢" },
    { id: "grid-notebook", name: "Grid Notebook A5", cat: "Goods", price: 18, rating: 4.8, reviews: 212, colors: ["cream", "ocean"], h1: 65, h2: 105, glyph: "📓", badge: "New" },
    { id: "darkmode-hoodie", name: "Dark Mode Hoodie", cat: "Apparel", price: 68, rating: 4.9, reviews: 388, colors: ["graphite", "ocean"], h1: 255, h2: 295, glyph: "🧥", badge: "New" },
    { id: "walnut-coasters", name: "Walnut Coasters ×4", cat: "Goods", price: 22, rating: 4.1, reviews: 37, colors: ["rust"], h1: 55, h2: 35, glyph: "🪵" },
  ];
  const byId = (id) => FX_PRODUCTS.find((p) => p.id === id);

  const stars = (r) => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));

  window.fxShopCard = function (p) {
    const off = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
    return `<div class="fx-shop-card" data-id="${p.id}">
      <div class="fx-shop-art" style="--_h1:${p.h1};--_h2:${p.h2}" role="button" tabindex="0" aria-label="${p.name}">
        ${p.badge ? `<span class="fx-badge ${p.badge === "Sale" ? "fx-badge--destructive" : ""} fx-shop-badge">${p.badge}</span>` : ""}
        <button class="fx-shop-heart" data-heart aria-label="Save to wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></button>
        <span class="fx-shop-glyph">${p.glyph}</span>
        <button class="fx-shop-quick" data-quick>Add to cart — ${money(p.price)}</button>
      </div>
      <div class="fx-shop-meta">
        <span class="fx-shop-name">${p.name}</span>
        <span class="fx-shop-cat">${p.cat}</span>
        <span class="fx-shop-stars"><b>${stars(p.rating)}</b>${p.rating} (${p.reviews})</span>
        <span class="fx-shop-price">${money(p.price)}${p.compareAt ? `<s>${money(p.compareAt)}</s><span class="off">−${off}%</span>` : ""}</span>
      </div>
    </div>`;
  };

  /* ============ cart (shared, persisted) ============ */
  window.fxShopCart = (() => {
    let items = [];
    try { items = JSON.parse(localStorage.getItem("fx-shop-cart")) || []; } catch (_) {}
    const save = () => { try { localStorage.setItem("fx-shop-cart", JSON.stringify(items)); } catch (_) {} };

    /* drawer chrome */
    const scrim = document.createElement("div");
    scrim.className = "fx-shop-scrim";
    const drawer = document.createElement("aside");
    drawer.className = "fx-shop-drawer";
    drawer.setAttribute("aria-label", "Cart");
    drawer.innerHTML =
      `<div class="fx-shop-dhead"><b>Your cart</b><span class="fx-badge fx-badge--secondary" data-d-count>0</span>
         <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-d-close style="margin-left:auto" aria-label="Close cart">✕</button>
       </div>
       <div class="fx-shop-dbody" data-d-body></div>
       <div class="fx-shop-meter" data-d-meter><span data-d-meter-label></span><div class="fx-shop-meter-bar"><i></i></div></div>
       <div class="fx-shop-dfoot">
         <div class="fx-shop-subtotal"><span>Subtotal</span><b data-d-subtotal>$0</b></div>
         <a class="fx-btn" style="width:100%" href="../flows.html" data-d-checkout>Checkout</a>
         <button class="fx-btn fx-btn--ghost fx-btn--sm" data-d-close>Continue shopping</button>
       </div>`;
    const mount = () => { document.body.append(scrim, drawer); };
    document.readyState === "loading" ? addEventListener("DOMContentLoaded", mount) : mount();

    const count = () => items.reduce((a, i) => a + i.qty, 0);
    const subtotal = () => items.reduce((a, i) => a + byId(i.id).price * i.qty, 0);

    function render() {
      const body = drawer.querySelector("[data-d-body]");
      if (!items.length) body.innerHTML = `<div class="fx-shop-empty">Your cart is empty.<br>The desk mat is calling.</div>`;
      else body.innerHTML = items.map((it, i) => {
        const p = byId(it.id);
        return `<div class="fx-shop-item" data-i="${i}">
          <span class="fx-shop-item-art" style="--_h1:${p.h1};--_h2:${p.h2}">${p.glyph}</span>
          <div class="fx-shop-item-main"><b>${p.name}</b>${it.variant ? `<small>${it.variant}</small>` : ""}
            <span class="fx-shop-qty"><button data-d-dec aria-label="Decrease">−</button><output>${it.qty}</output><button data-d-inc aria-label="Increase">+</button></span>
          </div>
          <div class="fx-shop-item-side"><span class="price">${money(p.price * it.qty)}</span><button class="fx-shop-remove" data-d-remove>Remove</button></div>
        </div>`;
      }).join("");
      const sub = subtotal();
      drawer.querySelector("[data-d-count]").textContent = count();
      drawer.querySelector("[data-d-subtotal]").textContent = money(sub);
      const meter = drawer.querySelector("[data-d-meter]");
      const free = sub >= FREE_SHIP;
      meter.classList.toggle("is-free", free);
      meter.querySelector("[data-d-meter-label]").innerHTML = free
        ? "🎉 You've unlocked free shipping"
        : `You're <b style="font-family:var(--font-mono)">${money(FREE_SHIP - sub)}</b> from free shipping`;
      meter.querySelector("i").style.setProperty("--_w", Math.min(100, (sub / FREE_SHIP) * 100) + "%");
      document.querySelectorAll("[data-shop-count]").forEach((el) => {
        el.textContent = count();
        el.hidden = !count();
      });
      save();
    }

    function open() { drawer.classList.add("is-open"); scrim.classList.add("is-on"); render(); }
    function close() { drawer.classList.remove("is-open"); scrim.classList.remove("is-on"); }
    scrim.addEventListener("click", close);
    drawer.addEventListener("click", (e) => {
      if (e.target.closest("[data-d-close]")) return close();
      const row = e.target.closest(".fx-shop-item");
      if (!row) return;
      const i = +row.dataset.i;
      if (e.target.closest("[data-d-inc]")) items[i].qty++;
      else if (e.target.closest("[data-d-dec]")) { items[i].qty--; if (items[i].qty <= 0) items.splice(i, 1); }
      else if (e.target.closest("[data-d-remove]")) items.splice(i, 1);
      else return;
      render();
    });

    function add(id, opts = {}) {
      const variant = opts.variant || "";
      const found = items.find((i) => i.id === id && i.variant === variant);
      if (found) found.qty += opts.qty || 1;
      else items.push({ id, qty: opts.qty || 1, variant });
      render();
      if (opts.open !== false) open();
    }
    addEventListener("DOMContentLoaded", render);
    return { add, open, close, render, count, subtotal, get items() { return items; }, clear() { items = []; render(); } };
  })();

  /* header cart buttons */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-shop-cart]")) { e.preventDefault(); fxShopCart.open(); }
  });

  /* ============ PLP grid + live filters ============ */
  window.fxShopGrid = function (root, opts) {
    const rail = opts.rail;
    const products = opts.products || FX_PRODUCTS;
    const state = { cats: new Set(), colors: new Set(), max: null, minRating: 0, sort: "featured" };

    function read() {
      state.cats = new Set([...rail.querySelectorAll("[data-f-cat]:checked")].map((i) => i.value));
      state.colors = new Set([...rail.querySelectorAll("[data-f-color][aria-pressed=true]")].map((i) => i.dataset.fColor));
      const pr = rail.querySelector("[data-f-price]");
      state.max = pr ? +pr.value : null;
      state.minRating = +([...rail.querySelectorAll("[data-f-rating]:checked")][0]?.value || 0);
      state.sort = opts.sortEl ? opts.sortEl.value : "featured";
    }
    function visible() {
      let list = products.filter((p) =>
        (!state.cats.size || state.cats.has(p.cat)) &&
        (!state.colors.size || p.colors.some((c) => state.colors.has(c))) &&
        (state.max == null || p.price <= state.max) &&
        p.rating >= state.minRating);
      const s = state.sort;
      if (s === "price-asc") list = list.slice().sort((a, b) => a.price - b.price);
      if (s === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);
      if (s === "rating") list = list.slice().sort((a, b) => b.rating - a.rating);
      return list;
    }
    function chips() {
      if (!opts.chipsEl) return;
      const parts = [];
      state.cats.forEach((c) => parts.push({ k: "cat", v: c, label: c }));
      state.colors.forEach((c) => parts.push({ k: "color", v: c, label: c }));
      if (state.minRating) parts.push({ k: "rating", v: state.minRating, label: state.minRating + "★ & up" });
      if (state.max != null && state.max < 200) parts.push({ k: "price", v: state.max, label: "≤ " + money(state.max) });
      opts.chipsEl.innerHTML = parts.map((p) => `<button class="fx-shop-chip" data-k="${p.k}" data-v="${p.v}">${p.label}<i>✕</i></button>`).join("") +
        (parts.length > 1 ? `<button class="fx-shop-chip" data-k="all">Clear all</button>` : "");
    }
    function paint() {
      read();
      const list = visible();
      root.innerHTML = list.map(fxShopCard).join("") ||
        `<div class="fx-shop-empty" style="grid-column:1/-1">Nothing matches those filters — loosen one and try again.</div>`;
      if (opts.countEl) opts.countEl.textContent = list.length + " of " + products.length + " products";
      chips();
      /* histogram shading */
      const buckets = [25, 50, 75, 100, 150, 200];
      const hist = rail.querySelector("[data-f-hist]");
      if (hist) {
        const counts = buckets.map((b, i) => products.filter((p) => p.price <= b && p.price > (buckets[i - 1] || 0)).length);
        const mx = Math.max(...counts, 1);
        hist.innerHTML = counts.map((c, i) => `<i style="height:${(c / mx) * 100}%" class="${state.max != null && buckets[i] > state.max ? "is-out" : ""}"></i>`).join("");
      }
      const out = rail.querySelector("[data-f-price-out]");
      if (out && state.max != null) out.textContent = state.max >= 200 ? "Any" : "≤ " + money(state.max);
    }

    rail.addEventListener("input", paint);
    rail.addEventListener("click", (e) => {
      const sw = e.target.closest("[data-f-color]");
      if (sw) { sw.setAttribute("aria-pressed", sw.getAttribute("aria-pressed") !== "true"); paint(); }
    });
    opts.sortEl?.addEventListener("change", paint);
    opts.chipsEl?.addEventListener("click", (e) => {
      const chip = e.target.closest(".fx-shop-chip");
      if (!chip) return;
      const { k, v } = chip.dataset;
      if (k === "all" || k === "cat") rail.querySelectorAll("[data-f-cat]").forEach((i) => { if (k === "all" || i.value === v) i.checked = false; });
      if (k === "all" || k === "color") rail.querySelectorAll("[data-f-color]").forEach((i) => { if (k === "all" || i.dataset.fColor === v) i.setAttribute("aria-pressed", "false"); });
      if (k === "all" || k === "rating") rail.querySelectorAll("[data-f-rating]").forEach((i) => (i.checked = false));
      if (k === "all" || k === "price") { const pr = rail.querySelector("[data-f-price]"); if (pr) pr.value = pr.max; }
      paint();
    });
    root.addEventListener("click", (e) => {
      const card = e.target.closest(".fx-shop-card");
      if (!card) return;
      if (e.target.closest("[data-heart]")) return e.target.closest("[data-heart]").classList.toggle("is-on");
      if (e.target.closest("[data-quick]")) return fxShopCart.add(card.dataset.id);
      location.href = "product.html?id=" + card.dataset.id;
    });
    paint();
    return { paint, visible };
  };

  window.fxShopColors = COLORS;
})();
