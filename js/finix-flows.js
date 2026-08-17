/*!
 * finix-ui · finix-flows.js — fxWizard multi-step flow engine
 * Declarative sections ([data-step]) + progress rail, native+custom
 * validation, branching (opts.next), auto review step, localStorage
 * save-and-resume, focus/survey mode with keyboard advance.
 */
(() => {
  "use strict";
  const esc = (s) => (window.fxEsc || String)(s ?? "");

  window.fxWizard = function (root, opts = {}) {
    const secs = [...root.querySelectorAll("[data-step]")];
    const byId = {};
    secs.forEach((s) => { s.classList.add("fx-wiz-sec"); byId[s.dataset.step] = s; });
    const railSecs = secs.filter((s) => s.dataset.step !== "done");
    root.classList.add("fx-wiz");
    if (opts.focus) root.classList.add("fx-wiz--focus");

    /* ---- chrome: rail / progress bar + footer ---- */
    const rail = document.createElement("div");
    rail.className = "fx-wiz-rail";
    const panel = document.createElement("div");
    panel.className = "fx-wiz-panel";
    secs.forEach((s) => panel.appendChild(s));
    const bar = document.createElement("div");
    if (opts.focus) {
      bar.className = "fx-wiz-bar";
      bar.innerHTML = "<i></i>";
      root.append(bar, panel);
    } else root.append(rail, panel);

    const foot = document.createElement("div");
    foot.className = "fx-wiz-foot";
    foot.innerHTML =
      `<button class="fx-btn fx-btn--ghost" data-wz-back type="button">Back</button>
       <button class="fx-btn" data-wz-next type="button">Continue</button>
       <span class="fx-wiz-generr" data-wz-err hidden></span>
       <span class="fx-wiz-count" data-wz-count></span>`;
    panel.appendChild(foot);

    let active = null;
    const history = [];

    /* ---- values ---- */
    function values() {
      const v = {};
      secs.forEach((s) => {
        s.querySelectorAll("[name]").forEach((f) => {
          if (f.type === "radio") { if (f.checked) v[f.name] = f.value; }
          else if (f.type === "checkbox") v[f.name] = f.checked;
          else v[f.name] = f.value;
        });
      });
      return v;
    }
    function labelFor(f) {
      if (f.dataset.label) return f.dataset.label;
      const field = f.closest(".fx-field");
      const lab = field && field.querySelector(".fx-label");
      return lab ? lab.textContent : f.name;
    }
    function displayVal(s, name) {
      const fields = [...s.querySelectorAll(`[name="${name}"]`)];
      if (!fields.length) return null;
      if (fields[0].dataset.secret != null) return fields[0].value ? "•••" : null;
      if (fields[0].type === "radio") {
        const c = fields.find((f) => f.checked);
        if (!c) return null;
        return c.dataset.display || c.closest(".fx-wiz-choice")?.querySelector("b")?.textContent || c.value;
      }
      const f = fields[0];
      if (f.type === "checkbox") return f.checked ? "Yes" : "No";
      return f.value || null;
    }

    /* ---- persistence ---- */
    function save() {
      if (!opts.storageKey) return;
      try { localStorage.setItem(opts.storageKey, JSON.stringify({ values: values(), step: active, history })); } catch (_) {}
    }
    function restore() {
      if (!opts.storageKey) return null;
      try {
        const d = JSON.parse(localStorage.getItem(opts.storageKey));
        /* only resume when there is real progress (past the first step) */
        if (!d || !byId[d.step] || d.step === "done" || !(d.history || []).length) return null;
        secs.forEach((s) => s.querySelectorAll("[name]").forEach((f) => {
          if (!(f.name in d.values)) return;
          if (f.type === "radio") f.checked = f.value === d.values[f.name];
          else if (f.type === "checkbox") f.checked = !!d.values[f.name];
          else f.value = d.values[f.name];
        }));
        history.splice(0, history.length, ...(d.history || []));
        return d.step;
      } catch (_) { return null; }
    }
    root.addEventListener("input", save);

    /* ---- rail ---- */
    function paintRail() {
      if (opts.focus) {
        const idx = railSecs.findIndex((s) => s.dataset.step === active);
        bar.querySelector("i").style.setProperty("--_w", ((idx + (active === "done" ? 1 : 0)) / railSecs.length) * 100 + "%");
        if (active === "done") bar.querySelector("i").style.setProperty("--_w", "100%");
        return;
      }
      rail.innerHTML = "";
      railSecs.forEach((s, i) => {
        const id = s.dataset.step;
        const done = history.includes(id);
        const skip = s.hasAttribute("data-alt") && !done && id !== active;
        const node = document.createElement("div");
        node.className = "fx-wiz-node" + (id === active ? " is-active" : "") + (done ? " is-done" : "") + (skip ? " is-skip" : "");
        node.dataset.go = done ? id : "";
        node.innerHTML =
          `<span class="fx-wiz-dot">${done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : i + 1}</span>
           <span class="fx-wiz-meta"><b>${esc(s.dataset.title || id)}</b>${s.dataset.desc ? `<span>${esc(s.dataset.desc)}</span>` : ""}</span>`;
        rail.appendChild(node);
      });
    }
    rail.addEventListener("click", (e) => {
      const node = e.target.closest("[data-go]");
      if (node && node.dataset.go) go(node.dataset.go, { back: true, viaRail: true });
    });

    /* ---- review ---- */
    function buildReview() {
      const box = byId.review && byId.review.querySelector("[data-review]");
      if (!box) return;
      box.innerHTML = "";
      box.classList.add("fx-wiz-review");
      history.filter((id) => id !== "review").forEach((id) => {
        const s = byId[id];
        const names = [...new Set([...s.querySelectorAll("[name]")].map((f) => f.name))];
        const rows = names.map((n) => ({ n, label: labelFor(s.querySelector(`[name="${n}"]`)), val: displayVal(s, n) })).filter((r) => r.val);
        if (!rows.length) return;
        const g = document.createElement("div");
        g.className = "fx-wiz-rgroup";
        g.innerHTML =
          `<div class="fx-wiz-rhead"><b>${esc(s.dataset.title || id)}</b><button class="fx-btn fx-btn--ghost fx-btn--sm" data-edit="${esc(id)}" type="button">Edit</button></div>` +
          rows.map((r) => `<div class="fx-wiz-rrow"><dt>${esc(r.label)}</dt><dd>${esc(r.val)}</dd></div>`).join("");
        box.appendChild(g);
      });
    }
    panel.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) go(edit.dataset.edit, { back: true, viaRail: true });
    });

    /* ---- navigation ---- */
    function defaultNext(id) {
      let i = secs.indexOf(byId[id]) + 1;
      while (i < secs.length && secs[i].hasAttribute("data-alt")) i++;
      return secs[i] ? secs[i].dataset.step : null;
    }
    function validate() {
      const s = byId[active];
      const err = foot.querySelector("[data-wz-err]");
      err.hidden = true;
      let firstBad = null;
      s.querySelectorAll("input, select, textarea").forEach((f) => {
        f.closest(".fx-field")?.classList.remove("is-invalid");
        if (!f.checkValidity()) {
          f.closest(".fx-field")?.classList.add("is-invalid");
          if (!firstBad) firstBad = f;
        }
      });
      if (firstBad) {
        err.textContent = "Please fill the highlighted fields.";
        err.hidden = false;
        firstBad.focus();
        return false;
      }
      const custom = opts.validate?.[active]?.(values(), s);
      if (custom) {
        err.textContent = custom;
        err.hidden = false;
        return false;
      }
      return true;
    }
    function go(id, nav = {}) {
      if (!byId[id]) return;
      if (nav.viaRail) {
        const at = history.indexOf(id);
        if (at !== -1) history.splice(at);
      }
      const prev = active && byId[active];
      if (prev) prev.classList.remove("is-active", "is-back");
      active = id;
      const s = byId[id];
      s.classList.add("is-active");
      s.classList.toggle("is-back", !!nav.back);
      if (id === "review") buildReview();
      /* footer state */
      foot.hidden = id === "done";
      foot.querySelector("[data-wz-back]").style.visibility = history.length ? "visible" : "hidden";
      foot.querySelector("[data-wz-next]").textContent = s.dataset.nextLabel || "Continue";
      const idx = railSecs.findIndex((x) => x.dataset.step === id);
      foot.querySelector("[data-wz-count]").textContent = id === "done" ? "" : `Step ${idx + 1} of ${railSecs.length}`;
      foot.querySelector("[data-wz-err]").hidden = true;
      paintRail();
      opts.onShow?.(id, api);
      if (id === "done") {
        if (opts.storageKey) try { localStorage.removeItem(opts.storageKey); } catch (_) {}
        opts.onFinish?.(values());
      } else save();
      if (!nav.restore && !nav.first) s.querySelector("input:not([type=radio]):not([type=checkbox]), select, textarea")?.focus?.();
    }
    function next() {
      if (!validate()) return;
      const nid = opts.next?.[active]?.(values()) || defaultNext(active);
      if (!nid) return;
      history.push(active);
      go(nid);
    }
    function back() {
      const id = history.pop();
      if (id) go(id, { back: true });
    }
    foot.addEventListener("click", (e) => {
      if (e.target.closest("[data-wz-next]")) next();
      if (e.target.closest("[data-wz-back]")) back();
    });

    /* ---- keyboard (focus mode) + choice auto-advance ---- */
    if (opts.focus) {
      root.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (e.target.matches("textarea") && e.shiftKey) return; /* Shift+Enter = newline */
          e.preventDefault();
          next();
        }
        if (/^[a-d]$/i.test(e.key) && !e.target.matches("input[type=text], input[type=email], textarea")) {
          const chs = byId[active].querySelectorAll(".fx-wiz-choice input");
          const i = e.key.toLowerCase().charCodeAt(0) - 97;
          if (chs[i]) { chs[i].checked = true; chs[i].dispatchEvent(new Event("change", { bubbles: true })); }
        }
      });
      root.addEventListener("change", (e) => {
        if (e.target.matches(".fx-wiz-choice input[type=radio]") && byId[active].contains(e.target)) {
          setTimeout(next, 280);
        }
      });
      root.tabIndex = -1;
    }

    const api = { go, next, back, values, root, get step() { return active; }, history };
    const resumed = restore();
    go(resumed || railSecs[0].dataset.step, { restore: !!resumed, first: !resumed });
    if (resumed) opts.onResume?.(resumed);
    return api;
  };
})();
