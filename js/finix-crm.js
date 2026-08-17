/*!
 * finix-ui · finix-crm.js — sales CRM behaviors
 * fxPipeline — weighted pipeline board with pointer-drag deals
 * fxScore    — lead-score ring (+ factor popover fill)
 * fxQuote    — CPQ line-item builder with live math + approval threshold
 */
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = (n, cur = "$") => cur + Math.round(n).toLocaleString("en-US");
  const esc = (s) => (window.fxEsc || String)(s ?? "");
  const pulse = (el) => {
    if (reduced || !el) return;
    el.classList.remove("is-pulse");
    void el.offsetWidth;
    el.classList.add("is-pulse");
  };
  const monogram = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  /* ============ fxPipeline ============ */
  window.fxPipeline = function (root, opts) {
    const stages = opts.stages.map((s) => ({ ...s }));
    const deals = opts.deals.map((d) => ({ ...d }));
    const cur = opts.currency || "$";
    root.classList.add("fx-crm-pipe");
    root.innerHTML = "";

    const lanes = document.createElement("div");
    lanes.className = "fx-crm-lanes";
    const foot = document.createElement("div");
    foot.className = "fx-crm-pipe-foot";
    foot.innerHTML =
      `<div class="fx-crm-kpi"><span>Total pipeline</span><b data-total>—</b></div>
       <div class="fx-crm-kpi"><span>Weighted forecast</span><b data-wtd>—</b></div>
       <div class="fx-crm-kpi"><span>Open deals</span><b data-open>—</b></div>
       <div class="fx-crm-kpi"><span>Win rate</span><b>${opts.winRate != null ? opts.winRate + "%" : "—"}</b></div>`;
    root.append(lanes, foot);

    const stageEls = {};
    const stageOf = (id) => stages.find((s) => s.id === id);

    stages.forEach((s) => {
      const el = document.createElement("div");
      el.className = "fx-crm-stage";
      el.dataset.stage = s.id;
      el.innerHTML =
        `<div class="fx-crm-stage-head">
           <div class="fx-crm-stage-top">
             <span class="fx-crm-stage-name">${esc(s.name)}</span>
             <span class="fx-crm-stage-count">0</span>
             <span class="fx-crm-stage-prob">${Math.round(s.prob * 100)}%</span>
           </div>
           <div class="fx-crm-stage-vals"><span>Σ <b data-sum>—</b></span><span>wtd <b data-stage-wtd>—</b></span></div>
         </div>
         <div class="fx-crm-stage-body"></div>`;
      lanes.appendChild(el);
      stageEls[s.id] = el;
    });

    function cardEl(d) {
      const el = document.createElement("div");
      el.className = "fx-crm-deal";
      el.dataset.deal = d.id;
      el.innerHTML =
        `<div class="fx-crm-deal-top">
           <span class="fx-crm-deal-co">${esc(monogram(d.company))}</span>
           <span class="fx-crm-deal-name" title="${esc(d.company)} — ${esc(d.name)}">${esc(d.name)}</span>
           <span class="fx-crm-deal-own">${esc(d.owner)}</span>
         </div>
         <div class="fx-crm-deal-meta">
           <b class="fx-crm-deal-val">${money(d.value, cur)}</b>
           <span class="fx-crm-deal-date${d.late ? " is-late" : ""}">${esc(d.closes)}</span>
           <span class="fx-crm-prob">${Math.round(stageOf(d.stage).prob * 100)}%</span>
         </div>`;
      return el;
    }
    deals.forEach((d) => stageEls[d.stage].querySelector(".fx-crm-stage-body").appendChild(cardEl(d)));

    function totals() {
      const per = {};
      stages.forEach((s) => (per[s.id] = { sum: 0, n: 0 }));
      deals.forEach((d) => { per[d.stage].sum += d.value; per[d.stage].n++; });
      let total = 0, weighted = 0;
      stages.forEach((s) => { total += per[s.id].sum; weighted += per[s.id].sum * s.prob; });
      return { per, total, weighted, open: deals.length };
    }
    function paint(animate) {
      const t = totals();
      stages.forEach((s) => {
        const el = stageEls[s.id], p = t.per[s.id];
        el.querySelector(".fx-crm-stage-count").textContent = p.n;
        const sum = el.querySelector("[data-sum]"), wtd = el.querySelector("[data-stage-wtd]");
        const sv = money(p.sum, cur), wv = money(p.sum * s.prob, cur);
        if (animate && sum.textContent !== sv) { pulse(sum); pulse(wtd); }
        sum.textContent = sv;
        wtd.textContent = wv;
      });
      const tot = foot.querySelector("[data-total]"), wtd = foot.querySelector("[data-wtd]");
      if (animate && tot.textContent !== money(t.total, cur)) { pulse(tot); pulse(wtd); }
      tot.textContent = money(t.total, cur);
      wtd.textContent = money(t.weighted, cur);
      foot.querySelector("[data-open]").textContent = t.open;
    }
    paint(false);

    /* model+paint after the card node is already in its new DOM position */
    function commitMove(deal, toId, cardNode) {
      const from = deal.stage;
      deal.stage = toId;
      cardNode.querySelector(".fx-crm-prob").textContent = Math.round(stageOf(toId).prob * 100) + "%";
      paint(true);
      if (from !== toId) opts.onMove?.(deal, from, toId);
    }

    /* ---- pointer drag ---- */
    let drag = null;
    lanes.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const card = lanes.contains(e.target) ? e.target.closest(".fx-crm-deal") : null;
      if (!card) return;
      drag = { card, x0: e.clientX, y0: e.clientY, active: false };
      try { card.setPointerCapture(e.pointerId); } catch (_) {}
    });
    lanes.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        const rect = drag.card.getBoundingClientRect();
        const ghost = drag.card.cloneNode(true);
        ghost.classList.add("fx-crm-deal-ghost");
        ghost.style.width = rect.width + "px";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        document.body.appendChild(ghost);
        const place = document.createElement("div");
        place.className = "fx-crm-place";
        place.style.height = rect.height + "px";
        drag.card.after(place);
        drag.card.classList.add("is-src");
        Object.assign(drag, { active: true, ghost, place, dx: e.clientX - rect.left, dy: e.clientY - rect.top, over: null });
      }
      drag.ghost.style.left = e.clientX - drag.dx + "px";
      drag.ghost.style.top = e.clientY - drag.dy + "px";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const stage = under && under.closest(".fx-crm-stage");
      if (drag.over && drag.over !== stage) drag.over.classList.remove("is-over");
      drag.over = stage || null;
      if (!stage) return;
      stage.classList.add("is-over");
      const body = stage.querySelector(".fx-crm-stage-body");
      const cards = [...body.querySelectorAll(".fx-crm-deal:not(.is-src)")];
      const next = cards.find((c) => e.clientY < c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2);
      body.insertBefore(drag.place, next || null);
    });
    function finish(commit) {
      if (!drag) return;
      if (drag.active) {
        const { card, ghost, place, over } = drag;
        if (commit && over) {
          const deal = deals.find((d) => d.id === card.dataset.deal);
          place.before(card);
          commitMove(deal, over.dataset.stage, card);
        }
        ghost.remove();
        place.remove();
        card.classList.remove("is-src");
        if (over) over.classList.remove("is-over");
      }
      drag = null;
    }
    lanes.addEventListener("pointerup", () => finish(true));
    lanes.addEventListener("pointercancel", () => finish(false));

    return {
      totals,
      deals,
      moveDeal(id, stageId) {
        const deal = deals.find((d) => d.id === id);
        const card = lanes.querySelector(`[data-deal="${id}"]`);
        if (deal && card && stageEls[stageId]) {
          stageEls[stageId].querySelector(".fx-crm-stage-body").appendChild(card);
          commitMove(deal, stageId, card);
        }
      },
    };
  };

  /* ============ fxScore ============ */
  window.fxScore = function (el, opts) {
    const v = Math.max(0, Math.min(100, Math.round(opts.score)));
    el.classList.add("fx-crm-score");
    if (opts.size === "sm") el.classList.add("fx-crm-score--sm");
    el.classList.add(v >= 70 ? "is-hot" : v >= 40 ? "is-warm" : "is-cold");
    el.innerHTML = `<b>${v}</b>`;
    el.setAttribute("aria-label", `Lead score ${v} of 100`);
    if (reduced) el.style.setProperty("--_v", v);
    else {
      /* sweep the ring in */
      let cv = 0;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 600);
        cv = v * (1 - Math.pow(1 - p, 3));
        el.style.setProperty("--_v", cv);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    if (opts.factors && opts.popover) {
      const pop = typeof opts.popover === "string" ? document.querySelector(opts.popover) : opts.popover;
      if (pop) {
        pop.innerHTML =
          `<div class="fx-menu-label">Score breakdown</div><div class="fx-menu-sep"></div>
           <div class="fx-crm-factors">` +
          opts.factors
            .map((f) =>
              `<div class="fx-crm-factor"><span>${esc(f.label)}</span><i style="--_w:${Math.min(100, Math.abs(f.delta) * 4)}%"></i><b class="${f.delta >= 0 ? "up" : "down"}">${f.delta >= 0 ? "+" : ""}${+f.delta}</b></div>`)
            .join("") +
          `</div>`;
      }
    }
    return { value: v };
  };

  /* ============ fxQuote ============ */
  window.fxQuote = function (root, opts) {
    const products = opts.products;
    const lines = (opts.lines || []).map((l) => ({ ...l }));
    const taxRate = opts.taxRate != null ? opts.taxRate : 0.18;
    const threshold = opts.approvalThreshold != null ? opts.approvalThreshold : 15;
    const cur = opts.currency || "$";
    root.classList.add("fx-crm-quote");
    root.innerHTML =
      `<div class="fx-crm-quote-scroll"><table>
         <thead><tr><th>Product</th><th style="width:4.75rem">Qty</th><th class="num" style="width:7rem">Unit price</th><th class="num" style="width:5.25rem">Disc %</th><th class="num" style="width:7rem">Amount</th><th style="width:2.25rem"></th></tr></thead>
         <tbody></tbody>
       </table></div>
       <div class="fx-crm-quote-foot">
         <div style="display:flex;flex-direction:column;gap:.625rem;align-items:flex-start">
           <button class="fx-btn fx-btn--outline fx-btn--sm" data-add type="button">Add line</button>
           <span class="fx-badge fx-badge--warning" data-approval hidden>Needs approval — discount &gt; ${threshold}%</span>
         </div>
         <div class="fx-crm-quote-totals">
           <div class="fx-crm-total"><span>Subtotal</span><b data-sub></b></div>
           <div class="fx-crm-total"><span>Discount</span><b data-disc></b></div>
           <div class="fx-crm-total"><span>Tax (${Math.round(taxRate * 100)}%)</span><b data-tax></b></div>
           <div class="fx-crm-total is-grand"><span>Total</span><b data-total></b></div>
           <div class="fx-crm-margin"><span>Margin</span><div class="fx-crm-margin-bar"><i></i></div><b data-margin></b></div>
         </div>
       </div>`;
    const tbody = root.querySelector("tbody");

    const productOptions = (sel) =>
      products.map((p) => `<option value="${esc(p.id)}"${p.id === sel ? " selected" : ""}>${esc(p.name)}</option>`).join("");

    function rowEl(line, i) {
      const tr = document.createElement("tr");
      tr.dataset.i = i;
      tr.innerHTML =
        `<td><select class="fx-select" data-f="product">${productOptions(line.product)}</select></td>
         <td><input class="fx-input fx-crm-qty" data-f="qty" type="number" min="1" value="${line.qty}"></td>
         <td class="num"><input class="fx-input fx-crm-price" data-f="price" type="number" min="0" step="1" value="${line.price}"></td>
         <td class="num"><input class="fx-input fx-crm-disc" data-f="disc" type="number" min="0" max="80" value="${line.disc}"></td>
         <td class="num" data-amount></td>
         <td><button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-remove type="button" aria-label="Remove line">✕</button></td>`;
      return tr;
    }
    function render() {
      tbody.innerHTML = "";
      lines.forEach((l, i) => tbody.appendChild(rowEl(l, i)));
      calc();
    }
    function calc() {
      let sub = 0, discTotal = 0, cost = 0, maxDisc = 0;
      lines.forEach((l, i) => {
        const p = products.find((x) => x.id === l.product);
        const gross = l.qty * l.price;
        const amount = gross * (1 - l.disc / 100);
        sub += gross;
        discTotal += gross - amount;
        cost += l.qty * (p ? p.cost : 0);
        maxDisc = Math.max(maxDisc, l.disc);
        const tr = tbody.children[i];
        if (tr) {
          tr.querySelector("[data-amount]").textContent = money(amount, cur);
          tr.querySelector('[data-f="disc"]').classList.toggle("is-over", l.disc > threshold);
        }
      });
      const net = sub - discTotal;
      const tax = net * taxRate;
      const total = net + tax;
      const margin = net > 0 ? ((net - cost) / net) * 100 : 0;
      root.querySelector("[data-sub]").textContent = money(sub, cur);
      root.querySelector("[data-disc]").textContent = "−" + money(discTotal, cur);
      root.querySelector("[data-tax]").textContent = money(tax, cur);
      root.querySelector("[data-total]").textContent = money(total, cur);
      const mEl = root.querySelector(".fx-crm-margin");
      mEl.classList.toggle("is-thin", margin < 30);
      mEl.querySelector("i").style.setProperty("--_w", Math.max(0, Math.min(100, margin)) + "%");
      root.querySelector("[data-margin]").textContent = margin.toFixed(1) + "%";
      const needs = maxDisc > threshold;
      root.querySelector("[data-approval]").hidden = !needs;
      opts.onApproval?.(needs);
      return { sub, discount: discTotal, net, tax, total, margin, needsApproval: needs };
    }
    root.addEventListener("input", (e) => {
      const f = e.target.dataset.f;
      if (!f) return;
      const tr = e.target.closest("tr");
      const line = lines[+tr.dataset.i];
      if (f === "product") {
        line.product = e.target.value;
        const p = products.find((x) => x.id === line.product);
        if (p) { line.price = p.price; tr.querySelector('[data-f="price"]').value = p.price; }
      } else line[f] = +e.target.value || 0;
      calc();
    });
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) {
        const p = products[0];
        lines.push({ product: p.id, qty: 1, price: p.price, disc: 0 });
        render();
      } else if (e.target.closest("[data-remove]")) {
        lines.splice(+e.target.closest("tr").dataset.i, 1);
        render();
      }
    });
    render();
    return { totals: calc, lines, addLine: (l) => { lines.push(l); render(); } };
  };
})();
