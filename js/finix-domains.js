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

  /* ================= emoji picker (singleton) ================= */
  const EMOJI = {
    Smileys: [["\u{1F600}","grinning"],["\u{1F602}","joy laugh"],["\u{1F642}","smile"],["\u{1F609}","wink"],["\u{1F60D}","heart eyes love"],["\u{1F929}","star struck"],["\u{1F914}","thinking"],["\u{1F610}","neutral"],["\u{1F634}","sleep"],["\u{1F62E}","wow surprised"],["\u{1F622}","sad cry"],["\u{1F62D}","sob"],["\u{1F624}","angry frustrated"],["\u{1F971}","yawn tired"],["\u{1F605}","sweat relief"],["\u{1F60E}","cool sunglasses"]],
    Gestures: [["\u{1F44D}","thumbs up yes"],["\u{1F44E}","thumbs down no"],["\u{1F44F}","clap"],["\u{1F64C}","raised hands celebrate"],["\u{1F44B}","wave hello"],["\u{1F91D}","handshake deal"],["✌️","peace victory"],["\u{1F91E}","fingers crossed luck"],["\u{1F4AA}","muscle strong"],["\u{1F64F}","pray thanks"]],
    Hearts: [["❤️","red heart love"],["\u{1F9E1}","orange heart"],["\u{1F49B}","yellow heart"],["\u{1F49A}","green heart"],["\u{1F499}","blue heart"],["\u{1F49C}","purple heart"],["\u{1F5A4}","black heart"],["\u{1F496}","sparkling heart"],["\u{1F4AF}","hundred 100"]],
    Objects: [["\u{1F389}","party tada celebrate"],["\u{1F680}","rocket ship launch"],["\u{1F525}","fire hot lit"],["⭐","star"],["✅","check done yes"],["❌","cross no x"],["⚡","zap lightning"],["\u{1F4A1}","idea bulb"],["\u{1F4CC}","pin"],["\u{1F41B}","bug"],["\u{1F440}","eyes looking"],["\u{1F9E0}","brain smart"]],
  };
  let emojiPop = null, emojiCb = null;
  function buildEmojiPop() {
    emojiPop = document.createElement("div");
    emojiPop.className = "fx-emoji-pop";
    emojiPop.innerHTML =
      `<input class="fx-input" placeholder="Search emoji…" data-emoji-search style="height:1.75rem;font-size:.8125rem;margin-bottom:.375rem">
       <div class="fx-emoji-grid">${Object.entries(EMOJI).map(([cat, list]) =>
         `<div class="fx-emoji-cat" data-cat>${cat}</div>` +
         list.map(([e, name]) => `<button class="fx-emoji-btn" data-emoji="${e}" data-name="${name}" title="${name}">${e}</button>`).join("")).join("")}
       </div>`;
    document.body.appendChild(emojiPop);
    emojiPop.addEventListener("click", (e) => {
      const b = e.target.closest("[data-emoji]");
      if (b) { emojiCb?.(b.dataset.emoji); fxEmoji.close(); }
    });
    emojiPop.addEventListener("input", (e) => {
      if (!e.target.matches("[data-emoji-search]")) return;
      const q = e.target.value.toLowerCase();
      emojiPop.querySelectorAll("[data-emoji]").forEach((b) => (b.hidden = q && !b.dataset.name.includes(q)));
      emojiPop.querySelectorAll("[data-cat]").forEach((c) => (c.hidden = !!q));
    });
    document.addEventListener("pointerdown", (e) => {
      if (emojiPop.classList.contains("is-open") && !e.target.closest(".fx-emoji-pop")) fxEmoji.close();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fxEmoji.close(); });
  }
  window.fxEmoji = {
    open(anchor, cb) {
      if (!emojiPop) buildEmojiPop();
      emojiCb = cb;
      const r = anchor.getBoundingClientRect();
      emojiPop.classList.add("is-open");
      const w = emojiPop.offsetWidth, h = emojiPop.offsetHeight;
      let left = Math.min(Math.max(8, r.left), innerWidth - w - 8);
      let top = r.bottom + 6;
      if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
      emojiPop.style.left = left + "px"; emojiPop.style.top = top + "px";
      const inp = emojiPop.querySelector("[data-emoji-search]");
      inp.value = ""; inp.dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(() => inp.focus(), 50);
    },
    close() { emojiPop?.classList.remove("is-open"); emojiCb = null; },
  };

  /* ================= channel messages ================= */
  window.fxMessages = function (root, opts) {
    const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const msgs = opts.messages || [];
    const me = opts.me || "You";
    const ini = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    let uid = 0;
    msgs.forEach((m) => (m._id = ++uid));

    function reactionHtml(m) {
      const entries = Object.entries(m.reactions || {});
      if (!entries.length) return "";
      return `<div class="fx-msg-reactions">${entries.map(([e, r]) =>
        `<button class="fx-reaction ${r.mine ? "is-mine" : ""}" data-react="${e}" data-mid="${m._id}">${e}<small>${r.count}</small></button>`).join("")}</div>`;
    }
    function rowHtml(m, first, fresh) {
      return `<div class="fx-msgrow ${first ? "is-first" : ""} ${fresh ? "fx-msg is-new" : ""}" data-mid="${m._id}">
        ${first
          ? `<span class="fx-avatar fx-avatar--sm">${ini(m.author)}</span>`
          : `<span class="fx-msg-gutter"><span class="fx-msg-hovertime">${esc(m.time)}</span></span>`}
        <div class="fx-msg-content">
          ${first ? `<div class="fx-msg-author"><b>${esc(m.author)}</b><small>${esc(m.time)}</small></div>` : ""}
          <div class="fx-msg-text">${esc(m.body)}</div>
          ${reactionHtml(m)}
          ${m.thread ? `<button class="fx-msg-thread"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20c0-3.87 3.13-7 7-7h11"/><path d="m15 7 6 6-6 6"/></svg>${m.thread} repl${m.thread === 1 ? "y" : "ies"}</button>` : ""}
        </div>
        <div class="fx-chmsg-actions">
          <button data-mact="react" data-fx-tip="Add reaction" aria-label="Add reaction"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg></button>
          <button data-mact="reply" data-fx-tip="Reply in thread" aria-label="Reply in thread"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20c0-3.87 3.13-7 7-7h11"/><path d="m15 7 6 6-6 6"/></svg></button>
          <button data-mact="pin" data-fx-tip="Pin message" aria-label="Pin message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg></button>
        </div>
      </div>`;
    }
    function render() {
      let html = "", prev = null;
      for (const m of msgs) {
        if (m.day !== prev?.day) html += `<div class="fx-msgday"><span>${esc(m.day)}</span></div>`;
        if (m.unreadBefore) html += `<div class="fx-msgunread"><span>New</span></div>`;
        const first = !prev || prev.day !== m.day || prev.author !== m.author || m.unreadBefore;
        html += rowHtml(m, first);
        prev = m;
      }
      root.classList.add("fx-messages");
      root.innerHTML =
        `<div class="fx-messages-scroll">${html}</div>
         <div class="fx-msg-composer">
           <input class="fx-input" placeholder="Message #${esc(opts.channel || "general")}" data-msg-input>
           <button class="fx-btn" data-msg-send>Send</button>
         </div>`;
      const sc = root.querySelector(".fx-messages-scroll");
      sc.scrollTop = sc.scrollHeight;
    }
    function findMsg(el) { return msgs.find((m) => m._id === +el.closest("[data-mid]").dataset.mid); }
    root.addEventListener("click", (e) => {
      const rx = e.target.closest("[data-react]");
      if (rx) {
        const m = findMsg(rx);
        const r = m.reactions[rx.dataset.react];
        if (r.mine) { r.count--; r.mine = false; if (!r.count) delete m.reactions[rx.dataset.react]; }
        else { r.count++; r.mine = true; }
        render();
        return;
      }
      const act = e.target.closest("[data-mact]");
      if (act) {
        const m = findMsg(act);
        if (act.dataset.mact === "react") {
          fxEmoji.open(act, (emoji) => {
            m.reactions = m.reactions || {};
            if (m.reactions[emoji]) { if (!m.reactions[emoji].mine) { m.reactions[emoji].count++; m.reactions[emoji].mine = true; } }
            else m.reactions[emoji] = { count: 1, mine: true };
            render();
          });
        }
        if (act.dataset.mact === "reply") { m.thread = (m.thread || 0) + 1; render(); }
        if (act.dataset.mact === "pin" && window.finix) finix.toast({ title: "Pinned to #" + (opts.channel || "general"), description: m.body.slice(0, 60) });
        return;
      }
      if (e.target.closest("[data-msg-send]")) send();
    });
    root.addEventListener("keydown", (e) => {
      if (e.target.matches("[data-msg-input]") && e.key === "Enter") send();
    });
    function send() {
      const inp = root.querySelector("[data-msg-input]");
      if (!inp.value.trim()) return;
      msgs.push({ _id: ++uid, author: me, day: msgs[msgs.length - 1]?.day || "Today", time: "now", body: inp.value.trim(), reactions: {} });
      render();
      root.querySelector("[data-msg-input]").focus();
    }
    render();
    return { render, get messages() { return msgs; } };
  };

  /* ================= TOC scroll-spy ================= */
  window.fxToc = function (root, opts) {
    const target = typeof opts.target === "string" ? document.querySelector(opts.target) : opts.target;
    const heads = [...target.querySelectorAll("h2, h3")];
    heads.forEach((h, i) => { if (!h.id) h.id = "toc-" + i; });
    root.classList.add("fx-toc");
    root.innerHTML = `<div class="fx-toc-title">${opts.title || "On this page"}</div>` +
      heads.map((h) => `<a href="#${h.id}" class="${h.tagName === "H3" ? "is-sub" : ""}" data-toc="${h.id}">${h.textContent}</a>`).join("");
    const links = new Map(heads.map((h) => [h.id, root.querySelector(`[data-toc="${h.id}"]`)]));
    const setActive = (id) => {
      root.querySelectorAll("a").forEach((a) => a.classList.toggle("is-active", a.dataset.toc === id));
    };
    const scroller = opts.scroller ? (typeof opts.scroller === "string" ? document.querySelector(opts.scroller) : opts.scroller) : null;
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
      const first = heads.find((h) => visible.has(h));
      if (first) setActive(first.id);
    }, { root: scroller, rootMargin: "0px 0px -55% 0px" });
    heads.forEach((h) => io.observe(h));
    root.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-toc]");
      if (!a) return;
      e.preventDefault();
      document.getElementById(a.dataset.toc)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      setActive(a.dataset.toc);
    });
    if (heads[0]) setActive(heads[0].id);
  };

  /* ================= call tiles ================= */
  window.fxCallTiles = function (root, opts = {}) {
    const parts = opts.participants || [];
    let share = opts.screenShare || null;
    let rotate = null;
    const ini = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const MIC_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
    const MIC_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
    const CAM_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
    function tile(p, i, extra) {
      return `<div class="fx-call-tile ${p.speaking ? "is-speaking" : ""} ${extra || ""}" data-ci="${i}"
        style="background:linear-gradient(135deg, color-mix(in oklab, var(--chart-${(i % 5) + 1}) 22%, var(--well)), var(--well))">
        <span class="fx-call-avatar">${ini(p.name)}</span>
        <span class="fx-call-name">${p.name}${p.self ? " (you)" : ""}</span>
        <span class="fx-call-badges">
          <span class="fx-call-badge ${p.muted ? "is-off" : ""}">${p.muted ? MIC_OFF : MIC_ON}</span>
          ${p.camera === false ? `<span class="fx-call-badge is-off">${CAM_OFF}</span>` : ""}
        </span>
      </div>`;
    }
    function render() {
      root.classList.add("fx-call");
      root.classList.toggle("has-share", !!share);
      const others = parts.filter((p) => !p.self);
      const self = parts.find((p) => p.self);
      root.innerHTML =
        `<div class="fx-call-grid">` +
        (share
          ? `<div class="fx-call-share"><div class="fx-call-share-inner">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
               <b>${share.by === "You" ? "You are presenting" : share.by + " is presenting"}</b><span>${share.title || "Screen share"}</span>
             </div></div>
             <div class="fx-call-strip">${others.map((p, i) => tile(p, i)).join("")}</div>`
          : others.map((p, i) => tile(p, i)).join("")) +
        `</div>` +
        (self ? tile(self, parts.indexOf(self), "fx-call-self") : "") +
        `<div class="fx-call-bar">
          <button class="fx-btn fx-btn--outline fx-btn--icon ${self?.muted ? "is-off" : ""}" data-call="mic" data-fx-tip="${self?.muted ? "Unmute" : "Mute"}" aria-label="Toggle microphone">${self?.muted ? MIC_OFF : MIC_ON}</button>
          <button class="fx-btn fx-btn--outline fx-btn--icon ${self?.camera === false ? "is-off" : ""}" data-call="cam" data-fx-tip="Toggle camera" aria-label="Toggle camera"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg></button>
          <button class="fx-btn fx-btn--outline fx-btn--icon ${share ? "is-off" : ""}" data-call="share" data-fx-tip="${share ? "Stop presenting" : "Present screen"}" aria-label="Toggle screen share"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg></button>
          <button class="fx-btn fx-btn--destructive fx-btn--icon" data-call="leave" data-fx-tip="Leave call" aria-label="Leave call"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg></button>
        </div>`;
    }
    function startRotation() {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      rotate = setInterval(() => {
        const eligible = parts.filter((p) => !p.muted);
        if (eligible.length < 2) return;
        const cur = eligible.findIndex((p) => p.speaking);
        parts.forEach((p) => (p.speaking = false));
        eligible[(cur + 1) % eligible.length].speaking = true;
        render();
      }, 2600);
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-call]");
      if (!b) return;
      const self = parts.find((p) => p.self);
      if (b.dataset.call === "mic" && self) { self.muted = !self.muted; if (self.muted) self.speaking = false; render(); }
      if (b.dataset.call === "cam" && self) { self.camera = self.camera === false ? true : false; render(); }
      if (b.dataset.call === "share") { share = share ? null : { by: "You", title: "Q3 metrics — dashboard" }; render(); }
      if (b.dataset.call === "leave") {
        clearInterval(rotate);
        root.innerHTML = `<div class="fx-empty" style="min-height:14rem"><div class="fx-empty-title">You left the call</div><div class="fx-empty-desc">The meeting continues without you.</div><div class="fx-empty-actions"><button class="fx-btn" data-call="rejoin">Rejoin</button></div></div>`;
        root.classList.remove("has-share");
      }
      if (b.dataset.call === "rejoin") { render(); startRotation(); }
    });
    render();
    startRotation();
    return { render, get participants() { return parts; } };
  };

  /* ================= payment form behaviors ================= */
  const PAY_BRANDS = {
    generic: '<svg viewBox="0 0 28 18" fill="none"><rect x=".5" y=".5" width="27" height="17" rx="2.5" stroke="currentColor" opacity=".4"/><rect x="3" y="4" width="7" height="5" rx="1" fill="currentColor" opacity=".35"/></svg>',
    visa: '<svg viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#1A1F71"/><text x="14" y="12.5" text-anchor="middle" font-family="Arial" font-style="italic" font-weight="bold" font-size="7.5" fill="#fff">VISA</text></svg>',
    mastercard: '<svg viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#252525"/><circle cx="11.5" cy="9" r="5" fill="#EB001B"/><circle cx="16.5" cy="9" r="5" fill="#F79E1B" fill-opacity=".9"/></svg>',
    amex: '<svg viewBox="0 0 28 18"><rect width="28" height="18" rx="3" fill="#2E77BC"/><text x="14" y="11.5" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="6" fill="#fff">AMEX</text></svg>',
  };
  document.addEventListener("input", (e) => {
    const inp = e.target.closest("[data-pay-number]");
    if (!inp) return;
    const first = inp.value.replace(/\D/g, "")[0];
    const brand = first === "4" ? "visa" : first === "5" ? "mastercard" : first === "3" ? "amex" : "generic";
    const box = inp.closest(".fx-payment");
    const slot = box?.querySelector(".fx-pay-brand");
    if (slot && box.dataset.brand !== brand) {
      box.dataset.brand = brand;
      slot.innerHTML = PAY_BRANDS[brand];
      slot.classList.remove("is-pop");
      void slot.offsetWidth;
      slot.classList.add("is-pop");
    }
  });
  document.addEventListener("click", (e) => {
    const pay = e.target.closest("[data-pay-submit]");
    if (pay && !pay.dataset.state) {
      const box = pay.closest(".fx-payment");
      if (window.finix?.buttonState) finix.buttonState(pay, "loading");
      setTimeout(() => {
        if (window.finix?.buttonState) finix.buttonState(pay, "success");
        setTimeout(() => {
          box.querySelector(".fx-pay-form")?.setAttribute("hidden", "");
          box.querySelector(".fx-pay-wallets")?.setAttribute("hidden", "");
          box.querySelector(".fx-pay-divider")?.setAttribute("hidden", "");
          box.querySelector(".fx-pay-success")?.removeAttribute("hidden");
        }, 700);
      }, 1400);
      return;
    }
    const wallet = e.target.closest(".fx-pay-wallet");
    if (wallet && window.finix) finix.toast({ title: wallet.textContent.trim() + " sheet", description: "The wallet payment sheet would open here." });
    const reset = e.target.closest("[data-pay-reset]");
    if (reset) {
      const box = reset.closest(".fx-payment");
      box.querySelector(".fx-pay-form")?.removeAttribute("hidden");
      box.querySelector(".fx-pay-wallets")?.removeAttribute("hidden");
      box.querySelector(".fx-pay-divider")?.removeAttribute("hidden");
      box.querySelector(".fx-pay-success")?.setAttribute("hidden", "");
      const btn = box.querySelector("[data-pay-submit]");
      if (btn && window.finix?.buttonState) finix.buttonState(btn, "reset");
    }
  });
})();
