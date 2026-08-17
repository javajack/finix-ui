/*!
 * finixui docs generator — renders demo/reference.html from manifest.json.
 * The manifest is the single source of truth (name, category, classes,
 * markup, js per component); this page is its human-readable view.
 *
 *   npm run docs
 */
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("..", import.meta.url).pathname;
const m = JSON.parse(await readFile(root + "manifest.json", "utf8"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CAT_LABELS = {
  form: "Forms & inputs", data: "Data", overlay: "Overlays & navigation",
  feedback: "Feedback", display: "Display", layout: "Layout", navigation: "Navigation",
  widget: "Widgets & shell", content: "Content", template: "Templates",
  finance: "Finance", social: "Social", hr: "HR", support: "Support", ai: "AI",
  devtools: "Developer platform", identity: "Identity", motion: "Motion",
  marketing: "Marketing site", crm: "Sales CRM", trading: "Trading",
  flows: "Wizards & flows", mobile: "Mobile", commerce: "Commerce",
  banking: "Banking", ops: "Incidents & status", travel: "Travel",
  healthcare: "Healthcare", learning: "Learning", logistics: "Logistics",
  pos: "POS & hospitality", app: "App patterns",
};

const byCat = new Map();
for (const c of m.components) {
  if (!byCat.has(c.category)) byCat.set(c.category, []);
  byCat.get(c.category).push(c);
}

const card = (c) => `
      <div class="fx-card ref-item" data-search="${esc((c.name + " " + (c.classes || []).join(" ")).toLowerCase())}">
        <div class="fx-card-header">
          <div class="fx-card-title" style="font-family:var(--font-mono);font-size:.875rem">${esc(c.name)}</div>
        </div>
        <div class="fx-card-content fx-stack" style="gap:.625rem">
          ${(c.classes || []).length ? `<div class="fx-row" style="gap:.25rem;flex-wrap:wrap">${c.classes.map((cl) => `<code class="fx-inline-code" style="font-size:.6875rem">${esc(cl)}</code>`).join("")}</div>` : ""}
          ${c.markup ? `<div style="overflow-x:auto"><pre style="margin:0;background:var(--well);border:1px solid var(--border-soft);border-radius:var(--radius-md);padding:.625rem .75rem;font-size:.6875rem;line-height:1.55;font-family:var(--font-mono);white-space:pre-wrap;word-break:break-word">${esc(c.markup)}</pre></div>` : ""}
          ${c.js ? `<p class="fx-text-sm fx-muted" style="margin:0;line-height:1.6">${esc(c.js)}</p>` : ""}
        </div>
      </div>`;

const sections = [...byCat.entries()].map(([cat, items]) => `
      <section class="ref-cat" id="cat-${esc(cat)}">
        <h2 style="font-size:.9375rem;font-weight:650;letter-spacing:-.01em;margin:1.75rem 0 .75rem">${esc(CAT_LABELS[cat] || cat)} <span class="fx-badge fx-badge--secondary" style="font-family:var(--font-mono)">${items.length}</span></h2>
        <div class="fx-grid" style="grid-template-columns:repeat(auto-fill,minmax(24rem,1fr));gap:.875rem">
          ${items.map(card).join("")}
        </div>
      </section>`).join("");

const html = `<!doctype html>
<!-- GENERATED FILE — edit manifest.json and run: npm run docs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Component Reference · Finix UI</title>
<link rel="stylesheet" href="../css/fonts.css">
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/finix.css">
<link rel="stylesheet" href="../css/finix-widgets.css">
<script>try{var t=localStorage.getItem('fx-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var b=localStorage.getItem('fx-brand');if(b)document.documentElement.dataset.brand=b;}catch(e){}</script>
<script defer src="../js/finix-charts.js"></script>
<script defer src="shell.js"></script>
<script defer src="../js/finix.js"></script>
</head>
<body>
<div class="fx-shell">
  <div class="fx-shell-main">
    <div class="fx-shell-content">

      <div class="fx-page-header">
        <div>
          <h1 class="fx-page-title">Component reference</h1>
          <p class="fx-page-sub">${m.components.length} components, generated from <b style="font-family:var(--font-mono)">manifest.json</b> — the same registry AI agents consume. Search by name or class.</p>
        </div>
      </div>

      <div class="fx-input-group" style="max-width:24rem;margin-bottom:.5rem">
        <span class="fx-input-addon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
        <input class="fx-input" id="ref-search" placeholder="Filter ${m.components.length} components… (e.g. fx-wiz, pipeline)" aria-label="Filter components">
      </div>
      <p class="fx-text-xs fx-muted" id="ref-count" style="margin:0"></p>
${sections}
    </div>
  </div>
</div>
<script>
window.addEventListener("DOMContentLoaded", () => {
  const items = [...document.querySelectorAll(".ref-item")];
  const cats = [...document.querySelectorAll(".ref-cat")];
  const count = document.getElementById("ref-count");
  const paint = (q) => {
    let n = 0;
    items.forEach((el) => {
      const hit = !q || el.dataset.search.includes(q);
      el.hidden = !hit;
      if (hit) n++;
    });
    cats.forEach((c) => (c.hidden = ![...c.querySelectorAll(".ref-item")].some((i) => !i.hidden)));
    count.textContent = q ? n + " matching" : "";
  };
  document.getElementById("ref-search").addEventListener("input", (e) => paint(e.target.value.trim().toLowerCase()));
  paint("");
});
</script>
</body>
</html>
`;

await writeFile(root + "demo/reference.html", html);
console.log(`demo/reference.html: ${m.components.length} components across ${byCat.size} categories`);
