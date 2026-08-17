# Using finixui from a server-rendered stack

finixui is plain CSS + JS — every framework below just emits HTML with
`fx-*` classes. Copy markup from the [component reference]
(https://javajack.github.io/finix-ui/demo/reference.html) or let an AI
agent consume `manifest.json`/`llms.txt`.

## The two lines every stack needs

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/javajack/finix-ui@v0.6.0/dist/finix-all.min.css">
<script defer src="https://cdn.jsdelivr.net/gh/javajack/finix-ui@v0.6.0/dist/finix-all.min.js"></script>
```

(Or `npm i finixui` and serve `dist/`/`css/`/`js/` yourself — no build
step either way. Pin versions; add SRI from `dist/sri.json`.)

## Flask

`flask/app.py` in this folder is a complete runnable example:

```bash
pip install flask && python examples/flask/app.py
# → http://localhost:5000
```

## Rails (ERB partial)

```erb
<%# app/views/shared/_stat_card.html.erb %>
<div class="fx-card fx-stat">
  <div class="fx-card-content">
    <div class="fx-stat-label"><%= label %></div>
    <div class="fx-stat-value"><%= number_to_currency(value) %></div>
  </div>
</div>
```

## Django

```html
{# templates/partials/badge.html #}
<span class="fx-badge fx-badge--{{ tone|default:'secondary' }}">{{ text }}</span>
```

## Laravel (Blade)

```blade
{{-- resources/views/components/toast-button.blade.php --}}
<button class="fx-btn fx-btn--outline"
  onclick="finix.toast({title: @js($title), variant: 'success'})">
  {{ $slot }}
</button>
```

Server-side templating and `fx-*` classes are the whole integration —
behaviors attach via data attributes when `finix.js` loads.
