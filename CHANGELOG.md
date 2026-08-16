# Changelog

All notable changes to finixui. Format loosely follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver.

## [Unreleased — 0.6.0]

Production-readiness wave: MIT LICENSE file, XSS-safe rendering contract
(`fxEsc`, all option text escaped), interval leak guards, npm packaging +
`dist/` minified bundles with SRI, self-hosted Geist fonts, accessibility
pass (keyboard move mode for the pipeline board, sheet keys, aria-live
toasts), Playwright smoke suite + GitHub Actions CI + auto Pages deploy,
generated component reference from manifest.json, locale/currency options,
browser fallbacks, examples/.

## [0.5.0] — 2026-08-17

Vertical depth II. New modules: **travel** (fare calendar, live-filtered
flights, seat map, boarding pass), **health** (provider day grid, rx
composer with interaction warnings, vitals normal-range band, signed
intake), **learn** (curriculum tree, transcript-synced player, graded
quiz), **logi** (bin heat, scan-to-pick, CSS route map), **pos**
(register + split bill, floor plan, KDS, hotel room grid). Settings IA
(hash-routed), account-security cards, full-page edge states
(404/500/maintenance/offline), printable statement/contract note.
218 components, 30 admin + 6 public + 4 edge pages.

## [0.4.0] — 2026-08-17

Vertical depth I. New modules: **crm** (weighted pipeline board, contact
360, lead score, CPQ quotes), **trading** (watchlist, order ticket with
margin math, option chain, depth, positions, blotter), **flows**
(fxWizard: branching, validation, save-and-resume, survey mode),
**mobile** (device frames with container queries, snap bottom sheet,
swipe rows, FAB), **shop** (PLP/PDP + cross-page cart with free-shipping
meter), **bank** (running-balance feed, virtual card, transfer flow,
budgets), incidents console + public status page. 197 components.

## [0.3.0] — 2026-08-17

Public-web arena: **marketing** module (fx-mk-*) — heroes with live
browser frames, logo marquee, bento, pricing with billing toggle,
comparison table, ROI calculator, waitlist with queue position + referral
reveal, countdown, tweet wall. Pages: home, launch, pricing. 160
components.

## [0.2.0] — 2026-08-17

Domain build-out (T1–T20): activity timeline v2, split-pane + record
peek, diff viewer, dev/API set (keys, env vars, webhooks, flags,
experiments), CSV import wizard, funnel + cohort + candles + time-heat
charts, product tour + NPS, ticket inbox with SLA, channel messages +
emoji picker + call tiles, payment sheet, SKU matrix, approvals,
signature pad, slot picker, permission matrix, audit log, workflow node
canvas, issue list + swimlanes, reconciliation, accounts tree, trace
waterfall. 140 components.

## [0.1.0] — 2026-08-16

Initial kit: OKLCH token system (light/dark × 5 brands), ~65 primitives,
app shell, data grid, charts, kanban, calendar, gantt, editor, AI chat,
auth pages, manifest.json + llms.txt.
