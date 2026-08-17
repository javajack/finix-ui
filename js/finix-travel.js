/*!
 * finix-ui · finix-travel.js — travel & booking behaviors
 * fxFareCal (per-day min prices), fxFlights (live filter/sort results),
 * fxSeatMap (selection + running total).
 */
(() => {
  "use strict";
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const esc = (s) => (window.fxEsc || String)(s ?? "");

  /* ============ fxFareCal ============ */
  window.fxFareCal = function (root, opts) {
    const { month, days, prices, startDow = 0 } = opts; /* prices: {day: minPrice} */
    const cheapest = Object.entries(prices).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([d]) => +d);
    root.classList.add("fx-tv-cal");
    root.innerHTML =
      ["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span class="fx-tv-cal-head">${d}</span>`).join("") +
      Array.from({ length: startDow }, () => `<span></span>`).join("") +
      Array.from({ length: days }, (_, i) => {
        const d = i + 1, p = prices[d];
        return `<button class="fx-tv-day${cheapest.includes(d) ? " is-cheap" : ""}" data-day="${d}" aria-pressed="false" ${p ? "" : "disabled"}>
          <b>${d}</b>${p ? `<small>${(p / 1000).toFixed(1)}k</small>` : ""}
        </button>`;
      }).join("");
    root.addEventListener("click", (e) => {
      const day = e.target.closest("[data-day]");
      if (!day || day.disabled) return;
      root.querySelectorAll("[data-day]").forEach((b) => b.setAttribute("aria-pressed", b === day));
      opts.onSelect?.(+day.dataset.day, prices[+day.dataset.day]);
    });
    return { select: (d) => root.querySelector(`[data-day="${d}"]`)?.click() };
  };

  /* ============ fxFlights ============ */
  window.fxFlights = function (root, opts) {
    const flights = opts.flights;
    const rail = opts.rail;
    let sort = "cheap";

    const windowOf = (dep) => {
      const h = +dep.split(":")[0];
      return h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    };
    const dur = (m) => Math.floor(m / 60) + "h " + (m % 60 ? (m % 60) + "m" : "").trim();

    function visible() {
      const stops = [...rail.querySelectorAll("[data-f-stops]:checked")].map((i) => +i.value);
      const wins = [...rail.querySelectorAll("[data-f-win][aria-pressed=true]")].map((b) => b.dataset.fWin);
      const airs = [...rail.querySelectorAll("[data-f-air]:checked")].map((i) => i.value);
      const max = +rail.querySelector("[data-f-max]")?.value || Infinity;
      let list = flights.filter((f) =>
        (!stops.length || stops.includes(f.stops)) &&
        (!wins.length || wins.includes(windowOf(f.dep))) &&
        (!airs.length || airs.includes(f.code)) &&
        f.price <= max);
      list = list.slice().sort((a, b) => (sort === "cheap" ? a.price - b.price : a.mins - b.mins));
      return list;
    }
    function render() {
      const list = visible();
      root.innerHTML = list.map((f) =>
        `<div class="fx-tv-flight" data-id="${esc(f.id)}">
           <div class="fx-tv-airline"><i style="--_c:${f.color}">${esc(f.code)}</i><small>${esc(f.airline)}</small></div>
           <div class="fx-tv-route">
             <div class="fx-tv-time"><b>${esc(f.dep)}</b><span>${esc(f.from)}</span></div>
             <div class="fx-tv-path">
               <small>${dur(f.mins)}</small>
               <div class="fx-tv-line${f.stops ? "" : " nonstop"}"><i></i></div>
               <span class="fx-tv-stops${f.stops ? "" : " nonstop"}">${f.stops ? +f.stops + " stop · " + esc(f.via) : "Non-stop"}</span>
             </div>
             <div class="fx-tv-time" style="text-align:right"><b>${esc(f.arr)}</b><span>${esc(f.to)}</span></div>
           </div>
           <div class="fx-tv-buy"><span class="fx-tv-price">${inr(f.price)}</span><button class="fx-btn fx-btn--sm">Select</button></div>
         </div>`).join("") ||
        `<div class="fx-text-sm fx-muted" style="text-align:center;padding:2rem">No flights match — loosen a filter.</div>`;
      opts.countEl && (opts.countEl.textContent = list.length + " of " + flights.length + " flights");
    }
    rail.addEventListener("input", render);
    rail.addEventListener("click", (e) => {
      const win = e.target.closest("[data-f-win]");
      if (win) { win.setAttribute("aria-pressed", win.getAttribute("aria-pressed") !== "true"); render(); }
    });
    opts.sortEl?.addEventListener("click", (e) => {
      const t = e.target.closest("[data-sort]");
      if (!t) return;
      sort = t.dataset.sort;
      opts.sortEl.querySelectorAll("[data-sort]").forEach((b) => b.setAttribute("aria-selected", b === t));
      render();
    });
    render();
    return { visible, render };
  };

  /* ============ fxSeatMap ============ */
  window.fxSeatMap = function (root, opts) {
    const rows = opts.rows || 12;
    const cols = ["A", "B", "C", "D", "E", "F"];
    const occupied = new Set(opts.occupied || []);
    const extraRows = new Set(opts.extraRows || []);
    const priceStd = opts.price != null ? opts.price : 299;
    const priceExtra = opts.priceExtra != null ? opts.priceExtra : 899;
    const selected = new Set();

    root.classList.add("fx-tv-cabin");
    root.innerHTML = Array.from({ length: rows }, (_, r) => {
      const row = r + 1;
      return `<div class="fx-tv-row">
        <span class="fx-tv-rownum">${row}</span>` +
        cols.map((c, ci) => {
          const id = row + c;
          return (ci === 3 ? '<span class="fx-tv-aisle"></span>' : "") +
            `<button class="fx-tv-seat${extraRows.has(row) ? " is-extra" : ""}" data-seat="${id}" aria-pressed="false" ${occupied.has(id) ? "disabled" : ""} data-fx-tip="${id} · ${occupied.has(id) ? "taken" : inr(extraRows.has(row) ? priceExtra : priceStd)}">${id}</button>`;
        }).join("") +
        `<span class="fx-tv-rownum">${row}</span>
      </div>`;
    }).join("");

    function total() {
      let t = 0;
      selected.forEach((id) => { t += extraRows.has(+id.slice(0, -1)) ? priceExtra : priceStd; });
      return t;
    }
    root.addEventListener("click", (e) => {
      const seat = e.target.closest("[data-seat]");
      if (!seat || seat.disabled) return;
      const id = seat.dataset.seat;
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      seat.setAttribute("aria-pressed", selected.has(id));
      opts.onChange?.([...selected], total());
    });
    return { selected, total, el: root };
  };
})();
