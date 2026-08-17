"""Minimal Flask app rendering a finixui page — no build step, no npm.

    pip install flask && python app.py  ->  http://localhost:5000
"""
from flask import Flask, render_template_string

app = Flask(__name__)

CDN = "https://cdn.jsdelivr.net/gh/javajack/finix-ui@v0.6.0/dist"

PAGE = """<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ title }}</title>
<link rel="stylesheet" href="{{ cdn }}/finix-all.min.css">
<script defer src="{{ cdn }}/finix-all.min.js"></script>
</head>
<body style="padding:2rem;max-width:52rem;margin-inline:auto">
  <h1 class="fx-page-title">{{ title }}</h1>
  <p class="fx-page-sub">Server-rendered by Flask; styled and wired by finixui.</p>

  <div class="fx-grid" style="grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));margin-block:1.25rem">
    {% for s in stats %}
    <div class="fx-card fx-stat">
      <div class="fx-card-content">
        <div class="fx-stat-label">{{ s.label }}</div>
        <div class="fx-stat-value">{{ s.value }}</div>
        <div class="fx-stat-meta">{{ s.meta }}</div>
      </div>
    </div>
    {% endfor %}
  </div>

  <div class="fx-card">
    <div class="fx-card-header">
      <div class="fx-card-title fx-card-title--lg">Orders</div>
    </div>
    <div class="fx-card-content">
      <table class="fx-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          {% for o in orders %}
          <tr>
            <td style="font-family:var(--font-mono)">{{ o.id }}</td>
            <td>{{ o.customer }}</td>
            <td><span class="fx-badge fx-badge--{{ o.tone }}">{{ o.status }}</span></td>
            <td style="text-align:right;font-family:var(--font-mono)">{{ o.amount }}</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
      <button class="fx-btn" style="margin-top:1rem"
        onclick="finix.toast({title:'Hello from finixui', description:'Rendered by Flask, no build step.', variant:'success'})">
        Show a toast
      </button>
    </div>
  </div>
</body>
</html>"""


@app.get("/")
def index():
    return render_template_string(
        PAGE,
        cdn=CDN,
        title="Flask × finixui",
        stats=[
            {"label": "Revenue", "value": "$45,231", "meta": "+20% this month"},
            {"label": "Orders", "value": "1,204", "meta": "38 today"},
            {"label": "Refund rate", "value": "0.4%", "meta": "well under target"},
        ],
        orders=[
            {"id": "#3102", "customer": "Sofia Davis", "status": "Paid", "tone": "success", "amount": "$249.00"},
            {"id": "#3101", "customer": "Jackson Lee", "status": "Pending", "tone": "warning", "amount": "$149.00"},
            {"id": "#3100", "customer": "Ava Patel", "status": "Refunded", "tone": "secondary", "amount": "$89.00"},
        ],
    )


if __name__ == "__main__":
    app.run(debug=True)
