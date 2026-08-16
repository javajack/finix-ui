/*!
 * finix-ui · finix-health.js — clinic behaviors
 * fxDayGrid (provider × 30-min slots w/ click-to-book), fxRx (prescription
 * composer w/ live sig preview + interaction check).
 */
(() => {
  "use strict";

  /* ============ fxDayGrid ============ */
  window.fxDayGrid = function (root, opts) {
    const providers = opts.providers;
    const start = opts.start || 9, end = opts.end || 17; /* hours */
    const slots = (end - start) * 2;
    const appts = opts.appts.map((a) => ({ ...a }));
    root.classList.add("fx-hc-grid");
    root.style.setProperty("--_prov", providers.length);

    const label = (i) => {
      const h = start + Math.floor(i / 2), m = i % 2 ? "30" : "00";
      return h.toString().padStart(2, "0") + ":" + m;
    };
    function render() {
      root.innerHTML = "<span></span>" + providers.map((p) =>
        `<div class="fx-hc-prov"><span class="fx-avatar fx-avatar--sm">${p.ini}</span>${p.name}<small>· ${p.role}</small></div>`).join("");
      for (let i = 0; i < slots; i++) {
        root.insertAdjacentHTML("beforeend", `<span class="fx-hc-time">${i % 2 === 0 ? label(i) : ""}</span>`);
        providers.forEach((p, pi) => {
          const appt = appts.find((a) => a.prov === pi && a.slot === i);
          if (appt) {
            root.insertAdjacentHTML("beforeend",
              `<div class="fx-hc-appt" style="--_c:${appt.color};grid-row:span ${appt.len || 1}"><b>${appt.name}</b><small>${appt.type} · ${label(i)}–${label(i + (appt.len || 1))}</small></div>`);
          } else if (!appts.find((a) => a.prov === pi && i > a.slot && i < a.slot + (a.len || 1))) {
            root.insertAdjacentHTML("beforeend",
              `<button class="fx-hc-slot" data-prov="${pi}" data-slot="${i}">+ ${label(i)}</button>`);
          }
        });
      }
    }
    root.addEventListener("click", (e) => {
      const slot = e.target.closest(".fx-hc-slot");
      if (!slot) return;
      const pi = +slot.dataset.prov, si = +slot.dataset.slot;
      const appt = { prov: pi, slot: si, len: 1, name: opts.bookAs || "New patient", type: "Consult", color: "var(--chart-2)" };
      appts.push(appt);
      render();
      opts.onBook?.(appt, providers[pi], label(si));
    });
    render();
    return { appts, count: () => appts.length };
  };

  /* ============ fxRx ============ */
  window.fxRx = function (root, opts) {
    const drugs = opts.drugs; /* [{name, doses[], interactsWith?}] */
    const current = (opts.currentMeds || []).slice();
    root.innerHTML =
      `<div class="fx-hc-rx">
         <div class="fx-field"><label class="fx-label">Drug</label>
           <select class="fx-select" data-rx="drug">${drugs.map((d) => `<option>${d.name}</option>`).join("")}</select></div>
         <div class="fx-field"><label class="fx-label">Dose</label><select class="fx-select" data-rx="dose"></select></div>
         <div class="fx-field"><label class="fx-label">Frequency</label>
           <select class="fx-select" data-rx="freq"><option>OD (once daily)</option><option>BD (twice daily)</option><option>TDS (thrice daily)</option><option>SOS (as needed)</option></select></div>
         <div class="fx-field"><label class="fx-label">Duration</label>
           <select class="fx-select" data-rx="dur"><option>5 days</option><option>7 days</option><option>14 days</option><option>30 days</option></select></div>
         <button class="fx-btn" data-rx-add type="button" style="height:2rem">Add</button>
       </div>
       <div class="fx-hc-sig" data-rx-sig></div>
       <div data-rx-warn></div>
       <div class="fx-hc-list" data-rx-list style="margin-top:.625rem"></div>`;
    const $ = (s) => root.querySelector(s);
    const val = (k) => $(`[data-rx="${k}"]`).value;

    function doseOptions() {
      const d = drugs.find((x) => x.name === val("drug"));
      $('[data-rx="dose"]').innerHTML = d.doses.map((x) => `<option>${x}</option>`).join("");
    }
    function sig() {
      $("[data-rx-sig]").innerHTML = `Sig: <b>${val("drug")} ${val("dose")}</b> — take ${val("freq").toLowerCase()}, ${val("dur")}${val("freq").startsWith("SOS") ? "" : ", after food"}.`;
      const d = drugs.find((x) => x.name === val("drug"));
      const clash = d.interactsWith && current.find((m) => m.includes(d.interactsWith));
      $("[data-rx-warn]").innerHTML = clash
        ? `<div class="fx-hc-interact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span><b>Interaction:</b> ${d.name} + ${clash} — ${d.note || "monitor closely"}.</span></div>`
        : "";
      return !clash;
    }
    root.addEventListener("change", (e) => {
      if (e.target.dataset.rx === "drug") doseOptions();
      if (e.target.dataset.rx) sig();
    });
    root.addEventListener("click", (e) => {
      if (!e.target.closest("[data-rx-add]")) return;
      $("[data-rx-list]").insertAdjacentHTML("beforeend",
        `<div class="fx-hc-row"><span><b style="font-weight:550">${val("drug")} ${val("dose")}</b><small>${val("freq")} · ${val("dur")}</small></span><span class="fx-badge fx-badge--secondary" style="font-size:.5625rem">New</span><button class="fx-btn fx-btn--ghost fx-btn--sm" onclick="this.closest('.fx-hc-row').remove()" style="height:1.5rem;font-size:.625rem">Remove</button></div>`);
      opts.onAdd?.(val("drug") + " " + val("dose"));
    });
    doseOptions();
    sig();
    return { sig, count: () => root.querySelectorAll("[data-rx-list] .fx-hc-row").length };
  };
})();
