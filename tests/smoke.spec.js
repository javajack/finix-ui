// @ts-check
/**
 * finixui smoke suite — codifies the manual quality loop:
 * every page loads with ZERO console errors and ZERO horizontal overflow,
 * plus behavior assertions through the demo pages' window.__ handles.
 */
import { test, expect } from "@playwright/test";

const ADMIN = [
  "index", "forms", "data", "overlays", "feedback", "charts", "scheduling",
  "flows", "ai", "mobile", "settings", "crm", "trading", "banking", "travel",
  "clinic", "learn", "logistics", "hospitality", "support", "business",
  "devtools", "workflow", "people", "collab", "ops", "editor", "motion",
  "auth", "research",
].map((p) => `/demo/${p}.html`);
const SITE = ["home", "launch", "pricing", "store", "product", "status"].map((p) => `/demo/site/${p}.html`);
const ERRORS = ["404", "500", "maintenance", "offline"].map((p) => `/demo/errors/${p}.html`);

/** Load a page collecting console errors + uncaught exceptions. */
async function load(page, url) {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400); // deferred init + first ticks
  return errors;
}

for (const url of [...ADMIN, ...SITE, ...ERRORS]) {
  test(`page ${url} is clean`, async ({ page }) => {
    const errors = await load(page, url);
    expect(errors, `console errors on ${url}`).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `horizontal overflow on ${url}`).toBe(0);
  });
}

test("crm: pipeline math + keyboard move", async ({ page }) => {
  await load(page, "/demo/crm.html");
  const t = await page.evaluate(() => window.__pipeline.totals());
  expect(t.total).toBe(660300);
  expect(t.weighted).toBe(300580);
  const moved = await page.evaluate(() => {
    const card = document.querySelector('[data-deal="d5"]');
    card.focus();
    card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return window.__pipeline.deals.find((d) => d.id === "d5").stage;
  });
  expect(moved).toBe("qual");
});

test("crm: quote math + approval threshold", async ({ page }) => {
  await load(page, "/demo/crm.html");
  const q = await page.evaluate(() => window.__quote.totals());
  expect(Math.round(q.total)).toBe(15269);
  expect(q.needsApproval).toBe(false);
});

test("trading: margin + option-chain ITM logic", async ({ page }) => {
  await load(page, "/demo/trading.html");
  const ok = await page.evaluate(() => {
    const spot = window.__chain.spot;
    const rows = [...document.querySelectorAll("#option-chain tbody tr")];
    return rows.every((tr) => {
      const strike = +tr.children[3].textContent.replace(/,/g, "");
      return tr.children[2].classList.contains("is-itm") === strike < spot &&
             tr.children[4].classList.contains("is-itm") === strike > spot;
    });
  });
  expect(ok).toBe(true);
  const margin = await page.evaluate(() => window.__ticket.getMargin());
  expect(margin).toBeGreaterThan(0);
});

test("flows: wizard validation gate + XSS-safe review", async ({ page }) => {
  await load(page, "/demo/flows.html");
  const r = await page.evaluate(async () => {
    localStorage.removeItem("fx-demo-checkout");
    const w = window.__checkout;
    const step0 = w.step;
    w.next(); // empty required fields must block
    const blocked = w.step === step0;
    document.querySelector('#wiz-checkout [name="name"]').value = '<img src=x onerror="window.__xss=1">';
    document.querySelector('#wiz-checkout [name="email"]').value = "a@b.co";
    document.querySelector('#wiz-checkout [name="street"]').value = "s";
    document.querySelector('#wiz-checkout [name="city"]').value = "c";
    w.next(); w.next();
    document.querySelector('#wiz-checkout [name="card"]').value = "4242";
    document.querySelector('#wiz-checkout [name="exp"]').value = "12/28";
    document.querySelector('#wiz-checkout [name="cvc"]').value = "123";
    w.next();
    await new Promise((r) => setTimeout(r, 200));
    const out = {
      blocked,
      step: w.step,
      injected: document.querySelectorAll("#wiz-checkout [data-review] img").length,
    };
    localStorage.removeItem("fx-demo-checkout");
    return out;
  });
  expect(r.blocked).toBe(true);
  expect(r.step).toBe("review");
  expect(r.injected).toBe(0);
});

test("banking: running-balance chain is arithmetically consistent", async ({ page }) => {
  await load(page, "/demo/banking.html");
  const ok = await page.evaluate(() => {
    const r = window.__feed.running();
    return r[0].run === window.__feed.balance &&
      r.every((t, i) => i === 0 || r[i].run === r[i - 1].run - r[i - 1].amount);
  });
  expect(ok).toBe(true);
});

test("store: cart math + free-shipping meter", async ({ page }) => {
  await load(page, "/demo/site/store.html");
  const r = await page.evaluate(() => {
    localStorage.removeItem("fx-shop-cart");
    fxShopCart.clear();
    fxShopCart.add("aurora-kb", { open: false });
    fxShopCart.add("aurora-kb", { open: false });
    const out = { count: fxShopCart.count(), subtotal: fxShopCart.subtotal() };
    fxShopCart.clear();
    localStorage.removeItem("fx-shop-cart");
    return out;
  });
  expect(r.count).toBe(2);
  expect(r.subtotal).toBe(298);
});

test("hospitality: register totals + split sums to check", async ({ page }) => {
  await load(page, "/demo/hospitality.html");
  const r = await page.evaluate(() => {
    const t = window.__pos.totals();
    window.__split.openSplit(t.total);
    const rows = [...document.querySelectorAll("#split-rows .fx-pos-split-row")].slice(0, -1);
    const sum = rows.reduce((a, x) => a + parseFloat(x.querySelector("b").textContent.replace("₹", "")), 0);
    document.getElementById("split-dlg").close();
    return { total: Math.round(t.total * 100) / 100, sum: Math.round(sum * 100) / 100 };
  });
  expect(r.sum).toBeCloseTo(r.total, 2);
});

test("status: uptime percentages match bar states", async ({ page }) => {
  await load(page, "/demo/site/status.html");
  const ok = await page.evaluate(() => {
    const svcs = [...document.querySelectorAll(".fx-ops-svc")];
    return svcs.every((s) => {
      const down = s.querySelectorAll('[data-state="down"]').length;
      const deg = s.querySelectorAll('[data-state="degraded"]').length;
      const total = s.querySelectorAll(".fx-tracker span").length;
      const expected = (100 - ((down + deg * 0.25) / total) * 100).toFixed(2);
      return s.querySelector("[data-uptime]").dataset.uptime === expected;
    });
  });
  expect(ok).toBe(true);
});

test("learn: curriculum rollup + quiz grading", async ({ page }) => {
  await load(page, "/demo/learn.html");
  const r = await page.evaluate(() => {
    const before = window.__curric.progress();
    window.__curric.complete("l5");
    const q = document.getElementById("quiz");
    q.querySelector('[data-q="0"] [data-opt="1"]').click(); // right
    q.querySelector('[data-q="1"] [data-opt="0"]').click(); // wrong
    q.querySelector("[data-quiz-submit]").click();
    return { before, after: window.__curric.progress(), score: window.__quiz.score };
  });
  expect(r.before).toBe(50);
  expect(r.after).toBe(63);
  expect(r.score).toBe(1);
});
