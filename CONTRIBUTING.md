# Contributing to finixui

Thanks for helping. finixui has one hard constraint and one house style —
both are non-negotiable and everything else is easy.

## The constraint

**Plain HTML/CSS/JS, zero runtime dependencies, no build step for
consumers.** Native `<dialog>`, the Popover API, `<details name>`,
container queries. If a feature needs a framework or a bundler to work,
it doesn't belong here. (Dev-time tooling — Playwright, esbuild for the
optional `dist/` bundles — is fine.)

## House style

- **Surface ladder**: fills come from the named tokens only —
  `--background` < `--well` < `--card` < `--popover`, pointer fills use
  `--hover`, internal dividers `--border-soft`, structural borders
  `--border`. Never invent a gray mix.
- **Size scale**: controls 2rem (sm 1.75 / lg 2.25); radius roles
  `--radius-md` controls, `--radius-lg` inner, `--radius-xl` cards; data
  values in `--font-mono`; focus = border-ring + 3px ring.
- **Motion**: ≤250ms, `var(--ease-out)`, everything behind
  `prefers-reduced-motion`.
- **Namespacing**: every module owns a prefix (`fx-crm-*`, `fx-tr-*`, …).
  Shared-sounding bare class names collide — we learned the hard way.
- **Escaping**: any option-provided string rendered via `innerHTML` goes
  through `fxEsc()`. Fields that intentionally accept HTML must be named
  `html` and documented.
- **No serif fonts.** Geist + Geist Mono only (self-hosted in
  `assets/fonts/`).

## Workflow

1. Build the component in its module (`css/finix-<module>.css` +
   `js/finix-<module>.js`) and add a demo section to the mapped page.
2. Register it: an entry in `manifest.json` (classes, markup snippet, JS
   hook) and a line in `llms.txt`.
3. Validate: light **and** dark, real interactions, zero console errors,
   zero horizontal overflow (`scrollWidth === clientWidth`), reduced
   motion respected.
4. `npm test` (Playwright smoke suite) must pass.
5. One PR per component or tight component pair; imperative commit
   subject + bullet body.

## Bug reports

Use the issue template. A repro on the hosted demo
(https://javajack.github.io/finix-ui/) plus browser + OS beats a
paragraph of description.
