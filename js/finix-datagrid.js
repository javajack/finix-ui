/*!
 * finix-ui · finix-datagrid.js — vanilla data grid + Linear-style filter bar
 * Pattern sources (free tiers): ReUI Data Grid, tablecn, DiceUI, bazza/ui.
 * No dependencies. Requires finix.css / finix-datagrid.css; uses finix.place().
 *
 * API:
 *   const grid = fxDataGrid(el, { columns, data, select, pageSize, pinned, maxHeight })
 *     column: { key, label, sortable, editable, type:'number'?, align:'right'?,
 *               width?, render?(value,row), format?(value), mono? }
 *   grid.setGlobalFilter(q) · grid.setPredicate(fn) · grid.refresh() · grid.getData()
 *
 *   fxFilterBar(el, { fields, onChange })
 *     field: { key, label, type:'enum'|'number', options?[{value,label}] }
 *     onChange(predicate|null)
 */
(function () {
  "use strict";
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let uid = 0;

  /* ============================ data grid ============================ */
  window.fxDataGrid = function (root, opts) {
    const cols = opts.columns.map((c) => ({ ...c }));
    const data = opts.data.map((r, i) => ({ ...r, _i: i }));
    const state = {
      order: cols.map((c) => c.key),
      hidden: new Set(),
      pinned: { ...(opts.pinned || {}) },          // key -> 'left' | 'right'
      widths: {},                                   // key -> px
      sort: null,                                   // { key, dir }
      page: 0,
      pageSize: opts.pageSize || 10,
      selection: new Set(),
      globalFilter: "",
      predicate: null,
      activeRow: null,
    };
    const id = "dg" + (++uid);
    const colByKey = (k) => cols.find((c) => c.key === k);

    root.classList.add("fx-dg");
    root.innerHTML =
      `<div class="fx-dg-toolbar">
         <div class="fx-dg-filterslot"></div>
         <div style="flex:1"></div>
         <div class="fx-input-group" style="width:13rem">
           <span class="fx-input-addon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
           <input class="fx-input fx-dg-search" placeholder="Search…">
         </div>
         <button class="fx-btn fx-btn--outline fx-btn--sm fx-dg-colsbtn" popovertarget="${id}-cols">
           <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
           Columns
         </button>
       </div>
       <div class="fx-dg-wrap" ${opts.maxHeight ? `style="max-height:${opts.maxHeight}px"` : ""}>
         <table class="fx-table fx-dg-table"><colgroup></colgroup><thead></thead><tbody></tbody></table>
       </div>
       <div class="fx-dg-footer">
         <span class="fx-text-sm fx-muted fx-dg-count"></span>
         <div class="fx-row" style="gap:1rem">
           <label class="fx-row fx-text-sm fx-muted" style="gap:.5rem">Rows
             <select class="fx-select fx-dg-pagesize" style="width:4.25rem;height:1.75rem;padding-block:0">
               ${[5, 8, 10, 20, 50].map((n) => `<option ${n === state.pageSize ? "selected" : ""}>${n}</option>`).join("")}
             </select>
           </label>
           <nav class="fx-pagination fx-dg-pages"></nav>
         </div>
       </div>
       <div class="fx-menu" popover id="${id}-cols">
         ${cols.map((c) => `<label class="fx-menu-item" data-fx-keep-open><input type="checkbox" class="fx-checkbox" data-colvis="${c.key}" checked> ${esc(c.label)}</label>`).join("")}
       </div>
       <div class="fx-menu" popover id="${id}-colmenu">
         <button class="fx-menu-item" data-act="asc"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>Sort ascending</button>
         <button class="fx-menu-item" data-act="desc"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>Sort descending</button>
         <div class="fx-menu-sep"></div>
         <button class="fx-menu-item" data-act="pin-left">Pin left</button>
         <button class="fx-menu-item" data-act="pin-right">Pin right</button>
         <button class="fx-menu-item" data-act="unpin">Unpin</button>
         <div class="fx-menu-sep"></div>
         <button class="fx-menu-item" data-act="hide">Hide column</button>
       </div>`;

    const q = (s) => root.querySelector(s);
    const wrap = q(".fx-dg-wrap"), table = q(".fx-dg-table"),
          colgroup = q("colgroup"), thead = q("thead"), tbody = q("tbody");
    let menuColKey = null, dragKey = null;

    /* ---------- data pipeline ---------- */
    function filteredRows() {
      let rows = data;
      if (state.predicate) rows = rows.filter(state.predicate);
      const g = state.globalFilter.trim().toLowerCase();
      if (g) rows = rows.filter((r) => cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(g)));
      if (state.sort) {
        const { key, dir } = state.sort;
        const t = colByKey(key)?.type;
        rows = [...rows].sort((a, b) => {
          const av = a[key], bv = b[key];
          const cmp = t === "number" ? (+av) - (+bv) : String(av).localeCompare(String(bv));
          return dir === "asc" ? cmp : -cmp;
        });
      }
      return rows;
    }
    function visibleCols() {
      const ks = state.order.filter((k) => !state.hidden.has(k));
      const L = ks.filter((k) => state.pinned[k] === "left");
      const R = ks.filter((k) => state.pinned[k] === "right");
      const M = ks.filter((k) => !state.pinned[k]);
      return [...L, ...M, ...R];
    }

    /* ---------- render ---------- */
    function cellHtml(c, r) {
      const v = r[c.key];
      const body = c.render ? c.render(v, r) : esc(c.format ? c.format(v) : v ?? "");
      return `<td data-key="${c.key}" data-i="${r._i}" class="${c.align === "right" ? "fx-dg-right " : ""}${c.mono ? "fx-dg-mono " : ""}${c.editable ? "fx-dg-editable" : ""}">${body}</td>`;
    }
    function render() {
      const ks = visibleCols();
      const rows = filteredRows();
      const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
      state.page = Math.min(state.page, pages - 1);
      const pageRows = rows.slice(state.page * state.pageSize, (state.page + 1) * state.pageSize);

      colgroup.innerHTML = (opts.select ? `<col style="width:34px">` : "") +
        ks.map((k) => `<col data-key="${k}" style="width:${state.widths[k] || colByKey(k).width || 150}px">`).join("");

      thead.innerHTML = `<tr>` +
        (opts.select ? `<th class="fx-dg-selcol"><input type="checkbox" class="fx-checkbox fx-dg-selall" aria-label="Select all"></th>` : "") +
        ks.map((k) => {
          const c = colByKey(k);
          const sorted = state.sort?.key === k ? state.sort.dir : null;
          return `<th data-key="${k}" class="${state.pinned[k] ? "fx-dg-pin fx-dg-pin-" + (state.pinned[k] === "left" ? "l" : "r") : ""}">
            <div class="fx-dg-th">
              <span class="fx-dg-th-label" draggable="true">${esc(c.label)}</span>
              ${c.sortable ? `<button class="fx-dg-sort" data-dir="${sorted || ""}" aria-label="Sort ${esc(c.label)}">${
                sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}</button>` : ""}
              <button class="fx-dg-colmenu-btn" popovertarget="${id}-colmenu" aria-label="Column menu of ${esc(c.label)}">⋯</button>
            </div>
            <span class="fx-dg-resize"></span>
          </th>`;
        }).join("") + `</tr>`;

      tbody.innerHTML = pageRows.length
        ? pageRows.map((r) => `<tr data-i="${r._i}" ${state.selection.has(r._i) ? "data-selected" : ""} ${state.activeRow === r._i ? "data-active" : ""}>` +
            (opts.select ? `<td class="fx-dg-selcol"><input type="checkbox" class="fx-checkbox fx-dg-sel" ${state.selection.has(r._i) ? "checked" : ""} aria-label="Select row"></td>` : "") +
            ks.map((k) => cellHtml(colByKey(k), r)).join("") + `</tr>`).join("")
        : `<tr><td colspan="${ks.length + (opts.select ? 1 : 0)}"><div class="fx-empty" style="border:0;padding:2rem"><div class="fx-empty-title">No results</div><div class="fx-empty-desc">Try adjusting the filters or search.</div></div></td></tr>`;

      // pinned offsets
      applyPins(ks);

      // footer
      q(".fx-dg-count").textContent = state.selection.size
        ? `${state.selection.size} of ${rows.length} row(s) selected`
        : `${rows.length} row${rows.length === 1 ? "" : "s"}`;
      const pg = q(".fx-dg-pages");
      let nums = [];
      for (let i = 0; i < pages; i++) {
        if (pages <= 7 || i === 0 || i === pages - 1 || Math.abs(i - state.page) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== "…") nums.push("…");
      }
      pg.innerHTML = `<button class="fx-page" data-pg="prev" ${state.page === 0 ? "disabled" : ""}>‹</button>` +
        nums.map((n) => n === "…" ? `<span class="fx-muted" style="padding:0 .25rem">…</span>`
          : `<button class="fx-page" data-pg="${n}" ${n === state.page ? 'aria-current="page"' : ""}>${n + 1}</button>`).join("") +
        `<button class="fx-page" data-pg="next" ${state.page >= pages - 1 ? "disabled" : ""}>›</button>`;
      const selAll = q(".fx-dg-selall");
      if (selAll) {
        const allSel = pageRows.length && pageRows.every((r) => state.selection.has(r._i));
        selAll.checked = allSel;
        selAll.indeterminate = !allSel && pageRows.some((r) => state.selection.has(r._i));
      }
    }
    function applyPins(ks) {
      const selW = opts.select ? 34 : 0;
      let left = 0;
      const lefts = ks.filter((k) => state.pinned[k] === "left");
      const rights = ks.filter((k) => state.pinned[k] === "right");
      const offs = {};
      lefts.forEach((k) => { offs[k] = { side: "l", off: selW + left }; left += state.widths[k] || colByKey(k).width || 150; });
      let right = 0;
      [...rights].reverse().forEach((k) => { offs[k] = { side: "r", off: right }; right += state.widths[k] || colByKey(k).width || 150; });
      table.querySelectorAll("th[data-key], td[data-key]").forEach((cell) => {
        const k = cell.dataset.key;
        cell.classList.remove("fx-dg-pin", "fx-dg-pin-l", "fx-dg-pin-r", "fx-dg-pin-l-last", "fx-dg-pin-r-first");
        cell.style.left = cell.style.right = "";
        const o = offs[k];
        if (!o) return;
        cell.classList.add("fx-dg-pin", "fx-dg-pin-" + o.side);
        cell.style[o.side === "l" ? "left" : "right"] = o.off + "px";
        if (o.side === "l" && k === lefts[lefts.length - 1]) cell.classList.add("fx-dg-pin-l-last");
        if (o.side === "r" && k === rights[0]) cell.classList.add("fx-dg-pin-r-first");
      });
      if (opts.select) table.querySelectorAll(".fx-dg-selcol").forEach((cell) => {
        const pin = lefts.length > 0;
        cell.classList.toggle("fx-dg-pin", pin); cell.classList.toggle("fx-dg-pin-l", pin);
        cell.style.left = pin ? "0px" : "";
      });
    }

    /* ---------- events ---------- */
    q(".fx-dg-search").addEventListener("input", (e) => { state.globalFilter = e.target.value; state.page = 0; render(); });
    q(".fx-dg-pagesize").addEventListener("change", (e) => { state.pageSize = +e.target.value; state.page = 0; render(); });

    root.addEventListener("click", (e) => {
      const pg = e.target.closest("[data-pg]");
      if (pg) {
        if (pg.dataset.pg === "prev") state.page--;
        else if (pg.dataset.pg === "next") state.page++;
        else state.page = +pg.dataset.pg;
        render(); return;
      }
      const sortBtn = e.target.closest(".fx-dg-sort");
      if (sortBtn) {
        const k = sortBtn.closest("th").dataset.key;
        state.sort = state.sort?.key === k && state.sort.dir === "asc" ? { key: k, dir: "desc" }
          : state.sort?.key === k && state.sort.dir === "desc" ? null : { key: k, dir: "asc" };
        render(); return;
      }
      const menuBtn = e.target.closest(".fx-dg-colmenu-btn");
      if (menuBtn) menuColKey = menuBtn.closest("th").dataset.key;
    });

    root.addEventListener("change", (e) => {
      if (e.target.classList.contains("fx-dg-selall")) {
        const rows = filteredRows().slice(state.page * state.pageSize, (state.page + 1) * state.pageSize);
        rows.forEach((r) => e.target.checked ? state.selection.add(r._i) : state.selection.delete(r._i));
        render(); return;
      }
      if (e.target.classList.contains("fx-dg-sel")) {
        const i = +e.target.closest("tr").dataset.i;
        e.target.checked ? state.selection.add(i) : state.selection.delete(i);
        render(); return;
      }
      const vis = e.target.closest("[data-colvis]");
      if (vis) {
        vis.checked ? state.hidden.delete(vis.dataset.colvis) : state.hidden.add(vis.dataset.colvis);
        render();
      }
    });

    // column menu actions
    q(`#${CSS.escape(id)}-colmenu`).addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act || !menuColKey) return;
      if (act === "asc") state.sort = { key: menuColKey, dir: "asc" };
      if (act === "desc") state.sort = { key: menuColKey, dir: "desc" };
      if (act === "pin-left") state.pinned[menuColKey] = "left";
      if (act === "pin-right") state.pinned[menuColKey] = "right";
      if (act === "unpin") delete state.pinned[menuColKey];
      if (act === "hide") {
        state.hidden.add(menuColKey);
        const cb = root.querySelector(`[data-colvis="${menuColKey}"]`);
        if (cb) cb.checked = false;
      }
      render();
    });

    // resize
    let rz = null;
    root.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".fx-dg-resize");
      if (!handle) return;
      const th = handle.closest("th");
      rz = { key: th.dataset.key, startX: e.clientX, startW: th.getBoundingClientRect().width };
      e.preventDefault();
      document.body.style.cursor = "col-resize";
      const move = (ev) => {
        const w = Math.max(70, rz.startW + ev.clientX - rz.startX);
        state.widths[rz.key] = Math.round(w);
        const col = colgroup.querySelector(`col[data-key="${rz.key}"]`);
        if (col) col.style.width = w + "px";
        applyPins(visibleCols());
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.body.style.cursor = "";
        rz = null;
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });

    // reorder (drag header label)
    thead.addEventListener("dragstart", (e) => {
      const label = e.target.closest(".fx-dg-th-label");
      if (!label) return;
      dragKey = label.closest("th").dataset.key;
      e.dataTransfer.effectAllowed = "move";
    });
    thead.addEventListener("dragover", (e) => {
      const th = e.target.closest("th[data-key]");
      if (!th || !dragKey || th.dataset.key === dragKey) return;
      e.preventDefault();
      thead.querySelectorAll("th").forEach((t) => t.classList.remove("fx-dg-drop-l", "fx-dg-drop-r"));
      const r = th.getBoundingClientRect();
      th.classList.add(e.clientX < r.left + r.width / 2 ? "fx-dg-drop-l" : "fx-dg-drop-r");
    });
    thead.addEventListener("drop", (e) => {
      const th = e.target.closest("th[data-key]");
      if (!th || !dragKey) return;
      e.preventDefault();
      const target = th.dataset.key;
      const r = th.getBoundingClientRect();
      const before = e.clientX < r.left + r.width / 2;
      const o = state.order.filter((k) => k !== dragKey);
      o.splice(o.indexOf(target) + (before ? 0 : 1), 0, dragKey);
      state.order = o;
      dragKey = null;
      render();
    });
    thead.addEventListener("dragend", () => {
      thead.querySelectorAll("th").forEach((t) => t.classList.remove("fx-dg-drop-l", "fx-dg-drop-r"));
      dragKey = null;
    });

    // row click -> active row + callback
    if (opts.onRowClick) {
      q(".fx-dg-table").classList.add("fx-dg-clickable");
      tbody.addEventListener("click", (e) => {
        if (e.target.closest("input, button, a, .fx-dg-selcol")) return;
        const tr = e.target.closest("tr[data-i]");
        if (!tr) return;
        const row = data.find((r) => r._i === +tr.dataset.i);
        if (!row) return;
        state.activeRow = row._i;
        tbody.querySelectorAll("tr[data-active]").forEach((t) => t.removeAttribute("data-active"));
        tr.setAttribute("data-active", "");
        opts.onRowClick(row, tr);
      });
    }

    // inline edit
    tbody.addEventListener("dblclick", (e) => {
      const td = e.target.closest("td.fx-dg-editable");
      if (!td || td.querySelector("input")) return;
      const c = colByKey(td.dataset.key);
      const row = data.find((r) => r._i === +td.dataset.i);
      const orig = row[c.key];
      td.innerHTML = `<input class="fx-input fx-dg-editinput" value="${esc(orig)}" ${c.type === "number" ? 'inputmode="decimal"' : ""}>`;
      const inp = td.querySelector("input");
      inp.focus(); inp.select();
      const commit = () => {
        let v = inp.value;
        if (c.type === "number") { v = parseFloat(v); if (isNaN(v)) v = orig; }
        row[c.key] = v;
        render();
      };
      inp.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") commit();
        if (ev.key === "Escape") render();
      });
      inp.addEventListener("blur", commit);
    });

    // position grid popovers near their invokers
    root.addEventListener("toggle", (e) => {
      const pop = e.target;
      if (!pop.matches?.(".fx-menu[popover]") || e.newState !== "open") return;
      const anchor = pop.__fxAnchor;
      if (anchor && window.finix) finix.place(pop, anchor, "bottom", "end");
    }, true);

    render();
    return {
      refresh: render,
      setGlobalFilter: (v) => { state.globalFilter = v; state.page = 0; render(); },
      setPredicate: (fn) => { state.predicate = fn; state.page = 0; render(); },
      getData: () => data,
      getViewRows: () => filteredRows(),
      setActiveRow: (i) => { state.activeRow = i; render(); },
      filterSlot: q(".fx-dg-filterslot"),
      el: root,
    };
  };

  /* ============================ filter bar ============================ */
  window.fxFilterBar = function (root, opts) {
    const chips = []; // {key, op, value: array|number}
    const fieldBy = (k) => opts.fields.find((f) => f.key === k);
    const id = "fb" + (++uid);
    root.classList.add("fx-filterbar");

    const addBtn = h(`<button class="fx-btn fx-btn--outline fx-btn--sm" style="border-style:dashed">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>Filter</button>`);
    const fieldMenu = h(`<div class="fx-menu" popover id="${id}-fields">` +
      opts.fields.map((f) => `<button class="fx-menu-item" data-key="${f.key}">${esc(f.label)}</button>`).join("") + `</div>`);
    const valuePop = h(`<div class="fx-menu" popover id="${id}-val" style="min-width:11rem"></div>`);
    addBtn.setAttribute("popovertarget", `${id}-fields`);
    root.append(addBtn, fieldMenu, valuePop);
    let valueChip = null;

    function emit() {
      if (!chips.length) return opts.onChange(null);
      opts.onChange((row) => chips.every((ch) => {
        const f = fieldBy(ch.key);
        const v = row[ch.key];
        if (f.type === "enum") {
          if (!ch.value.length) return true;
          const inSet = ch.value.includes(String(v));
          return ch.op === "is" ? inSet : !inSet;
        }
        if (ch.value === "" || ch.value == null || isNaN(ch.value)) return true;
        return ch.op === ">" ? +v > +ch.value : ch.op === "<" ? +v < +ch.value : +v === +ch.value;
      }));
    }
    function valueLabel(ch) {
      const f = fieldBy(ch.key);
      if (f.type === "enum") {
        if (!ch.value.length) return "any";
        if (ch.value.length <= 2) return ch.value.map((v) => f.options.find((o) => o.value === v)?.label || v).join(", ");
        return ch.value.length + " selected";
      }
      return ch.value === "" || ch.value == null ? "…" : ch.value;
    }
    function renderChips() {
      root.querySelectorAll(".fx-fchip").forEach((c) => c.remove());
      chips.forEach((ch, i) => {
        const f = fieldBy(ch.key);
        const el = h(`<span class="fx-fchip">
          <span class="fx-fchip-field">${esc(f.label)}</span>
          <button class="fx-fchip-op">${esc(ch.op)}</button>
          <button class="fx-fchip-val" popovertarget="${id}-val">${esc(valueLabel(ch))}</button>
          <button class="fx-fchip-x" aria-label="Remove filter">×</button>
        </span>`);
        el.querySelector(".fx-fchip-op").addEventListener("click", () => {
          ch.op = f.type === "enum" ? (ch.op === "is" ? "is not" : "is")
            : ch.op === ">" ? "<" : ch.op === "<" ? "=" : ">";
          renderChips(); emit();
        });
        el.querySelector(".fx-fchip-val").addEventListener("click", (e) => { valueChip = ch; buildValuePop(); });
        el.querySelector(".fx-fchip-x").addEventListener("click", () => { chips.splice(i, 1); renderChips(); emit(); });
        root.insertBefore(el, addBtn);
      });
    }
    function buildValuePop() {
      const f = fieldBy(valueChip.key);
      if (f.type === "enum") {
        valuePop.innerHTML = f.options.map((o) =>
          `<label class="fx-menu-item" data-fx-keep-open><input type="checkbox" class="fx-checkbox" value="${esc(o.value)}" ${valueChip.value.includes(o.value) ? "checked" : ""}> ${esc(o.label)}</label>`).join("");
        valuePop.querySelectorAll("input").forEach((cb) => cb.addEventListener("change", () => {
          valueChip.value = [...valuePop.querySelectorAll("input:checked")].map((c) => c.value);
          renderChips(); emit();
        }));
      } else {
        valuePop.innerHTML = `<div style="padding:.375rem"><input class="fx-input" type="number" style="width:8rem" placeholder="Value" value="${valueChip.value ?? ""}"></div>`;
        const inp = valuePop.querySelector("input");
        inp.addEventListener("input", () => { valueChip.value = inp.value === "" ? "" : +inp.value; renderChips(); emit(); });
        setTimeout(() => inp.focus(), 30);
      }
    }
    fieldMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-key]");
      if (!btn) return;
      const f = fieldBy(btn.dataset.key);
      const ch = { key: f.key, op: f.type === "enum" ? "is" : ">", value: f.type === "enum" ? [] : "" };
      chips.push(ch);
      renderChips(); emit();
      valueChip = ch;
      buildValuePop();
      setTimeout(() => {
        const chipVal = [...root.querySelectorAll(".fx-fchip-val")].pop();
        if (chipVal) { valuePop.__fxAnchor = chipVal; valuePop.showPopover(); if (window.finix) finix.place(valuePop, chipVal, "bottom", "start"); }
      }, 50);
    });
    valuePop.addEventListener("toggle", (e) => {
      if (e.newState === "open" && valuePop.__fxAnchor && window.finix) finix.place(valuePop, valuePop.__fxAnchor, "bottom", "start");
    });
    return { clear: () => { chips.length = 0; renderChips(); emit(); } };
  };
})();
