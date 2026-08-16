/*!
 * finix-ui · finix-mobile.js — mobile behaviors
 * fxSheet (snap-point bottom sheet), swipe rows, tab bar, FAB speed dial,
 * large-title collapse, segmented control, pull-to-refresh. Pointer-event
 * driven (testable), reduced-motion safe.
 */
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ fxSheet ============ */
  window.fxSheet = function (sheet, opts = {}) {
    const snaps = (opts.snaps || [0.45, 0.88]).slice().sort((a, b) => a - b);
    const container = sheet.offsetParent || sheet.parentElement;
    const scrim = opts.scrim ? (typeof opts.scrim === "string" ? container.querySelector(opts.scrim) : opts.scrim) : null;
    let snap = -1; /* -1 = closed */

    const H = () => container.clientHeight;
    const yFor = (s) => H() - s * H();
    function apply() {
      sheet.style.transform = snap === -1 ? "translateY(100%)" : `translateY(${yFor(snaps[snap])}px)`;
      scrim?.classList.toggle("is-on", snap !== -1);
    }
    function open(i = 0) { snap = Math.min(i, snaps.length - 1); apply(); }
    function close() { snap = -1; apply(); }
    scrim?.addEventListener("click", close);

    const grab = sheet.querySelector(".fx-m-sheet-grab") || sheet;
    let drag = null;
    grab.addEventListener("pointerdown", (e) => {
      drag = { y0: e.clientY, start: snap === -1 ? H() : yFor(snaps[snap]) };
      try { grab.setPointerCapture(e.pointerId); } catch (_) {}
      sheet.classList.add("is-dragging");
    });
    grab.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const y = Math.max(yFor(snaps[snaps.length - 1]), Math.min(H(), drag.start + (e.clientY - drag.y0)));
      drag.y = y;
      sheet.style.transform = `translateY(${y}px)`;
    });
    const release = () => {
      if (!drag) return;
      sheet.classList.remove("is-dragging");
      if (drag.y != null) {
        const cands = snaps.map((s, i) => ({ i, y: yFor(s) })).concat([{ i: -1, y: H() }]);
        cands.sort((a, b) => Math.abs(a.y - drag.y) - Math.abs(b.y - drag.y));
        snap = cands[0].i;
      }
      apply();
      drag = null;
    };
    grab.addEventListener("pointerup", release);
    grab.addEventListener("pointercancel", release);
    apply();
    return { open, close, get snap() { return snap; }, el: sheet };
  };

  /* ============ swipe rows ============ */
  document.querySelectorAll(".fx-m-swipe").forEach((wrap) => {
    const row = wrap.querySelector(".fx-m-swipe-row");
    const under = wrap.querySelector(".fx-m-swipe-under");
    if (!row || !under) return;
    const W = () => under.scrollWidth || under.offsetWidth;
    let x = 0, drag = null;
    const setX = (v) => { x = v; row.style.transform = `translateX(${v}px)`; };
    row.addEventListener("pointerdown", (e) => {
      drag = { x0: e.clientX, start: x, moved: false };
      try { row.setPointerCapture(e.pointerId); } catch (_) {}
    });
    row.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) < 5) return;
      drag.moved = true;
      row.classList.add("is-dragging");
      setX(Math.max(-W() - 14, Math.min(0, drag.start + dx)));
    });
    const done = () => {
      if (!drag) return;
      row.classList.remove("is-dragging");
      if (drag.moved) {
        /* close any other open row */
        document.querySelectorAll(".fx-m-swipe-row.is-open").forEach((r) => {
          if (r !== row) { r.classList.remove("is-open"); r.style.transform = ""; }
        });
        if (x < -W() / 2) { setX(-W()); row.classList.add("is-open"); }
        else { setX(0); row.classList.remove("is-open"); }
      }
      drag = null;
    };
    row.addEventListener("pointerup", done);
    row.addEventListener("pointercancel", done);
    under.addEventListener("click", (e) => {
      const act = e.target.closest(".fx-m-swipe-act");
      if (!act) return;
      if (act.dataset.act === "delete" || act.dataset.act === "archive") {
        wrap.style.maxHeight = wrap.offsetHeight + "px";
        void wrap.offsetWidth;
        wrap.classList.add("is-leaving");
        setTimeout(() => wrap.remove(), reduced ? 0 : 300);
      } else {
        setX(0);
        row.classList.remove("is-open");
      }
    });
  });

  /* ============ tab bar + segmented ============ */
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".fx-m-tabbar .fx-m-tab");
    if (tab) {
      tab.closest(".fx-m-tabbar").querySelectorAll(".fx-m-tab").forEach((t) => t.setAttribute("aria-current", t === tab));
      return;
    }
    const seg = e.target.closest(".fx-m-seg button");
    if (seg) seg.closest(".fx-m-seg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === seg));
  });

  /* ============ FAB speed dial ============ */
  document.addEventListener("click", (e) => {
    const fab = e.target.closest("[data-m-fab]");
    if (!fab) return;
    const dial = document.querySelector(fab.dataset.mFab);
    if (!dial) return;
    const open = !fab.classList.contains("is-open");
    fab.classList.toggle("is-open", open);
    dial.classList.toggle("is-open", open);
    [...dial.children].forEach((b, i, all) => b.style.setProperty("--_d", (open ? (all.length - 1 - i) : i) * 0.045 + "s"));
  });

  /* ============ large-title collapse ============ */
  document.querySelectorAll(".fx-phone-body").forEach((body) => {
    const nav = body.querySelector(".fx-m-nav");
    if (!nav) return;
    body.addEventListener("scroll", () => nav.classList.toggle("is-collapsed", body.scrollTop > 30), { passive: true });
  });

  /* ============ pull to refresh ============ */
  document.querySelectorAll("[data-m-refresh]").forEach((body) => {
    const ptr = document.createElement("div");
    ptr.className = "fx-m-ptr";
    ptr.innerHTML = "<i></i>";
    body.prepend(ptr);
    let drag = null;
    body.addEventListener("pointerdown", (e) => {
      if (body.scrollTop > 0 || e.target.closest(".fx-m-swipe-row, .fx-m-sheet, button, input")) return;
      drag = { y0: e.clientY, armed: false };
    });
    body.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dy = e.clientY - drag.y0;
      drag.armed = dy > 55;
      ptr.classList.toggle("is-armed", drag.armed);
    });
    const end = () => {
      if (!drag) return;
      if (drag.armed) {
        ptr.classList.remove("is-armed");
        ptr.classList.add("is-spinning");
        setTimeout(() => {
          ptr.classList.remove("is-spinning");
          body.dispatchEvent(new CustomEvent("fx-refresh", { bubbles: true }));
        }, 950);
      } else ptr.classList.remove("is-armed");
      drag = null;
    };
    body.addEventListener("pointerup", end);
    body.addEventListener("pointercancel", end);
  });
})();
