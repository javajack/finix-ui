/*!
 * finix-ui · finix-domains.js — business-domain behaviors
 * fxOrderBook (live depth ladder) · fxComments (nesting, reactions, @mentions) ·
 * fxTimesheet (editable grid + running timer) · follow toggles
 */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ============ order book ============ */
  window.fxOrderBook = function (root, opts = {}) {
    const mid = opts.mid || 64250;
    const depth = opts.rows || 7;
    const sym = opts.symbol || "BTC-USD";
    let bids = [], asks = [];
    function seed() {
      bids = []; asks = [];
      for (let i = 0; i < depth; i++) {
        bids.push({ p: mid - (i + 1) * (2 + Math.random() * 6), s: 0.2 + Math.random() * 2.4 });
        asks.push({ p: mid + (i + 1) * (2 + Math.random() * 6), s: 0.2 + Math.random() * 2.4 });
      }
    }
    function render(changed) {
      const maxT = Math.max(...bids.map((b) => b.s), ...asks.map((a) => a.s));
      const row = (o, side, i) =>
        `<div class="fx-ob-row ${side} ${changed === side + i ? "flash" : ""}" style="--depth:${(o.s / maxT) * 100}%">
           <span class="p">${o.p.toFixed(1)}</span><span class="s">${o.s.toFixed(3)}</span><span class="t">${(o.p * o.s / 1000).toFixed(1)}k</span>
         </div>`;
      const spread = asks[0].p - bids[0].p;
      root.innerHTML =
        `<div class="fx-orderbook-head"><span>Price (USD)</span><span style="text-align:right">Size (${sym.split("-")[0]})</span><span style="text-align:right">Total</span></div>` +
        [...asks].reverse().map((a, i) => row(a, "ask", asks.length - 1 - i)).join("") +
        `<div class="fx-ob-spread"><b>${((bids[0].p + asks[0].p) / 2).toFixed(1)}</b><span class="fx-muted fx-text-xs">spread ${spread.toFixed(1)} · ${((spread / mid) * 100).toFixed(3)}%</span></div>` +
        bids.map((b, i) => row(b, "bid", i)).join("");
    }
    root.classList.add("fx-orderbook");
    seed(); render();
    setInterval(() => {
      const side = Math.random() > 0.5 ? "bid" : "ask";
      const arr = side === "bid" ? bids : asks;
      const i = Math.floor(Math.random() * arr.length);
      arr[i].s = Math.max(0.05, arr[i].s + (Math.random() - 0.5) * 0.9);
      if (Math.random() > 0.8) arr[i].p += (Math.random() - 0.5) * 1.6;
      render(side + i);
    }, opts.interval || 700);
    return { render };
  };

  /* ============ nested comments ============ */
  window.fxComments = function (root, opts) {
    const people = opts.people || ["Olivia", "Jackson", "Isabella", "Sofia", "Noah"];
    root.classList.add("fx-comments");

    function reactionBtn(emoji, count, on) {
      return `<button class="fx-reaction" aria-pressed="${!!on}" data-count="${count}">${emoji} <span>${count}</span></button>`;
    }
    function renderComment(c) {
      return `<div class="fx-comment">
        <span class="fx-avatar fx-avatar--sm" style="flex-shrink:0">${c.ini}</span>
        <div class="fx-comment-body">
          <div class="fx-comment-head"><b>${esc(c.name)}</b><span>${esc(c.time)}</span></div>
          <div class="fx-comment-text">${c.html}</div>
          <div class="fx-comment-actions">
            ${(c.reactions || []).map((r) => reactionBtn(r.e, r.n, r.on)).join("")}
            <button class="fx-btn fx-btn--ghost fx-btn--sm" data-reply style="height:1.5rem;font-size:.71rem;padding:0 .4375rem">Reply</button>
          </div>
          ${c.children && c.children.length ? `<div class="fx-comment-children">${c.children.map(renderComment).join("")}</div>` : ""}
        </div>
      </div>`;
    }
    root.innerHTML =
      opts.comments.map(renderComment).join("") +
      `<div class="fx-comment">
         <span class="fx-avatar fx-avatar--sm" style="flex-shrink:0">RK</span>
         <div class="fx-comment-body">
           <div class="fx-composer" style="padding:.5rem .625rem;border-radius:var(--radius-lg)">
             <textarea rows="1" placeholder="Add a comment — type @ to mention" style="min-height:1.5rem"></textarea>
             <div class="fx-composer-bar">
               <span class="fx-text-xs fx-muted">@ mentions supported</span>
               <div class="fx-topbar-spacer"></div>
               <button class="fx-btn fx-btn--sm" data-post>Comment</button>
             </div>
           </div>
         </div>
       </div>`;

    // reactions toggle
    root.addEventListener("click", (e) => {
      const r = e.target.closest(".fx-reaction");
      if (r) {
        const on = r.getAttribute("aria-pressed") === "true";
        let n = +r.dataset.count + (on ? -1 : 1);
        r.setAttribute("aria-pressed", String(!on));
        r.dataset.count = n;
        r.querySelector("span").textContent = n;
        return;
      }
      if (e.target.closest("[data-reply]")) {
        root.querySelector(".fx-composer textarea").focus();
      }
    });

    // @mention popover
    const ta = root.querySelector(".fx-composer textarea");
    let menu = null;
    function closeMenu() { if (menu) menu.remove(), (menu = null); }
    ta.addEventListener("input", () => {
      const upto = ta.value.slice(0, ta.selectionStart);
      const m = upto.match(/@(\w*)$/);
      if (!m) return closeMenu();
      const q = m[1].toLowerCase();
      const hits = people.filter((p) => p.toLowerCase().startsWith(q));
      if (!hits.length) return closeMenu();
      if (!menu) {
        menu = document.createElement("div");
        menu.className = "fx-menu";
        menu.style.cssText = "position:fixed;z-index:70;min-width:9rem";
        document.body.appendChild(menu);
      }
      menu.innerHTML = hits.map((p) => `<button class="fx-menu-item" data-m="${p}"><span class="fx-avatar fx-avatar--sm" style="width:1.125rem;height:1.125rem;font-size:.5rem">${p[0]}</span>${p}</button>`).join("");
      const r = ta.getBoundingClientRect();
      menu.style.left = r.left + "px";
      menu.style.top = (r.top - Math.min(hits.length * 30 + 10, 160) - 6) + "px";
      menu.onmousedown = (ev) => {
        ev.preventDefault();
        const b = ev.target.closest("[data-m]");
        if (!b) return;
        ta.value = ta.value.slice(0, ta.selectionStart).replace(/@\w*$/, "@" + b.dataset.m + " ") + ta.value.slice(ta.selectionStart);
        closeMenu();
        ta.focus();
      };
    });
    ta.addEventListener("blur", () => setTimeout(closeMenu, 150));

    // post
    root.querySelector("[data-post]").addEventListener("click", () => {
      const text = ta.value.trim();
      if (!text) return;
      const html = esc(text).replace(/@(\w+)/g, '<span class="fx-mention">@$1</span>');
      const el = document.createElement("div");
      el.innerHTML = renderComment({ ini: "RK", name: "Rakesh K.", time: "just now", html, reactions: [{ e: "👍", n: 0 }] });
      root.insertBefore(el.firstChild, root.lastElementChild);
      ta.value = "";
    });
  };

  /* ============ timesheet ============ */
  window.fxTimesheet = function (root, opts) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayIdx = (new Date().getDay() + 6) % 7;
    const rows = opts.rows; // [{name, client, hours:[7]}]
    root.classList.add("fx-timesheet");

    function fmt(v) { return v ? v.toFixed(v % 1 ? 2 : 1) : ""; }
    function render() {
      root.innerHTML = `<table>
        <thead><tr><th>Project</th>${days.map((d, i) => `<th class="${i === todayIdx ? "is-today" : ""}">${d}</th>`).join("")}<th>Total</th></tr></thead>
        <tbody>${rows.map((r, ri) => `<tr>
          <td>${esc(r.name)}<span>${esc(r.client)}</span></td>
          ${r.hours.map((h, di) => `<td class="${di === todayIdx ? "is-today" : ""}"><input class="fx-ts-cell" data-r="${ri}" data-d="${di}" value="${fmt(h)}" inputmode="decimal" placeholder="–" aria-label="${r.name} ${days[di]}"></td>`).join("")}
          <td class="fx-ts-total">${r.hours.reduce((a, b) => a + b, 0).toFixed(1)}h</td>
        </tr>`).join("")}</tbody>
        <tfoot><tr><td>Total</td>${days.map((_, di) => `<td class="${di === todayIdx ? "is-today" : ""}">${rows.reduce((a, r) => a + r.hours[di], 0).toFixed(1)}</td>`).join("")}
        <td class="fx-ts-total">${rows.reduce((a, r) => a + r.hours.reduce((x, y) => x + y, 0), 0).toFixed(1)}h</td></tr></tfoot>
      </table>`;
    }
    root.addEventListener("change", (e) => {
      const inp = e.target.closest(".fx-ts-cell");
      if (!inp) return;
      const v = parseFloat(inp.value);
      rows[+inp.dataset.r].hours[+inp.dataset.d] = isNaN(v) ? 0 : Math.min(24, Math.max(0, v));
      render();
    });
    render();

    // running timer → today's first project
    if (opts.timerBtn && opts.timerOut) {
      let running = false, t0 = 0, iv = null;
      const btn = $(opts.timerBtn), out = $(opts.timerOut);
      btn.addEventListener("click", () => {
        running = !running;
        if (running) {
          t0 = Date.now();
          btn.innerHTML = btn.innerHTML.replace("Start timer", "Stop timer");
          btn.classList.add("fx-btn--destructive");
          iv = setInterval(() => {
            const s = Math.floor((Date.now() - t0) / 1000);
            out.textContent = String(Math.floor(s / 3600)).padStart(2, "0") + ":" + String(Math.floor((s % 3600) / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
          }, 250);
        } else {
          clearInterval(iv);
          const hrs = (Date.now() - t0) / 36e5;
          rows[0].hours[todayIdx] = +(rows[0].hours[todayIdx] + Math.max(0.01, hrs)).toFixed(2);
          render();
          out.textContent = "00:00:00";
          btn.innerHTML = btn.innerHTML.replace("Stop timer", "Start timer");
          btn.classList.remove("fx-btn--destructive");
          if (window.finix) finix.toast({ title: "Time logged", description: rows[0].name + " +" + Math.max(0.01, hrs).toFixed(2) + "h", variant: "success" });
        }
      });
    }
    return { rows, render };
  };

  /* ============ follow toggle ============ */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fx-follow]");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") === "true";
    b.setAttribute("aria-pressed", String(!on));
    b.textContent = on ? "Follow" : "Following";
    b.classList.toggle("fx-btn--outline", on);
    b.classList.toggle("fx-btn--secondary", !on);
  });

  /* ================= SLA countdown chips ================= */
  function renderSla(el) {
    const due = +el.dataset.fxSla;
    if (!due) return;
    const diff = due - Date.now();
    const mins = Math.abs(Math.round(diff / 60000));
    const h = Math.floor(mins / 60), m = mins % 60;
    const t = (h ? h + "h " : "") + m + "m";
    el.classList.add("fx-sla");
    el.dataset.state = diff < 0 ? "breach" : diff < 3600000 ? "warn" : "ok";
    el.textContent = diff < 0 ? "-" + t : t;
  }
  window.fxSlaTick = () => document.querySelectorAll("[data-fx-sla]").forEach(renderSla);
  fxSlaTick();
  setInterval(fxSlaTick, 30000);

  /* ================= ticket inbox ================= */
  window.fxInbox = function (root, opts) {
    const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const tickets = opts.tickets || [];
    const macros = opts.macros || [];
    let filter = "open", active = tickets[0];
    const ini = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const id = "inbox" + Math.floor(Math.random() * 1e6);

    function match(t) {
      if (filter === "open") return t.status === "open";
      if (filter === "mine") return t.mine && t.status !== "snoozed";
      return t.status === "snoozed";
    }
    function queueHtml() {
      const counts = {
        open: tickets.filter((t) => t.status === "open").length,
        mine: tickets.filter((t) => t.mine && t.status !== "snoozed").length,
        snoozed: tickets.filter((t) => t.status === "snoozed").length,
      };
      return `<div class="fx-inbox-tabs">
          <div class="fx-activity-filters" role="tablist">
            ${[["open", "Open"], ["mine", "Mine"], ["snoozed", "Snoozed"]].map(([k, l]) =>
              `<button class="fx-activity-chip" aria-pressed="${filter === k}" data-qtab="${k}">${l} <small>${counts[k]}</small></button>`).join("")}
          </div>
        </div>
        <div class="fx-inbox-list">
          ${tickets.filter(match).map((t) => `
            <button class="fx-ticket ${t === active ? "is-active" : ""}" data-tid="${esc(t.id)}">
              <span class="fx-ticket-top">
                <span class="fx-avatar fx-avatar--sm">${ini(t.requester)}</span>
                <span class="fx-ticket-subject">${esc(t.subject)}</span>
              </span>
              <span class="fx-ticket-snippet">${esc(t.snippet)}</span>
              <span class="fx-ticket-meta">
                <span class="fx-ticket-chan">${esc(t.channel)}</span>
                ${t.due ? `<span data-fx-sla="${t.due}"></span>` : ""}
                <span style="margin-left:auto">${esc(t.time)}</span>
              </span>
            </button>`).join("") || `<p class="fx-text-sm fx-muted" style="padding:1rem">Nothing here.</p>`}
        </div>`;
    }
    function msgHtml(m, fresh) {
      const kind = m.from === "note" ? "note" : m.from;
      const av = `<span class="fx-avatar fx-avatar--sm" style="flex-shrink:0">${ini(m.author)}</span>`;
      return `<div class="fx-msg fx-msg--${kind} ${fresh ? "is-new" : ""}">
          ${kind === "note" ? "" : av}
          <div class="fx-msg-body">
            <span class="fx-msg-meta">${kind === "note" ? '<span class="fx-msg-note-tag">Internal note</span> · ' : ""}<b>${esc(m.author)}</b> · ${esc(m.time)}</span>
            <div class="fx-msg-bubble">${esc(m.body)}</div>
          </div>
        </div>`;
    }
    function mainHtml() {
      if (!active) return `<div class="fx-empty" style="border:0;margin:auto"><div class="fx-empty-title">No ticket selected</div></div>`;
      return `<div class="fx-inbox-head">
          <div class="fx-inbox-head-title">
            <b>${esc(active.subject)}</b>
            <small>${esc(active.requester)} · ${esc(active.company)} · ${esc(active.id)}</small>
          </div>
          ${active.due ? `<span data-fx-sla="${active.due}"></span>` : ""}
          <button class="fx-btn fx-btn--outline fx-btn--sm" data-act="snooze">Snooze</button>
          <button class="fx-btn fx-btn--sm" data-act="resolve">Resolve</button>
        </div>
        <div class="fx-inbox-thread">${active.messages.map((m) => msgHtml(m)).join("")}</div>
        <div class="fx-inbox-composer" data-mode="reply">
          <div class="fx-toggle-group fx-toggle-group--outline" style="align-self:flex-start">
            <button class="fx-toggle" aria-pressed="true" data-vis="reply">Reply</button>
            <button class="fx-toggle" aria-pressed="false" data-vis="note">Internal note</button>
          </div>
          <textarea class="fx-textarea" rows="2" placeholder="Reply to ${esc(active.requester)}…"></textarea>
          <div class="fx-inbox-composer-bar">
            <button class="fx-btn fx-btn--outline fx-btn--icon fx-btn--sm" popovertarget="${id}-macros" data-fx-tip="Insert macro" aria-label="Insert macro">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
            </button>
            <span style="flex:1"></span>
            <button class="fx-btn fx-btn--sm" data-act="send">Send</button>
          </div>
          <div class="fx-menu fx-macro-pop" popover id="${id}-macros">
            <input class="fx-input" placeholder="Search macros…" data-macro-search>
            ${macros.map((mc, i) => `<button class="fx-menu-item fx-macro-item" data-macro="${i}"><b>${esc(mc.name)}</b><small>${esc(mc.body)}</small></button>`).join("")}
          </div>
        </div>`;
    }
    function railHtml() {
      if (!active) return "";
      const c = active.customer || {};
      return `<div class="fx-rail-entity">
          <span class="fx-avatar">${ini(active.requester)}</span>
          <div><b>${esc(active.requester)}</b><small>${esc(c.email || "")}</small></div>
        </div>
        <div>
          <span class="fx-label" style="display:block;margin-bottom:.375rem">Details</span>
          <div class="fx-rail-attrs">
            ${Object.entries(c.attrs || {}).map(([k, v]) => `<div class="fx-rail-attr"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}
          </div>
        </div>
        <div>
          <span class="fx-label" style="display:block;margin-bottom:.375rem">Recent activity</span>
          <div data-rail-activity></div>
        </div>`;
    }
    function render() {
      root.classList.add("fx-inbox");
      root.innerHTML =
        `<div class="fx-inbox-queue">${queueHtml()}</div>
         <div class="fx-inbox-main">${mainHtml()}</div>
         <aside class="fx-inbox-rail">${railHtml()}</aside>`;
      fxSlaTick();
      const railAct = root.querySelector("[data-rail-activity]");
      if (railAct && window.fxActivity && active?.activity) fxActivity(railAct, { events: active.activity, filters: false });
      const thread = root.querySelector(".fx-inbox-thread");
      if (thread) thread.scrollTop = thread.scrollHeight;
    }

    root.addEventListener("click", (e) => {
      const qtab = e.target.closest("[data-qtab]");
      if (qtab) { filter = qtab.dataset.qtab; const vis = tickets.filter(match); if (!vis.includes(active)) active = vis[0]; render(); return; }
      const trow = e.target.closest("[data-tid]");
      if (trow) { active = tickets.find((t) => t.id === trow.dataset.tid); render(); return; }
      const vis = e.target.closest("[data-vis]");
      if (vis) {
        const composer = root.querySelector(".fx-inbox-composer");
        composer.dataset.mode = vis.dataset.vis;
        root.querySelectorAll("[data-vis]").forEach((b) => b.setAttribute("aria-pressed", b === vis));
        composer.querySelector("textarea").placeholder = vis.dataset.vis === "note" ? "Add an internal note (not visible to the customer)…" : `Reply to ${active.requester}…`;
        return;
      }
      const macro = e.target.closest("[data-macro]");
      if (macro) {
        const ta = root.querySelector(".fx-inbox-composer textarea");
        ta.value = macros[+macro.dataset.macro].body.replace("{name}", active.requester.split(" ")[0]);
        macro.closest("[popover]").hidePopover();
        ta.focus();
        return;
      }
      const act = e.target.closest("[data-act]");
      if (act) {
        if (act.dataset.act === "send") {
          const composer = root.querySelector(".fx-inbox-composer");
          const ta = composer.querySelector("textarea");
          if (!ta.value.trim()) return;
          const isNote = composer.dataset.mode === "note";
          const msg = { from: isNote ? "note" : "agent", author: opts.agent || "You", time: "just now", body: ta.value.trim() };
          active.messages.push(msg);
          const thread = root.querySelector(".fx-inbox-thread");
          thread.insertAdjacentHTML("beforeend", msgHtml(msg, true));
          thread.scrollTop = thread.scrollHeight;
          ta.value = "";
        }
        if (act.dataset.act === "resolve") {
          active.status = "resolved";
          if (window.finix) finix.toast({ title: "Ticket resolved", description: active.id + " closed.", variant: "success" });
          const vis2 = tickets.filter(match);
          active = vis2[0] || null;
          render();
        }
        if (act.dataset.act === "snooze") {
          active.status = "snoozed";
          if (window.finix) finix.toast({ title: "Snoozed until tomorrow 9:00", description: active.id });
          const vis2 = tickets.filter(match);
          active = vis2[0] || null;
          render();
        }
      }
    });
    root.addEventListener("input", (e) => {
      if (e.target.matches("[data-macro-search]")) {
        const q = e.target.value.toLowerCase();
        root.querySelectorAll("[data-macro]").forEach((b) => {
          b.hidden = q && !b.textContent.toLowerCase().includes(q);
        });
      }
    });

    render();
    return { get active() { return active; }, render };
  };

  /* ================= CSAT widget ================= */
  document.querySelectorAll("[data-fx-csat]").forEach((box) => {
    box.classList.add("fx-csat");
    const q = box.dataset.fxCsat || "How was your support experience?";
    const FACES = ["\u{1F620}", "\u{1F641}", "\u{1F610}", "\u{1F642}", "\u{1F60D}"];
    box.innerHTML =
      `<div class="fx-csat-q">${q}</div>
       <div class="fx-csat-faces" role="radiogroup" aria-label="Rating">
         ${FACES.map((f, i) => `<button class="fx-csat-face" role="radio" aria-checked="false" data-face="${i + 1}" aria-label="${i + 1} of 5">${f}</button>`).join("")}
       </div>
       <div class="fx-csat-follow" hidden>
         <textarea class="fx-textarea" rows="2" placeholder="Tell us more (optional)…"></textarea>
         <button class="fx-btn fx-btn--sm" data-csat-submit>Submit</button>
       </div>
       <div class="fx-csat-thanks" hidden>
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
         Thanks for the feedback!
       </div>`;
    box.addEventListener("click", (e) => {
      const face = e.target.closest(".fx-csat-face");
      if (face) {
        box.querySelectorAll(".fx-csat-face").forEach((b) => { b.classList.remove("is-sel"); b.setAttribute("aria-checked", "false"); });
        face.classList.add("is-sel");
        face.setAttribute("aria-checked", "true");
        box.querySelector(".fx-csat-follow").hidden = false;
        box.querySelector(".fx-csat-thanks").hidden = true;
        return;
      }
      if (e.target.closest("[data-csat-submit]")) {
        box.querySelector(".fx-csat-follow").hidden = true;
        box.querySelector(".fx-csat-faces").style.pointerEvents = "none";
        box.querySelector(".fx-csat-thanks").hidden = false;
      }
    });
  });
})();
