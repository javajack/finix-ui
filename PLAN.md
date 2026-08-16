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

### ✅ T13. Commerce ops → business.html
- Variant/SKU matrix editor: option-value tag inputs (reuse fx-tags) auto-
  generate cartesian SKU table rows w/ price/stock inline edits.
- Order detail card w/ fulfillment `fx-stages` (from T1) + items + totals.

### ✅ T14. Approval chain + signature + slot picker → people.html / editor.html / scheduling.html
- `fx-approvals` (people.html): multi-stage approver chain — avatars, state
  chips, acted timestamps, current-stage glow; approve/reject demo actions.
- `fxSignature` (editor.html): canvas draw pad + type-it tab (script-ish font
  fallback) + clear/undo, outputs PNG preview.
- `fxSlotPicker` (scheduling.html): Calendly-style — day column strip + slot
  buttons, timezone select, selected-slot confirm card. Weekly availability
  editor (per-day ranges + copy-to-all) beside it.

### ✅ T15. Identity & audit → devtools.html
- `fx-permmatrix`: role × permission checkbox grid w/ inherited-state dots and
  column/row hover cross-highlight.
- Audit log: fxLogTable variant with actor/action/target formatting + row
  expand showing before/after via `fxDiff` (T3) or fxJsonTree.

## WAVE 5 — Big rocks

### ✅ T16. Workflow node canvas → workflow.html (create page + NAV)
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

### ✅ T17. Issue list + swimlanes → scheduling.html (Projects)
- `fx-issues`: Linear-density rows — priority icon, ID (mono), title, label
  chips, assignee avatar, status dot; grouped section headers w/ counts;
  keyboard j/k navigation + x to select; hover action bar.
- Kanban swimlanes: `fx-kanban--lanes` modifier — horizontal lane rows
  (e.g. by assignee) × status columns; lane headers sticky-left.

### ✅ T18. Accounting set → business.html
- Bank reconciliation split-pane (compose fx-split): bank feed rows left,
  suggested matches right w/ confidence badges, confirm/split actions,
  running matched-total meter.
- Chart-of-accounts tree table: expandable hierarchy rows (fx-tree + table) w/
  rollup sums in mono; indent guides.

### ✅ T19. Observability → devtools.html
- `fxTraceWaterfall({spans})`: nested span bars on a time axis, service color
  coding, duration labels, collapse subtree, hover detail tooltip.
- `fxCharts.timeheat({rows,cols,values})`: time × dimension heatmap w/ sage
  sequential ramp + hover values.
- Alert-rule builder mini: threshold input drawing a live line on an area chart.

### ✅ T20. Final wave — polish & release
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

---

## WAVE M — Public web: marketing, launch & landing pages (v0.3)

New arena: PUBLIC pages (no admin shell). Standalone layout with own navbar +
footer, still token-driven, still Geist-only, still light/dark × brands.
New module: `css/finix-marketing.css` + `js/finix-marketing.js`, namespace
`fx-mk-*` (avoids app-component collisions — lesson from .fx-msg-actions).
Pages live in `demo/site/`. Marketing visuals use LIVE finix components as the
"product screenshots" (real markup in a browser frame) — we are the product.

### Section taxonomy (the full enumeration)

**Above the fold**
1. Announcement bar — launch/promo strip w/ link, dismissible
2. Navbar — logo, links, (mega)menu, theme toggle, primary CTA; sticky w/
   scroll-shrink + blur; mobile hamburger panel
3. Hero variants: centered copy+CTA · split copy/visual · screenshot-in-
   browser-frame · video · background fx (aurora/grid/dots) · eyebrow badge
   ("v0.3 is out →") · gradient headline span · inline email-capture ·
   CTA pair (primary + secondary) · social-proof strip under CTA
   (avatar stack + stars + "Trusted by N teams")
4. Logo cloud — static grid or infinite marquee, muted wordmarks

**Value communication**
5. Feature grid — icon cards 3/4-up
6. Bento grid — asymmetric showcase, cells host live mini-components
7. Zig-zag feature rows — alternating text/visual deep dives
8. Tabbed/interactive showcase
9. How-it-works steps (1-2-3)
10. Use-case / persona cards ("For support teams…")
11. Integrations wall + count CTA
12. Stats band — counter-up metrics (uptime, requests, teams)
13. Comparison table — us vs them (✓ / ✕ / partial)
14. Code/install snippet section (dev products)

**Trust & social proof**
15. Testimonial patterns: spotlight quote · card carousel · wall of love
    (tweet-card masonry) · case-study cards w/ result metrics
16. Ratings badges (G2-style stars), press mentions
17. Security/compliance badges (SOC2, GDPR, SSO)

**Conversion**
18. Pricing — tiers, monthly/annual toggle (animated price swap), featured
    plan, per-feature comparison table
19. ROI mini-calculator (sliders → computed savings)
20. Newsletter / waitlist capture — email + button → success state + live
    "join N others" counter
21. Countdown timer (launch)
22. FAQ accordion (objection handling)
23. Final CTA band — gradient/aurora, restated value prop, one action

**Closing**
24. Footer — multi-column links, newsletter, socials, status dot, legal bar

**Conversion craft (applies everywhere):** one primary CTA repeated down the
page; social proof adjacent to every CTA; benefit-first headline + specific
subhead; scannable sections (eyebrow → h2 → lede rhythm); scroll-reveal
animation (IO, reduced-motion guarded); sticky nav CTA; mobile-first stacking.

### Tasks

### ✅ M1. Marketing module scaffold
`finix-marketing.css`: container/rhythm/display-type/eyebrow/lede tokens,
reveal system, browser-frame, aurora/grid backdrops, navbar, footer.
`finix-marketing.js`: sticky-nav state, mobile menu, IO scroll-reveal,
counter-up, carousel, pricing billing toggle, countdown, waitlist form,
theme toggle hook.

### ✅ M2. home.html — SaaS homepage (flagship, many sections)
Announcement bar · navbar · hero (badge, gradient headline, CTA pair, social
strip, LIVE dashboard in browser frame + aurora) · logo marquee · bento (live
mini-components in cells) · zig-zag rows ×2 · stats band (counter-up) ·
testimonial spotlight + carousel · integrations · pricing (toggle) · FAQ ·
final CTA · footer. Full loop.

### ✅ M3. launch.html — launch/waitlist page
Minimal nav · countdown hero · waitlist capture w/ live counter · blurred
"early preview" frame · launch timeline (reuse fx-stages) · early tweets
(wall-of-love lite) · mini FAQ · minimal footer. Full loop.

### ✅ M4. pricing.html — dedicated pricing page
H1 + billing toggle · 3 tiers · full feature-comparison table · ROI
calculator (fx-sliders) · logos · testimonial band · objection FAQ · CTA ·
footer. Full loop.

### ✅ M5. Integration & release
Admin NAV group "Marketing site" → the three pages; manifest (category
"marketing") + llms.txt; research.html credits from the free-sources sweep
(Tailark, HyperUI, Magic UI, …); 3-page light+dark+console+overflow sweep;
commit; tag v0.3.0.

Sequencing: M1→M5, one commit per task, quality loop on every task.

---

## 0.1 State addendum — read together with §0 when resuming (written after v0.3.0)

- **Done so far:** T1–T20 (tag `v0.2.0`) and M1–M5 (tag `v0.3.0`). 160 components
  in `manifest.json` v0.3.0. Demo = 18 admin pages + 3 public pages in `demo/site/`.
- **File map additions since §0:** `js/finix-devtools.js` + `css/finix-devtools.css` ·
  `js/finix-canvas.js` (fxCanvas + fxSchemaForm) · `css/finix-marketing.css` +
  `js/finix-marketing.js` (public-web, `fx-mk-*`) · `demo/site/` (home, launch,
  pricing) · `demo/charts.js` grew funnel/cohort/candles/timeheat + `fxCharts.refresh`.
- **Traps learned (do not relearn):**
  1. `css/finix.css` has a global reset `img, svg, video { max-width: 100% }` —
     any attribute-sized SVG inside a 0-width/absolute parent collapses. Fix with
     explicit inline width/height or `max-width: none` (bit us on fxCanvas edges).
  2. **Namespace every new module's classes** (`fx-crm-*`, `fx-tr-*`, …). A bare
     shared-sounding class WILL collide (`.fx-msg-actions` collided with the AI
     chat widget and silently inherited `opacity: 0`).
  3. Demo server sends no cache headers — phantom "function not defined" console
     errors are usually stale cache. Hard-reload before debugging.
  4. HTML5 drag is not synthesizable via browser tools (dispatch `DragEvent` +
     `DataTransfer` instead); pointer-event drags ARE testable; wrap
     `setPointerCapture` in try/catch; never call `window.print()` in the browser
     session; page scrolling: use `End`/`scrollIntoView`, wheel gets captured by
     inner scrollers. Screenshots ≈1568px wide vs 1920 CSS px (DPR ≈ 1.2245).
  5. User browses the demo themselves: before judging colors check
     `localStorage.fx-brand`; after dark/brand testing restore **light + their
     brand**.
- **NAV growth plan:** the Apps group is at 11 items. When Wave V lands its first
  page, split the sidebar into "Apps" (charts, projects, AI, workflows, editor,
  motion) and a new group **"Industries"** (support, business, dev & API, people,
  collab + all new vertical pages). Public pages join the "Marketing site" group
  (rename to **"Public site"** when the store lands). Command palette follows NAV
  automatically.

---

## WAVE V — Vertical depth I: CRM, trading, wizards, mobile, commerce, banking (v0.4)

Everything below runs the §1 quality loop steps 1–8, no exceptions: build on the
surface ladder + size scale, light AND dark screenshots, real interaction
evidence, consistency + hierarchy + motion passes, console sweep, one commit per
task. Sources: free/open-source only — MIT/Apache may be distilled with credit
in `research.html`; restricted kits (Aceternity, Preline, shadcnblocks, paid
templates) and proprietary products (Kite, Attio, TradingView…) are
**inspiration-only, never port code**. No serifs, ever.

### ✅ V1. Sales CRM deep → new page `crm.html` ("Sales CRM", Industries group)
New module `css/finix-crm.css` + `js/finix-crm.js`, namespace `fx-crm-*`.
- `fxPipeline(el, {stages, deals, onMove})` — pipeline board (kanban DNA, denser):
  stage columns w/ header = name + deal count + **stage value + weighted value**
  (value × stage probability, both mono); deal cards = company monogram avatar,
  deal name, value (mono), close date (overdue → destructive tint), owner
  avatar, probability chip; drag deal → stage rollups + footer totals re-animate
  (number ticker reuse). Footer bar: total pipeline · weighted forecast · win
  rate. Stage-probability config in data.
- **Contact 360** — compose `fx-split`: left = contact list rows (avatar, name,
  company, last-touch relative time, score chip); center = profile header
  (avatar, title, company link, tags) + attribute well (email/phone/owner/
  source, inline-editable via dg pattern) + tabs: Activity (`fxActivity` reuse,
  email/call/note types), Deals (mini pipeline rows), Notes (composer);
  right rail = "next best action" card + open-deal summary + lead-score card.
- `fx-score` — lead-score ring badge (0–100, color ramp ok/warn/hot) + popover
  factor breakdown rows (+/- contributions, mono).
- `fxQuote(el, {items, taxRate, approvalThreshold})` — CPQ line-item builder:
  product combobox, qty stepper, unit price, per-line discount %; live subtotal
  / discount / tax / **total** (mono, verified math); margin meter; discount >
  threshold ⇒ "Needs approval" badge + `fxApprovals` chain appears; "Generate
  quote" → `fx-doc` printable quote reuse.
- Forecast card — quota vs closed vs weighted-commit (stacked bar or combo via
  fxCharts) + attainment gauge reuse; month selector re-renders.
- Validation: move a deal → assert rollup sums; quote math assertion incl.
  threshold trigger; contact inline-edit persists in DOM state.
- Research (credit in research.html): Twenty CRM + ERPNext/Krayin (open source,
  distill freely) · Attio/Pipedrive/HubSpot (inspiration-only).

### ✅ V2. Trading terminal → new page `trading.html` ("Trading", Industries group)
New module `css/finix-trading.css` + `js/finix-trading.js`, namespace `fx-tr-*`.
Dense, mono-heavy, dark-native — the showcase page. India-flavored data (NSE
symbols, ₹, lots) since candles/order-book atoms already exist.
- Page layout: terminal grid — watchlist left rail · center = candles chart
  (reuse `fxCharts.candles`) over **option chain** · right rail = order ticket +
  market depth. Every region its own inner scroller; zero page overflow.
- `fxWatchlist(el, {symbols})` — rows: symbol + exchange tag, LTP (mono),
  change chip ±%, sparkline; simulated live ticks (interval; price-flash green/
  red ≤250ms, reduced-motion guarded); add-symbol combobox; row click loads
  chart + chain (single source of truth symbol state).
- `fxOrderTicket(el)` — Buy/Sell segmented toggle (success/destructive accent
  swap on whole ticket), qty (lots) + price steppers, order-type select
  (Market/Limit/SL/SL-M — price disabled on market, trigger appears on SL),
  product toggle (Intraday/Delivery), margin required vs available readout
  (verified math: qty·price/leverage), stateful submit → fills into blotter.
- `fxPositions(el, {positions})` — table w/ live P&L per row ((ltp−avg)·qty,
  mono, ±tint, assert math), day/net toggle, square-off action; Holdings tab:
  invested/current/returns KPI row + allocation donut reuse.
- `fxOptionChain(el, {chain, spot})` — strike ladder: CALLS | strike | PUTS;
  ITM cells soft-primary tint (calls below spot, puts above — assert logic),
  ATM row highlighted, OI micro-bars in-cell, LTP + change, expiry select
  re-renders, header spot ticker.
- `fxDepth(el, {bids, asks})` — 5-level ladder, qty bars (success/destructive
  10–14% mixes), totals row, spread readout.
- Trade blotter — order rows (time mono, symbol, side chip, type, status
  open/filled/rejected w/ status dot), cancel on open orders.
- GTT/alerts manager — rule rows (symbol, condition, trigger price) + create row.
- Research: OpenBB/Ghostfolio (AGPL ⇒ inspiration-only, no code) · Kite/Groww/
  TradingView (inspiration-only). All markup original.

### V3. Wizard & flow pack → new page `flows.html` ("Wizards & Flows", Apps group)
New module `css/finix-flows.css` + `js/finix-flows.js`, namespace `fx-wiz-*`.
Orthogonal primitive — later tasks (V5 checkout, E2 intake) depend on it.
- `fxWizard(el, {steps, onFinish, storageKey})` — shell: left vertical progress
  rail (step states pending/active/done/error; completed steps clickable), top
  compact progress bar on narrow (container query); step panels slide
  enter/exit ≤250ms (`@starting-style`, reduced-motion guarded); per-step
  `validate(values)` hook gating Next (inline field errors); **review step**
  auto-generated from all values w/ per-section Edit links; success panel;
  `storageKey` ⇒ save-and-resume via localStorage (restore on reload —
  validation: fill 2 steps, reload page, assert state restored).
- **Branching**: step `next(values)` returns the next step id — demo branch:
  account type Individual vs Business → different document steps.
- **Checkout wizard demo** (feeds V5): Address (form reuse, country select) →
  Shipping (radio cards w/ carrier, ETA, price — selection updates total) →
  Payment (`fx-payment` reuse) → Review (items + totals math asserted) →
  Success (order # mono + `fx-stages` fulfillment preview).
- **KYC wizard demo**: type branch → PAN/ID upload (dropzone + file cards w/
  uploading-progress → verified / rejected-with-reason states) → selfie step
  (CSS camera-frame placeholder) → review → **pending-verification** end state
  (fx-stages: submitted ✓ → under review (active) → verified (pending)).
- **Survey mode** `fxWizard --focus` — Typeform-style one-question-per-screen:
  big type (display scale), top hairline progress, Enter/keyboard advance,
  choice cards w/ A/B/C key hints, rating + NPS reuse, short-text; end screen
  w/ summary. Full keyboard run = the interaction evidence.

### V4. Mobile-first pack → new page `mobile.html` ("Mobile", Apps group)
New module `css/finix-mobile.css` + `js/finix-mobile.js`, namespace `fx-m-*`.
Demo = CSS device frames (`fx-phone`: rounded frame, dynamic-island notch,
status bar, home indicator), each screen a **container-query context**
(`container-type: inline-size`) so components adapt to frame width — no iframes.
- `fx-tabbar` — bottom nav (4–5 items, icon + label, active pill slide, badge
  dot, safe-area padding var).
- `fx-sheet` — bottom sheet: drag handle, pointer-drag between snap points
  (peek/half/full — testable drag), scrim fade, spring-free snap ≤250ms.
- `fx-mlist` — iOS-style grouped inset list: section headers, rows w/ leading
  icon tile, trailing value/chevron/switch; press state = `--hover` fill.
- Swipe-row — pointer-drag reveal of trailing actions (archive/delete tints),
  snap open/closed, tap elsewhere closes (drag = interaction evidence).
- `fx-fab` — floating action button + speed-dial fan-out (staggered ≤250ms).
- Large-title header — collapses to compact bar on screen scroll (scroll-driven
  class toggle, not scroll-timeline — Firefox).
- Mobile segmented control · search bar w/ cancel reveal · pull-to-refresh
  affordance (overscroll pointer sim → spinner reveal).
- **Composed screens in frames:** chat (bubbles reuse) · feed w/ stories rail ·
  profile · settings (fx-mlist) · OTP login (fx-otp reuse) · mobile checkout
  (V3 wizard in focus mode) · banking home teaser (V6 components).
- Validation: sheet + swipe drags via pointer events; container-query proof =
  same component screenshot in narrow frame vs desktop context.

### V5. E-commerce storefront → `demo/site/store.html` + `demo/site/product.html` (Public site group)
New module `css/finix-shop.css` + `js/finix-shop.js`, namespace `fx-shop-*`.
Public pages (fx-mk nav/footer reuse). Product art = self-contained CSS
gradient/pattern tiles + glyphs (no external images ever).
- **PLP (store.html):** filter rail (category checks, price range slider w/
  histogram, color swatches, rating filter) → applied-filter chips row (clear
  each/all); sort select; product cards (art tile, wishlist heart toggle,
  name, price + compare-at strike, stars, hover quick-add); result count;
  live client-side filtering (assert: filter → card count + chips update);
  load-more w/ count.
- **PDP (product.html):** gallery (main + thumb strip, crossfade swap);
  variant pickers (size boxes w/ disabled OOS state, color swatches w/ ring —
  selection updates price/art, asserted); qty stepper; add-to-cart stateful
  button → cart badge increments; sticky buy bar on narrow; accordion
  (details/shipping/returns); reviews block (histogram + cards reuse);
  "pairs well with" carousel reuse.
- **Cart drawer** — side drawer (desktop) / `fx-sheet` (mobile, V4 dep):
  line items w/ qty steppers + remove, **free-shipping progress meter**
  (threshold math asserted), subtotal (mono), checkout CTA → flows.html
  checkout wizard.
- **Order tracking section:** `fx-stages` route + ETA card + delivery updates
  (fxActivity reuse).
- Research: HyperUI ecommerce (MIT, distill) · Medusa/Saleor storefronts
  (open source, inspiration) · Preline (inspiration-only).

### V6. Consumer banking → new page `banking.html` ("Banking", Industries group)
New module `css/finix-bank.css` + `js/finix-bank.js`, namespace `fx-bank-*`.
Desktop layout + one V4 phone frame showing the same components (dogfood the
container-query story).
- Balance hero — total balance (mono, mask/unmask eye toggle), monthly in/out
  chips, spark.
- Account cards row — checking/savings/credit; credit card shows utilization
  bar (warn >70%, asserted).
- Transaction feed — day-grouped rows: merchant glyph tile, name, category
  chip (per-category hue via chart tokens), amount mono ±tint, pending style;
  search + category filter chips (assert filtering); optional running-balance
  column (sums asserted).
- **Card management** — virtual card visual (gradient, chip, masked PAN mono);
  press-and-hold to reveal CVV (reuse fx-apikey hold pattern); freeze toggle
  (instant frosted overlay state); per-category limit sliders; control
  switches (online/intl/ATM/contactless).
- **Transfer flow** — recipient picker (recent avatars + search), amount
  keypad (mobile-style big digits), review sheet → success morph (stateful
  button, no confetti); scheduled transfers list.
- Budgets — category mini-rings (spent/limit, over-budget destructive tint,
  % asserted) + monthly trend spark.
- Bill pay — upcoming due rows (due-date chip warn ramp, autopay badge, pay CTA).
- UPI quick-pay strip — QR placeholder card + VPA input + recent payees row.
- Research: Ghostfolio/Firefly III (inspiration) · Revolut/Monzo/CRED
  (inspiration-only).

### V7. Incidents & status → new page `ops.html` ("Incidents", Industries) + `demo/site/status.html` (Public site)
Small lift, big credibility. Extends finix-devtools module (`fx-ops-*` classes).
- Admin (ops.html): incident list rows (SEV1–3 chips, status open/monitoring/
  resolved, age ticking); incident detail = fxActivity timeline w/ **update
  composer** (posts status-change events, asserted); on-call rotation card
  (24h schedule strip, current shift highlighted, override action); escalation
  policy vertical fx-stages; postmortem template via fx-doc.
- Public (status.html): overall banner (operational/degraded/major states),
  per-service 90-day uptime bars (fx-tracker reuse) + uptime % mono,
  active-incident card, past-incident history list, subscribe capture
  (fx-mk waitlist pattern reuse).
- Research: Upptime + cState (MIT, distill) · Instatus/Statuspage
  (inspiration-only).

### V8. v0.4 integration & release
- NAV restructure per §0.1 (Apps / Industries split; "Public site" rename) +
  command palette verify.
- manifest.json entries + llms.txt lines for **every** new component (verify
  vs actual `window.fx*` exports); version 0.4.0; README component count,
  module table rows, page list; research.html credits card for Wave V sources.
- Full sweep: every new page light+dark screenshots · console clean · zero
  horizontal overflow (`scrollWidth === clientWidth` assert) · brand spot-check
  (ocean + mono) · reduced-motion spot check · restore user theme/brand.
- Memory file update; PLAN.md checkboxes; commit; tag `v0.4.0`.

**Wave V exit criteria:** all 4 user-named arenas (CRM, trading, wizards,
mobile) live; 6 new admin pages + 3 public pages; ~40 new components
registered; every task committed with loop evidence.

---

## WAVE E — Vertical depth II: travel, health, learning, logistics, hospitality + cross-cutting (v0.5)

Same contract: §1 loop per task, one commit per task, free sources only,
namespace per module. Detail below is build-ready; refine data/copy at
execution time, never the quality bar.

### E1. Travel & booking → new page `travel.html` ("Travel", Industries)
Module `css/finix-travel.css` + `js/finix-travel.js`, `fx-tv-*`.
- Search widget: origin/destination comboboxes + swap button (rotate anim),
  date-range picker reuse, travellers/class popover (steppers per type);
  one-way/round toggle.
- **Fare calendar** — month grid, per-day min price, cheapest-day tint ramp,
  select loads results (asserted).
- Results: flight cards (dep/arr times mono, duration bar w/ stop dots,
  airline monogram, price CTA); filter rail (stops, departure-window chips,
  price slider, airline checks — live filtering asserted); sort tabs
  (cheapest/fastest).
- **Seat map** — cabin grid (rows × ABC-DEF), seat states: available/occupied/
  extra-legroom/exit-row/selected (+price), aisle gap, legend; select seats →
  running total asserted.
- Itinerary timeline — segments + layover blocks (short-connection warn <45m,
  asserted); fare rules accordion.
- Boarding pass card — perforated edge (CSS mask dots), PNR/seat/gate mono,
  QR placeholder, wallet-button row.
- Hotel variant: hotel card (stars, amenity icons, per-night price) + room
  rate rows (refundable vs non chips).

### E2. Clinic & healthcare → new page `clinic.html` ("Clinic", Industries)
Module `css/finix-health.css` + `js/finix-health.js`, `fx-hc-*`.
- Provider day grid — 15-min slot columns per provider (calendar reuse),
  booked blocks w/ visit-type hue, click-to-book popover.
- Patient chart header — demographics strip, **allergy alert badges**
  (destructive, always visible), MRN mono.
- Vitals timeline — multi-series line reuse + **normal-range band** (extend
  area threshold → band fill); out-of-range points flagged (asserted).
- Problem list + meds table — active/resolved chips; interaction-warning row
  tint + icon; prescription composer (drug combobox, dose/freq/duration
  steppers, sig preview line).
- Intake wizard — fxWizard reuse (V3 dep) w/ consent step = fxSignature reuse.
- Queue board — waiting/in-room/done lanes (`fx-kanban--lanes` reuse) w/
  wait-time ageing chips.
- Strict ladder discipline: clinical alerts use semantic tints only — no new
  colors.

### E3. Learning / LMS → new page `learn.html` ("Learning", Industries)
Module `css/finix-learn.css` + `js/finix-learn.js`, `fx-lms-*`.
- Course catalog cards — art tile (CSS), level badge, progress ring, rating.
- Curriculum tree — modules → lessons w/ done checks, duration mono, locked
  state (lock icon + muted), current-lesson highlight; progress rollup per
  module (asserted).
- Lesson player layout — video placeholder (16:9 well + play affordance),
  transcript rail w/ active-line sync sim, notes composer, prev/next footer.
- **Quiz set** — MCQ cards (instant correct/incorrect states, success/
  destructive tints + shake-free feedback), reorder question (pointer sortable
  reuse), fill-blank input; results screen (score gauge reuse + per-question
  review rows); score math asserted.
- Streak calendar (timeheat reuse) · leaderboard rows (rank medals, delta
  chips) · certificate = fx-doc variant (print-verified).

### E4. Logistics & fleet → new page `logistics.html` ("Logistics", Industries)
Module `css/finix-logi.css` + `js/finix-logi.js`, `fx-lg-*`.
- Shipment board — cards w/ fx-stages route progress, exception tint + reason
  chip, ETA countdown (fx-sla reuse).
- Route map placeholder — self-contained SVG map w/ route polyline + moving
  dot (`offset-path`, reduced-motion static); scan-event markers.
- Scan timeline — fxActivity variant w/ location + facility codes (mono).
- Warehouse bin grid — aisle × bay occupancy heat (sequential ramp), hover
  detail, click → bin contents rows.
- Pick list — barcode mono rows, scan-check simulation (keyboard input marks
  row picked, progress meter asserted).
- Driver manifest — stop rows w/ ETA windows, reorder via sortable (drag
  evidence), capacity meter.
- Exceptions queue — resolve/reroute actions w/ confirm.

### E5. POS & hospitality → new page `hospitality.html` ("Hospitality", Industries)
Module `css/finix-pos.css` + `js/finix-pos.js`, `fx-pos-*`.
- POS register — category tabs + menu-item tile grid (price mono, 86'd/out
  state) | ticket rail (items, modifiers indented, course separators,
  running total asserted); tender buttons row.
- **Split bill** — dialog: by-item assignment chips / equal-split stepper;
  per-person totals must sum to check total (asserted).
- Table floor plan — SVG tables (2/4/6-top shapes), state colors (open/
  seated/check-dropped), occupied-timer chips; click seats a party.
- KDS — kitchen ticket cards w/ ageing color ramp (ok → warn → late,
  time-driven, asserted), bump action, all-day counts rail.
- PMS — room-grid calendar (rooms × nights, reservation bars spanning nights,
  status hues, hover detail; no drag in v1 — note it); housekeeping board
  (clean/dirty/inspected chips); rate calendar w/ inline per-night price edit
  (dg pattern).

### E6. Settings IA + extended auth → new page `settings.html` (Apps) + `auth.html` additions
No new module — primitives exist; this is composition + a few `fx-set-*` bits.
- Settings shell — left settings nav (Profile/Workspace/Members/Notifications/
  Billing/API/Danger), content panes swap (hash-routed, deep-linkable).
- Profile (avatar upload → fxCropper reuse) · Workspace (name/logo/domain
  rows) · Members (invite composer + role select + pending chips; reuse
  entity rows) · **Notifications matrix** (channel × event checkbox grid —
  fxPermMatrix reuse) · Billing (plan card + seat usage meter + payment-method
  rows + invoice table reuse) · Danger zone (destructive well + confirm-typing
  dialog reuse).
- Auth additions: **2FA setup** (QR placeholder + secret mono + verify via
  fx-otp reuse, success state) · backup-codes grid (mono, copy-all, "used"
  strikethrough state) · passkey rows (device icon, added/last-used, revoke) ·
  SSO page (Google/GitHub/Okta buttons + org-discovery email input) · device
  sessions list (current-device badge, revoke w/ confirm).

### E7. Edge surfaces & print → `demo/errors/` + print variants
- Error pages (public, minimal shell): 404 (search + popular links), 500
  (trace-id mono + retry + status link), maintenance (countdown reuse),
  offline (auto-retry tick sim). Each light+dark, zero console.
- Empty-state gallery card on feedback.html consolidating the empty/zero
  patterns (first-run, no-results, error, permission-denied).
- Print pack: bank statement + trading contract note as fx-doc variants;
  verify via print-preview screenshot of @media print styles (never
  window.print() in the browser session — render check via emulated media in
  devtools protocol or visual inspection of print stylesheet rules).

### E8. v0.5 integration & release
Same shape as V8: manifest/llms/README/research.html; full new-page sweep
(light+dark, console, overflow, brand + reduced-motion spot checks, restore
user theme/brand); memory + PLAN checkboxes; commit; tag `v0.5.0`.

**Wave E exit criteria:** 5 new industry pages + settings + error surfaces;
manifest ≥ ~215 components, all verified against real exports.

---

## Wave V/E sequencing & dependencies

- Order: V1→V8, then E1→E8. Hard deps: **V3 before V5** (checkout wizard) and
  **before E2** (intake); **V4 before V5** (cart sheet on mobile) and **before
  V6** (phone-frame demo). V1/V2 are independent — if a session stalls on one,
  the other is safe to pick up.
- Mark `### V{n}` → `### ✅ V{n}` (same for E) when a task's loop completes —
  this file is the single source of truth for resume.
- Stateless resume recipe: read §0 + §0.1 + §1 + this section, then
  `git log --oneline -15` + `git tag`, then start the first unchecked task.
  Never start a task without the demo server running and a hard-reloaded
  baseline screenshot.
