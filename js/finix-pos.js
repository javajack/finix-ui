/*!
 * finix-ui · finix-pos.js — POS & hospitality behaviors
 * fxPos (register: menu tiles → ticket rail w/ live totals + split bill),
 * fxKds (kitchen tickets w/ ageing + bump), fxRoomGrid (rooms × nights w/
 * stay bars, housekeeping, editable rates).
 */
(() => {
  "use strict";
  /* locale-aware money: components accept {locale, currency} */
  const makeMoney = (o = {}) => {
    try {
      const f = new Intl.NumberFormat(o.locale || "en-IN", { style: "currency", currency: o.currency || "INR", maximumFractionDigits: 0 });
      return (n) => f.format(Math.round(n));
    } catch (_) { return (n) => "₹" + Math.round(n).toLocaleString("en-IN"); }
  };
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const esc = (s) => (window.fxEsc || String)(s ?? "");

  /* ============ fxPos ============ */
  window.fxPos = function (root, opts) {
    if (!root) { console.warn("finixui: fxPos called without a root element"); return null; }
    const inr = makeMoney(opts);
    const menu = opts.menu; /* [{cat, items:[{name, price, glyph, out}]}] */
    const lines = (opts.lines || []).map((l) => ({ ...l }));
    const GST = opts.gst != null ? opts.gst : 0.05;
    const SVC = opts.service != null ? opts.service : 0.1;
    let cat = menu[0].cat;

    root.classList.add("fx-pos");
    root.innerHTML =
      `<div>
         <div class="fx-pos-cats" data-pos-cats></div>
         <div class="fx-pos-menu" data-pos-menu></div>
       </div>
       <div class="fx-pos-ticket">
         <div class="fx-pos-ticket-head">Table 12 · Dine-in<span class="fx-badge fx-badge--secondary" data-pos-count>0</span></div>
         <div class="fx-pos-lines" data-pos-lines></div>
         <div class="fx-pos-totals" data-pos-totals></div>
         <div class="fx-pos-tender">
           <button class="fx-btn fx-btn--outline fx-btn--sm" data-pos-split>Split</button>
           <button class="fx-btn fx-btn--outline fx-btn--sm">Hold</button>
           <button class="fx-btn fx-btn--sm" data-pos-pay>Pay</button>
         </div>
       </div>`;

    function paintCats() {
      root.querySelector("[data-pos-cats]").innerHTML = menu.map((m) =>
        `<button class="fx-btn ${m.cat === cat ? "" : "fx-btn--outline"} fx-btn--sm" data-cat="${esc(m.cat)}" style="height:1.75rem;font-size:.6875rem">${esc(m.cat)}</button>`).join("");
      root.querySelector("[data-pos-menu]").innerHTML = menu.find((m) => m.cat === cat).items.map((it, i) =>
        `<button class="fx-pos-tile" data-item="${esc(it.name)}" ${it.out ? "disabled" : ""}>
           <span class="glyph">${esc(it.glyph)}</span><b>${esc(it.name)}</b>
           ${it.out ? '<span class="out">86’d — out of stock</span>' : `<span class="price">${inr(it.price)}</span>`}
         </button>`).join("");
    }
    function totals() {
      const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
      const svc = sub * SVC, gst = (sub + svc) * GST;
      return { sub, svc, gst, total: sub + svc + gst };
    }
    function paintTicket() {
      const el = root.querySelector("[data-pos-lines]");
      let html = "", lastCourse = null;
      lines.forEach((l, i) => {
        if (l.course && l.course !== lastCourse) { html += `<div class="fx-pos-course">${esc(l.course)}</div>`; lastCourse = l.course; }
        html += `<div class="fx-pos-line" data-i="${i}"><span class="qty">${+l.qty}×</span><span>${esc(l.name)}</span><span class="amt">${inr(l.price * l.qty)}</span><button class="rm" aria-label="Remove">✕</button></div>`;
        (l.mods || []).forEach((m) => (html += `<div class="fx-pos-mod">↳ ${esc(m)}</div>`));
      });
      el.innerHTML = html || `<div class="fx-text-xs fx-muted" style="padding:1.25rem;text-align:center">Tap items to start the ticket.</div>`;
      const t = totals();
      root.querySelector("[data-pos-totals]").innerHTML =
        `<div class="fx-pos-trow"><span>Subtotal</span><b>${inr(t.sub)}</b></div>
         <div class="fx-pos-trow"><span>Service 10%</span><b>${inr(t.svc)}</b></div>
         <div class="fx-pos-trow"><span>GST 5%</span><b>${inr(t.gst)}</b></div>
         <div class="fx-pos-trow grand"><span>Total</span><b>${inr(t.total)}</b></div>`;
      root.querySelector("[data-pos-count]").textContent = lines.reduce((a, l) => a + l.qty, 0);
    }
    root.addEventListener("click", (e) => {
      const catBtn = e.target.closest("[data-cat]");
      if (catBtn) { cat = catBtn.dataset.cat; paintCats(); return; }
      const tile = e.target.closest("[data-item]");
      if (tile && !tile.disabled) {
        const item = menu.flatMap((m) => m.items).find((x) => x.name === tile.dataset.item);
        const ex = lines.find((l) => l.name === item.name && !(l.mods || []).length);
        if (ex) ex.qty++;
        else lines.push({ name: item.name, price: item.price, qty: 1, course: menu.find((m) => m.items.includes(item)).cat });
        paintTicket();
        return;
      }
      if (e.target.closest(".rm")) {
        lines.splice(+e.target.closest("[data-i]").dataset.i, 1);
        paintTicket();
        return;
      }
      if (e.target.closest("[data-pos-split]")) opts.onSplit?.(totals());
      if (e.target.closest("[data-pos-pay]")) opts.onPay?.(totals());
    });
    paintCats();
    paintTicket();
    return { lines, totals };
  };

  /* ============ fxKds ============ */
  window.fxKds = function (root, opts) {
    if (!root) { console.warn("finixui: fxKds called without a root element"); return null; }
    const tickets = opts.tickets.map((t) => ({ ...t }));
    root.classList.add("fx-pos-kds");
    function render() {
      root.innerHTML = tickets.map((t, i) => {
        const mins = Math.floor((Date.now() - t.at) / 6e4);
        const cls = mins >= (opts.late || 12) ? " is-late" : mins >= (opts.warn || 7) ? " is-warn" : "";
        return `<div class="fx-pos-kticket${cls}" data-i="${i}">
          <div class="fx-pos-khead">#${esc(t.num)} · ${esc(t.where)}<span class="fx-pos-kage">${mins}m</span></div>
          <div class="fx-pos-kbody">${t.items.map((it) => `<span>${+it.qty}× ${esc(it.name)}</span>` + (it.mod ? `<span class="mod">↳ ${esc(it.mod)}</span>` : "")).join("")}</div>
          <div class="fx-pos-kfoot"><button class="fx-btn fx-btn--sm" data-bump style="width:100%">Bump</button></div>
        </div>`;
      }).join("") || `<div class="fx-text-sm fx-muted" style="padding:1.5rem">All caught up — the pass is clear. 🎉</div>`;
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-bump]");
      if (!b) return;
      const t = tickets.splice(+b.closest("[data-i]").dataset.i, 1)[0];
      render();
      opts.onBump?.(t);
    });
    render();
    const kdsIv = setInterval(() => {
      if (!root.isConnected) return clearInterval(kdsIv);
      render();
    }, 30000);
    return { tickets, render, stop: () => clearInterval(kdsIv) };
  };

  /* ============ fxRoomGrid ============ */
  window.fxRoomGrid = function (root, opts) {
    if (!root) { console.warn("finixui: fxRoomGrid called without a root element"); return null; }
    const inr = makeMoney(opts);
    const rooms = opts.rooms; /* [{num, type, hk}] */
    const nights = opts.nights; /* ["Mon 17", …] length 7 */
    const stays = opts.stays; /* [{room, from, len, guest, color}] */
    const rates = opts.rates.slice();
    const hkLabel = { clean: "● Clean", dirty: "● Dirty", inspect: "● Inspect" };

    root.classList.add("fx-pos-pms-wrap");
    function render() {
      let html = `<div class="fx-pos-pms"><span></span>` +
        nights.map((n) => `<span class="fx-pos-pms-head">${esc(n)}</span>`).join("");
      rooms.forEach((r, ri) => {
        html += `<div class="fx-pos-room">${esc(r.num)}<small>${esc(r.type)}</small><span class="fx-pos-hk ${hkLabel[r.hk] ? r.hk : "clean"}" data-hk="${ri}" style="margin-left:auto;cursor:pointer" title="Click to cycle">${hkLabel[r.hk] || hkLabel.clean}</span></div>`;
        let n = 0;
        while (n < 7) {
          const stay = stays.find((s) => s.room === r.num && s.from === n);
          if (stay) {
            html += `<div class="fx-pos-stay" style="grid-column:span ${+stay.len};--_c:${stay.color || "var(--primary)"}">${esc(stay.guest)}</div>`;
            n += stay.len;
          } else if (!stays.find((s) => s.room === r.num && n > s.from && n < s.from + s.len)) {
            html += `<div class="fx-pos-night"></div>`;
            n++;
          } else n++;
        }
      });
      html += `<div class="fx-pos-room" style="color:var(--muted-foreground)">Rate<small>· base</small></div>` +
        rates.map((v, i) => `<div class="fx-pos-rate" data-rate="${i}" title="Click to edit">${inr(v)}</div>`).join("");
      html += `</div>`;
      root.innerHTML = html;
    }
    root.addEventListener("click", (e) => {
      const hk = e.target.closest("[data-hk]");
      if (hk) {
        const order = ["dirty", "inspect", "clean"];
        const r = rooms[+hk.dataset.hk];
        r.hk = order[(order.indexOf(r.hk) + 1) % 3];
        render();
        return;
      }
      const rate = e.target.closest("[data-rate]");
      if (rate && !rate.querySelector("input")) {
        const i = +rate.dataset.rate;
        rate.innerHTML = `<input value="${rates[i]}" inputmode="numeric">`;
        const inp = rate.querySelector("input");
        inp.focus(); inp.select();
        const commit = () => { rates[i] = +inp.value || rates[i]; render(); opts.onRate?.(i, rates[i]); };
        inp.addEventListener("blur", commit);
        inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") inp.blur(); if (ev.key === "Escape") { inp.value = rates[i]; inp.blur(); } });
      }
    });
    render();
    return { rooms, rates };
  };
})();
