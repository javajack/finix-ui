# finix-ui — Domain Build-Out Plan (v1)

Execution plan for closing the top-20 SaaS-domain component gaps. Written to
survive session compaction: everything a fresh session needs is here.

---

## 0. Standing context (read first after compaction)

- Repo: `/home/rakesh/work/react/finix-ui`, branch `main`. Commit after every
  finished task; message style = imperative summary + bullet list, trailer
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Demo server: `cd /home/rakesh/work/react/finix-ui && python3 -m http.server 8613`
  → `http://localhost:8613/demo/`. **The server sends no cache headers — always
  hard-reload (ctrl+shift+r) before judging a render.**
- File map: `css/tokens.css` (tokens/themes) · `css/finix.css` (primitives) ·
  `css/finix-widgets.css` (shell/stats/motion/orb) · `css/finix-datagrid.css` +
  `js/finix-datagrid.js` · `css/finix-apps.css` + `js/finix-apps.js` (calendar,
  gantt, filter builder, log table, AI surfaces) · `js/finix-editor.js` ·
  `css/finix-domains.css` + `js/finix-domains.js` (business/HR) ·
  `js/finix.js` (core behaviors, motion, palette) · `demo/*.html` (14 pages) ·
  `demo/shell.js` (nav — NAV array drives sidebar AND command palette) ·
  `manifest.json` + `llms.txt` (agent registry — update for every new component).
- Identity rules (user-mandated): warm-sage default, **NO serif fonts** (Geist +
  Geist Mono only), compact density. Brand presets finix/mono/ocean/forest/sunset.
  User browses the demo and switches brands — check `localStorage.fx-brand`
  before judging screenshot colors.
- Surface ladder (MANDATORY for all new CSS): `--background` (canvas) <
  `--well` (inset panels ON surfaces) < `--card` (surfaces) < `--popover`
  (overlays). Hover fills = `--hover`. Internal dividers = `--border-soft`;
  structural container borders = `--border`. Never invent a gray mix.
- Size scale: controls 2rem default / 1.75rem sm / 2.25rem lg; radius roles:
  `--radius-md` controls, `--radius-lg` inner containers, `--radius-xl` cards;
  data values in `--font-mono`; focus ring = border-ring + 3px ring at 50%.
- Motion rules: entry stagger comes free from `.fx-shell-content > *`; new
  interactive elements need hover/press response; micro-animations ≤ 250ms with
  `var(--ease-out)`; everything behind `@media (prefers-reduced-motion)`.
  Motion vocabulary available: fx-beam (AI-busy), fx-shine-border (featured),
  fx-spotlight, fx-fade-edges, fx-anim-list, stateful buttons, fxVoiceBars, fx-orb.
- Validation tooling: screenshots via Chrome tools; HTML5 drag CANNOT be
  synthesized by left_click_drag — verify via dispatched
  `DragEvent` + `DataTransfer` (kanban/calendar pattern) or use pointer-events
  for new drag features (testable). `setPointerCapture` must be try/caught.
  Check console errors (pattern ".", onlyErrors) after each page.

## 1. THE QUALITY LOOP — run for EVERY task below, no exceptions

1. **Build** — CSS strictly on ladder tokens + size scale; JS as a window-level
   `fx*` module or data-attribute behavior; demo section on the mapped page;
   add `manifest.json` component entry + `llms.txt` line.
2. **Render-validate** — hard-reload, screenshot **light AND dark**; fix
   anything visually wrong before proceeding.
3. **Interaction-validate** — exercise every behavior (clicks via browser,
   drags via dispatched events, logic via JS assertions). State the evidence.
4. **Consistency pass** — control heights on scale; radius roles correct;
   borders full-vs-soft correct; dark-mode input fills (`--input` 30% mix);
   focus rings present; Geist scale (no ad-hoc font sizes); mono for data;
   card containment (`min-width:0` respected, wide content wrapped in
   overflow containers).
5. **Hierarchy/aesthetics pass** — is every fill on the right ladder rung?
   Wells below surfaces, overlays above; spacing rhythm (1.25rem card padding,
   0.375–0.625rem intra-component gaps); nothing reads generic — check against
   the flagship product the pattern comes from.
6. **Motion pass** — hover/press feedback on new interactives; one purposeful
   subtle animation where state changes (expand, insert, status flip);
   reduced-motion guard; nothing loud.
7. **Console sweep** — zero errors on every touched page.
8. **Commit** — one commit per task (or tight task pair) with the trailer.

## 2. New demo pages to create (add to shell.js NAV as tasks land)

- `support.html` — "Support" (Apps, after AI Assistant) — Wave 3
- `devtools.html` — "Dev & API" (Apps, after Business & CRM) — Wave 1/2
- `collab.html` — "Collaboration" (Apps, after People & HR) — Wave 3
- `workflow.html` — "Workflows" (Apps, after Dev & API) — Wave 5

Existing-page placements are named per task. Keep pages ≤ ~8 cards; order cards
by importance (flagship pattern first).

---

## WAVE 1 — Universal primitives (highest cross-domain leverage)

### ✅ T1. Universal activity timeline v2 (`fxActivity`) → feedback.html (replaces static timeline) + reused everywhere
Serves CRM, support, PM, identity, fintech, e-sign, commerce, logistics (8+ domains).
- `fxActivity(el, {events, filters})`: interleaved event types (status-change,
  comment w/ avatar, system) with day-group headers, type-filter chips, relative
  times; icon-in-ring rail (reuse fx-timeline bones, richer).
- **Staged-status variant** `fx-stages`: horizontal/vertical checkpoint chain
  (pending/active/done/failed states + timestamps) — this single variant covers
  fulfillment, dispute, shipment, signing-order, approval chains later.
- Loop steps 1–8. Extra: filter chips must use `--well`+card pattern like log levels.

### ✅ T2. Master-detail split-pane + record peek (`fx-split`, `fxPeek`) → data.html
Powers support inbox, CRM records, reconciliation, comms later.
- `fx-split`: CSS grid split-pane w/ draggable divider (pointer events →
  testable), collapse toggle, min sizes.
- `fxPeek(rowEl, {fields})`: click a data-grid/table row → right-side panel
  (inside the split or as sheet on narrow) with field list, inline-editable
  values (reuse dg inline-edit pattern), prev/next record arrows.
- Demo: wire onto the existing products data grid.
- Motion: panel slide-in 200ms; active row `--hover` persistent highlight.

### ✅ T3. Diff viewer (`fxDiff`) → devtools.html (create page this task)
- Unified + split modes; line-level LCS diff (implement simple Myers/LCS in JS);
  add/remove line tints (success/destructive at 10–14% mixes), line numbers,
  collapsed unchanged regions with "expand 12 lines" affordances, mono font.
- Also create `devtools.html` skeleton + NAV entry this task.

### ✅ T4. Dev/API trio → devtools.html
- `fx-apikey` rows: masked key, reveal/copy/rotate buttons, scope badges,
  last-used relative time. Reveal = press-and-hold (motion detail).
- `fx-envvars`: masked KV editor rows (add/remove, reveal toggle).
- `fxWebhookLog`: delivery rows (event, status chip, attempts, duration) —
  compose log-table styles; row click → payload inspector drawer using a new
  small `fxJsonTree` (collapsible JSON viewer, mono, type-colored values).
- SLA of loop step 5: keys/values in `--font-mono`; wells for inspector.

### ✅ T5. CSV import wizard (`fxImporter`) → data.html
Near-zero free competition (Flatfile/OneSchema are paid).
- 4 steps reusing fx-stepper: Upload (dropzone) → Map columns (source column
  cards + target select per column, auto-match by name similarity) → Validate
  (preview table with per-cell error highlights + "fix inline" via dg edit
  pattern + error-count chips) → Import (progress + success state w/ counts).
- Demo ships a bundled sample CSV string; also accepts a real dropped file
  (parse with a ~40-line CSV parser, handle quoted fields).

**Wave 1 exit:** commit per task, then a sweep: all pages light+dark screenshots,
console clean, README component count updated.

## WAVE 2 — Analytics, flags, growth

### ✅ T6. Funnel chart + cohort retention grid → charts.html
- `fxCharts.funnel({steps:[{name,value}]})`: stepped bars w/ connector slopes,
  per-step conversion % and drop-off labels; hover tooltip.
- `fxCharts.cohort({rows})`: triangular retention matrix, %-shaded cells on a
  sequential sage ramp (color-mix chart-1), row = cohort week, hover shows n.
- Register both in the theme re-render registry.

### ✅ T7. Feature flags set → devtools.html
- `fx-flags` list rows: flag name/key (mono), per-environment toggle switches
  (prod guarded by confirm dialog), rollout badge.
- Targeting rule builder: reuse `fxFilterBuilder` for IF-conditions + new
  "serve" rows (variation select + percentage rollout slider group that must
  sum to 100 — auto-balance with subtle number animation).
- Experiment result card: variant rows w/ lift %, CI bar (catbar variant),
  significance badge.

### ✅ T8. Product tour + NPS → feedback.html
- `fxTour(steps)`: coachmark engine — dims page via overlay w/ SVG mask
  spotlight cutout on target element, step popover (uses fx-popover styles +
  finix.place), next/back/skip, progress dots. Demo: "Tour this page" button
  walking 4 real elements.
- `fx-nps`: 0–10 segmented scale buttons + follow-up textarea state + thanks
  state; score buttons color-ramp on hover.

## WAVE 3 — Support & collaboration

### ✅ T9. Ticket inbox → support.html (create page + NAV)
Composes T1 + T2. Zendesk/Intercom-grade split-pane:
- Left: queue list (ticket rows: requester avatar, subject, snippet, channel
  badge, **SLA countdown chip** — new `fx-sla` with ok/warn/breach color states
  and live ticking), filter tabs (Open/Mine/Snoozed).
- Center: conversation thread — customer vs agent bubbles + **internal-note
  toggle** (amber-tinted notes), macro picker (reuse command-palette pattern in
  a popover), reply composer with visibility switch.
- Right: customer context rail (entity card + fxActivity + attributes well).
- CSAT widget card (emoji scale + comment) on same page.

### ✅ T10. Channel messages + presence → collab.html (create page + NAV)
- `fx-messages`: day dividers, consecutive-message grouping (avatar only on
  first), hover action bar (react/reply/pin), thread-reply indicator rows,
  unread divider line.
- `fx-emoji`: searchable emoji picker popover (categories, recent row,
  skin-tone submenu optional) — feeds message reactions AND comments.
- `fx-facepile`: overlapping presence avatars w/ live dots + overflow count;
  hover expands spacing (subtle).
- TOC scroll-spy rail (`fx-toc`) + draggable page tree (compose fx-tree +
  sortable drag) for the docs half of the page.

### ✅ T11. Call tile grid → collab.html
- `fx-calltiles`: responsive participant grid, speaking ring animation (reuse
  orb ping), mute/camera badges, screen-share hero tile layout, self-tile
  corner float. Demo simulates active-speaker rotation.

## WAVE 4 — Commerce, fintech, HR completion

### ✅ T12. Payment sheet + candlestick + printable invoice → business.html
- `fx-payment`: card form w/ live brand detect (icon swap on 4/5/3 prefix),
  masked inputs (reuse data-fx-mask), wallet buttons row, processing→success
  states (stateful button + sheet morph).
- `fxCharts.candles({ohlc})`: candlestick chart w/ wicks, up/down coloring
  (success/destructive), crosshair tooltip.
- `fx-doc` printable invoice: A4-styled document card + `@media print`
  stylesheet (hide shell, white bg) + Print button. Serves receipts/labels too.

### T13. Commerce ops → business.html
- Variant/SKU matrix editor: option-value tag inputs (reuse fx-tags) auto-
  generate cartesian SKU table rows w/ price/stock inline edits.
- Order detail card w/ fulfillment `fx-stages` (from T1) + items + totals.

### T14. Approval chain + signature + slot picker → people.html / editor.html / scheduling.html
- `fx-approvals` (people.html): multi-stage approver chain — avatars, state
  chips, acted timestamps, current-stage glow; approve/reject demo actions.
- `fxSignature` (editor.html): canvas draw pad + type-it tab (script-ish font
  fallback) + clear/undo, outputs PNG preview.
- `fxSlotPicker` (scheduling.html): Calendly-style — day column strip + slot
  buttons, timezone select, selected-slot confirm card. Weekly availability
  editor (per-day ranges + copy-to-all) beside it.

### T15. Identity & audit → devtools.html
- `fx-permmatrix`: role × permission checkbox grid w/ inherited-state dots and
  column/row hover cross-highlight.
- Audit log: fxLogTable variant with actor/action/target formatting + row
  expand showing before/after via `fxDiff` (T3) or fxJsonTree.

## WAVE 5 — Big rocks

### T16. Workflow node canvas → workflow.html (create page + NAV)
The biggest structural gap; unlocks automation, journeys, lineage, service maps.
- `fxCanvas(el, {nodes, edges})`: SVG edge layer + absolutely-positioned node
  cards; pan (pointer drag on bg) + zoom (wheel, 0.5–1.5, transform-origin
  math); node drag (pointer events — testable); bezier edges w/ animated
  dash-flow on "running" edges; minimap (scaled clone rects); node status
  chips (idle/running/success/failed) using fx-beam on running nodes.
- Step-config side panel (schema-driven form: text/select/toggle fields from a
  JSON schema) opens on node click (reuse fxPeek pattern).
- Run history list w/ per-step status + payload inspect (fxJsonTree).
- Keep scope honest: read-and-arrange canvas, not a full editor (no edge
  re-connection dragging in v1 — note it).

### T17. Issue list + swimlanes → scheduling.html (Projects)
- `fx-issues`: Linear-density rows — priority icon, ID (mono), title, label
  chips, assignee avatar, status dot; grouped section headers w/ counts;
  keyboard j/k navigation + x to select; hover action bar.
- Kanban swimlanes: `fx-kanban--lanes` modifier — horizontal lane rows
  (e.g. by assignee) × status columns; lane headers sticky-left.

### T18. Accounting set → business.html
- Bank reconciliation split-pane (compose fx-split): bank feed rows left,
  suggested matches right w/ confidence badges, confirm/split actions,
  running matched-total meter.
- Chart-of-accounts tree table: expandable hierarchy rows (fx-tree + table) w/
  rollup sums in mono; indent guides.

### T19. Observability → devtools.html
- `fxTraceWaterfall({spans})`: nested span bars on a time axis, service color
  coding, duration labels, collapse subtree, hover detail tooltip.
- `fxCharts.timeheat({rows,cols,values})`: time × dimension heatmap w/ sage
  sequential ramp + hover values.
- Alert-rule builder mini: threshold input drawing a live line on an area chart.

### T20. Final wave — polish & release
- Full 18-page sweep: light+dark screenshots, console clean, narrow-viewport
  containment, brand-switch spot check (ocean + mono).
- Update README (component count, page list), manifest/llms completeness check
  vs actual exports; research.html: mark new patterns + their flagship sources.
- Memory + PLAN.md checkboxes updated; final commit + tag `v0.2.0`.

---

## Sequencing & discipline

- Order: T1→T20. T1/T2/T3 unblock the most later tasks; never start a Wave-3+
  task before its Wave-1 dependency (T9 needs T1+T2; T15 needs T3; T16 needs
  fxJsonTree from T4).
- One task = one loop = one commit. If a task reveals a framework bug, fix it
  in the same commit and note it.
- Track progress by editing this file: change `### T{n}` to `### ✅ T{n}` when
  its loop completes.
- If context is compacted mid-wave: read this file + `git log --oneline` +
  memory, then resume at the first un-checked task.
