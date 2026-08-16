# Security policy

## Supported versions

The latest minor release receives fixes. finixui has **zero runtime
dependencies**, so there is no transitive supply chain to worry about.

## Rendering contract (XSS)

All component options documented as text (names, titles, labels, bodies,
values) are HTML-escaped via `fxEsc()` before rendering. Only fields
explicitly named/documented as `html` are inserted as markup — pass
pre-sanitized content there. If you find an interpolation site that
renders option text unescaped, that is a security bug: please report it.

## Reporting a vulnerability

Open a GitHub security advisory on the repository (Security → Advisories
→ Report a vulnerability) or email the maintainer privately. Please do
not open public issues for exploitable problems. You can expect an
acknowledgement within a few days and a fix or mitigation plan within two
weeks for confirmed issues.
