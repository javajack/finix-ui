/*!
 * finix-ui · finix-logi.js — logistics behaviors
 * fxBinGrid (warehouse occupancy heat + bin contents), fxPickList
 * (scan-to-pick w/ progress meter).
 */
(() => {
  "use strict";

  /* ============ fxBinGrid ============ */
  window.fxBinGrid = function (root, opts) {
    const aisles = opts.aisles; /* ["A","B",…] */
    const bays = opts.bays; /* number */
    const data = opts.data; /* { "A1": {occ: 0-100, items:[{sku,qty}]} } */
    root.innerHTML =
      `<div class="fx-lg-bins" style="grid-template-columns:auto repeat(${bays}, minmax(0,1fr))">` +
      `<span></span>` + Array.from({ length: bays }, (_, b) => `<span class="fx-lg-bin-label">${b + 1}</span>`).join("") +
      aisles.map((a) =>
        `<span class="fx-lg-bin-label" style="align-self:center">${a}</span>` +
        Array.from({ length: bays }, (_, b) => {
          const id = a + (b + 1);
          const d = data[id];
          return `<button class="fx-lg-bin" data-bin="${id}" style="--_o:${d ? d.occ * 0.55 : 0}" aria-pressed="false" data-fx-tip="${id} · ${d ? d.occ + "% full" : "empty"}"></button>`;
        }).join("")).join("") +
      `</div>
       <div class="fx-lg-bin-detail" data-bin-detail style="margin-top:.75rem" hidden></div>`;
    root.addEventListener("click", (e) => {
      const bin = e.target.closest("[data-bin]");
      if (!bin) return;
      root.querySelectorAll("[data-bin]").forEach((b) => b.setAttribute("aria-pressed", b === bin));
      const id = bin.dataset.bin;
      const d = data[id];
      const detail = root.querySelector("[data-bin-detail]");
      detail.hidden = false;
      detail.innerHTML = `<b>Bin ${id}</b> — ${d ? d.occ + "% occupied" : "empty"}` +
        (d ? d.items.map((it) => `<div class="fx-lg-bin-row"><span>${it.name}</span><span>${it.sku} × ${it.qty}</span></div>`).join("") : "");
      opts.onSelect?.(id, d);
    });
    return { data };
  };

  /* ============ fxPickList ============ */
  window.fxPickList = function (root, opts) {
    const items = opts.items.map((i) => ({ ...i, picked: false }));
    const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    root.innerHTML =
      `<div class="fx-row" style="gap:.5rem;margin-bottom:.75rem">
         <input class="fx-input" data-scan placeholder="Scan or type a SKU, then Enter…" style="font-family:var(--font-mono);font-size:.75rem;max-width:18rem">
         <span class="fx-text-xs fx-muted" data-scan-msg></span>
       </div>
       <div data-pick-rows></div>
       <div class="fx-lg-meter" style="margin-top:.75rem"><span>Picked</span><div class="fx-lg-meter-bar"><i></i></div><b data-pick-count></b></div>`;
    const rowsEl = root.querySelector("[data-pick-rows]");

    function render() {
      rowsEl.innerHTML = items.map((it, i) =>
        `<div class="fx-lg-pick${it.picked ? " is-picked" : ""}" data-i="${i}">
           <span class="fx-lg-pickbox">${it.picked ? check : ""}</span>
           <span><span style="font-weight:550">${it.name}</span><span class="fx-lg-sku" style="display:block">${it.sku}</span></span>
           <span class="fx-lg-loc">${it.loc}</span>
           <span style="font-family:var(--font-mono);font-size:.75rem">× ${it.qty}</span>
         </div>`).join("");
      const done = items.filter((i) => i.picked).length;
      root.querySelector(".fx-lg-meter i").style.setProperty("--_w", (done / items.length) * 100 + "%");
      root.querySelector("[data-pick-count]").textContent = done + "/" + items.length;
      if (done === items.length) opts.onDone?.();
    }
    root.querySelector("[data-scan]").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const code = e.target.value.trim().toUpperCase();
      const msg = root.querySelector("[data-scan-msg]");
      const it = items.find((i) => i.sku.toUpperCase() === code && !i.picked);
      if (it) {
        it.picked = true;
        msg.textContent = "✓ " + it.name;
        msg.style.color = "var(--success)";
        render();
      } else {
        msg.textContent = code ? "No unpicked item with SKU " + code : "";
        msg.style.color = "var(--destructive)";
      }
      e.target.value = "";
    });
    rowsEl.addEventListener("click", (e) => {
      const row = e.target.closest("[data-i]");
      if (!row) return;
      items[+row.dataset.i].picked = !items[+row.dataset.i].picked;
      render();
    });
    render();
    return { items, progress: () => items.filter((i) => i.picked).length / items.length };
  };
})();
