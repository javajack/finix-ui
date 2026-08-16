/*!
 * finix-ui · finix-marketing.js — public-web behaviors
 * Sticky nav, mobile menu, scroll reveal, counter-up, testimonial carousel,
 * billing toggle, countdown, waitlist capture, ROI calculator, theme toggle.
 * All data-attribute driven; reduced-motion respected throughout.
 */
(() => {
  "use strict";
  const doc = document;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- sticky nav state ---------- */
  const nav = doc.querySelector(".fx-mk-nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile menu ---------- */
  doc.addEventListener("click", (e) => {
    const burger = e.target.closest("[data-mk-menu]");
    if (burger) {
      const panel = doc.querySelector(".fx-mk-mobile");
      const open = panel.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open);
      return;
    }
    if (e.target.closest(".fx-mk-mobile a")) doc.querySelector(".fx-mk-mobile")?.classList.remove("is-open");
  });

  /* ---------- theme toggle ---------- */
  doc.addEventListener("click", (e) => {
    const t = e.target.closest("[data-mk-theme]");
    if (!t) return;
    const next = doc.documentElement.dataset.theme === "dark" ? "light" : "dark";
    if (window.finix?.setTheme) finix.setTheme(next);
    else { doc.documentElement.dataset.theme = next; try { localStorage.setItem("fx-theme", next); } catch (_) {} }
  });

  /* ---------- scroll reveal ---------- */
  const revealEls = [...doc.querySelectorAll(".fx-mk-reveal")];
  if (revealEls.length && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const delay = +en.target.dataset.mkDelay || 0;
        setTimeout(() => en.target.classList.add("is-in"), delay);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add("is-in"));

  /* ---------- counter-up stats ---------- */
  const counters = [...doc.querySelectorAll("[data-mk-count]")];
  if (counters.length) {
    const fmt = (v, dec) => v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const run = (el) => {
      const target = parseFloat(el.dataset.mkCount);
      const dec = (el.dataset.mkCount.split(".")[1] || "").length;
      const prefix = el.dataset.mkPrefix || "", suffix = el.dataset.mkSuffix || "";
      if (reduced) { el.textContent = prefix + fmt(target, dec) + suffix; return; }
      const t0 = performance.now(), dur = 1300;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + fmt(target * eased, dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- testimonial carousel ---------- */
  window.fxMkCarousel = function (root) {
    const track = root.querySelector(".fx-mk-carousel-track");
    const cards = [...track.children];
    const dotsEl = root.querySelector(".fx-mk-dots");
    let page = 0, timer = null;
    const perPage = () => {
      const w = root.clientWidth;
      return w > 900 ? 3 : w > 620 ? 2 : 1;
    };
    const pages = () => Math.max(1, Math.ceil(cards.length / perPage()));
    function go(p) {
      page = ((p % pages()) + pages()) % pages();
      const card = cards[0];
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      const step = (card.offsetWidth + gap) * perPage();
      track.style.transform = `translateX(${-page * step}px)`;
      if (dotsEl) {
        dotsEl.innerHTML = Array.from({ length: pages() }, (_, i) =>
          `<button class="${i === page ? "is-on" : ""}" data-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`).join("");
      }
    }
    function auto() {
      if (reduced) return;
      clearInterval(timer);
      timer = setInterval(() => go(page + 1), 5500);
    }
    root.addEventListener("click", (e) => {
      const prev = e.target.closest("[data-mk-prev]"), next = e.target.closest("[data-mk-next]"), dot = e.target.closest("[data-dot]");
      if (prev) { go(page - 1); auto(); }
      if (next) { go(page + 1); auto(); }
      if (dot) { go(+dot.dataset.dot); auto(); }
    });
    root.addEventListener("pointerenter", () => clearInterval(timer));
    root.addEventListener("pointerleave", auto);
    addEventListener("resize", () => go(page), { passive: true });
    go(0); auto();
    return { go };
  };
  doc.querySelectorAll("[data-mk-carousel]").forEach((el) => fxMkCarousel(el));

  /* ---------- billing toggle (monthly / annual) ---------- */
  doc.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mk-bill]");
    if (!btn) return;
    const mode = btn.dataset.mkBill;
    btn.closest(".fx-mk-billing, [data-mk-billing]")?.querySelectorAll("[data-mk-bill]")
      .forEach((b) => b.setAttribute("aria-pressed", b === btn));
    doc.querySelectorAll("[data-price-monthly]").forEach((el) => {
      const v = mode === "annual" ? el.dataset.priceAnnual : el.dataset.priceMonthly;
      const priceEl = el.querySelector("b") || el;
      if (priceEl.textContent !== v) {
        priceEl.textContent = v;
        el.classList.remove("is-bump");
        void el.offsetWidth;
        el.classList.add("is-bump");
      }
    });
    doc.querySelectorAll("[data-mk-period]").forEach((el) => (el.textContent = mode === "annual" ? "/mo, billed annually" : "/mo"));
  });

  /* ---------- countdown ---------- */
  doc.querySelectorAll("[data-mk-countdown]").forEach((box) => {
    const target = new Date(box.dataset.mkCountdown).getTime();
    const cells = {};
    ["d", "h", "m", "s"].forEach((k) => {
      const label = { d: "Days", h: "Hours", m: "Min", s: "Sec" }[k];
      const cell = doc.createElement("div");
      cell.className = "fx-mk-cd";
      cell.innerHTML = `<b>00</b><span>${label}</span>`;
      box.appendChild(cell);
      cells[k] = cell.querySelector("b");
    });
    box.classList.add("fx-mk-countdown");
    function tick() {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      const vals = { d, h, m, s };
      for (const k in vals) {
        const v = String(vals[k]).padStart(2, "0");
        if (cells[k].textContent !== v) {
          cells[k].textContent = v;
          if (!reduced) { cells[k].classList.remove("is-tick"); void cells[k].offsetWidth; cells[k].classList.add("is-tick"); }
        }
      }
    }
    tick();
    setInterval(tick, 1000);
  });

  /* ---------- waitlist / newsletter capture ---------- */
  doc.addEventListener("submit", (e) => {
    const box = e.target.closest("[data-mk-waitlist]");
    if (!box) return;
    e.preventDefault();
    const input = box.querySelector('input[type="email"], .fx-input');
    const email = (input?.value || "").trim();
    const wrap = box.closest(".fx-mk-waitlist") || box;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      wrap.classList.add("has-error");
      input?.focus();
      return;
    }
    wrap.classList.remove("has-error");
    doc.querySelectorAll("[data-mk-waitcount]").forEach((c) => {
      const n = parseInt(c.textContent.replace(/[^\d]/g, ""), 10) + 1;
      c.textContent = n.toLocaleString();
    });
    const n = doc.querySelector("[data-mk-waitcount]")?.textContent || "";
    box.outerHTML = `<div class="fx-mk-waitlist-success">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      You're on the list${n ? ` — you're #${n}` : ""}. Check your inbox.
    </div>`;
  });

  /* ---------- ROI calculator ---------- */
  doc.querySelectorAll("[data-mk-roi]").forEach((box) => {
    const seats = box.querySelector("[data-roi-seats]");
    const hours = box.querySelector("[data-roi-hours]");
    const rate = box.querySelector("[data-roi-rate]");
    const out = box.querySelector("[data-roi-out]");
    if (!seats || !out) return;
    const paint = (s) => s.style.setProperty("--fx-fill", ((+s.value - +s.min) / (+s.max - +s.min)) * 100 + "%");
    function calc() {
      [seats, hours, rate].forEach((s) => s && paint(s));
      box.querySelectorAll("output[data-for]").forEach((o) => {
        const src = box.querySelector(`[data-roi-${o.dataset.for}]`);
        if (src) o.textContent = (+src.value).toLocaleString() + (o.dataset.suffix || "");
      });
      const yearly = (+seats.value) * (+(hours?.value || 0)) * (+(rate?.value || 0)) * 52;
      out.textContent = "$" + Math.round(yearly).toLocaleString();
    }
    box.addEventListener("input", calc);
    calc();
  });
})();
