/*!
 * finix-ui · finix-devtools.js — developer-tool components
 * fxDiff: unified/split line diff viewer with collapsed unchanged regions.
 * Plain JS, no dependencies. Pair with css/finix-devtools.css.
 */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- diff viewer ---------- */
  window.fxDiff = function (root, opts = {}) {
    const before = String(opts.before ?? "").split("\n");
    const after = String(opts.after ?? "").split("\n");
    let mode = opts.mode || "unified";
    const context = opts.context ?? 3;
    const expanded = new Set();

    // line-level LCS with common prefix/suffix trimming
    function computeOps(a, b) {
      let s = 0;
      while (s < a.length && s < b.length && a[s] === b[s]) s++;
      let ea = a.length, eb = b.length;
      while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
      const A = a.slice(s, ea), B = b.slice(s, eb);
      const n = A.length, m = B.length;
      const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
      for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
          dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      const ops = [];
      for (let k = 0; k < s; k++) ops.push({ t: "same", a: k, b: k });
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (A[i] === B[j]) { ops.push({ t: "same", a: s + i, b: s + j }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ t: "del", a: s + i++ });
        else ops.push({ t: "add", b: s + j++ });
      }
      while (i < n) ops.push({ t: "del", a: s + i++ });
      while (j < m) ops.push({ t: "add", b: s + j++ });
      for (let k = 0; k < a.length - ea; k++) ops.push({ t: "same", a: ea + k, b: eb + k });
      return ops;
    }

    // normalize into hunks: {type:'same', rows:[{a,b}]} | {type:'change', dels:[a], adds:[b]}
    function toHunks(ops) {
      const hunks = [];
      let same = [], dels = [], adds = [];
      const flushChange = () => { if (dels.length || adds.length) { hunks.push({ type: "change", dels, adds }); dels = []; adds = []; } };
      const flushSame = () => { if (same.length) { hunks.push({ type: "same", rows: same }); same = []; } };
      for (const op of ops) {
        if (op.t === "same") { flushChange(); same.push({ a: op.a, b: op.b }); }
        else { flushSame(); if (op.t === "del") dels.push(op.a); else adds.push(op.b); }
      }
      flushChange(); flushSame();
      return hunks;
    }

    const ops = computeOps(before, after);
    const hunks = toHunks(ops);
    const stats = {
      adds: ops.filter((o) => o.t === "add").length,
      dels: ops.filter((o) => o.t === "del").length,
    };

    // split a same-hunk into [visible-head, hidden, visible-tail] given position
    function sameParts(rows, hi) {
      if (expanded.has(hi)) return [rows, [], []];
      const first = hi === 0, last = hi === hunks.length - 1;
      const head = first ? 0 : context;
      const tail = last ? 0 : context;
      if (rows.length <= head + tail + 4) return [rows, [], []];
      return [rows.slice(0, head), rows.slice(head, rows.length - tail), rows.slice(rows.length - tail)];
    }

    const numCell = (n) => `<td class="fx-diff-num">${n == null ? "" : n + 1}</td>`;
    const textCell = (line, sign, cls) =>
      `<td class="fx-diff-text${cls ? " " + cls : ""}"><span class="fx-diff-sign">${sign}</span>${esc(line)}</td>`;

    function renderUnified() {
      let html = "";
      hunks.forEach((h, hi) => {
        if (h.type === "change") {
          for (const a of h.dels) html += `<tr class="fx-diff-del">${numCell(a)}${numCell(null)}${textCell(before[a], "-", "")}</tr>`;
          for (const b of h.adds) html += `<tr class="fx-diff-add">${numCell(null)}${numCell(b)}${textCell(after[b], "+", "")}</tr>`;
        } else {
          const [head, hidden, tail] = sameParts(h.rows, hi);
          for (const r of head) html += `<tr>${numCell(r.a)}${numCell(r.b)}${textCell(before[r.a], " ", "")}</tr>`;
          if (hidden.length) html += expandRow(hi, hidden.length, 3);
          for (const r of tail) html += `<tr>${numCell(r.a)}${numCell(r.b)}${textCell(before[r.a], " ", "")}</tr>`;
        }
      });
      return `<table><colgroup><col style="width:3rem"><col style="width:3rem"><col></colgroup><tbody>${html}</tbody></table>`;
    }

    function renderSplit() {
      let html = "";
      hunks.forEach((h, hi) => {
        if (h.type === "change") {
          const len = Math.max(h.dels.length, h.adds.length);
          for (let k = 0; k < len; k++) {
            const a = h.dels[k], b = h.adds[k];
            html += `<tr>` +
              (a != null ? numCell(a) + textCell(before[a], "-", "fx-diff-cell-del") : `<td class="fx-diff-num fx-diff-void"></td><td class="fx-diff-text fx-diff-void"></td>`) +
              (b != null ? numCell(b) + textCell(after[b], "+", "fx-diff-cell-add") : `<td class="fx-diff-num fx-diff-void"></td><td class="fx-diff-text fx-diff-void"></td>`) +
              `</tr>`;
          }
        } else {
          const [head, hidden, tail] = sameParts(h.rows, hi);
          const sameRow = (r) => `<tr>${numCell(r.a)}${textCell(before[r.a], " ", "")}${numCell(r.b)}${textCell(after[r.b], " ", "")}</tr>`;
          for (const r of head) html += sameRow(r);
          if (hidden.length) html += expandRow(hi, hidden.length, 4);
          for (const r of tail) html += sameRow(r);
        }
      });
      return `<table><colgroup><col style="width:3rem"><col style="width:50%"><col style="width:3rem"><col style="width:50%"></colgroup><tbody>${html}</tbody></table>`;
    }

    const expandRow = (hi, n, colspan) =>
      `<tr class="fx-diff-expand"><td colspan="${colspan}"><button type="button" data-expand="${hi}">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
        Expand ${n} unchanged line${n === 1 ? "" : "s"}</button></td></tr>`;

    function render() {
      root.classList.add("fx-diff");
      root.innerHTML =
        `<div class="fx-diff-head">
          ${opts.file ? `<span class="fx-diff-file">${esc(opts.file)}</span>` : ""}
          <span class="fx-diff-stats"><span class="fx-diff-stat-add">+${stats.adds}</span><span class="fx-diff-stat-del">−${stats.dels}</span></span>
          <span style="flex:1"></span>
          <div class="fx-toggle-group fx-toggle-group--outline fx-diff-modes">
            <button class="fx-toggle" aria-pressed="${mode === "unified"}" data-mode="unified">Unified</button>
            <button class="fx-toggle" aria-pressed="${mode === "split"}" data-mode="split">Split</button>
          </div>
        </div>
        <div class="fx-diff-body">${mode === "unified" ? renderUnified() : renderSplit()}</div>`;
    }

    root.addEventListener("click", (e) => {
      const ex = e.target.closest("[data-expand]");
      if (ex) {
        expanded.add(+ex.dataset.expand);
        const body = root.querySelector(".fx-diff-body");
        body.innerHTML = mode === "unified" ? renderUnified() : renderSplit();
        body.classList.add("is-fresh");
        setTimeout(() => body.classList.remove("is-fresh"), 300);
        return;
      }
      const mb = e.target.closest("[data-mode]");
      if (mb && mb.dataset.mode !== mode) { mode = mb.dataset.mode; render(); }
    });

    render();
    return { setMode: (m) => { mode = m; render(); }, stats };
  };

  /* ---------- JSON tree viewer ---------- */
  window.fxJsonTree = function (root, data, opts = {}) {
    const depth = opts.open ?? 2;
    function node(key, val, lvl) {
      const keyHtml = key != null ? `<span class="fx-jt-key">${esc(key)}</span><span class="fx-jt-colon">: </span>` : "";
      if (val !== null && typeof val === "object") {
        const isArr = Array.isArray(val);
        const entries = isArr ? val.map((v, i) => [null, v]) : Object.entries(val);
        const count = entries.length;
        const open = lvl < depth;
        return `<div class="fx-jt-node${open ? " is-open" : ""}">
          <button class="fx-jt-row" type="button" aria-expanded="${open}">
            <svg class="fx-jt-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            ${keyHtml}<span class="fx-jt-brace">${isArr ? "[" : "{"}</span>
            <span class="fx-jt-count">${count} ${isArr ? (count === 1 ? "item" : "items") : (count === 1 ? "key" : "keys")}</span>
            <span class="fx-jt-brace fx-jt-brace-close">${isArr ? "]" : "}"}</span>
          </button>
          <div class="fx-jt-children">${entries.map(([k, v]) => node(k, v, lvl + 1)).join("")}</div>
        </div>`;
      }
      let cls = "fx-jt-null", body = "null";
      if (typeof val === "string") { cls = "fx-jt-str"; body = `"${esc(val)}"`; }
      else if (typeof val === "number") { cls = "fx-jt-num"; body = String(val); }
      else if (typeof val === "boolean") { cls = "fx-jt-bool"; body = String(val); }
      return `<div class="fx-jt-leaf">${keyHtml}<span class="${cls}">${body}</span></div>`;
    }
    root.classList.add("fx-jsontree");
    root.innerHTML = node(null, data, 0);
    if (!root.__fxJtWired) {
      root.__fxJtWired = true;
      root.addEventListener("click", (e) => {
        const row = e.target.closest(".fx-jt-row");
        if (!row) return;
        const n = row.parentElement;
        n.classList.toggle("is-open");
        row.setAttribute("aria-expanded", n.classList.contains("is-open"));
      });
    }
    return { set: (d) => fxJsonTree(root, d, opts) };
  };

  /* ---------- API keys: press-and-hold reveal ---------- */
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".fx-apikey-reveal");
    if (!btn) return;
    e.preventDefault();
    const rowEl = btn.closest(".fx-apikey");
    const valEl = rowEl?.querySelector(".fx-apikey-value");
    if (!valEl) return;
    btn.classList.add("is-holding");
    const timer = setTimeout(() => {
      valEl.dataset.mask = valEl.textContent;
      valEl.textContent = rowEl.dataset.key || valEl.textContent;
      valEl.classList.add("is-revealed");
      btn.classList.add("is-revealed");
    }, 550);
    const end = () => {
      clearTimeout(timer);
      btn.classList.remove("is-holding", "is-revealed");
      if (valEl.classList.contains("is-revealed")) {
        valEl.textContent = valEl.dataset.mask;
        valEl.classList.remove("is-revealed");
      }
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });

  /* ---------- env vars editor ---------- */
  const envRow = (k = "", v = "") =>
    `<div class="fx-envvar">
      <input class="fx-input fx-envvar-k" placeholder="KEY" value="${esc(k)}" spellcheck="false" autocomplete="off">
      <div class="fx-input-group fx-envvar-vwrap">
        <input class="fx-input fx-envvar-v" type="password" placeholder="value" value="${esc(v)}" spellcheck="false" autocomplete="off">
        <button class="fx-input-addon fx-envvar-eye" type="button" aria-label="Reveal value" aria-pressed="false">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm fx-envvar-del" type="button" aria-label="Remove variable">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  document.querySelectorAll("[data-fx-envvars]").forEach((box) => {
    const vars = JSON.parse(box.dataset.fxEnvvars || "[]");
    box.classList.add("fx-envvars");
    box.innerHTML = vars.map(([k, v]) => envRow(k, v)).join("") +
      `<button class="fx-btn fx-btn--outline fx-btn--sm fx-envvar-add" type="button">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add variable
      </button>`;
  });
  document.addEventListener("click", (e) => {
    const eye = e.target.closest(".fx-envvar-eye");
    if (eye) {
      const inp = eye.closest(".fx-envvar-vwrap").querySelector(".fx-envvar-v");
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      eye.setAttribute("aria-pressed", show);
      return;
    }
    const del = e.target.closest(".fx-envvar-del");
    if (del) {
      const row = del.closest(".fx-envvar");
      row.classList.add("is-leaving");
      setTimeout(() => row.remove(), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
      return;
    }
    const add = e.target.closest(".fx-envvar-add");
    if (add) {
      add.insertAdjacentHTML("beforebegin", envRow());
      const row = add.previousElementSibling;
      row.classList.add("is-entering");
      row.querySelector(".fx-envvar-k").focus();
      setTimeout(() => row.classList.remove("is-entering"), 200);
    }
  });

  /* ---------- webhook delivery log ---------- */
  window.fxWebhookLog = function (root, opts = {}) {
    const deliveries = opts.deliveries || [];
    root.classList.add("fx-webhooks");
    const chip = (code) => {
      const cls = code === "pending" ? "is-pending" : code < 300 ? "is-ok" : "is-fail";
      const label = code === "pending" ? "Pending" : code;
      return `<span class="fx-wh-chip ${cls}">${label}</span>`;
    };
    root.innerHTML = `
      <div class="fx-wh-head">
        <span style="width:3.5rem">Status</span><span style="flex:1">Event</span>
        <span style="width:4.5rem;text-align:right">Attempts</span>
        <span style="width:4.5rem;text-align:right">Duration</span>
        <span style="width:5.5rem;text-align:right">Delivered</span>
      </div>` +
      deliveries.map((d, i) => `
      <button class="fx-wh-row" type="button" data-i="${i}">
        ${chip(d.status)}
        <span class="fx-wh-event"><b>${esc(d.event)}</b><small>${esc(d.id)}</small></span>
        <span class="fx-wh-cell">${d.attempts}</span>
        <span class="fx-wh-cell">${d.status === "pending" ? "—" : d.duration + " ms"}</span>
        <span class="fx-wh-cell">${esc(d.time)}</span>
      </button>`).join("");
    root.addEventListener("click", (e) => {
      const row = e.target.closest(".fx-wh-row");
      if (!row) return;
      root.querySelectorAll(".fx-wh-row.is-sel").forEach((r) => r.classList.remove("is-sel"));
      row.classList.add("is-sel");
      opts.onSelect?.(deliveries[+row.dataset.i]);
    });
    return { deliveries };
  };

  /* ---------- feature flags: guarded env toggle ---------- */
  let pendingGuard = null;
  document.addEventListener("change", (e) => {
    const sw = e.target.closest("input[data-fx-confirm-toggle]");
    if (sw) {
      const dlg = document.querySelector(sw.dataset.fxConfirmToggle);
      if (!dlg) return;
      sw.checked = !sw.checked;               // revert until confirmed
      pendingGuard = sw;
      const nameEl = dlg.querySelector("[data-guard-flag]");
      if (nameEl) nameEl.textContent = sw.dataset.flagName || "this flag";
      const verbEl = dlg.querySelector("[data-guard-verb]");
      if (verbEl) verbEl.textContent = sw.checked ? "Disable" : "Enable";
      if (window.finix) finix.openDialog(sw.dataset.fxConfirmToggle);
      else dlg.showModal();
    }
  });
  document.addEventListener("click", (e) => {
    const apply = e.target.closest("[data-fx-confirm-apply]");
    if (apply && pendingGuard) {
      pendingGuard.checked = !pendingGuard.checked;
      pendingGuard.dispatchEvent(new CustomEvent("fx:flagchange", { bubbles: true }));
      pendingGuard = null;
    }
  });

  /* ---------- rollout slider group: auto-balance to 100 ---------- */
  document.addEventListener("input", (e) => {
    const slider = e.target.closest("[data-fx-rollout] .fx-slider");
    if (!slider) return;
    const box = slider.closest("[data-fx-rollout]");
    const sliders = [...box.querySelectorAll(".fx-slider")];
    const others = sliders.filter((s) => s !== slider);
    let remainder = 100 - +slider.value;
    const otherTotal = others.reduce((t, s) => t + +s.value, 0);
    let acc = 0;
    others.forEach((s, i) => {
      let v;
      if (i === others.length - 1) v = remainder - acc;
      else {
        v = otherTotal > 0 ? Math.round((+s.value / otherTotal) * remainder) : Math.round(remainder / others.length);
        acc += v;
      }
      s.value = Math.max(0, v);
      s.style.setProperty("--fx-fill", s.value + "%");
    });
    sliders.forEach((s) => {
      const pct = s.closest(".fx-rollout-row")?.querySelector(".fx-rollout-pct");
      if (pct && pct.textContent !== s.value + "%") {
        pct.textContent = s.value + "%";
        pct.classList.remove("is-bump");
        void pct.offsetWidth;
        pct.classList.add("is-bump");
      }
    });
  });

  /* ---------- permission matrix ---------- */
  window.fxPermMatrix = function (root, opts) {
    const roles = opts.roles || [];
    const groups = opts.permissions || [];
    const grants = opts.grants || {};
    function render() {
      root.classList.add("fx-permmatrix");
      root.innerHTML = `<table>
        <thead><tr><th>Permission</th>${roles.map((r, c) => `<th data-col="${c}">${r}</th>`).join("")}</tr></thead>
        <tbody>
          ${groups.map((g) =>
            `<tr class="fx-pm-group"><td colspan="${roles.length + 1}">${g.group}</td></tr>` +
            g.items.map((it) => `<tr>
              <td class="fx-pm-perm">${it.label}</td>
              ${roles.map((r, c) => {
                const v = grants[r]?.[it.key];
                return `<td class="fx-pm-cell" data-col="${c}" data-role="${r}" data-perm="${it.key}" ${v === "inherited" ? `data-fx-tip="Inherited from ${grants[r].__from || "parent role"}"` : ""}>
                  ${v === "inherited"
                    ? '<span class="fx-pm-inherit"></span>'
                    : `<input type="checkbox" class="fx-checkbox" ${v ? "checked" : ""} tabindex="-1">`}
                </td>`;
              }).join("")}
            </tr>`).join("")
          ).join("")}
        </tbody></table>`;
    }
    root.addEventListener("pointerover", (e) => {
      const cell = e.target.closest("[data-col]");
      root.querySelectorAll(".is-colhover").forEach((c) => c.classList.remove("is-colhover"));
      if (cell) root.querySelectorAll(`[data-col="${cell.dataset.col}"]`).forEach((c) => c.classList.add("is-colhover"));
    });
    root.addEventListener("pointerleave", () => root.querySelectorAll(".is-colhover").forEach((c) => c.classList.remove("is-colhover")));
    root.addEventListener("click", (e) => {
      const cell = e.target.closest(".fx-pm-cell");
      if (!cell) return;
      const { role, perm } = cell.dataset;
      const cur = grants[role]?.[perm];
      if (cur === "inherited") return;
      (grants[role] = grants[role] || {})[perm] = !cur;
      cell.innerHTML = `<input type="checkbox" class="fx-checkbox" ${!cur ? "checked" : ""} tabindex="-1">`;
      opts.onChange?.(role, perm, !cur);
    });
    render();
    return { render, grants };
  };

  /* ---------- audit log ---------- */
  window.fxAuditLog = function (root, opts) {
    const entries = opts.entries || [];
    const ini = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    root.classList.add("fx-audit");
    root.innerHTML = entries.map((en, i) => `
      <div class="fx-audit-item">
        <button class="fx-audit-row" data-ai="${i}" ${en.before || en.after ? "" : "disabled"}>
          <svg class="fx-audit-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${en.before || en.after ? "" : 'style="visibility:hidden"'}><path d="m9 18 6-6-6-6"/></svg>
          <span class="fx-audit-time">${en.time}</span>
          <span class="fx-audit-actor"><span class="fx-avatar fx-avatar--sm">${ini(en.actor)}</span><b>${en.actor}</b></span>
          <span class="fx-audit-action is-${en.action}">${en.action}</span>
          <span class="fx-audit-target">${en.target}</span>
          <span class="fx-audit-ip">${en.ip || ""}</span>
        </button>
        <div class="fx-audit-detail" data-detail="${i}"></div>
      </div>`).join("");
    root.addEventListener("click", (e) => {
      const row = e.target.closest("[data-ai]");
      if (!row || row.disabled) return;
      const item = row.closest(".fx-audit-item");
      const open = item.classList.toggle("is-open");
      const detail = item.querySelector(".fx-audit-detail");
      if (open && !detail.dataset.rendered) {
        detail.dataset.rendered = "1";
        const en = entries[+row.dataset.ai];
        const box = document.createElement("div");
        detail.appendChild(box);
        if (en.before && en.after && window.fxDiff) {
          fxDiff(box, {
            file: en.target,
            before: JSON.stringify(en.before, null, 2),
            after: JSON.stringify(en.after, null, 2),
            context: 2,
          });
        } else if (window.fxJsonTree) {
          fxJsonTree(box, en.after || en.before || {});
        }
      }
    });
    return { entries };
  };
})();
