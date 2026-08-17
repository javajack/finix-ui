/*!
 * finix-ui · finix-trading.js — trading terminal behaviors
 * fxWatchlist (live-tick symbol rail), fxOrderTicket (buy/sell w/ margin math),
 * fxPositions (positions/holdings P&L), fxOptionChain (strike ladder w/ ITM
 * logic), fxDepth (5-level book), fxBlotter (order log). Self-contained sim.
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
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inr = (n, dec = 2) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const inr0 = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const pct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  const esc = (s) => (window.fxEsc || String)(s ?? "");

  /* ============ fxWatchlist ============ */
  window.fxWatchlist = function (root, opts) {
    if (!root) { console.warn("finixui: fxWatchlist called without a root element"); return null; }
    const symbols = opts.symbols.map((s) => ({ ...s, hist: [] }));
    symbols.forEach((s) => { let p = s.ltp; for (let i = 0; i < 24; i++) { s.hist.push(p); p *= 1 + (Math.sin(i * 2.7 + s.ltp) * 0.004); } s.hist.push(s.ltp); });
    root.classList.add("fx-tr-watch");
    root.innerHTML =
      `<div class="fx-tr-search"><input class="fx-input" placeholder="Add symbol… (Enter)" style="height:1.875rem;font-size:.75rem"></div>
       <div class="fx-tr-rows"></div>`;
    const rowsEl = root.querySelector(".fx-tr-rows");
    let current = null;

    const sparkSvg = (hist) => {
      const min = Math.min(...hist), max = Math.max(...hist), span = max - min || 1;
      const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * 60},${16 - ((v - min) / span) * 14}`).join(" ");
      const up = hist[hist.length - 1] >= hist[0];
      return `<svg width="60" height="18" viewBox="0 0 60 18" style="display:block"><polyline points="${pts}" fill="none" stroke="${up ? "var(--success)" : "var(--destructive)"}" stroke-width="1.25" stroke-linejoin="round"/></svg>`;
    };
    function rowHtml(s) {
      const chg = ((s.ltp - s.prev) / s.prev) * 100;
      return `<div style="display:flex;flex-direction:column;gap:.125rem;min-width:0">
          <span class="fx-tr-sym"><span style="overflow:hidden;text-overflow:ellipsis">${esc(s.sym)}</span><span class="fx-tr-exch">${esc(s.exch)}</span></span>
          <span class="fx-tr-sub">${sparkSvg(s.hist)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.125rem">
          <span class="fx-tr-ltp">${s.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="fx-tr-chg ${chg >= 0 ? "up" : "down"}">${pct(chg)}</span>
        </div>`;
    }
    function render() {
      rowsEl.innerHTML = "";
      symbols.forEach((s) => {
        const row = document.createElement("div");
        row.className = "fx-tr-wrow";
        row.dataset.sym = s.sym; /* dataset assignment is safe; selectors use CSS.escape */
        row.setAttribute("aria-current", current === s.sym);
        row.innerHTML = rowHtml(s);
        rowsEl.appendChild(row);
      });
    }
    function paintRow(s, dir) {
      const row = rowsEl.querySelector(`[data-sym="${CSS.escape(s.sym)}"]`);
      if (!row) return;
      row.innerHTML = rowHtml(s);
      if (!reduced && dir) {
        row.classList.remove("is-up-flash", "is-down-flash");
        void row.offsetWidth;
        row.classList.add(dir > 0 ? "is-up-flash" : "is-down-flash");
      }
    }
    function select(sym) {
      current = sym;
      rowsEl.querySelectorAll(".fx-tr-wrow").forEach((r) => r.setAttribute("aria-current", r.dataset.sym === sym));
      const s = symbols.find((x) => x.sym === sym);
      if (s) opts.onSelect?.(s);
    }
    rowsEl.addEventListener("click", (e) => {
      const row = e.target.closest(".fx-tr-wrow");
      if (row) select(row.dataset.sym);
    });
    root.querySelector("input").addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !e.target.value.trim()) return;
      const sym = e.target.value.trim().toUpperCase();
      if (!symbols.find((s) => s.sym === sym)) {
        const base = 200 + (sym.length * 137) % 1800;
        const s = { sym, exch: "NSE", ltp: base, prev: base * 0.995, hist: Array.from({ length: 25 }, (_, i) => base * (1 + Math.sin(i) * 0.004)) };
        symbols.push(s);
        render();
      }
      e.target.value = "";
    });

    /* live tick sim */
    const timer = setInterval(() => {
      if (!root.isConnected) return clearInterval(timer);
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const s = symbols[Math.floor(Math.random() * symbols.length)];
        const dir = Math.random() > 0.48 ? 1 : -1;
        s.ltp = Math.max(1, s.ltp * (1 + dir * Math.random() * 0.0028));
        s.hist.push(s.ltp);
        if (s.hist.length > 25) s.hist.shift();
        paintRow(s, dir);
        opts.onTick?.(s);
      }
    }, 1600);

    render();
    if (opts.selected) select(opts.selected);
    return { select, symbols, get: (sym) => symbols.find((s) => s.sym === sym), stop: () => clearInterval(timer) };
  };

  /* ============ fxOrderTicket ============ */
  window.fxOrderTicket = function (root, opts) {
    if (!root) { console.warn("finixui: fxOrderTicket called without a root element"); return null; }
    const inr = makeMoney(opts);
    const st = { sym: opts.symbol, ltp: opts.ltp, side: "buy", type: "MARKET", product: "MIS", qty: opts.qty || 10, price: opts.ltp, trigger: 0, available: opts.available != null ? opts.available : 200000 };
    root.classList.add("fx-tr-ticket");
    root.innerHTML =
      `<div class="fx-tr-side">
         <button type="button" data-side="buy" aria-pressed="true">Buy</button>
         <button type="button" data-side="sell" aria-pressed="false">Sell</button>
       </div>
       <div class="fx-tr-ticket-body">
         <div class="fx-tr-frow"><span>Qty</span><input class="fx-input" data-t="qty" type="number" min="1" value="${st.qty}"></div>
         <div class="fx-tr-frow"><span>Price</span><input class="fx-input" data-t="price" type="number" step="0.05" value="${st.ltp.toFixed(2)}" disabled></div>
         <div class="fx-tr-frow" data-trigger-row hidden><span>Trigger</span><input class="fx-input" data-t="trigger" type="number" step="0.05" value="0"></div>
         <div class="fx-tr-frow"><span>Order type</span>
           <select class="fx-select" data-t="type"><option>MARKET</option><option>LIMIT</option><option>SL</option><option>SL-M</option></select>
         </div>
         <div class="fx-tr-frow"><span>Product</span>
           <div class="fx-tr-seg">
             <button type="button" data-prod="MIS" aria-pressed="true">Intraday 5×</button>
             <button type="button" data-prod="CNC" aria-pressed="false">Delivery 1×</button>
           </div>
         </div>
         <div class="fx-tr-margin">
           <div><span>Margin required</span><b data-mreq>—</b></div>
           <div><span>Available</span><b data-mav>—</b></div>
         </div>
         <button class="fx-btn fx-tr-submit" data-submit type="button">BUY</button>
       </div>`;
    const $ = (s) => root.querySelector(s);

    function margin() {
      const price = st.type === "MARKET" || st.type === "SL-M" ? st.ltp : st.price;
      const lev = st.product === "MIS" ? 5 : 1;
      return (st.qty * price) / lev;
    }
    function paint() {
      root.classList.toggle("is-sell", st.side === "sell");
      const priceInput = $('[data-t="price"]');
      const mkt = st.type === "MARKET" || st.type === "SL-M";
      priceInput.disabled = mkt;
      if (mkt) priceInput.value = st.ltp.toFixed(2);
      $("[data-trigger-row]").hidden = !(st.type === "SL" || st.type === "SL-M");
      const req = margin();
      const short = req > st.available;
      $("[data-mreq]").textContent = inr0(req);
      $("[data-mav]").textContent = inr0(st.available);
      $("[data-mreq]").parentElement.classList.toggle("is-short", short);
      const btn = $("[data-submit]");
      btn.textContent = (st.side === "buy" ? "BUY " : "SELL ") + st.sym; /* textContent — safe */
      btn.disabled = short;
      if (short) btn.textContent = "Insufficient margin";
    }
    root.addEventListener("click", (e) => {
      const side = e.target.closest("[data-side]");
      const prod = e.target.closest("[data-prod]");
      if (side) {
        st.side = side.dataset.side;
        root.querySelectorAll("[data-side]").forEach((b) => b.setAttribute("aria-pressed", b === side));
        paint();
      }
      if (prod) {
        st.product = prod.dataset.prod;
        root.querySelectorAll("[data-prod]").forEach((b) => b.setAttribute("aria-pressed", b === prod));
        paint();
      }
      if (e.target.closest("[data-submit]") && !$("[data-submit]").disabled) {
        const btn = $("[data-submit]");
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Placing…";
        setTimeout(() => {
          opts.onOrder?.({ sym: st.sym, side: st.side, type: st.type, product: st.product, qty: st.qty, price: st.type === "MARKET" || st.type === "SL-M" ? st.ltp : st.price });
          btn.disabled = false;
          btn.textContent = label;
        }, 550);
      }
    });
    root.addEventListener("input", (e) => {
      const t = e.target.dataset.t;
      if (!t) return;
      if (t === "type") st.type = e.target.value;
      else st[t] = +e.target.value || 0;
      paint();
    });
    paint();
    return {
      setSymbol(sym, ltp) { st.sym = sym; st.ltp = ltp; st.price = ltp; $('[data-t="price"]').value = ltp.toFixed(2); paint(); },
      setLtp(ltp) { st.ltp = ltp; if (st.type === "MARKET" || st.type === "SL-M") { $('[data-t="price"]').value = ltp.toFixed(2); $("[data-mreq]").textContent = inr0(margin()); } },
      getMargin: margin,
      state: st,
    };
  };

  /* ============ fxPositions ============ */
  window.fxPositions = function (root, opts) {
    if (!root) { console.warn("finixui: fxPositions called without a root element"); return null; }
    const inr = makeMoney(opts);
    const mode = opts.mode || "positions";
    const rows = opts.rows.map((r) => ({ ...r }));
    root.classList.add("fx-tr-table-wrap");
    function render() {
      let totalPnl = 0, totalInv = 0, totalCur = 0;
      const body = rows.map((r, i) => {
        const pnl = (r.ltp - r.avg) * r.qty;
        totalPnl += pnl;
        if (mode === "holdings") { totalInv += r.avg * r.qty; totalCur += r.ltp * r.qty; }
        const ret = ((r.ltp - r.avg) / r.avg) * 100 * (r.qty < 0 ? -1 : 1);
        return mode === "positions"
          ? `<tr data-i="${i}"><td>${esc(r.sym)}<span class="fx-tr-prod">${esc(r.product)}</span></td>
             <td class="${r.qty < 0 ? "down" : ""}">${r.qty}</td><td>${r.avg.toFixed(2)}</td><td>${r.ltp.toFixed(2)}</td>
             <td class="${pnl >= 0 ? "up" : "down"}">${(pnl >= 0 ? "+" : "−") + inr(Math.abs(pnl)).slice(1)}</td>
             <td><button class="fx-btn fx-btn--ghost fx-btn--sm" data-sq style="height:1.375rem;font-size:.625rem;padding-inline:.4375rem">Exit</button></td></tr>`
          : `<tr><td>${esc(r.sym)}</td><td>${r.qty}</td><td>${r.avg.toFixed(2)}</td><td>${r.ltp.toFixed(2)}</td>
             <td>${inr0(r.avg * r.qty)}</td><td>${inr0(r.ltp * r.qty)}</td>
             <td class="${pnl >= 0 ? "up" : "down"}">${(pnl >= 0 ? "+" : "−") + inr(Math.abs(pnl)).slice(1)} <span style="opacity:.75">(${pct(ret)})</span></td></tr>`;
      }).join("");
      root.innerHTML = mode === "positions"
        ? `<table class="fx-tr-table"><thead><tr><th>Instrument</th><th>Qty</th><th>Avg</th><th>LTP</th><th>P&amp;L</th><th></th></tr></thead>
           <tbody>${body}</tbody>
           <tfoot><tr><td colspan="4" style="text-align:left;font-family:var(--font-sans)">Total</td><td class="${totalPnl >= 0 ? "up" : "down"}">${(totalPnl >= 0 ? "+" : "−") + inr(Math.abs(totalPnl)).slice(1)}</td><td></td></tr></tfoot></table>`
        : `<table class="fx-tr-table"><thead><tr><th>Instrument</th><th>Qty</th><th>Avg cost</th><th>LTP</th><th>Invested</th><th>Current</th><th>P&amp;L</th></tr></thead>
           <tbody>${body}</tbody>
           <tfoot><tr><td colspan="4" style="text-align:left;font-family:var(--font-sans)">Total</td><td>${inr0(totalInv)}</td><td>${inr0(totalCur)}</td><td class="${totalCur - totalInv >= 0 ? "up" : "down"}">${(totalCur - totalInv >= 0 ? "+" : "−") + inr(Math.abs(totalCur - totalInv)).slice(1)}</td></tr></tfoot></table>`;
    }
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sq]");
      if (!btn) return;
      const i = +btn.closest("tr").dataset.i;
      const r = rows.splice(i, 1)[0];
      render();
      opts.onExit?.(r);
    });
    render();
    return {
      tick(sym, ltp) { let hit = false; rows.forEach((r) => { if (r.sym === sym) { r.ltp = ltp; hit = true; } }); if (hit) render(); },
      totals() { return rows.reduce((a, r) => a + (r.ltp - r.avg) * r.qty, 0); },
      rows,
    };
  };

  /* ============ fxOptionChain ============ */
  window.fxOptionChain = function (root, opts) {
    if (!root) { console.warn("finixui: fxOptionChain called without a root element"); return null; }
    let spot = opts.spot;
    const step = opts.step || 50;
    root.classList.add("fx-tr-chain-wrap");
    function gen() {
      const atm = Math.round(spot / step) * step;
      const rows = [];
      for (let k = -6; k <= 6; k++) {
        const strike = atm + k * step;
        const dist = (strike - spot) / step;
        const tv = step * 0.55 * Math.exp(-Math.abs(dist) / 2.4);
        const callLtp = Math.max(spot - strike, 0) + tv;
        const putLtp = Math.max(strike - spot, 0) + tv;
        const peak = Math.exp(-Math.abs(dist) / 3);
        rows.push({
          strike,
          call: { ltp: callLtp, oi: Math.round(peak * 82 + ((strike * 7) % 23)), chg: (Math.sin(strike) * 4) },
          put: { ltp: putLtp, oi: Math.round(peak * 74 + ((strike * 11) % 27)), chg: (Math.cos(strike) * 4) },
        });
      }
      return rows;
    }
    function render() {
      const rows = gen();
      const maxOi = Math.max(...rows.flatMap((r) => [r.call.oi, r.put.oi]));
      const atm = Math.round(spot / step) * step;
      root.innerHTML =
        `<table class="fx-tr-chain">
           <thead><tr><th>OI (L)</th><th>Chg%</th><th>Call LTP</th><th class="strike">Strike</th><th>Put LTP</th><th>Chg%</th><th>OI (L)</th></tr></thead>
           <tbody>` +
        rows.map((r) => {
          const cItm = r.strike < spot, pItm = r.strike > spot;
          const c = cItm ? " is-itm" : "", p = pItm ? " is-itm" : "";
          return `<tr${r.strike === atm ? ' class="is-atm"' : ""}>
            <td class="fx-tr-oi${c}" style="--_w:${(r.call.oi / maxOi) * 88}%">${r.call.oi.toFixed(1)}</td>
            <td class="${c} ${r.call.chg >= 0 ? "up" : "down"}">${pct(r.call.chg)}</td>
            <td class="${c}">${r.call.ltp.toFixed(2)}</td>
            <td class="strike">${r.strike.toLocaleString("en-IN")}</td>
            <td class="${p}">${r.put.ltp.toFixed(2)}</td>
            <td class="${p} ${r.put.chg >= 0 ? "up" : "down"}">${pct(r.put.chg)}</td>
            <td class="fx-tr-oi put${p}" style="--_w:${(r.put.oi / maxOi) * 88}%">${r.put.oi.toFixed(1)}</td>
          </tr>`;
        }).join("") +
        `</tbody></table>`;
    }
    render();
    return { setSpot(v) { spot = v; render(); }, get spot() { return spot; }, el: root };
  };

  /* ============ fxDepth ============ */
  window.fxDepth = function (root, opts) {
    if (!root) { console.warn("finixui: fxDepth called without a root element"); return null; }
    let ltp = opts.ltp;
    root.classList.add("fx-tr-depth");
    function render() {
      const mk = (side) => Array.from({ length: 5 }, (_, i) => {
        const off = (i + 1) * ltp * 0.0004;
        return { price: side === "bid" ? ltp - off : ltp + off, qty: Math.round(50 + ((i * 97 + ltp) % 400)) };
      });
      const bids = mk("bid"), asks = mk("ask");
      const maxQ = Math.max(...bids.concat(asks).map((r) => r.qty));
      const col = (rows, cls) =>
        `<div class="fx-tr-depth-col ${cls}">
           <div class="fx-tr-dhead"><span>${cls === "bids" ? "Bid" : "Ask"}</span><span>Qty</span></div>` +
        rows.map((r) => `<div class="fx-tr-drow"><i style="--_w:${(r.qty / maxQ) * 92}%"></i><span>${r.price.toFixed(2)}</span><span>${r.qty}</span></div>`).join("") +
        `</div>`;
      const tb = bids.reduce((a, r) => a + r.qty, 0), ta = asks.reduce((a, r) => a + r.qty, 0);
      root.innerHTML = col(bids, "bids") + col(asks, "asks") +
        `<div class="fx-tr-spread"><span>Total bid <b>${tb}</b></span><span>Spread <b>${(asks[0].price - bids[0].price).toFixed(2)}</b></span><span>Total ask <b>${ta}</b></span></div>`;
    }
    render();
    return { tick(v) { ltp = v; render(); } };
  };

  /* ============ fxBlotter ============ */
  window.fxBlotter = function (root) {
    if (!root) { console.warn("finixui: fxBlotter called without a root element"); return null; }
    root.classList.add("fx-tr-table-wrap");
    root.innerHTML =
      `<table class="fx-tr-table" style="min-width:34rem"><thead><tr><th>Time</th><th>Instrument</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody></tbody></table>`;
    const tbody = root.querySelector("tbody");
    let n = 0;
    function badge(status) {
      const map = { open: "fx-badge--warning", filled: "fx-badge--success", rejected: "fx-badge--destructive", cancelled: "fx-badge--outline" };
      return `<span class="fx-badge ${map[status]}" style="font-size:.5625rem">${status[0].toUpperCase() + status.slice(1)}</span>`;
    }
    function add(o) {
      const id = "ord" + ++n;
      const tr = document.createElement("tr");
      tr.dataset.id = id;
      const time = new Date().toTimeString().slice(0, 8);
      tr.innerHTML =
        `<td style="text-align:left;font-family:var(--font-mono);font-size:.6875rem">${time}</td>
         <td style="text-align:left;font-family:var(--font-sans);font-weight:550;font-size:.75rem">${esc(o.sym)}<span class="fx-tr-prod">${esc(o.product)}</span></td>
         <td><span class="fx-tr-bs ${o.side === "buy" ? "b" : "s"}">${o.side === "buy" ? "B" : "S"}</span></td>
         <td>${esc(o.type)}</td><td>${+o.qty}</td><td>${o.price.toFixed(2)}</td>
         <td data-status>${badge("open")}</td>
         <td><button class="fx-btn fx-btn--ghost fx-btn--sm" data-cancel style="height:1.375rem;font-size:.625rem;padding-inline:.4375rem">Cancel</button></td>`;
      tbody.prepend(tr);
      const fillIn = 900 + Math.random() * 1600;
      const t = setTimeout(() => {
        tr.querySelector("[data-status]").innerHTML = badge("filled");
        tr.querySelector("[data-cancel]")?.remove();
      }, fillIn);
      tr.addEventListener("click", (e) => {
        if (e.target.closest("[data-cancel]")) {
          clearTimeout(t);
          tr.querySelector("[data-status]").innerHTML = badge("cancelled");
          e.target.closest("[data-cancel]").remove();
        }
      });
      return id;
    }
    return { add, count: () => tbody.children.length };
  };
})();
