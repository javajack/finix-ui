/*!
 * finix-ui · finix.js — vanilla behavior layer (no dependencies)
 * Data-attribute driven; safe to load once per page (defer).
 * Public API: window.finix { toast, setTheme, setBrand, openDialog, closeDialog }
 */
(function () {
  "use strict";
  const doc = document;
  const $ = (sel, root) => (root || doc).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || doc).querySelectorAll(sel));

  /* ================= theme manager ================= */
  const root = doc.documentElement;
  function setTheme(mode) {
    root.dataset.theme = mode;
    try { localStorage.setItem("fx-theme", mode); } catch (e) {}
    doc.dispatchEvent(new CustomEvent("fx:theme", { detail: { mode } }));
  }
  function setBrand(brand) {
    root.dataset.brand = brand;
    try { localStorage.setItem("fx-brand", brand); } catch (e) {}
    doc.dispatchEvent(new CustomEvent("fx:brand", { detail: { brand } }));
  }
  // initial stamp happens inline in <head>; this is a safety net
  if (!root.dataset.theme) {
    let saved = null;
    try { saved = localStorage.getItem("fx-theme"); } catch (e) {}
    setThemeAttrOnly(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }
  function setThemeAttrOnly(m) { root.dataset.theme = m; }

  /* ================= positioning util ================= */
  function place(el, anchor, side = "bottom", align = "start", gap = 6) {
    const a = anchor.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    let top, left;
    if (side === "bottom" && a.bottom + gap + r.height > vh && a.top - gap - r.height > 0) side = "top";
    else if (side === "top" && a.top - gap - r.height < 0) side = "bottom";
    if (side === "bottom") top = a.bottom + gap;
    else if (side === "top") top = a.top - gap - r.height;
    else top = a.top + (a.height - r.height) / 2;
    if (side === "left") left = a.left - gap - r.width;
    else if (side === "right") left = a.right + gap;
    else {
      if (align === "start") left = a.left;
      else if (align === "end") left = a.right - r.width;
      else left = a.left + (a.width - r.width) / 2;
    }
    left = Math.max(8, Math.min(left, vw - r.width - 8));
    top = Math.max(8, Math.min(top, vh - r.height - 8));
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.dataset.side = side;
  }

  /* ================= popover menus / popovers ================= */
  // remember which button invoked which popover (for positioning)
  doc.addEventListener("click", (e) => {
    const btn = e.target.closest("[popovertarget]");
    if (btn) {
      const pop = doc.getElementById(btn.getAttribute("popovertarget"));
      if (pop) pop.__fxAnchor = btn;
    }
  }, true);

  doc.addEventListener("toggle", (e) => {
    const el = e.target;
    if (!(el.matches && el.matches(".fx-menu[popover], .fx-popover[popover]"))) return;
    if (e.newState === "open") {
      const anchor = el.__fxAnchor || $(`[popovertarget="${el.id}"]`);
      if (anchor) place(el, anchor, el.dataset.fxSide || "bottom", el.dataset.fxAlign || "start");
      // focus first item for keyboard nav in menus
      if (el.classList.contains("fx-menu")) {
        const first = $(".fx-menu-item", el);
        if (first) first.focus({ preventScroll: true });
      }
    }
  }, true);

  // menu item activation closes its popover (unless opting out)
  doc.addEventListener("click", (e) => {
    const item = e.target.closest(".fx-menu .fx-menu-item");
    if (!item || item.hasAttribute("data-fx-keep-open")) return;
    const pop = item.closest("[popover]");
    if (pop) pop.hidePopover();
  });

  // arrow-key nav inside menus
  doc.addEventListener("keydown", (e) => {
    const menu = e.target.closest(".fx-menu[popover]");
    if (!menu || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    const items = $$(".fx-menu-item:not([aria-disabled='true'])", menu);
    const i = items.indexOf(doc.activeElement);
    const next = e.key === "ArrowDown" ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
    if (next) next.focus();
  });

  /* ================= tooltips ================= */
  let tipEl = null, tipTimer = null;
  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = doc.createElement("div");
    tipEl.className = "fx-tooltip";
    tipEl.setAttribute("popover", "manual");
    doc.body.appendChild(tipEl);
    return tipEl;
  }
  function showTip(target) {
    const text = target.getAttribute("data-fx-tip");
    if (!text) return;
    const el = ensureTip();
    el.textContent = text;
    try { el.showPopover(); } catch (err) {}
    place(el, target, target.dataset.fxTipSide || "top", "center", 8);
  }
  function hideTip() {
    clearTimeout(tipTimer);
    if (tipEl && tipEl.matches(":popover-open")) tipEl.hidePopover();
  }
  doc.addEventListener("mouseenter", (e) => {
    const t = e.target.closest && e.target.closest("[data-fx-tip]");
    if (!t) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(t), 150);
  }, true);
  doc.addEventListener("mouseleave", (e) => {
    if (e.target.closest && e.target.closest("[data-fx-tip]")) hideTip();
  }, true);
  doc.addEventListener("focusin", (e) => {
    const t = e.target.closest("[data-fx-tip]");
    if (t) showTip(t);
  });
  doc.addEventListener("focusout", hideTip);

  /* ================= dialogs / sheets / drawers ================= */
  function openDialog(sel) {
    const d = typeof sel === "string" ? $(sel) : sel;
    if (d && !d.open) d.showModal();
    return d;
  }
  function closeDialog(sel) {
    const d = typeof sel === "string" ? $(sel) : sel;
    if (d && d.open) d.close();
  }
  doc.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-fx-open]");
    if (opener) { e.preventDefault(); openDialog(opener.getAttribute("data-fx-open")); return; }
    const closer = e.target.closest("[data-fx-close]");
    if (closer) { const d = closer.closest("dialog"); if (d) d.close(); return; }
    // backdrop click closes
    if (e.target instanceof HTMLDialogElement && e.target.open) {
      const r = e.target.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) e.target.close();
    }
  });

  /* ================= tabs ================= */
  function activateTab(tab) {
    const list = tab.closest(".fx-tablist");
    if (!list) return;
    $$("[role='tab']", list).forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      const panel = t.getAttribute("aria-controls") && doc.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    tab.focus({ preventScroll: true });
  }
  doc.addEventListener("click", (e) => {
    const tab = e.target.closest(".fx-tablist [role='tab']");
    if (tab) activateTab(tab);
  });
  doc.addEventListener("keydown", (e) => {
    const tab = e.target.closest(".fx-tablist [role='tab']");
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const tabs = $$("[role='tab']", tab.closest(".fx-tablist"));
    const i = tabs.indexOf(tab);
    let next;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else next = tabs[tabs.length - 1];
    activateTab(next);
  });
  // initialize tab panels
  $$(".fx-tablist").forEach((list) => {
    $$("[role='tab']", list).forEach((t) => {
      const on = t.getAttribute("aria-selected") === "true";
      t.tabIndex = on ? 0 : -1;
      const panel = t.getAttribute("aria-controls") && doc.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
  });

  /* ================= command palette ================= */
  const cmd = $("dialog.fx-cmd");
  if (cmd) {
    const input = $(".fx-cmd-input", cmd);
    const list = $(".fx-cmd-list", cmd);
    const empty = $(".fx-cmd-empty", cmd);
    function items() { return $$(".fx-menu-item", list); }
    function visibleItems() { return items().filter((i) => !i.hidden); }
    function select(el) {
      items().forEach((i) => i.setAttribute("aria-selected", i === el ? "true" : "false"));
      if (el) el.scrollIntoView({ block: "nearest" });
    }
    /* v2: fuzzy subsequence matching with word-boundary bonus + recents */
    function fuzzy(q, text) {
      q = q.toLowerCase(); text = text.toLowerCase();
      let qi = 0, score = 0, streak = 0;
      for (let i = 0; i < text.length && qi < q.length; i++) {
        if (text[i] === q[qi]) {
          qi++; streak++;
          score += 1 + streak * 2 + (i === 0 || text[i - 1] === " " || text[i - 1] === ":" ? 8 : 0);
        } else streak = 0;
      }
      return qi === q.length ? score : -1;
    }
    function getRecents() {
      try { return JSON.parse(localStorage.getItem("fx-cmd-recents") || "[]"); } catch (e) { return []; }
    }
    function pushRecent(label) {
      const r = getRecents().filter((x) => x !== label);
      r.unshift(label);
      try { localStorage.setItem("fx-cmd-recents", JSON.stringify(r.slice(0, 5))); } catch (e) {}
    }
    function renderRecents() {
      let host = $("#fx-cmd-recents", list);
      if (host) host.remove();
      const rec = getRecents();
      if (!rec.length || input.value.trim()) return;
      host = doc.createElement("div");
      host.id = "fx-cmd-recents";
      host.setAttribute("data-fx-cmd-group", "");
      host.innerHTML = `<div class="fx-cmd-group-label">Recent</div>`;
      rec.forEach((label) => {
        const orig = $$(".fx-menu-item", list).find((i) => !i.closest("#fx-cmd-recents") && itemLabel(i) === label);
        if (orig) host.appendChild(orig.cloneNode(true));
      });
      if ($$(".fx-menu-item", host).length) list.prepend(host);
    }
    function itemLabel(i) {
      const c = i.cloneNode(true);
      c.querySelectorAll(".fx-menu-shortcut, svg, i").forEach((n) => n.remove());
      return c.textContent.trim();
    }
    list.addEventListener("click", (e) => {
      const it = e.target.closest(".fx-menu-item");
      if (it) pushRecent(itemLabel(it));
    }, true);
    function filter() {
      const q = input.value.trim();
      let any = false;
      const scored = [];
      items().forEach((i) => {
        if (i.closest("#fx-cmd-recents")) { i.hidden = !!q; return; }
        const s = q ? fuzzy(q, i.textContent) : 0;
        i.hidden = s < 0;
        if (s >= 0) { any = true; scored.push([s, i]); }
      });
      if (q) {
        // reorder within each group by score, best first
        scored.sort((a, b) => b[0] - a[0]);
        const byParent = new Map();
        scored.forEach(([s, i]) => {
          if (!byParent.has(i.parentNode)) byParent.set(i.parentNode, []);
          byParent.get(i.parentNode).push(i);
        });
        byParent.forEach((els, parent) => els.forEach((el) => parent.appendChild(el)));
      }
      renderRecents();
      $$("[data-fx-cmd-group]", list).forEach((g) => {
        g.hidden = !$$(".fx-menu-item", g).some((i) => !i.hidden);
      });
      if (empty) empty.hidden = any;
      select(visibleItems()[0] || null);
    }
    input.addEventListener("input", filter);
    input.addEventListener("keydown", (e) => {
      const vis = visibleItems();
      const cur = vis.findIndex((i) => i.getAttribute("aria-selected") === "true");
      if (e.key === "ArrowDown") { e.preventDefault(); select(vis[(cur + 1) % vis.length]); }
      else if (e.key === "ArrowUp") { e.preventDefault(); select(vis[(cur - 1 + vis.length) % vis.length]); }
      else if (e.key === "Enter") { e.preventDefault(); const el = vis[cur]; if (el) el.click(); cmd.close(); }
    });
    doc.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (cmd.open) cmd.close();
        else { openDialog(cmd); input.value = ""; filter(); input.focus(); }
      }
    });
    cmd.addEventListener("close", () => { input.value = ""; });
    filter();
  }

  /* ================= combobox / custom select ================= */
  $$(".fx-combobox").forEach((box) => {
    const trigger = $(".fx-combo-trigger", box);
    const pop = $("[popover]", box);
    if (!trigger || !pop) return;
    const valueEl = $(".fx-combo-value", trigger);
    const search = $(".fx-combo-search input", pop);
    const options = () => $$(".fx-menu-item", pop);

    pop.addEventListener("toggle", (e) => {
      if (e.newState === "open") {
        place(pop, trigger, "bottom", "start");
        pop.style.minWidth = trigger.getBoundingClientRect().width + "px";
        if (search) { search.value = ""; filterOptions(""); search.focus(); }
      }
    });
    function filterOptions(q) {
      q = q.toLowerCase();
      options().forEach((o) => { o.hidden = q && !o.textContent.toLowerCase().includes(q); });
    }
    if (search) search.addEventListener("input", () => filterOptions(search.value.trim()));
    pop.addEventListener("click", (e) => {
      const opt = e.target.closest(".fx-menu-item");
      if (!opt) return;
      options().forEach((o) => o.setAttribute("aria-selected", o === opt ? "true" : "false"));
      if (valueEl) { valueEl.textContent = opt.dataset.value || opt.textContent.trim(); valueEl.removeAttribute("data-placeholder"); }
      box.dispatchEvent(new CustomEvent("fx:select", { detail: { value: opt.dataset.value || opt.textContent.trim() }, bubbles: true }));
    });
  });

  /* ================= OTP input ================= */
  $$(".fx-otp").forEach((otp) => {
    const inputs = $$("input", otp);
    inputs.forEach((inp, i) => {
      inp.maxLength = 1;
      inp.setAttribute("inputmode", inp.getAttribute("inputmode") || "numeric");
      inp.addEventListener("input", () => {
        inp.value = inp.value.slice(-1);
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
        if (e.key === "ArrowLeft" && inputs[i - 1]) inputs[i - 1].focus();
        if (e.key === "ArrowRight" && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
        inputs.slice(i).forEach((f, j) => { if (text[j]) f.value = text[j]; });
        const last = Math.min(i + text.length, inputs.length - 1);
        inputs[last].focus();
      });
    });
  });

  /* ================= tags input ================= */
  $$(".fx-tags").forEach((wrap) => {
    const input = $("input", wrap);
    if (!input) return;
    function addTag(text) {
      text = text.trim();
      if (!text) return;
      const tag = doc.createElement("span");
      tag.className = "fx-tag";
      tag.append(text);
      const x = doc.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Remove " + text);
      x.innerHTML = "<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg>";
      x.addEventListener("click", () => tag.remove());
      tag.appendChild(x);
      wrap.insertBefore(tag, input);
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input.value); input.value = ""; }
      else if (e.key === "Backspace" && !input.value) {
        const last = input.previousElementSibling;
        if (last && last.classList.contains("fx-tag")) last.remove();
      }
    });
    wrap.addEventListener("click", () => input.focus());
  });

  /* ================= slider fill ================= */
  function paintSlider(s) {
    const min = +s.min || 0, max = +s.max || 100;
    s.style.setProperty("--fx-fill", ((+s.value - min) / (max - min)) * 100 + "%");
  }
  $$(".fx-slider").forEach((s) => {
    paintSlider(s);
    s.addEventListener("input", () => paintSlider(s));
  });

  /* ================= rating ================= */
  $$(".fx-rating").forEach((r) => {
    const btns = $$("button", r);
    function set(n) { btns.forEach((b, i) => b.classList.toggle("is-on", i < n)); r.dataset.value = n; }
    set(+r.dataset.value || 0);
    btns.forEach((b, i) => b.addEventListener("click", () => set(i + 1)));
  });

  /* ================= table: sort / filter / select-all ================= */
  doc.addEventListener("click", (e) => {
    const btn = e.target.closest(".fx-th-sort");
    if (!btn) return;
    const th = btn.closest("th");
    const table = th.closest("table");
    const idx = Array.from(th.parentNode.children).indexOf(th);
    const dir = btn.dataset.dir === "asc" ? "desc" : "asc";
    $$(".fx-th-sort", table).forEach((b) => delete b.dataset.dir);
    btn.dataset.dir = dir;
    const tbody = $("tbody", table);
    const rows = $$("tr", tbody);
    rows.sort((a, b) => {
      const av = (a.children[idx].dataset.sort ?? a.children[idx].textContent).trim();
      const bv = (b.children[idx].dataset.sort ?? b.children[idx].textContent).trim();
      const an = parseFloat(av.replace(/[^0-9.-]/g, "")), bn = parseFloat(bv.replace(/[^0-9.-]/g, ""));
      const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : av.localeCompare(bv);
      return dir === "asc" ? cmp : -cmp;
    });
    rows.forEach((r) => tbody.appendChild(r));
  });

  $$("[data-fx-table-filter]").forEach((input) => {
    const table = $(input.getAttribute("data-fx-table-filter"));
    if (!table) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $$("tbody tr", table).forEach((r) => { r.hidden = q && !r.textContent.toLowerCase().includes(q); });
    });
  });

  doc.addEventListener("change", (e) => {
    const all = e.target.closest("[data-fx-select-all]");
    if (all) {
      const table = all.closest("table");
      $$("tbody .fx-checkbox", table).forEach((c) => { c.checked = all.checked; });
    }
  });

  /* ================= kanban drag & drop ================= */
  $$(".fx-kanban").forEach((board) => {
    let dragging = null;
    board.addEventListener("dragstart", (e) => {
      const card = e.target.closest(".fx-kanban-card");
      if (!card) return;
      dragging = card;
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    board.addEventListener("dragend", () => {
      if (dragging) dragging.classList.remove("is-dragging");
      dragging = null;
      $$(".fx-kanban-col", board).forEach((c) => c.classList.remove("is-over"));
    });
    board.addEventListener("dragover", (e) => {
      const col = e.target.closest(".fx-kanban-col");
      if (!col || !dragging) return;
      e.preventDefault();
      $$(".fx-kanban-col", board).forEach((c) => c.classList.toggle("is-over", c === col));
      const after = $$(".fx-kanban-card:not(.is-dragging)", col).find((c) => e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
      if (after) col.insertBefore(dragging, after);
      else col.appendChild(dragging);
    });
    $$(".fx-kanban-card", board).forEach((c) => (c.draggable = true));
  });

  /* ================= toast ================= */
  function toaster() {
    let t = $(".fx-toaster");
    if (!t) { t = doc.createElement("div"); t.className = "fx-toaster"; doc.body.appendChild(t); }
    return t;
  }
  const TOAST_ICONS = {
    success: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='m9 12 2 2 4-4'/></svg>",
    destructive: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 8v4M12 16h.01'/></svg>",
    warning: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/><path d='M12 9v4M12 17h.01'/></svg>",
  };
  function toast(opts) {
    if (typeof opts === "string") opts = { title: opts };
    const t = doc.createElement("div");
    t.className = "fx-toast" + (opts.variant ? " fx-toast--" + opts.variant : "");
    if (opts.variant && TOAST_ICONS[opts.variant]) t.innerHTML += TOAST_ICONS[opts.variant];
    const title = doc.createElement("div");
    title.className = "fx-toast-title";
    title.textContent = opts.title || "";
    t.appendChild(title);
    if (opts.description) {
      const d = doc.createElement("div");
      d.className = "fx-toast-desc";
      d.textContent = opts.description;
      t.appendChild(d);
    }
    if (opts.action) {
      const b = doc.createElement("button");
      b.className = "fx-btn fx-btn--outline fx-btn--sm fx-toast-action";
      b.textContent = opts.action.label;
      b.addEventListener("click", () => { if (opts.action.onClick) opts.action.onClick(); dismiss(); });
      t.appendChild(b);
    }
    toaster().appendChild(t);
    let timer = setTimeout(dismiss, opts.duration || 4500);
    function dismiss() {
      clearTimeout(timer);
      t.classList.add("is-leaving");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }
    t.addEventListener("click", (e) => { if (!e.target.closest("button")) dismiss(); });
    return { dismiss };
  }

  /* ================= number ticker ================= */
  const tickerIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting || en.target.__fxTicked) return;
      en.target.__fxTicked = true;
      const el = en.target;
      const raw = el.dataset.fxTicker || el.textContent;
      const target = parseFloat(raw.replace(/[^0-9.-]/g, "")) || 0;
      const prefix = raw.match(/^[^0-9-]*/)[0];
      const suffix = raw.match(/[^0-9.]*$/)[0];
      const decimals = (raw.split(".")[1] || "").replace(/\D/g, "").length;
      const dur = 900, start = performance.now();
      function frame(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }, { threshold: 0.4 });
  $$("[data-fx-ticker]").forEach((el) => tickerIO.observe(el));

  /* ================= bar list / progress circle init ================= */
  $$(".fx-barlist-bar[data-w]").forEach((b) => {
    requestAnimationFrame(() => b.style.setProperty("--fx-w", b.dataset.w + "%"));
  });
  $$(".fx-progress-circle[data-value]").forEach((pc) => {
    const fill = $(".fill", pc);
    if (!fill) return;
    const r = +fill.getAttribute("r");
    const c = 2 * Math.PI * r;
    fill.setAttribute("stroke-dasharray", c);
    fill.setAttribute("stroke-dashoffset", c);
    requestAnimationFrame(() => fill.setAttribute("stroke-dashoffset", c * (1 - (+pc.dataset.value / 100))));
  });

  /* ================= calendar / date picker ================= */
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  $$("[data-fx-calendar]").forEach((cal) => {
    let view = new Date();
    let selected = null;
    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      cal.innerHTML = "";
      const head = doc.createElement("div");
      head.className = "fx-cal-header";
      head.innerHTML = `<div class="fx-cal-month">${MONTHS[m]} ${y}</div>`;
      const nav = doc.createElement("div");
      nav.className = "fx-cal-nav";
      const mk = (dir, path) => {
        const b = doc.createElement("button");
        b.className = "fx-btn fx-btn--outline fx-btn--icon fx-btn--sm";
        b.type = "button";
        b.setAttribute("aria-label", dir > 0 ? "Next month" : "Previous month");
        b.innerHTML = `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='${path}'/></svg>`;
        b.addEventListener("click", () => { view = new Date(y, m + dir, 1); render(); });
        return b;
      };
      nav.append(mk(-1, "m15 18-6-6 6-6"), mk(1, "m9 18 6-6-6-6"));
      head.appendChild(nav);
      cal.appendChild(head);
      const grid = doc.createElement("div");
      grid.className = "fx-cal-grid";
      DOW.forEach((d) => { const s = doc.createElement("div"); s.className = "fx-cal-dow"; s.textContent = d; grid.appendChild(s); });
      const first = new Date(y, m, 1);
      const startDay = first.getDay();
      const today = new Date();
      for (let i = 0; i < 42; i++) {
        const d = new Date(y, m, i - startDay + 1);
        const b = doc.createElement("button");
        b.type = "button";
        b.className = "fx-cal-day";
        b.textContent = d.getDate();
        if (d.getMonth() !== m) b.classList.add("is-outside");
        if (d.toDateString() === today.toDateString()) b.classList.add("is-today");
        if (selected && d.toDateString() === selected.toDateString()) b.setAttribute("aria-selected", "true");
        b.addEventListener("click", () => {
          selected = d;
          render();
          const inputSel = cal.dataset.fxCalInput;
          if (inputSel) {
            const inp = $(inputSel);
            if (inp) inp.value = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
          }
          cal.dispatchEvent(new CustomEvent("fx:date", { detail: { date: d }, bubbles: true }));
        });
        grid.appendChild(b);
      }
      cal.appendChild(grid);
    }
    render();
  });

  /* ================= misc controls ================= */
  doc.addEventListener("click", (e) => {
    const themeBtn = e.target.closest("[data-fx-toggle-theme]");
    if (themeBtn) setTheme(root.dataset.theme === "dark" ? "light" : "dark");

    const brandBtn = e.target.closest("[data-fx-set-brand]");
    if (brandBtn) setBrand(brandBtn.getAttribute("data-fx-set-brand"));

    const modeBtn = e.target.closest("[data-fx-set-theme]");
    if (modeBtn) setTheme(modeBtn.getAttribute("data-fx-set-theme"));

    const sideBtn = e.target.closest("[data-fx-sidebar-toggle]");
    if (sideBtn) {
      const shell = $(".fx-shell");
      if (shell) shell.dataset.sidebar = shell.dataset.sidebar === "collapsed" ? "" : "collapsed";
    }

    const copyBtn = e.target.closest("[data-fx-copy]");
    if (copyBtn) {
      navigator.clipboard.writeText(copyBtn.getAttribute("data-fx-copy")).then(() => {
        toast({ title: "Copied to clipboard", variant: "success", duration: 2000 });
      });
    }

    const pressBtn = e.target.closest(".fx-toggle[aria-pressed]");
    if (pressBtn && !pressBtn.closest(".fx-toggle-group[data-fx-single]")) {
      pressBtn.setAttribute("aria-pressed", pressBtn.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }
    const groupBtn = e.target.closest(".fx-toggle-group[data-fx-single] .fx-toggle");
    if (groupBtn) {
      $$(".fx-toggle", groupBtn.closest(".fx-toggle-group")).forEach((t) => t.setAttribute("aria-pressed", t === groupBtn ? "true" : "false"));
    }
  });

  /* ================= public API ================= */
  window.finix = { toast, setTheme, setBrand, openDialog, closeDialog, place };
})();

/* ====================================================================
   finix.js · Tier 1 additions — advanced inputs & app flows
   number field · password strength · input mask · phone input ·
   multi-select combobox · date-range calendar · dropzone · sortable ·
   confirm-typing · stacked dialog offsets
   ==================================================================== */
(function () {
  "use strict";
  const doc = document;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));

  /* ---------- number field ---------- */
  $$(".fx-numberfield").forEach((nf) => {
    const inp = $("input", nf);
    const step = parseFloat(inp.step) || 1;
    const clamp = (v) => {
      if (inp.min !== "" && v < +inp.min) v = +inp.min;
      if (inp.max !== "" && v > +inp.max) v = +inp.max;
      return v;
    };
    nf.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-step]");
      if (!b) return;
      const v = clamp((parseFloat(inp.value) || 0) + step * +b.dataset.step);
      inp.value = +v.toFixed(6);
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    });
    inp.addEventListener("blur", () => { const v = parseFloat(inp.value); if (!isNaN(v)) inp.value = clamp(v); });
  });

  /* ---------- password visibility + strength ---------- */
  doc.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fx-password-toggle]");
    if (!btn) return;
    const input = $(btn.getAttribute("data-fx-password-toggle"));
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.classList.toggle("is-showing", show);
  });
  $$("input[data-fx-strength]").forEach((inp) => {
    const meter = $(inp.getAttribute("data-fx-strength"));
    if (!meter) return;
    const label = meter.parentElement.querySelector(".fx-strength-label");
    const NAMES = ["Too weak", "Too weak", "Weak", "Good", "Strong"];
    inp.addEventListener("input", () => {
      const v = inp.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      if (v.length === 0) s = 0;
      meter.dataset.score = s;
      if (label) label.textContent = v.length ? NAMES[s] + " password" : "Use 8+ chars with mixed case, numbers & symbols";
    });
  });

  /* ---------- input mask (9=digit, a=letter, *=any) ---------- */
  $$("input[data-fx-mask]").forEach((inp) => {
    const mask = inp.getAttribute("data-fx-mask");
    inp.placeholder = inp.placeholder || mask.replace(/9/g, "0").replace(/a/g, "x");
    inp.addEventListener("input", () => {
      const raw = inp.value.replace(/[^0-9a-zA-Z]/g, "").split("");
      let out = "";
      for (const mc of mask) {
        if (!raw.length) break;
        if (mc === "9") { while (raw.length && !/\d/.test(raw[0])) raw.shift(); if (raw.length) out += raw.shift(); }
        else if (mc === "a") { while (raw.length && !/[a-zA-Z]/.test(raw[0])) raw.shift(); if (raw.length) out += raw.shift(); }
        else if (mc === "*") out += raw.shift();
        else out += mc;
      }
      inp.value = out;
    });
  });

  /* ---------- phone input ---------- */
  const COUNTRIES = [
    ["IN", "🇮🇳", "+91"], ["US", "🇺🇸", "+1"], ["GB", "🇬🇧", "+44"], ["DE", "🇩🇪", "+49"],
    ["FR", "🇫🇷", "+33"], ["JP", "🇯🇵", "+81"], ["AU", "🇦🇺", "+61"], ["BR", "🇧🇷", "+55"],
    ["AE", "🇦🇪", "+971"], ["SG", "🇸🇬", "+65"], ["CA", "🇨🇦", "+1"], ["NL", "🇳🇱", "+31"],
  ];
  let phoneUid = 0;
  $$("[data-fx-phone]").forEach((group) => {
    const id = "fxph" + (++phoneUid);
    const input = $("input", group);
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "fx-phone-cc";
    btn.setAttribute("popovertarget", id);
    btn.innerHTML = `<span class="fx-phone-flag">🇮🇳</span><span class="fx-phone-code">+91</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
    group.prepend(btn);
    const menu = doc.createElement("div");
    menu.className = "fx-menu";
    menu.setAttribute("popover", "");
    menu.id = id;
    menu.innerHTML = COUNTRIES.map(([cc, flag, dial]) =>
      `<button class="fx-menu-item" data-dial="${dial}" data-flag="${flag}"><span>${flag}</span>${cc}<span class="fx-menu-shortcut">${dial}</span></button>`).join("");
    doc.body.appendChild(menu);
    menu.addEventListener("click", (e) => {
      const item = e.target.closest("[data-dial]");
      if (!item) return;
      $(".fx-phone-flag", btn).textContent = item.dataset.flag;
      $(".fx-phone-code", btn).textContent = item.dataset.dial;
      input.focus();
    });
    input.addEventListener("input", () => {
      const d = input.value.replace(/\D/g, "").slice(0, 12);
      input.value = d.replace(/(\d{5})(?=\d)/g, "$1 ");
    });
  });

  /* ---------- multi-select combobox ---------- */
  $$(".fx-combobox[data-fx-multi]").forEach((box) => {
    const trigger = $(".fx-combo-trigger", box);
    const pop = $("[popover]", box);
    const placeholder = $(".fx-combo-value", trigger);
    trigger.classList.add("fx-combo-trigger--multi");
    const selected = new Set();
    function renderChips() {
      $$(".fx-tag", trigger).forEach((t) => t.remove());
      placeholder.hidden = selected.size > 0;
      [...selected].forEach((v) => {
        const tag = doc.createElement("span");
        tag.className = "fx-tag";
        tag.append(v);
        const x = doc.createElement("button");
        x.type = "button";
        x.setAttribute("aria-label", "Remove " + v);
        x.innerHTML = "<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg>";
        x.addEventListener("click", (e) => {
          e.stopPropagation();
          selected.delete(v);
          const opt = $$(".fx-menu-item", pop).find((o) => (o.dataset.value || o.textContent.trim()) === v);
          if (opt) { opt.setAttribute("aria-selected", "false"); const cb = $("input", opt); if (cb) cb.checked = false; }
          renderChips();
        });
        tag.appendChild(x);
        trigger.insertBefore(tag, placeholder);
      });
      box.dispatchEvent(new CustomEvent("fx:multiselect", { detail: { values: [...selected] }, bubbles: true }));
    }
    pop.addEventListener("click", (e) => {
      const opt = e.target.closest(".fx-menu-item");
      if (!opt) return;
      e.stopPropagation();
      e.preventDefault();
      const v = opt.dataset.value || opt.textContent.trim();
      const cb = $("input[type=checkbox]", opt);
      if (selected.has(v)) { selected.delete(v); if (cb) cb.checked = false; opt.setAttribute("aria-selected", "false"); }
      else { selected.add(v); if (cb) cb.checked = true; opt.setAttribute("aria-selected", "true"); }
      renderChips();
    }, true);
  });

  /* ---------- date-range calendar ---------- */
  const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DW = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  $$("[data-fx-calendar-range]").forEach((rootEl) => {
    let view = new Date();
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    let start = null, end = null;
    const outSel = rootEl.dataset.fxCalInput;
    function fmt(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
    function output() {
      if (outSel && start && end) {
        const el = $(outSel);
        if (el) el[el.tagName === "INPUT" ? "value" : "textContent"] = `${fmt(start)} – ${fmt(end)}`;
      }
      if (start && end) rootEl.dispatchEvent(new CustomEvent("fx:range", { detail: { start, end }, bubbles: true }));
    }
    function setRange(s, e) { start = day0(s); end = day0(e); view = new Date(start.getFullYear(), start.getMonth(), 1); render(); output(); }
    function monthGrid(base) {
      const y = base.getFullYear(), m = base.getMonth();
      const grid = doc.createElement("div");
      grid.className = "fx-cal-grid";
      DW.forEach((d) => { const s = doc.createElement("div"); s.className = "fx-cal-dow"; s.textContent = d; grid.appendChild(s); });
      const startDay = new Date(y, m, 1).getDay();
      const today = day0(new Date());
      for (let i = 0; i < 42; i++) {
        const d = new Date(y, m, i - startDay + 1);
        const b = doc.createElement("button");
        b.type = "button";
        b.className = "fx-cal-day";
        b.textContent = d.getDate();
        if (d.getMonth() !== m) b.classList.add("is-outside");
        if (d.getTime() === today.getTime()) b.classList.add("is-today");
        if (start && d.getTime() === start.getTime()) b.classList.add("range-start");
        if (end && d.getTime() === end.getTime()) b.classList.add("range-end");
        if (start && end && d > start && d < end) b.classList.add("in-range");
        b.addEventListener("click", () => {
          if (!start || (start && end)) { start = day0(d); end = null; }
          else if (d < start) { start = day0(d); }
          else { end = day0(d); output(); }
          render();
        });
        grid.appendChild(b);
      }
      return grid;
    }
    function render() {
      rootEl.innerHTML = "";
      rootEl.classList.add("fx-cal-range");
      const presets = doc.createElement("div");
      presets.className = "fx-cal-presets";
      const today = day0(new Date());
      const mk = (label, fn) => { const b = doc.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", fn); presets.appendChild(b); };
      mk("Today", () => setRange(today, today));
      mk("Yesterday", () => { const d = new Date(today); d.setDate(d.getDate() - 1); setRange(d, d); });
      mk("Last 7 days", () => { const s = new Date(today); s.setDate(s.getDate() - 6); setRange(s, today); });
      mk("Last 30 days", () => { const s = new Date(today); s.setDate(s.getDate() - 29); setRange(s, today); });
      mk("This month", () => setRange(new Date(today.getFullYear(), today.getMonth(), 1), today));
      mk("Last month", () => setRange(new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)));
      rootEl.appendChild(presets);

      const months = doc.createElement("div");
      months.className = "fx-cal-months";
      [0, 1].forEach((off) => {
        const base = new Date(view.getFullYear(), view.getMonth() + off, 1);
        const cal = doc.createElement("div");
        cal.className = "fx-cal";
        const head = doc.createElement("div");
        head.className = "fx-cal-header";
        head.innerHTML = `<div class="fx-cal-month">${M[base.getMonth()]} ${base.getFullYear()}</div>`;
        const nav = doc.createElement("div");
        nav.className = "fx-cal-nav";
        if (off === 0) {
          const b = doc.createElement("button");
          b.className = "fx-btn fx-btn--outline fx-btn--icon fx-btn--sm"; b.type = "button"; b.setAttribute("aria-label", "Previous month");
          b.innerHTML = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m15 18-6-6 6-6'/></svg>";
          b.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
          nav.appendChild(b);
        } else {
          const b = doc.createElement("button");
          b.className = "fx-btn fx-btn--outline fx-btn--icon fx-btn--sm"; b.type = "button"; b.setAttribute("aria-label", "Next month");
          b.innerHTML = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m9 18 6-6-6-6'/></svg>";
          b.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
          nav.appendChild(b);
        }
        head.appendChild(nav);
        cal.append(head, monthGrid(base));
        months.appendChild(cal);
      });
      rootEl.appendChild(months);
    }
    render();
  });

  /* ---------- dropzone ---------- */
  $$(".fx-dropzone").forEach((dz) => {
    const input = $("input[type=file]", dz);
    const list = $(dz.dataset.fxFiles || ".fx-dropfiles", dz.parentElement) || (() => {
      const l = doc.createElement("div"); l.className = "fx-dropfiles"; dz.after(l); return l;
    })();
    function human(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
    function addFiles(files) {
      [...files].forEach((f) => {
        const row = doc.createElement("div");
        row.className = "fx-dropfile";
        const isImg = f.type.startsWith("image/");
        row.innerHTML =
          `<div class="fx-dropfile-icon">${isImg ? "" : "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v4a2 2 0 0 0 2 2h4'/></svg>"}</div>
           <div class="fx-dropfile-name">${f.name.replace(/[<>&]/g, "")}</div>
           <button class="fx-dropfile-x" aria-label="Remove"><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg></button>
           <div class="fx-dropfile-meta"><span>${human(f.size)}</span><div class="fx-progress"><div style="width:0%"></div></div><span class="fx-dropfile-pct">0%</span></div>`;
        if (isImg) {
          const img = doc.createElement("img");
          img.src = URL.createObjectURL(f);
          $(".fx-dropfile-icon", row).appendChild(img);
        }
        $(".fx-dropfile-x", row).addEventListener("click", () => row.remove());
        list.appendChild(row);
        // simulated upload progress
        const bar = $(".fx-progress > div", row), pct = $(".fx-dropfile-pct", row);
        let p = 0;
        const t = setInterval(() => {
          p = Math.min(100, p + 8 + Math.random() * 18);
          bar.style.width = p + "%";
          pct.textContent = Math.round(p) + "%";
          if (p >= 100) {
            clearInterval(t);
            pct.textContent = "✓";
            pct.style.color = "var(--success)";
          }
        }, 180);
      });
    }
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("is-over"); }));
    dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
  });

  /* ---------- sortable list ---------- */
  $$(".fx-sortable").forEach((listEl) => {
    let dragging = null;
    $$(".fx-sortable-item", listEl).forEach((it) => (it.draggable = true));
    listEl.addEventListener("dragstart", (e) => {
      dragging = e.target.closest(".fx-sortable-item");
      if (dragging) dragging.classList.add("is-dragging");
    });
    listEl.addEventListener("dragend", () => {
      if (dragging) dragging.classList.remove("is-dragging");
      dragging = null;
    });
    listEl.addEventListener("dragover", (e) => {
      if (!dragging) return;
      e.preventDefault();
      const after = $$(".fx-sortable-item:not(.is-dragging)", listEl)
        .find((it) => e.clientY < it.getBoundingClientRect().top + it.offsetHeight / 2);
      if (after) listEl.insertBefore(dragging, after);
      else listEl.appendChild(dragging);
    });
  });

  /* ---------- confirm-with-typing ---------- */
  $$("input[data-fx-confirm]").forEach((inp) => {
    const btn = $(inp.dataset.fxConfirmTarget || "[data-fx-confirm-btn]", inp.closest("dialog") || doc);
    if (!btn) return;
    btn.disabled = true;
    inp.addEventListener("input", () => { btn.disabled = inp.value !== inp.dataset.fxConfirm; });
  });

  /* ---------- stacked dialog visual offset ---------- */
  doc.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-fx-open-stacked]");
    if (!opener) return;
    e.preventDefault();
    const parent = opener.closest("dialog");
    const child = $(opener.getAttribute("data-fx-open-stacked"));
    if (!child) return;
    if (parent) parent.dataset.stack = "1";
    child.showModal();
    child.addEventListener("close", () => { if (parent) delete parent.dataset.stack; }, { once: true });
  });

  /* ---------- motion set (Batch M) ---------- */
  // spotlight: track cursor into CSS vars
  doc.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(".fx-spotlight");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--fx-mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--fx-my", (e.clientY - r.top) + "px");
  });

  // sliding tab indicator
  function moveIndicator(list) {
    const active = list.querySelector('[aria-selected="true"]');
    if (!active) return;
    let ind = list.querySelector(".fx-tab-indicator");
    if (!ind) {
      ind = doc.createElement("span");
      ind.className = "fx-tab-indicator";
      ind.setAttribute("aria-hidden", "true");
      list.prepend(ind);
      list.classList.add("has-indicator");
    }
    ind.style.left = active.offsetLeft + "px";
    ind.style.top = active.offsetTop + "px";
    ind.style.width = active.offsetWidth + "px";
    ind.style.height = active.offsetHeight + "px";
  }
  function allIndicators() { $$(".fx-tablist").forEach(moveIndicator); }
  doc.addEventListener("click", (e) => {
    const tab = e.target.closest(".fx-tablist [role='tab']");
    if (tab) requestAnimationFrame(() => moveIndicator(tab.closest(".fx-tablist")));
  });
  doc.addEventListener("keydown", (e) => {
    const tab = e.target.closest(".fx-tablist [role='tab']");
    if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
      requestAnimationFrame(() => moveIndicator(tab.closest(".fx-tablist")));
  });
  addEventListener("resize", allIndicators);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(allIndicators);
  requestAnimationFrame(allIndicators);

  // stateful button: loading → success → reset
  window.finix.buttonState = function (btn, state) {
    if (!btn.__fxOrig) btn.__fxOrig = btn.innerHTML;
    if (state === "loading") {
      btn.dataset.state = "loading";
      btn.innerHTML = '<span class="fx-spinner"></span>' + (btn.dataset.loadingText || "Working…");
    } else if (state === "success") {
      btn.dataset.state = "success";
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + (btn.dataset.successText || "Done");
    } else {
      delete btn.dataset.state;
      btn.innerHTML = btn.__fxOrig;
    }
  };
  doc.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fx-stateful]");
    if (!btn || btn.dataset.state) return;
    finix.buttonState(btn, "loading");
    setTimeout(() => finix.buttonState(btn, "success"), 1300);
    setTimeout(() => finix.buttonState(btn, "reset"), 2800);
  });

  // voice bars visualizer (demo mode: synthetic levels; pass an AnalyserNode for real audio)
  window.fxVoiceBars = function (el, opts = {}) {
    const n = opts.bars || 24;
    el.classList.add("fx-voicebars");
    el.innerHTML = "";
    const bars = [];
    for (let i = 0; i < n; i++) { const b = doc.createElement("i"); el.appendChild(b); bars.push(b); }
    let raf = null, t = 0, running = false;
    const data = opts.analyser ? new Uint8Array(opts.analyser.frequencyBinCount) : null;
    function frame() {
      t += 0.12;
      for (let i = 0; i < n; i++) {
        let v;
        if (opts.analyser) {
          opts.analyser.getByteFrequencyData(data);
          v = data[Math.floor((i / n) * data.length)] / 255;
        } else {
          v = Math.abs(Math.sin(t + i * 0.55)) * 0.55 + Math.abs(Math.sin(t * 1.7 + i)) * 0.35 + Math.random() * 0.1;
        }
        bars[i].style.height = Math.max(12, v * 100) + "%";
      }
      if (running) raf = requestAnimationFrame(frame);
    }
    const api = {
      start() { if (!running) { running = true; frame(); } return api; },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); bars.forEach((b) => (b.style.height = "18%")); return api; },
    };
    if (opts.auto !== false) api.start();
    return api;
  };
  $$("[data-fx-voicebars]").forEach((el) => fxVoiceBars(el));

  /* ---------- activity timeline v2 ---------- */
  window.fxActivity = function (root, opts = {}) {
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const I = {
      commit: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M12 3v6"/><path d="M12 15v6"/>',
      deploy: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
      user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
      flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
      alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
      card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
      arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    };
    const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n] || I.commit}</svg>`;
    const TYPE_LABELS = { comment: "Comments", status: "Status", system: "System" };
    const DAY = 864e5;
    let events = (opts.events || []).slice();
    let active = "all";
    const typeOrder = [];
    const regTypes = () => events.forEach((e) => { if (e.type && !typeOrder.includes(e.type)) typeOrder.push(e.type); });
    regTypes();
    const rel = (t) => {
      const d = (Date.now() - +new Date(t)) / 1e3;
      if (d < 60) return "just now";
      if (d < 3600) return Math.floor(d / 60) + "m ago";
      if (d < 86400) return Math.floor(d / 3600) + "h ago";
      return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    const dayLabel = (t) => {
      const now = new Date(), then = new Date(t);
      const mid = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
      const diff = Math.round((mid(now) - mid(then)) / DAY);
      if (diff === 0) return "Today";
      if (diff === 1) return "Yesterday";
      return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    const badge = (b) => {
      if (typeof b === "string") b = { label: b };
      const tone = b.tone ? ` fx-badge--${b.tone}` : " fx-badge--outline";
      const dot = b.tone ? " fx-badge--dot" : "";
      return `<span class="fx-badge${tone}${dot}">${esc(b.label)}</span>`;
    };
    function marker(ev) {
      if (ev.type === "comment") {
        const ini = (ev.actor || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
        return `<span class="fx-activity-marker fx-avatar">${esc(ini)}</span>`;
      }
      if (ev.type === "system" && !ev.icon) return '<span class="fx-activity-marker fx-activity-marker--dot"></span>';
      const tone = ev.tone ? ` data-tone="${esc(ev.tone)}"` : "";
      return `<span class="fx-activity-marker"${tone}>${svg(ev.icon || (ev.type === "status" ? "flag" : "commit"))}</span>`;
    }
    function item(ev) {
      let head = `<b>${esc(ev.actor || "System")}</b> <span class="fx-muted-part">${esc(ev.action || "")}</span>`;
      if (ev.target) head += ` <b>${esc(ev.target)}</b>`;
      head += `<span class="fx-activity-time">${rel(ev.time)}</span>`;
      let extra = "";
      if (ev.body) extra += `<div class="fx-activity-bubble">${esc(ev.body)}</div>`;
      if (ev.from || ev.to) extra += `<div class="fx-activity-badges">${ev.from ? badge(ev.from) : ""}${ev.from && ev.to ? svg("arrow") : ""}${ev.to ? badge(ev.to) : ""}</div>`;
      return `<div class="fx-activity-item" data-type="${esc(ev.type || "event")}">${marker(ev)}<div class="fx-activity-body"><div class="fx-activity-head">${head}</div>${extra}</div></div>`;
    }
    function render(animate) {
      const list = events
        .filter((e) => active === "all" || e.type === active)
        .sort((a, b) => +new Date(b.time) - +new Date(a.time));
      const types = typeOrder;
      const chips = opts.filters === false ? "" :
        `<div class="fx-activity-filters" role="group" aria-label="Filter activity">` +
        [["all", "All"], ...types.map((t) => [t, TYPE_LABELS[t] || t[0].toUpperCase() + t.slice(1)])]
          .map(([k, label]) => {
            const n = k === "all" ? events.length : events.filter((e) => e.type === k).length;
            return `<button class="fx-activity-chip" aria-pressed="${k === active}" data-filter="${esc(k)}">${esc(label)} <small>${n}</small></button>`;
          }).join("") + `</div>`;
      let html = chips, lastDay = null, group = [];
      const flush = () => { if (group.length) { html += `<div class="fx-activity-group">${group.join("")}</div>`; group = []; } };
      for (const ev of list) {
        const d = dayLabel(ev.time);
        if (d !== lastDay) { flush(); html += `<div class="fx-activity-day">${esc(d)}</div>`; lastDay = d; }
        group.push(item(ev));
      }
      flush();
      if (!list.length) html += `<p class="fx-text-sm fx-muted" style="padding:.5rem 0">No matching activity.</p>`;
      root.innerHTML = html;
      if (animate) {
        root.classList.add("is-animating");
        let i = 0;
        $$(".fx-activity-item, .fx-activity-day", root).forEach((el) => (el.style.animationDelay = 22 * i++ + "ms"));
        setTimeout(() => root.classList.remove("is-animating"), 250 + 22 * i);
      }
    }
    root.classList.add("fx-activity");
    root.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]");
      if (!chip || chip.dataset.filter === active) return;
      active = chip.dataset.filter;
      render(true);
    });
    render(false);
    return {
      add(ev) { events.unshift(ev); regTypes(); render(true); },
      filter(t) { active = t; render(true); },
      get events() { return events; },
    };
  };

  /* ---------- split pane ---------- */
  window.fxSplit = function (el) {
    if (el.__fxSplit) return el.__fxSplit;
    const divider = el.querySelector(":scope > .fx-split-divider");
    if (!divider) return null;
    if (!divider.querySelector(".fx-split-grip")) {
      divider.insertAdjacentHTML("beforeend",
        `<span class="fx-split-grip"><svg viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="2" cy="10" r="1"/><circle cx="6" cy="10" r="1"/></svg></span>`);
    }
    if (!divider.hasAttribute("tabindex")) divider.setAttribute("tabindex", "0");
    divider.setAttribute("role", "separator");
    divider.setAttribute("aria-orientation", "vertical");
    const initial = getComputedStyle(el).getPropertyValue("--split").trim() || "60%";
    const setPct = (pct) => el.style.setProperty("--split", Math.min(88, Math.max(12, pct)) + "%");
    const getPct = () => parseFloat(getComputedStyle(el).getPropertyValue("--split")) || 60;
    divider.addEventListener("pointerdown", (e) => {
      if (el.hasAttribute("data-collapsed")) return;
      e.preventDefault();
      el.classList.add("is-dragging");
      try { divider.setPointerCapture(e.pointerId); } catch (_) {}
      const rect = el.getBoundingClientRect();
      const move = (ev) => setPct(((ev.clientX - rect.left) / rect.width) * 100);
      const up = () => {
        el.classList.remove("is-dragging");
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", up);
      };
      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", up);
    });
    divider.addEventListener("dblclick", () => { el.style.removeProperty("--split"); el.style.setProperty("--split", initial); });
    divider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { setPct(getPct() - 2); e.preventDefault(); }
      if (e.key === "ArrowRight") { setPct(getPct() + 2); e.preventDefault(); }
    });
    const api = {
      collapse() { el.setAttribute("data-collapsed", ""); },
      expand() { el.setAttribute("data-animate", ""); el.removeAttribute("data-collapsed"); },
      get collapsed() { return el.hasAttribute("data-collapsed"); },
      el,
    };
    el.__fxSplit = api;
    return api;
  };
  $$("[data-fx-split]").forEach((el) => fxSplit(el));

  /* ---------- record peek panel ---------- */
  window.fxPeek = function (root, opts = {}) {
    const esc2 = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    root.classList.add("fx-peek");
    let records = [], idx = -1;
    const rec = () => records[idx];
    function fieldRow(f) {
      const r = rec(), v = r[f.key];
      const body = f.render ? f.render(v, r) : esc2(f.format ? f.format(v) : v ?? "—");
      return `<div class="fx-peek-field"><span class="fx-peek-label">${esc2(f.label)}</span>` +
        `<span class="fx-peek-value${f.mono ? " fx-peek-mono" : ""}"${f.editable ? ` data-editable data-key="${esc2(f.key)}"` : ""}>${body}</span></div>`;
    }
    function render(fresh) {
      const r = rec();
      if (!r) {
        root.innerHTML = `<div class="fx-peek-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
          <span>Select a row to inspect it here.</span></div>`;
        return;
      }
      const title = opts.title ? opts.title(r) : r[opts.titleKey || "name"];
      root.innerHTML =
        `<div class="fx-peek-head">
          <span class="fx-peek-title">${esc2(title)}</span>
          <span class="fx-peek-count">${idx + 1}/${records.length}</span>
          <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-peek="prev" aria-label="Previous record" ${idx === 0 ? "disabled" : ""}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-peek="next" aria-label="Next record" ${idx >= records.length - 1 ? "disabled" : ""}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
          <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-peek="close" aria-label="Close panel"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="fx-peek-body${fresh ? " is-fresh" : ""}">${(opts.fields || []).map(fieldRow).join("")}</div>`;
    }
    root.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-peek]");
      if (nav) {
        const act = nav.dataset.peek;
        if (act === "close") { opts.onClose?.(); return; }
        if (act === "prev" && idx > 0) idx--;
        if (act === "next" && idx < records.length - 1) idx++;
        render(true);
        opts.onNav?.(rec(), idx);
        return;
      }
      const val = e.target.closest("[data-editable]");
      if (val && !val.querySelector("input")) {
        const key = val.dataset.key;
        const f = (opts.fields || []).find((x) => x.key === key);
        const orig = rec()[key];
        val.innerHTML = `<input class="fx-input" value="${esc2(orig)}" ${f?.type === "number" ? 'inputmode="decimal"' : ""}>`;
        const inp = val.querySelector("input");
        inp.focus(); inp.select();
        let done = false;
        const commit = () => {
          if (done) return; done = true;
          let v = inp.value;
          if (f?.type === "number") { v = parseFloat(v); if (isNaN(v)) v = orig; }
          rec()[key] = v;
          render(false);
          if (v !== orig) opts.onChange?.(rec(), key, v);
        };
        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") commit();
          if (ev.key === "Escape") { done = true; render(false); }
        });
        inp.addEventListener("blur", commit);
      }
    });
    render(false);
    return {
      open(recs, i = 0) { records = recs; idx = i; render(true); },
      close() { records = []; idx = -1; render(false); },
      next() { if (idx < records.length - 1) { idx++; render(true); opts.onNav?.(rec(), idx); } },
      prev() { if (idx > 0) { idx--; render(true); opts.onNav?.(rec(), idx); } },
      refresh: () => render(false),
      get record() { return rec(); },
      get index() { return idx; },
    };
  };

  /* ---------- notification center ---------- */
  doc.addEventListener("click", (e) => {
    const mark = e.target.closest("[data-fx-notif-readall]");
    if (mark) {
      const panel = mark.closest(".fx-notif-panel");
      $$(".fx-notif[data-unread]", panel).forEach((n) => n.removeAttribute("data-unread"));
      $$(".fx-bell-dot").forEach((b) => b.setAttribute("data-read", ""));
    }
    const notif = e.target.closest(".fx-notif[data-unread]");
    if (notif) {
      notif.removeAttribute("data-unread");
      const panel = notif.closest(".fx-notif-panel");
      if (panel && !$(".fx-notif[data-unread]", panel)) $$(".fx-bell-dot").forEach((b) => b.setAttribute("data-read", ""));
    }
  });
})();
