/*!
 * finix-ui · finix-learn.js — LMS behaviors
 * fxCurriculum (module tree w/ progress rollups + lesson routing),
 * fxQuiz (instant-feedback MCQ + drag-order question + graded results).
 */
(() => {
  "use strict";
  const esc = (s) => (window.fxEsc || String)(s ?? "");

  /* ============ fxCurriculum ============ */
  window.fxCurriculum = function (root, opts) {
    if (!root) { console.warn("finixui: fxCurriculum called without a root element"); return null; }
    const modules = opts.modules;
    let current = opts.current;
    root.classList.add("fx-lms-curric");
    const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    const lock = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

    function render() {
      root.innerHTML = modules.map((m, mi) => {
        const done = m.lessons.filter((l) => l.done).length;
        return `<details class="fx-lms-mod" ${m.lessons.some((l) => l.id === current) || mi === 0 ? "open" : ""}>
          <summary>${esc(m.name)}<span class="fx-lms-count">${done}/${m.lessons.length}</span></summary>` +
          m.lessons.map((l) =>
            `<button class="fx-lms-lesson${l.done ? " is-done" : ""}" data-lesson="${esc(l.id)}" ${l.locked ? "disabled" : ""} aria-current="${l.id === current}">
               <span class="fx-lms-check">${l.done ? check : ""}</span>
               <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.name)}</span>
               ${l.locked ? lock : `<span class="fx-lms-dur">${esc(l.dur)}</span>`}
             </button>`).join("") +
        `</details>`;
      }).join("");
    }
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lesson]");
      if (!btn || btn.disabled) return;
      current = btn.dataset.lesson;
      root.querySelectorAll("[data-lesson]").forEach((b) => b.setAttribute("aria-current", b === btn));
      const lesson = modules.flatMap((m) => m.lessons).find((l) => l.id === current);
      opts.onSelect?.(lesson);
    });
    render();
    return {
      progress() {
        const all = modules.flatMap((m) => m.lessons);
        return Math.round((all.filter((l) => l.done).length / all.length) * 100);
      },
      complete(id) {
        const l = modules.flatMap((m) => m.lessons).find((x) => x.id === id);
        if (l) { l.done = true; render(); }
      },
      get current() { return current; },
    };
  };

  /* ============ fxQuiz ============ */
  window.fxQuiz = function (root, opts) {
    if (!root) { console.warn("finixui: fxQuiz called without a root element"); return null; }
    const qs = opts.questions;
    const answered = {};
    root.innerHTML = qs.map((q, qi) => {
      if (q.type === "order") {
        return `<div class="fx-lms-q" data-q="${qi}">
          <div class="fx-lms-q-title"><span class="num">Q${qi + 1}</span>${esc(q.text)}</div>
          <div class="fx-sortable fx-lms-order" data-order>` +
          q.items.map((it) => `<div class="fx-sortable-item" data-val="${esc(it)}"><button class="fx-sortable-handle" aria-label="Drag to reorder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg></button>${esc(it)}</div>`).join("") +
          `</div></div>`;
      }
      return `<div class="fx-lms-q" data-q="${qi}">
        <div class="fx-lms-q-title"><span class="num">Q${qi + 1}</span>${esc(q.text)}</div>` +
        q.options.map((o, oi) => `<button class="fx-lms-opt" data-opt="${oi}" type="button">${esc(o)}<i></i></button>`).join("") +
      `</div>`;
    }).join("") +
    `<div class="fx-row" style="margin-top:.875rem;gap:.75rem;align-items:center">
       <button class="fx-btn" data-quiz-submit type="button">Submit quiz</button>
       <span class="fx-text-xs fx-muted" data-quiz-note>MCQs grade instantly — the ordering question grades on submit.</span>
     </div>
     <div class="fx-lms-result" data-quiz-result hidden style="margin-top:1rem">
       <div data-quiz-gauge></div>
       <div class="fx-stack" style="gap:.25rem">
         <b class="fx-text-sm" data-quiz-line></b>
         <span class="fx-text-xs fx-muted" data-quiz-sub></span>
       </div>
     </div>`;

    root.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-opt]");
      if (opt) {
        const qEl = opt.closest("[data-q]");
        const qi = +qEl.dataset.q;
        if (answered[qi] != null) return;
        const q = qs[qi];
        const oi = +opt.dataset.opt;
        answered[qi] = oi === q.answer;
        qEl.querySelectorAll("[data-opt]").forEach((b, i) => {
          b.disabled = true;
          if (i === q.answer) { b.classList.add("is-right"); b.querySelector("i").textContent = "✓"; }
          else if (i === oi) { b.classList.add("is-wrong"); b.querySelector("i").textContent = "✕"; }
        });
        return;
      }
      if (e.target.closest("[data-quiz-submit]")) {
        /* grade order questions */
        qs.forEach((q, qi) => {
          if (q.type !== "order") return;
          const order = [...root.querySelectorAll(`[data-q="${qi}"] .fx-sortable-item`)].map((it) => it.dataset.val);
          answered[qi] = JSON.stringify(order) === JSON.stringify(q.correct);
          const box = root.querySelector(`[data-q="${qi}"] [data-order]`);
          box.style.borderColor = answered[qi] ? "var(--success)" : "var(--destructive)";
        });
        const score = qs.reduce((a, _, qi) => a + (answered[qi] ? 1 : 0), 0);
        const pct = Math.round((score / qs.length) * 100);
        const res = root.querySelector("[data-quiz-result]");
        res.hidden = false;
        root.querySelector("[data-quiz-gauge]").innerHTML = "";
        if (window.fxCharts?.gauge) fxCharts.gauge(root.querySelector("[data-quiz-gauge]"), { value: pct, label: "score", size: 120 });
        root.querySelector("[data-quiz-line]").textContent = `${score} of ${qs.length} correct — ${pct >= 70 ? "passed 🎉" : "below the 70% pass mark"}`;
        root.querySelector("[data-quiz-sub]").textContent = pct >= 70 ? "Certificate unlocked below." : "Review the red answers and retake — attempts are unlimited.";
        opts.onSubmit?.(score, qs.length);
      }
    });
    return { get score() { return qs.reduce((a, _, qi) => a + (answered[qi] ? 1 : 0), 0); }, answered };
  };
})();
