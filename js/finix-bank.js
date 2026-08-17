/*!
 * finix-ui · finix-bank.js — consumer banking behaviors
 * fxBankFeed (day-grouped txns w/ running balance + search/category filter),
 * fxBankCard (freeze + hold-to-reveal CVV), fxTransfer (recipient + keypad +
 * review + send), fxBankBudgets (spend rings). ₹ en-IN throughout.
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
  const inr = (n) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");
  const esc = (s) => (window.fxEsc || String)(s ?? "");
  const CATS = {
    Food: "var(--chart-1)", Transport: "var(--chart-2)", Shopping: "var(--chart-4)",
    Bills: "var(--chart-5)", Entertainment: "var(--chart-3)", Income: "var(--success)",
  };

  /* ============ fxBankFeed ============ */
  window.fxBankFeed = function (root, opts) {
    if (!root) { console.warn("finixui: fxBankFeed called without a root element"); return null; }
    const inr = makeMoney(opts);
    const txns = opts.txns.map((t) => ({ ...t }));
    let closing = opts.balance;
    const state = { q: "", cat: null };

    root.innerHTML =
      `<div class="fx-bank-feed-bar">
         <input class="fx-input" data-bf-q placeholder="Search transactions…" style="height:2rem;font-size:.75rem;max-width:14rem">
         <div class="fx-bank-catchips" data-bf-cats></div>
       </div>
       <div data-bf-list></div>`;
    const chipsEl = root.querySelector("[data-bf-cats]");
    chipsEl.innerHTML = Object.entries(CATS).map(([c, hue]) =>
      `<button class="fx-bank-catchip" data-cat="${c}" aria-pressed="false" style="--_c:${hue}"><i></i>${c}</button>`).join("");

    function withRunning() {
      /* newest-first; running balance after each txn */
      let bal = closing;
      return txns.map((t, i) => {
        const run = bal;
        bal -= t.amount;
        return { ...t, run };
      });
    }
    function render() {
      const list = root.querySelector("[data-bf-list]");
      const rows = withRunning().filter((t) =>
        (!state.cat || t.cat === state.cat) &&
        (!state.q || t.name.toLowerCase().includes(state.q)));
      const days = [];
      rows.forEach((t) => {
        let d = days.find((x) => x.day === t.day);
        if (!d) days.push((d = { day: t.day, rows: [] }));
        d.rows.push(t);
      });
      list.innerHTML = days.map((d) =>
        `<div class="fx-bank-day"><span>${esc(d.day)}</span><b>${d.rows.length} txns · net ${(d.rows.reduce((a, r) => a + r.amount, 0) >= 0 ? "+" : "−") + inr(d.rows.reduce((a, r) => a + r.amount, 0))}</b></div>` +
        d.rows.map((t) =>
          `<div class="fx-bank-txn${t.pending ? " is-pending" : ""}" style="--_c:${CATS[t.cat] || "var(--muted-foreground)"}">
             <span class="fx-bank-txn-ic">${esc(t.glyph)}</span>
             <span class="fx-bank-txn-main"><b>${esc(t.name)}</b><small><span class="fx-bank-cat">${esc(t.cat)}</span>· ${esc(t.time)}${t.pending ? " · pending" : ""}</small></span>
             <span class="fx-bank-amt${t.amount > 0 ? " in" : ""}">${t.amount > 0 ? "+" : "−"}${inr(t.amount)}</span>
             <span class="fx-bank-run">${inr(t.run)}</span>
           </div>`).join("")).join("") ||
        `<div class="fx-text-sm fx-muted" style="padding:1.5rem;text-align:center">No transactions match.</div>`;
    }
    root.addEventListener("input", (e) => {
      if (e.target.matches("[data-bf-q]")) { state.q = e.target.value.trim().toLowerCase(); render(); }
    });
    chipsEl.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-cat]");
      if (!chip) return;
      state.cat = state.cat === chip.dataset.cat ? null : chip.dataset.cat;
      chipsEl.querySelectorAll("[data-cat]").forEach((c) => c.setAttribute("aria-pressed", c.dataset.cat === state.cat));
      render();
    });
    render();
    return {
      add(t) {
        txns.unshift(t);
        closing += t.amount;
        render();
        root.querySelector(".fx-bank-txn")?.classList.add("is-new");
        opts.onBalance?.(closing);
      },
      running: () => withRunning(),
      get balance() { return closing; },
    };
  };

  /* ============ fxBankCard ============ */
  window.fxBankCard = function (root, opts) {
    if (!root) { console.warn("finixui: fxBankCard called without a root element"); return null; }
    root.classList.add("fx-bank-card");
    root.innerHTML =
      `<div class="fx-bank-card-top"><span class="fx-bank-chip"></span><span class="brand">VISA</span></div>
       <div class="fx-bank-pan">•••• •••• •••• ${esc(opts.last4 || "4021")}</div>
       <div class="fx-bank-card-foot">
         <div><span>Card holder</span>${esc(opts.holder || "RAKESH KUMAR")}</div>
         <div><span>Expires</span>${esc(opts.exp || "08/29")}</div>
         <div class="fx-bank-cvv" data-fx-tip="Press & hold to reveal"><span>CVV</span><b data-cvv>•••</b></div>
       </div>
       <div class="fx-bank-frost">❄️</div>`;
    /* hold-to-reveal cvv */
    const cvv = root.querySelector("[data-cvv]");
    let t = null;
    const holdEl = root.querySelector(".fx-bank-cvv");
    holdEl.addEventListener("pointerdown", (e) => {
      try { holdEl.setPointerCapture(e.pointerId); } catch (_) {}
      t = setTimeout(() => (cvv.textContent = opts.cvv || "213"), 550);
    });
    const hide = () => { clearTimeout(t); cvv.textContent = "•••"; };
    holdEl.addEventListener("pointerup", hide);
    holdEl.addEventListener("pointercancel", hide);
    return {
      freeze(on) { root.classList.toggle("is-frozen", on); },
      get frozen() { return root.classList.contains("is-frozen"); },
    };
  };

  /* ============ fxTransfer ============ */
  window.fxTransfer = function (root, opts) {
    if (!root) { console.warn("finixui: fxTransfer called without a root element"); return null; }
    const inr = makeMoney(opts);
    const recips = opts.recipients;
    let sel = null, amt = "";
    root.innerHTML =
      `<div class="fx-bank-recips" data-tr-recips>` +
      recips.map((r, i) =>
        `<button class="fx-bank-recip" data-i="${i}" aria-pressed="false"><span class="fx-avatar">${esc(r.ini)}</span>${esc(r.name.split(" ")[0])}</button>`).join("") +
      `</div>
       <div class="fx-bank-amount is-zero" data-tr-amt>₹0</div>
       <div class="fx-bank-quick">
         <button class="fx-btn fx-btn--outline fx-btn--sm" data-q="500">₹500</button>
         <button class="fx-btn fx-btn--outline fx-btn--sm" data-q="2000">₹2,000</button>
         <button class="fx-btn fx-btn--outline fx-btn--sm" data-q="5000">₹5,000</button>
       </div>
       <div class="fx-bank-pad" data-tr-pad>
         <button>1</button><button>2</button><button>3</button>
         <button>4</button><button>5</button><button>6</button>
         <button>7</button><button>8</button><button>9</button>
         <button>00</button><button>0</button><button aria-label="Backspace">⌫</button>
       </div>
       <div class="fx-bank-review" data-tr-review hidden style="margin-top:.75rem"></div>
       <button class="fx-btn" data-tr-go style="width:100%;margin-top:.75rem" disabled>Review transfer</button>`;
    const amtEl = root.querySelector("[data-tr-amt]");
    const goBtn = root.querySelector("[data-tr-go]");
    const review = root.querySelector("[data-tr-review]");
    let stage = "input";

    function paint() {
      const v = +amt || 0;
      amtEl.textContent = "₹" + v.toLocaleString("en-IN");
      amtEl.classList.toggle("is-zero", !v);
      goBtn.disabled = !v || !sel || v > opts.max;
      goBtn.textContent = v > opts.max ? "Exceeds balance" : stage === "input" ? "Review transfer" : "Send " + inr(v);
    }
    root.querySelector("[data-tr-recips]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (!b) return;
      sel = recips[+b.dataset.i];
      root.querySelectorAll("[data-i]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      paint();
    });
    root.querySelector("[data-tr-pad]").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.textContent === "⌫") amt = amt.slice(0, -1);
      else if (amt.length < 7) amt += b.textContent;
      stage = "input"; review.hidden = true; paint();
    });
    root.querySelector(".fx-bank-quick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]");
      if (b) { amt = b.dataset.q; stage = "input"; review.hidden = true; paint(); }
    });
    goBtn.addEventListener("click", () => {
      const v = +amt;
      if (stage === "input") {
        stage = "confirm";
        review.hidden = false;
        review.innerHTML =
          `<div><span>To</span><b style="font-family:var(--font-sans)">${esc(sel.name)} · ${esc(sel.vpa)}</b></div>
           <div><span>Amount</span><b>${inr(v)}</b></div>
           <div><span>Fee</span><b>₹0</b></div>
           <div><span>Arrives</span><b style="font-family:var(--font-sans)">Instantly · IMPS</b></div>`;
        paint();
      } else {
        goBtn.disabled = true;
        goBtn.textContent = "Sending…";
        setTimeout(() => {
          goBtn.textContent = "Sent ✓";
          opts.onSend?.({ to: sel, amount: v });
          setTimeout(() => {
            amt = ""; sel = null; stage = "input";
            review.hidden = true;
            root.querySelectorAll("[data-i]").forEach((x) => x.setAttribute("aria-pressed", "false"));
            paint();
          }, 1200);
        }, 700);
      }
    });
    paint();
    return { get state() { return { sel, amt: +amt || 0, stage }; } };
  };

  /* ============ fxBankBudgets ============ */
  window.fxBankBudgets = function (root, opts) {
    if (!root) { console.warn("finixui: fxBankBudgets called without a root element"); return null; }
    const inr = makeMoney(opts);
    root.classList.add("fx-bank-budgets");
    root.innerHTML = opts.cats.map((c) => {
      const pct = Math.round((c.spent / c.limit) * 100);
      return `<div class="fx-bank-budget${pct > 100 ? " is-over" : ""}">
        <div class="fx-bank-ring" style="--_v:${Math.min(100, pct)};${pct <= 100 ? `--_c:${CATS[c.name] || "var(--primary)"}` : ""}"><span>${esc(c.glyph)}</span></div>
        <b>${esc(c.name)}</b>
        <small>${inr(c.spent)} / ${inr(c.limit)}${pct > 100 ? " · over" : ""}</small>
      </div>`;
    }).join("");
    return { pct: (name) => { const c = opts.cats.find((x) => x.name === name); return Math.round((c.spent / c.limit) * 100); } };
  };

  window.fxBankCats = CATS;
})();
