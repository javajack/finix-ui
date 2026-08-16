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
})();
