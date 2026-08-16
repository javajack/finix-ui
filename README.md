# Finix UI

**A best-in-class admin framework in plain HTML/CSS/JS — the shadcn ecosystem's finest free patterns, distilled for every stack.**

**Live demo:** [javajack.github.io/finix-ui](https://javajack.github.io/finix-ui/) — [marketing site](https://javajack.github.io/finix-ui/demo/site/home.html) · [admin demo](https://javajack.github.io/finix-ui/demo/index.html) · [storefront](https://javajack.github.io/finix-ui/demo/site/store.html) · [status page](https://javajack.github.io/finix-ui/demo/site/status.html)

Finix UI ports the shadcn/ui v4 visual language (verbatim OKLCH token system) and the strongest free component patterns from across its ecosystem — ReUI, Kibo UI, Tremor, assistant-ui, Shadcn Studio, Animate UI, and more — into a dependency-free, framework-agnostic kit. No React. No build step. Works in Rails, Django, Laravel, Go templates, PHP, JSP, or a plain `.html` file.

## Why it doesn't look generic

The entire shadcn ecosystem shares one CSS-variable token contract. Finix ports that contract **verbatim** (`--background`, `--primary`, `--radius`, `--chart-1…5`, OKLCH values included), so every component is pixel-faithful to the originals — and interaction details (entry animations, focus rings, hover states, chart tooltips) are reproduced with `@starting-style` transitions, the Popover API, native `<dialog>`, and `<details name>` exclusive accordions.

## Quick start

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/finix.css">
<link rel="stylesheet" href="css/finix-widgets.css"> <!-- app-shell & widgets -->
<script defer src="js/finix.js"></script>
```

```html
<html data-theme="dark" data-brand="ocean">
```

Two orthogonal theme axes: **mode** (`light`/`dark`) × **brand** (`finix` warm-sage default, `mono`, `ocean`, `forest`, `sunset`). Add your own brand by overriding `--primary`, `--ring`, `--chart-*` under `[data-brand="acme"]`.

## What's inside

**218 registered components** (see `manifest.json`), organized in composable layers:

| Layer | Contents |
|---|---|
| `css/tokens.css` | OKLCH design tokens, 2 modes × 4 brands, shadows, radii, easing |
| `css/finix.css` | ~65 primitives: buttons, badges, cards, every form control (incl. OTP, tags, rating, combobox, multi-select, phone, masked, number field, password strength, date + date-range pickers, dropzone), tables w/ sort, tabs, accordion, menus, dialogs (incl. stacked + confirm-typing), command palette, toasts, stepper, timeline + `fxActivity` activity feed, `fx-stages` staged status, `fx-split` split-pane + `fxPeek` record panel, tree, sortable, notification center, empty states |
| `css/finix-widgets.css` | App shell (sidebar/topbar), KPI stat cards, Tremor-style tracker/bar-list/category-bar, kanban, AI chat, chart chrome, heatmap |
| `js/finix.js` | All behaviors, data-attribute driven: `finix.toast()`, `finix.setTheme()`, positioning, ⌘K palette, kanban DnD, table sort/filter, number tickers |
| `css/finix-datagrid.css` + `js/finix-datagrid.js` | Optional full data grid (`fxDataGrid`): sort, search, column resize/reorder/pin/hide, inline edit, selection, pagination + Linear-style `fxFilterBar` |
| `css/finix-apps.css` + `js/finix-apps.js` | App components: event calendar (month/week, drag events), Gantt (draggable bars), Notion-style filter builder, virtualized log table (50k rows, live tail), `fxImporter` CSV import wizard |
| `css/finix-domains.css` + `js/finix-domains.js` | Domain components: ticker tape, order book, ledger, pricing/usage/invoices, entity cards, comments w/ @mentions, reviews, org chart, timesheet, review matrix, `fxInbox` ticket inbox + SLA chips + CSAT, `fxMessages` channel + `fxEmoji` picker + facepiles, `fxCallTiles`, `fxApprovals`, `fxSkuMatrix` + order detail, `fx-payment`, `fx-doc` printable invoice, `fxRecon` reconciliation, `fxAccountsTree` |
| `css/finix-devtools.css` + `js/finix-devtools.js` | Developer platform: `fxDiff` unified/split diff viewer, API-key rows (hold-to-reveal), env-var editor, webhook delivery log, `fxJsonTree`, feature flags + rollout balance + experiments, `fxPermMatrix`, `fxAuditLog`, `fxTraceWaterfall` |
| `js/finix-canvas.js` | `fxCanvas` workflow node canvas: pan/zoom, drag-arrange, bezier edges w/ animated running dash, minimap + `fxSchemaForm` config forms |
| `css/finix-marketing.css` + `js/finix-marketing.js` | Marketing kit (`fx-mk-*`): heroes w/ aurora + live browser frames, logo marquee, bento, zig-zag, stats counter-up, testimonial carousel + tweet wall, pricing w/ billing toggle, comparison table, ROI calculator, waitlist + countdown, CTA band, footer — see `demo/site/` |
| `css/finix-crm.css` + `js/finix-crm.js` | Sales CRM: `fxPipeline` weighted pipeline board (pointer-drag, live forecast rollups), `fxScore` lead-score ring w/ factor popover, `fxQuote` CPQ builder w/ approval gates, contact-360 recipe |
| `css/finix-trading.css` + `js/finix-trading.js` | Trading terminal: `fxWatchlist` live ticks, `fxOrderTicket` w/ margin math, `fxOptionChain` (ITM/ATM logic), `fxDepth`, `fxPositions` P&L, `fxBlotter` — see `demo/trading.html` |
| `css/finix-flows.css` + `js/finix-flows.js` | `fxWizard` flow engine: declarative steps, branching, validation gates, auto review, localStorage save-and-resume, Typeform-style focus mode — checkout/KYC/survey demos |
| `css/finix-mobile.css` + `js/finix-mobile.js` | Mobile-first kit: CSS device frames w/ container-query screens, `fxSheet` snap bottom sheet, swipe rows, tab bar, FAB speed dial, large-title collapse, pull-to-refresh |
| `css/finix-shop.css` + `js/finix-shop.js` | Storefront: PLP live filters + product cards (CSS gradient art), PDP variants/gallery, `fxShopCart` cross-page cart drawer w/ free-shipping meter |
| `css/finix-bank.css` + `js/finix-bank.js` | Consumer banking: `fxBankFeed` running-balance feed, `fxBankCard` freeze + hold-to-reveal, `fxTransfer` keypad flow, `fxBankBudgets` rings, bills + UPI |
| `css/finix-travel.css` + `js/finix-travel.js` | Travel: `fxFareCal` fare calendar, `fxFlights` live-filtered results, `fxSeatMap` w/ running total; itinerary, boarding pass, hotel rates |
| `css/finix-health.css` + `js/finix-health.js` | Clinic: `fxDayGrid` click-to-book scheduler, `fxRx` composer w/ interaction warnings; patient chart, vitals band, queue board |
| `css/finix-learn.css` + `js/finix-learn.js` | LMS: `fxCurriculum` tree w/ rollups + locks, `fxQuiz` (instant MCQ + drag-order + gauge); lesson player, leaderboard, certificate |
| `css/finix-logi.css` + `js/finix-logi.js` | Logistics: `fxBinGrid` warehouse heat, `fxPickList` scan-to-pick; shipments w/ SLA, CSS route map w/ moving truck, run sheet |
| `css/finix-pos.css` + `js/finix-pos.js` | POS & hotel: `fxPos` register w/ live totals + split bill, `fxKds` ageing kitchen tickets, `fxRoomGrid` front desk; floor plan |
| `js/finix-editor.js` | `fxEditor` — Notion-style rich text (bubble menu, slash commands, md shortcuts) + `fxCropper` — image crop with aspect lock |
| `demo/charts.js` | Dependency-free SVG charts: area/line (w/ alert thresholds), bars (incl. negative + stacked), hbars, combo, scatter, donut, gauge, spark, funnel, cohort grid, candlestick, time heatmap — interactive legends & tooltips, re-render on theme change |
| `demo/` | Full admin template, 30 pages + a 6-page public site (`demo/site/`) + 4 edge pages (`demo/errors/`): Dashboard, Forms, Data & Tables, Navigation & Overlays, Feedback & Status, Charts, Projects, Wizards & Flows, AI Assistant, Mobile, Settings, Sales CRM, Trading, Banking, Travel, Clinic, Learning, Logistics, Hospitality, Support, Business Ops, Dev & API, Workflows, People & HR, Collaboration, Incidents, Editor & Media, Motion Lab, Auth, Research |
| `manifest.json` + `llms.txt` | Machine-readable registry for AI agents: component → classes → markup → JS hook |

## Run the demo

Hosted: **[javajack.github.io/finix-ui](https://javajack.github.io/finix-ui/)** (GitHub Pages, served from the `gh-pages` branch).

Locally:

```bash
cd finix-ui && python3 -m http.server 8613
# open http://localhost:8613/demo/
```

## Browser support

Chrome/Edge 125+, Safari 17.4+, Firefox 129+ (Popover API + `@starting-style`). Accordion height animation enhances progressively via `interpolate-size`.

## Provenance & license

MIT. Derived-from and inspired-by sources are all MIT/Apache-2.0 — full attribution in `demo/research.html`.
