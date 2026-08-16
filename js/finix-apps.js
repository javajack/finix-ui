/*!
 * finix-ui · finix-apps.js — app-level components
 * fxEventCalendar (month/week, draggable events) · fxGantt (draggable bars) ·
 * fxFilterBuilder (Notion-style AND/OR groups) · fxLogTable (virtualized, live tail)
 * Pattern sources (free tiers): ReUI Event Calendar/Gantt, Kibo Calendar/Gantt,
 * tablecn filter builder, OpenStatus log table. No dependencies.
 */
(function () {
  "use strict";
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COLORS = { 1: "var(--chart-1)", 2: "var(--chart-2)", 3: "var(--chart-3)", 4: "var(--chart-4)", 5: "var(--chart-5)" };
  const evColor = (c) => COLORS[c] || c || "var(--chart-1)";

  /* ============================ event calendar ============================ */
  window.fxEventCalendar = function (root, opts) {
    let view = opts.date ? parse(opts.date) : new Date();
    let mode = opts.view || "month";
    const events = opts.events.map((e, i) => ({ id: e.id ?? "e" + i, ...e }));
    root.classList.add("fx-evcal");

    function eventsOn(dstr) { return events.filter((e) => e.date === dstr); }

    function header() {
      const h = document.createElement("div");
      h.className = "fx-evcal-head";
      h.innerHTML =
        `<div class="fx-row">
           <button class="fx-btn fx-btn--outline fx-btn--sm" data-act="today">Today</button>
           <div class="fx-btn-group">
             <button class="fx-btn fx-btn--outline fx-btn--sm fx-btn--icon" data-act="prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
             <button class="fx-btn fx-btn--outline fx-btn--sm fx-btn--icon" data-act="next" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
           </div>
           <span class="fx-evcal-title">${MONTHS[view.getMonth()]} ${view.getFullYear()}</span>
         </div>
         <div class="fx-tablist" role="tablist" style="height:1.75rem">
           <button class="fx-tab" role="tab" aria-selected="${mode === "month"}" data-act="month">Month</button>
           <button class="fx-tab" role="tab" aria-selected="${mode === "week"}" data-act="week">Week</button>
         </div>`;
      h.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (!act) return;
        if (act === "today") view = new Date();
        else if (act === "prev") mode === "month" ? view.setMonth(view.getMonth() - 1) : view.setDate(view.getDate() - 7);
        else if (act === "next") mode === "month" ? view.setMonth(view.getMonth() + 1) : view.setDate(view.getDate() + 7);
        else mode = act;
        render();
      });
      return h;
    }

    function chip(e, timed) {
      const el = document.createElement("div");
      el.className = "fx-event";
      el.draggable = true;
      el.dataset.id = e.id;
      el.style.setProperty("--c", evColor(e.color));
      el.innerHTML = (e.time && !timed ? `<b>${e.time}</b> ` : "") + esc(e.title);
      el.title = e.title;
      el.addEventListener("dragstart", (ev) => { ev.dataTransfer.setData("text/fx-event", e.id); ev.dataTransfer.effectAllowed = "move"; el.classList.add("is-dragging"); });
      el.addEventListener("dragend", () => el.classList.remove("is-dragging"));
      return el;
    }

    function monthGrid() {
      const grid = document.createElement("div");
      grid.className = "fx-evcal-grid";
      DOW.forEach((d) => { const c = document.createElement("div"); c.className = "fx-evcal-dow"; c.textContent = d; grid.appendChild(c); });
      const y = view.getFullYear(), m = view.getMonth();
      const startDay = new Date(y, m, 1).getDay();
      const today = iso(new Date());
      for (let i = 0; i < 42; i++) {
        const d = new Date(y, m, i - startDay + 1);
        const dstr = iso(d);
        const cell = document.createElement("div");
        cell.className = "fx-evcal-cell" + (d.getMonth() !== m ? " is-outside" : "");
        cell.dataset.date = dstr;
        const num = document.createElement("span");
        num.className = "fx-evcal-daynum" + (dstr === today ? " is-today" : "");
        num.textContent = d.getDate();
        cell.appendChild(num);
        const evs = eventsOn(dstr);
        evs.slice(0, 3).forEach((e) => cell.appendChild(chip(e)));
        if (evs.length > 3) {
          const more = document.createElement("span");
          more.className = "fx-evcal-more";
          more.textContent = "+" + (evs.length - 3) + " more";
          cell.appendChild(more);
        }
        cell.addEventListener("dragover", (ev) => { if (ev.dataTransfer.types.includes("text/fx-event")) { ev.preventDefault(); cell.classList.add("is-over"); } });
        cell.addEventListener("dragleave", () => cell.classList.remove("is-over"));
        cell.addEventListener("drop", (ev) => {
          ev.preventDefault();
          cell.classList.remove("is-over");
          const id = ev.dataTransfer.getData("text/fx-event");
          const evt = events.find((x) => x.id === id);
          if (evt) { evt.date = dstr; render(); root.dispatchEvent(new CustomEvent("fx:eventmove", { detail: { event: evt }, bubbles: true })); }
        });
        grid.appendChild(cell);
      }
      return grid;
    }

    function weekGrid() {
      const H0 = 8, H1 = 20, HH = 44;
      const wrap = document.createElement("div");
      wrap.className = "fx-evcal-week";
      const start = day0(view);
      start.setDate(start.getDate() - start.getDay());
      const today = iso(new Date());
      let html = `<div class="fx-evcal-wk-head"><div class="fx-evcal-timecol"></div>`;
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(d.getDate() + i);
        days.push(d);
        html += `<div class="fx-evcal-wk-day ${iso(d) === today ? "is-today" : ""}"><span>${DOW[i]}</span><b>${d.getDate()}</b></div>`;
      }
      html += `</div><div class="fx-evcal-wk-body"><div class="fx-evcal-timecol">`;
      for (let h = H0; h < H1; h++) html += `<div class="fx-evcal-hour">${h}:00</div>`;
      html += `</div>`;
      days.forEach((d) => {
        const dstr = iso(d);
        html += `<div class="fx-evcal-wk-col" data-date="${dstr}" style="height:${(H1 - H0) * HH}px">`;
        for (let h = H0; h < H1; h++) html += `<div class="fx-evcal-hline" style="top:${(h - H0) * HH}px"></div>`;
        eventsOn(dstr).forEach((e) => {
          const [hh, mm] = (e.time || "9:00").split(":").map(Number);
          const top = Math.max(0, (hh - H0 + (mm || 0) / 60) * HH);
          const height = Math.max(26, (e.dur || 1) * HH - 4);
          html += `<div class="fx-event fx-event--timed" style="--c:${evColor(e.color)};top:${top}px;height:${height}px"><b>${e.time || ""}</b>${esc(e.title)}</div>`;
        });
        html += `</div>`;
      });
      html += `</div>`;
      wrap.innerHTML = html;
      return wrap;
    }

    function render() {
      root.innerHTML = "";
      root.appendChild(header());
      root.appendChild(mode === "month" ? monthGrid() : weekGrid());
    }
    render();
    return { render, events };
  };

  /* ============================ gantt ============================ */
  window.fxGantt = function (root, opts) {
    const DAY = 26, ROW = 40;
    const tasks = opts.tasks.map((t, i) => ({ id: "t" + i, ...t, s: parse(t.start), e: parse(t.end) }));
    const min = new Date(Math.min(...tasks.map((t) => t.s)));
    const max = new Date(Math.max(...tasks.map((t) => t.e)));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 4);
    const days = Math.round((max - min) / 864e5) + 1;
    const x = (d) => Math.round((d - min) / 864e5) * DAY;
    root.classList.add("fx-gantt");

    function render() {
      const today = day0(new Date());
      let names = `<div class="fx-gantt-names"><div class="fx-gantt-corner">Task</div>`;
      tasks.forEach((t) => {
        names += `<div class="fx-gantt-name"><span>${esc(t.name)}</span><span class="fx-muted fx-text-xs">${t.progress}%</span></div>`;
      });
      names += `</div>`;

      let head = `<div class="fx-gantt-head" style="width:${days * DAY}px">`;
      for (let i = 0; i < days; i++) {
        const d = new Date(min); d.setDate(d.getDate() + i);
        const isMonday = d.getDay() === 1;
        head += `<div class="fx-gantt-day ${d.getDay() === 0 || d.getDay() === 6 ? "is-wknd" : ""}" style="left:${i * DAY}px">${
          isMonday ? `<span>${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}</span>` : ""}</div>`;
      }
      head += `</div>`;

      let body = `<div class="fx-gantt-body" style="width:${days * DAY}px;height:${tasks.length * ROW}px">`;
      for (let i = 0; i < days; i++) {
        const d = new Date(min); d.setDate(d.getDate() + i);
        if (d.getDay() === 0 || d.getDay() === 6) body += `<div class="fx-gantt-wknd" style="left:${i * DAY}px"></div>`;
      }
      if (today >= min && today <= max) body += `<div class="fx-gantt-today" style="left:${x(today) + DAY / 2}px"></div>`;
      tasks.forEach((t, i) => {
        const w = (Math.round((t.e - t.s) / 864e5) + 1) * DAY - 6;
        body += `<div class="fx-gantt-bar" data-id="${t.id}" style="--c:${evColor(t.color)};left:${x(t.s) + 3}px;top:${i * ROW + 9}px;width:${w}px"
          data-fx-tip="${esc(t.name)} · ${t.start} → ${t.end}">
          <div class="fx-gantt-fill" style="width:${t.progress}%"></div><span>${esc(t.name)}</span></div>`;
      });
      body += `</div>`;

      root.innerHTML = names + `<div class="fx-gantt-scroll"><div>` + head + body + `</div></div>`;

      // drag bars horizontally (pointer events)
      root.querySelectorAll(".fx-gantt-bar").forEach((bar) => {
        bar.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          const t = tasks.find((k) => k.id === bar.dataset.id);
          const startX = e.clientX, origLeft = parseFloat(bar.style.left);
          let shift = 0;
          try { bar.setPointerCapture(e.pointerId); } catch (err) {}
          bar.classList.add("is-dragging");
          const move = (ev) => {
            shift = Math.round((ev.clientX - startX) / DAY);
            bar.style.left = origLeft + shift * DAY + "px";
          };
          const up = () => {
            bar.removeEventListener("pointermove", move);
            bar.removeEventListener("pointerup", up);
            bar.classList.remove("is-dragging");
            if (shift) {
              t.s.setDate(t.s.getDate() + shift);
              t.e.setDate(t.e.getDate() + shift);
              t.start = iso(t.s); t.end = iso(t.e);
              render();
              root.dispatchEvent(new CustomEvent("fx:ganttmove", { detail: { task: t }, bubbles: true }));
            }
          };
          bar.addEventListener("pointermove", move);
          bar.addEventListener("pointerup", up);
        });
      });
    }
    render();
    return { render, tasks };
  };

  /* ============================ filter builder ============================ */
  window.fxFilterBuilder = function (root, opts) {
    const OPS = {
      text: ["contains", "equals", "starts with"],
      number: ["=", "≠", ">", "<"],
      enum: ["is", "is not"],
      date: ["on", "before", "after"],
    };
    const fields = opts.fields;
    const state = { op: "and", rules: [] };
    root.classList.add("fx-fb");

    function fieldBy(k) { return fields.find((f) => f.key === k); }
    function newRule() { const f = fields[0]; return { field: f.key, operator: OPS[f.type][0], value: "" }; }

    function rulePredicate(r) {
      const f = fieldBy(r.field);
      return (row) => {
        const v = row[r.field];
        const rv = r.value;
        if (rv === "" || rv == null) return true;
        switch (f.type) {
          case "text": {
            const a = String(v).toLowerCase(), b = String(rv).toLowerCase();
            return r.operator === "contains" ? a.includes(b) : r.operator === "equals" ? a === b : a.startsWith(b);
          }
          case "number": {
            const n = +v, m = +rv;
            return r.operator === "=" ? n === m : r.operator === "≠" ? n !== m : r.operator === ">" ? n > m : n < m;
          }
          case "enum": return r.operator === "is" ? String(v) === rv : String(v) !== rv;
          case "date": {
            const a = String(v), b = String(rv);
            return r.operator === "on" ? a === b : r.operator === "before" ? a < b : a > b;
          }
        }
      };
    }
    function groupPredicate(g) {
      const preds = g.rules.map((r) => (r.rules ? groupPredicate(r) : rulePredicate(r)));
      if (!preds.length) return () => true;
      return g.op === "and" ? (row) => preds.every((p) => p(row)) : (row) => preds.some((p) => p(row));
    }
    function emit() { opts.onChange(state.rules.length ? groupPredicate(state) : null, state); }

    function valueEditor(r) {
      const f = fieldBy(r.field);
      if (f.type === "enum") {
        const s = document.createElement("select");
        s.className = "fx-select fx-fb-ctl";
        s.innerHTML = `<option value="">any</option>` + f.options.map((o) => `<option ${r.value === o ? "selected" : ""}>${esc(o)}</option>`).join("");
        s.addEventListener("change", () => { r.value = s.value; emit(); });
        return s;
      }
      const i = document.createElement("input");
      i.className = "fx-input fx-fb-ctl";
      i.type = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
      i.placeholder = "Value";
      i.value = r.value;
      i.addEventListener("input", () => { r.value = i.value; emit(); });
      return i;
    }

    function ruleRow(r, group, idx, depth) {
      const row = document.createElement("div");
      row.className = "fx-fb-row";
      // conjunction slot
      const conj = document.createElement("div");
      conj.className = "fx-fb-conj";
      if (idx === 0) conj.innerHTML = `<span class="fx-muted fx-text-sm">Where</span>`;
      else if (idx === 1) {
        const s = document.createElement("select");
        s.className = "fx-select fx-fb-ctl";
        s.style.width = "4.5rem";
        s.innerHTML = `<option value="and" ${group.op === "and" ? "selected" : ""}>and</option><option value="or" ${group.op === "or" ? "selected" : ""}>or</option>`;
        s.addEventListener("change", () => { group.op = s.value; renderAll(); emit(); });
        conj.appendChild(s);
      } else conj.innerHTML = `<span class="fx-muted fx-text-sm">${group.op}</span>`;
      row.appendChild(conj);

      if (r.rules) {
        // nested group
        const g = document.createElement("div");
        g.className = "fx-fb-group";
        r.rules.forEach((rr, i2) => g.appendChild(ruleRow(rr, r, i2, depth + 1)));
        const add = document.createElement("button");
        add.className = "fx-btn fx-btn--ghost fx-btn--sm";
        add.textContent = "+ Rule";
        add.addEventListener("click", () => { r.rules.push(newRule()); renderAll(); emit(); });
        g.appendChild(add);
        row.appendChild(g);
      } else {
        const fs = document.createElement("select");
        fs.className = "fx-select fx-fb-ctl";
        fs.innerHTML = fields.map((f) => `<option value="${f.key}" ${r.field === f.key ? "selected" : ""}>${esc(f.label)}</option>`).join("");
        fs.addEventListener("change", () => { r.field = fs.value; r.operator = OPS[fieldBy(r.field).type][0]; r.value = ""; renderAll(); emit(); });
        const os = document.createElement("select");
        os.className = "fx-select fx-fb-ctl";
        os.style.width = "7rem";
        os.innerHTML = OPS[fieldBy(r.field).type].map((o) => `<option ${r.operator === o ? "selected" : ""}>${o}</option>`).join("");
        os.addEventListener("change", () => { r.operator = os.value; emit(); });
        row.append(fs, os, valueEditor(r));
      }

      const x = document.createElement("button");
      x.className = "fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm";
      x.setAttribute("aria-label", "Remove");
      x.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
      x.addEventListener("click", () => { group.rules.splice(idx, 1); renderAll(); emit(); });
      row.appendChild(x);
      return row;
    }

    function renderAll() {
      root.innerHTML = "";
      state.rules.forEach((r, i) => root.appendChild(ruleRow(r, state, i, 0)));
      const bar = document.createElement("div");
      bar.className = "fx-row";
      const addR = document.createElement("button");
      addR.className = "fx-btn fx-btn--outline fx-btn--sm";
      addR.innerHTML = "+ Add filter";
      addR.addEventListener("click", () => { state.rules.push(newRule()); renderAll(); emit(); });
      const addG = document.createElement("button");
      addG.className = "fx-btn fx-btn--ghost fx-btn--sm";
      addG.innerHTML = "+ Add group";
      addG.addEventListener("click", () => { state.rules.push({ op: "or", rules: [newRule(), newRule()] }); renderAll(); emit(); });
      bar.append(addR, addG);
      root.appendChild(bar);
    }
    renderAll();
    return { state, clear: () => { state.rules = []; renderAll(); emit(); } };
  };

  /* ============================ virtualized log table ============================ */
  window.fxLogTable = function (root, opts) {
    const LEVELS = ["debug", "info", "warn", "error"];
    const SVCS = ["api", "web", "worker", "auth", "billing", "cron"];
    const MSGS = [
      "request completed", "cache miss for key user:{n}", "connection pool exhausted, retrying",
      "token refreshed for session {n}", "slow query detected ({n}ms)", "payment webhook received",
      "rate limit applied to 10.0.4.{n}", "deploy hook triggered", "queue depth at {n}",
      "TLS handshake failed, retrying", "user {n} logged in", "background job finished in {n}ms",
    ];
    const ROWH = 30, VISIBLE = 60;
    const total = opts.count || 50000;
    const t0 = Date.now() - total * 400;
    const rows = new Array(total);
    for (let i = 0; i < total; i++) {
      const r = Math.abs(Math.sin(i * 999)) ;
      rows[i] = {
        t: new Date(t0 + i * 400),
        level: r > 0.985 ? "error" : r > 0.93 ? "warn" : r > 0.45 ? "info" : "debug",
        svc: SVCS[Math.floor(r * 31) % SVCS.length],
        msg: MSGS[Math.floor(r * 173) % MSGS.length].replace("{n}", Math.floor(r * 9000) + 100),
      };
    }
    const state = { levels: new Set(LEVELS), q: "", live: true, sel: null };
    let filtered = [];

    root.classList.add("fx-logs");
    root.innerHTML =
      `<div class="fx-logs-toolbar">
         ${LEVELS.map((l) => `<button class="fx-logs-lvl is-on" data-lvl="${l}"><i></i>${l}</button>`).join("")}
         <div class="fx-input-group" style="width:14rem;margin-left:.25rem">
           <span class="fx-input-addon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
           <input class="fx-input fx-logs-q" placeholder="Search logs…" style="height:1.75rem">
         </div>
         <div style="flex:1"></div>
         <span class="fx-logs-count fx-text-xs fx-muted"></span>
         <label class="fx-row fx-text-sm" style="gap:.375rem"><input type="checkbox" class="fx-switch fx-logs-live" checked> Live</label>
       </div>
       <div class="fx-logs-viewport"><div class="fx-logs-spacer"><div class="fx-logs-window"></div></div></div>
       <pre class="fx-logs-detail" hidden></pre>`;

    const viewport = root.querySelector(".fx-logs-viewport");
    const spacer = root.querySelector(".fx-logs-spacer");
    const win = root.querySelector(".fx-logs-window");
    const detail = root.querySelector(".fx-logs-detail");

    function refilter() {
      const q = state.q.toLowerCase();
      filtered = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!state.levels.has(r.level)) continue;
        if (q && !(r.msg + " " + r.svc).toLowerCase().includes(q)) continue;
        filtered.push(i);
      }
      spacer.style.height = filtered.length * ROWH + "px";
      root.querySelector(".fx-logs-count").textContent = filtered.length.toLocaleString() + " / " + rows.length.toLocaleString() + " lines";
      paint();
    }
    function paint() {
      const start = Math.max(0, Math.floor(viewport.scrollTop / ROWH) - 5);
      const end = Math.min(filtered.length, start + VISIBLE);
      let html = "";
      for (let i = start; i < end; i++) {
        const r = rows[filtered[i]];
        html += `<div class="fx-logs-row ${state.sel === filtered[i] ? "is-sel" : ""}" data-i="${filtered[i]}" style="top:${i * ROWH}px">
          <span class="fx-logs-time">${r.t.toLocaleTimeString(undefined, { hour12: false })}.${String(r.t.getMilliseconds()).padStart(3, "0")}</span>
          <span class="fx-logs-badge is-${r.level}">${r.level}</span>
          <span class="fx-logs-svc">${r.svc}</span>
          <span class="fx-logs-msg">${esc(r.msg)}</span>
        </div>`;
      }
      win.innerHTML = html;
    }
    let raf = null;
    viewport.addEventListener("scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; paint(); });
      if (viewport.scrollTop + viewport.clientHeight < spacer.offsetHeight - ROWH * 2) {
        state.live = false;
        root.querySelector(".fx-logs-live").checked = false;
      }
    });
    root.querySelectorAll(".fx-logs-lvl").forEach((b) => b.addEventListener("click", () => {
      const l = b.dataset.lvl;
      state.levels.has(l) && state.levels.size > 1 ? state.levels.delete(l) : state.levels.add(l);
      b.classList.toggle("is-on", state.levels.has(l));
      refilter();
    }));
    root.querySelector(".fx-logs-q").addEventListener("input", (e) => { state.q = e.target.value; refilter(); });
    root.querySelector(".fx-logs-live").addEventListener("change", (e) => {
      state.live = e.target.checked;
      if (state.live) viewport.scrollTop = spacer.offsetHeight;
    });
    win.addEventListener("click", (e) => {
      const row = e.target.closest(".fx-logs-row");
      if (!row) return;
      state.sel = +row.dataset.i;
      const r = rows[state.sel];
      detail.hidden = false;
      detail.textContent = JSON.stringify({ timestamp: r.t.toISOString(), level: r.level, service: r.svc, message: r.msg, trace_id: "tr_" + state.sel.toString(36), host: r.svc + "-" + (state.sel % 4) + ".internal" }, null, 2);
      paint();
    });
    // live tail
    setInterval(() => {
      if (!state.live) return;
      const r = Math.random();
      rows.push({ t: new Date(), level: r > 0.95 ? "error" : r > 0.85 ? "warn" : "info", svc: SVCS[Math.floor(r * 6)], msg: MSGS[Math.floor(r * MSGS.length)].replace("{n}", Math.floor(r * 9000) + 100) });
      refilter();
      viewport.scrollTop = spacer.offsetHeight;
    }, 1100);

    refilter();
    viewport.scrollTop = spacer.offsetHeight;
    return { refilter };
  };

  /* ================= CSV import wizard (fxImporter) ================= */
  window.fxImporter = function (root, opts = {}) {
    const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const targets = opts.targets || [];
    const STEPS = ["Upload", "Map columns", "Validate", "Import"];
    let step = 0, csv = null, mapping = {}, fileName = "";

    // ---- tiny CSV parser: quoted fields, "" escapes, CRLF ----
    function parseCsv(text) {
      const rows = [];
      let row = [], field = "", inQ = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
          if (c === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; }
            else inQ = false;
          } else field += c;
        } else if (c === '"') inQ = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(field); field = "";
          if (row.length > 1 || row[0] !== "") rows.push(row);
          row = [];
        } else field += c;
      }
      if (field !== "" || row.length) { row.push(field); rows.push(row); }
      if (!rows.length) return null;
      return { headers: rows[0], rows: rows.slice(1) };
    }

    // ---- auto-match source headers to targets by name similarity ----
    const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
    function similarity(a, b) {
      a = norm(a); b = norm(b);
      if (!a || !b) return 0;
      if (a === b) return 1;
      if (a.includes(b) || b.includes(a)) return 0.8;
      const grams = (x) => { const g = new Set(); for (let i = 0; i < x.length - 1; i++) g.add(x.slice(i, i + 2)); return g; };
      const ga = grams(a), gb = grams(b);
      let hit = 0;
      ga.forEach((g) => { if (gb.has(g)) hit++; });
      return (2 * hit) / (ga.size + gb.size || 1);
    }
    function autoMatch() {
      mapping = {};
      const used = new Set();
      targets.forEach((t) => {
        let best = -1, bestScore = 0.45;
        csv.headers.forEach((h, i) => {
          if (used.has(i)) return;
          const s = Math.max(similarity(h, t.key), similarity(h, t.label));
          if (s > bestScore) { bestScore = s; best = i; }
        });
        if (best >= 0) { mapping[t.key] = best; used.add(best); }
      });
    }

    // ---- validation ----
    function mappedRows() {
      return csv.rows.map((r) => {
        const rec = {};
        targets.forEach((t) => { const i = mapping[t.key]; rec[t.key] = i == null ? "" : (r[i] ?? "").trim(); });
        return rec;
      });
    }
    function validate(rows) {
      const errs = [];
      rows.forEach((rec, ri) => {
        targets.forEach((t) => {
          let e = null;
          const v = rec[t.key];
          if (t.required && !v) e = "Required";
          else if (v && t.validate) e = t.validate(v) || null;
          if (e) errs.push({ row: ri, key: t.key, msg: e });
        });
      });
      return errs;
    }

    // ---- rendering ----
    function stepper() {
      return `<div class="fx-stepper">` + STEPS.map((label, i) => {
        const st = i < step ? "done" : i === step ? "active" : "pending";
        const dot = i < step
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
          : String(i + 1);
        return `<div class="fx-step" data-state="${st}"><div class="fx-step-dot">${dot}</div><div><div class="fx-step-label">${label}</div></div></div>`;
      }).join("") + `</div>`;
    }

    function bodyUpload() {
      return `<div class="fx-imp-drop fx-dropzone">
          <input type="file" accept=".csv,text/csv">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          <b>Drop a CSV here or click to browse</b>
          <span>Header row required · quoted fields supported</span>
        </div>
        <div class="fx-row" style="justify-content:center;margin-top:.75rem">
          <span class="fx-text-sm fx-muted">or</span>
          <button class="fx-btn fx-btn--outline fx-btn--sm" data-imp="sample">Use sample data</button>
        </div>`;
    }

    function bodyMap() {
      const usedIdx = new Map(Object.entries(mapping).map(([k, v]) => [v, k]));
      return `<div class="fx-imp-maps">` + csv.headers.map((h, i) => {
        const samples = csv.rows.slice(0, 2).map((r) => r[i]).filter(Boolean);
        const mappedKey = usedIdx.get(i) || "";
        return `<div class="fx-imp-map">
          <div class="fx-imp-src">
            <span class="fx-imp-src-name">${esc(h)}</span>
            <span class="fx-imp-src-sample">${esc(samples.join(" · ") || "—")}</span>
          </div>
          <svg class="fx-imp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          <select class="fx-select fx-imp-target" data-src="${i}">
            <option value="">Skip column</option>
            ${targets.map((t) => `<option value="${t.key}" ${mappedKey === t.key ? "selected" : ""}>${esc(t.label)}${t.required ? " *" : ""}</option>`).join("")}
          </select>
          ${mappedKey ? '<span class="fx-badge fx-badge--secondary fx-imp-auto">auto</span>' : '<span class="fx-imp-auto"></span>'}
        </div>`;
      }).join("") + `</div>
      <p class="fx-text-sm fx-muted" style="margin:.75rem 0 0" data-imp-mapnote></p>`;
    }

    function bodyValidate() {
      const rows = mappedRows();
      const errs = validate(rows);
      const byKey = {};
      errs.forEach((e) => (byKey[e.key] = (byKey[e.key] || 0) + 1));
      const errAt = (ri, k) => errs.find((e) => e.row === ri && e.key === k);
      const PREVIEW = 8;
      return `<div class="fx-row" style="gap:.375rem;margin-bottom:.75rem" data-imp-chips>
          ${errs.length
            ? targets.filter((t) => byKey[t.key]).map((t) => `<span class="fx-badge fx-badge--destructive">${esc(t.label)} · ${byKey[t.key]}</span>`).join("") +
              `<span class="fx-text-sm fx-muted" style="margin-left:.25rem">${errs.length} issue${errs.length === 1 ? "" : "s"} — click a highlighted cell to fix it</span>`
            : '<span class="fx-badge fx-badge--success fx-badge--dot">All rows valid</span>'}
        </div>
        <div class="fx-table-wrap" style="border:1px solid var(--border);border-radius:var(--radius-lg);max-height:19rem;overflow:auto">
          <table class="fx-table fx-imp-preview">
            <thead><tr><th style="width:2.5rem">#</th>${targets.map((t) => `<th>${esc(t.label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows.slice(0, PREVIEW).map((rec, ri) => `<tr>
                <td class="fx-muted fx-tabular">${ri + 1}</td>
                ${targets.map((t) => {
                  const e = errAt(ri, t.key);
                  return `<td class="${e ? "fx-imp-cell-err" : ""}" data-row="${ri}" data-key="${esc(t.key)}" ${e ? `data-fx-tip="${esc(e.msg)}"` : ""}>${esc(rec[t.key]) || '<span class="fx-muted">—</span>'}</td>`;
                }).join("")}
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        ${rows.length > PREVIEW ? `<p class="fx-text-xs fx-muted" style="margin:.5rem 0 0">Showing ${PREVIEW} of ${rows.length} rows — all rows are validated.</p>` : ""}`;
    }

    function bodyImport(done, imported, skipped) {
      if (!done) return `<div class="fx-imp-run">
          <div class="fx-stack" style="gap:.5rem;width:min(24rem,100%)">
            <div class="fx-row" style="justify-content:space-between"><span class="fx-text-sm">Importing ${csv.rows.length} rows…</span><span class="fx-text-sm fx-muted fx-tabular" data-imp-pct>0%</span></div>
            <div class="fx-progress"><div data-imp-bar style="width:0%"></div></div>
          </div>
        </div>`;
      return `<div class="fx-imp-run">
          <div class="fx-imp-done">
            <span class="fx-imp-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
            <div class="fx-imp-done-title">Import complete</div>
            <div class="fx-text-sm fx-muted">${imported} row${imported === 1 ? "" : "s"} imported${skipped ? ` · ${skipped} skipped (invalid)` : ""}${fileName ? ` from <b>${esc(fileName)}</b>` : ""}</div>
            <button class="fx-btn fx-btn--outline fx-btn--sm" data-imp="reset" style="margin-top:.5rem">Import another file</button>
          </div>
        </div>`;
    }

    function footer() {
      if (step === 3) return "";
      const errs = step === 2 ? validate(mappedRows()) : [];
      const missing = step === 1 ? targets.filter((t) => t.required && mapping[t.key] == null) : [];
      const next =
        step === 0 ? "" :
        step === 1 ? `<button class="fx-btn" data-imp="next" ${missing.length ? "disabled" : ""}>Continue</button>` :
        `<button class="fx-btn" data-imp="import">${errs.length ? `Import ${csv.rows.length - new Set(errs.map((e) => e.row)).size} valid rows` : `Import ${csv.rows.length} rows`}</button>`;
      return `<div class="fx-row" style="justify-content:space-between;margin-top:1.25rem">
        ${step > 0 ? '<button class="fx-btn fx-btn--outline" data-imp="back">Back</button>' : "<span></span>"}
        ${next}</div>`;
    }

    function render() {
      root.classList.add("fx-importer");
      root.innerHTML = stepper() +
        `<div class="fx-imp-body is-in">` +
        (step === 0 ? bodyUpload() : step === 1 ? bodyMap() : step === 2 ? bodyValidate() : bodyImport(false)) +
        `</div>` + footer();
      if (step === 1) updateMapNote();
      if (step === 3) runImport();
    }

    function updateMapNote() {
      const missing = targets.filter((t) => t.required && mapping[t.key] == null);
      const note = root.querySelector("[data-imp-mapnote]");
      if (note) note.innerHTML = missing.length
        ? `Map the required column${missing.length === 1 ? "" : "s"}: <b>${missing.map((t) => esc(t.label)).join(", ")}</b>`
        : `${Object.keys(mapping).length} of ${csv.headers.length} source columns mapped.`;
      const nextBtn = root.querySelector('[data-imp="next"]');
      if (nextBtn) nextBtn.disabled = !!missing.length;
    }

    function runImport() {
      const bar = root.querySelector("[data-imp-bar]");
      const pct = root.querySelector("[data-imp-pct]");
      const errs = validate(mappedRows());
      const skipped = new Set(errs.map((e) => e.row)).size;
      const imported = csv.rows.length - skipped;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let p = 0;
      const tick = () => {
        p = Math.min(100, p + 7 + Math.random() * 16);
        if (bar) { bar.style.width = p + "%"; pct.textContent = Math.round(p) + "%"; }
        if (p < 100 && !reduced) setTimeout(tick, 90);
        else setTimeout(() => {
          root.querySelector(".fx-imp-body").innerHTML = bodyImport(true, imported, skipped);
          opts.onComplete?.({ imported, skipped });
        }, reduced ? 0 : 250);
      };
      tick();
    }

    function loadCsv(text, name) {
      const parsed = parseCsv(text);
      if (!parsed || !parsed.headers.length || !parsed.rows.length) {
        if (window.finix) finix.toast({ title: "Could not parse CSV", description: "Need a header row and at least one data row.", variant: "destructive" });
        return;
      }
      csv = parsed; fileName = name || "";
      autoMatch();
      step = 1;
      render();
    }

    // ---- events ----
    root.addEventListener("click", (e) => {
      const act = e.target.closest("[data-imp]");
      if (act) {
        const a = act.dataset.imp;
        if (a === "sample" && opts.sampleCsv) loadCsv(opts.sampleCsv, "sample.csv");
        if (a === "back") { step--; render(); }
        if (a === "next") { step++; render(); }
        if (a === "import") { step = 3; render(); }
        if (a === "reset") { step = 0; csv = null; mapping = {}; fileName = ""; render(); }
        return;
      }
      const cell = e.target.closest("td.fx-imp-cell-err");
      if (cell && !cell.querySelector("input")) {
        const ri = +cell.dataset.row, key = cell.dataset.key;
        const src = mapping[key];
        const orig = (csv.rows[ri][src] ?? "").trim();
        cell.innerHTML = `<input class="fx-input" value="${esc(orig)}" style="height:1.75rem;font-size:.8125rem">`;
        const inp = cell.querySelector("input");
        inp.focus(); inp.select();
        let done = false;
        const commit = () => {
          if (done) return; done = true;
          if (src != null) csv.rows[ri][src] = inp.value;
          const scroller = root.querySelector(".fx-table-wrap");
          const keep = scroller ? scroller.scrollTop : 0;
          render();
          const s2 = root.querySelector(".fx-table-wrap");
          if (s2) s2.scrollTop = keep;
        };
        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") commit();
          if (ev.key === "Escape") { done = true; render(); }
        });
        inp.addEventListener("blur", commit);
      }
    });
    root.addEventListener("change", (e) => {
      if (e.target.matches(".fx-imp-drop input[type=file]")) {
        const f = e.target.files[0];
        if (f) f.text().then((t) => loadCsv(t, f.name));
        return;
      }
      if (e.target.matches(".fx-imp-target")) {
        const src = +e.target.dataset.src, key = e.target.value;
        Object.keys(mapping).forEach((k) => { if (mapping[k] === src) delete mapping[k]; });
        if (key) {
          // a target can only be fed by one column
          Object.keys(mapping).forEach((k) => { if (k === key) delete mapping[k]; });
          mapping[key] = src;
        }
        // refresh selects so a stolen target deselects elsewhere
        const keep = e.target;
        root.querySelectorAll(".fx-imp-target").forEach((sel) => {
          if (sel === keep) return;
          const i = +sel.dataset.src;
          const k = Object.keys(mapping).find((kk) => mapping[kk] === i) || "";
          sel.value = k;
        });
        updateMapNote();
      }
    });
    ["dragover", "dragleave", "drop"].forEach((ev) =>
      root.addEventListener(ev, (e) => {
        const dz = e.target.closest(".fx-imp-drop");
        if (!dz) return;
        e.preventDefault();
        dz.classList.toggle("is-over", ev === "dragover");
        if (ev === "drop") {
          const f = e.dataTransfer?.files?.[0];
          if (f) f.text().then((t) => loadCsv(t, f.name));
        }
      }));

    render();
    return {
      get step() { return step; },
      loadCsv,
      reset() { step = 0; csv = null; mapping = {}; render(); },
    };
  };
})();
