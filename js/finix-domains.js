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
})();
