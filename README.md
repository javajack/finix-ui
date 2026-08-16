# Finix UI

**A best-in-class admin framework in plain HTML/CSS/JS — the shadcn ecosystem's finest free patterns, distilled for every stack.**

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

Two orthogonal theme axes: **mode** (`light`/`dark`) × **brand** (`finix`, `ocean`, `forest`, `slate-green`, `sunset`). Add your own brand by overriding `--primary`, `--ring`, `--chart-*` under `[data-brand="acme"]`.

## What's inside

| Layer | Contents |
|---|---|
| `css/tokens.css` | OKLCH design tokens, 2 modes × 4 brands, shadows, radii, easing |
| `css/finix.css` | ~60 primitives: buttons, badges, cards, every form control (incl. OTP, tags, rating, combobox, multi-select, phone, masked, number field, password strength, date + date-range pickers, dropzone), tables w/ sort, tabs, accordion, menus, dialogs (incl. stacked + confirm-typing), command palette, toasts, stepper, timeline, tree, sortable, notification center, empty states |
| `css/finix-widgets.css` | App shell (sidebar/topbar), KPI stat cards, Tremor-style tracker/bar-list/category-bar, kanban, AI chat, chart chrome, heatmap |
| `js/finix.js` | All behaviors, data-attribute driven: `finix.toast()`, `finix.setTheme()`, positioning, ⌘K palette, kanban DnD, table sort/filter, number tickers |
| `css/finix-datagrid.css` + `js/finix-datagrid.js` | Optional full data grid (`fxDataGrid`): sort, search, column resize/reorder/pin/hide, inline edit, selection, pagination + Linear-style `fxFilterBar` |
| `css/finix-apps.css` + `js/finix-apps.js` | App components: event calendar (month/week, drag events), Gantt (draggable bars), Notion-style filter builder, virtualized log table (50k rows, live tail) |
| `js/finix-editor.js` | `fxEditor` — Notion-style rich text (bubble menu, slash commands, md shortcuts) + `fxCropper` — image crop with aspect lock |
| `demo/charts.js` | Dependency-free SVG charts: area/line, bars (incl. negative + stacked), hbars, combo, scatter, donut, gauge, spark — interactive legends & tooltips, re-render on theme change |
| `demo/` | Full admin template: Dashboard, Forms, Data, Overlays, Feedback, Widgets, Research |
| `manifest.json` + `llms.txt` | Machine-readable registry for AI agents: component → classes → markup → JS hook |

## Run the demo

```bash
cd finix-ui && python3 -m http.server 8613
# open http://localhost:8613/demo/
```

## Browser support

Chrome/Edge 125+, Safari 17.4+, Firefox 129+ (Popover API + `@starting-style`). Accordion height animation enhances progressively via `interpolate-size`.

## Provenance & license

MIT. Derived-from and inspired-by sources are all MIT/Apache-2.0 — full attribution in `demo/research.html`.
