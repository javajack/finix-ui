/*!
 * finix-ui · charts.js — dependency-free SVG charts themed by chart tokens.
 * API: fxCharts.area(el, opts) | .bars(el, opts) | .donut(el, opts) | .spark(el, opts)
 * Colors resolve from --chart-1..5 at render time; charts re-render on theme change.
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const registry = [];

  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function chartColor(i) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--chart-${(i % 5) + 1}`).trim();
  }
  function tipFor(container) {
    let t = container.querySelector(".fx-chart-tip");
    if (!t) {
      t = document.createElement("div");
      t.className = "fx-chart-tip";
      container.appendChild(t);
    }
    return t;
  }
  function fmt(v) { return typeof v === "number" ? v.toLocaleString() : v; }

  /* shared interactive legend: click to toggle series */
  function legend(container, allSeries, opts, rerender) {
    const hid = opts._hidden;
    const lg = document.createElement("div");
    lg.className = "fx-chart-legend";
    allSeries.forEach((sr, i) => {
      const c = sr.color || chartColor(i);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fx-chart-legend-item" + (hid.has(sr.name) ? " is-off" : "");
      b.innerHTML = `<i style="background:${c}"></i>${sr.name}`;
      b.addEventListener("click", () => {
        if (hid.has(sr.name)) hid.delete(sr.name);
        else if (allSeries.length - hid.size > 1) hid.add(sr.name);
        rerender();
      });
      lg.appendChild(b);
    });
    container.appendChild(lg);
  }

  /* ---------- area / line ---------- */
  function area(container, opts) {
    const { labels, height = 260, stacked = false, showLegend = true } = opts;
    const allSeries = opts.series;
    const hid = opts._hidden || (opts._hidden = new Set());
    const series = allSeries.filter((s) => !hid.has(s.name));
    const doFill = opts.fill !== false;
    container.classList.add("fx-chart");
    const W = 720, H = height, PL = 36, PR = 8, PT = 12, PB = 26;
    const iw = W - PL - PR, ih = H - PT - PB;
    const n = labels.length;
    const totals = labels.map((_, i) => stacked ? series.reduce((s, sr) => s + sr.data[i], 0) : Math.max(...series.map((sr) => sr.data[i])));
    const max = Math.max(...totals) * 1.15;
    const x = (i) => PL + (i / (n - 1)) * iw;
    const y = (v) => PT + ih - (v / max) * ih;

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    // grid + y labels
    for (let g = 0; g <= 4; g++) {
      const gy = PT + (ih * g) / 4;
      svg.appendChild(el("line", { x1: PL, x2: W - PR, y1: gy, y2: gy, class: "grid-line" }));
      const lbl = el("text", { x: PL - 8, y: gy + 4, "text-anchor": "end", class: "axis-label" });
      lbl.textContent = Math.round(max * (1 - g / 4)).toLocaleString();
      svg.appendChild(lbl);
    }
    // x labels (thinned)
    const step = Math.ceil(n / 8);
    labels.forEach((l, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      const t = el("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "axis-label" });
      t.textContent = l;
      svg.appendChild(t);
    });

    const defs = el("defs", {});
    svg.appendChild(defs);
    const acc = new Array(n).fill(0);
    const layers = series.map((sr, si) => {
      const c = sr.color || chartColor(allSeries.indexOf(sr));
      const gid = `fxg${Math.floor(Math.random() * 1e9)}`;
      const grad = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
      grad.appendChild(el("stop", { offset: "5%", "stop-color": c, "stop-opacity": 0.55 }));
      grad.appendChild(el("stop", { offset: "95%", "stop-color": c, "stop-opacity": 0.04 }));
      defs.appendChild(grad);

      const base = acc.slice();
      const tops = sr.data.map((v, i) => (stacked ? base[i] + v : v));
      if (stacked) sr.data.forEach((v, i) => (acc[i] += v));

      let dLine = "", dArea = "";
      tops.forEach((v, i) => { dLine += (i ? "L" : "M") + x(i) + " " + y(v) + " "; });
      dArea = dLine + `L ${x(n - 1)} ${y(stacked ? base[n - 1] : 0)} `;
      for (let i = n - 1; i >= 0; i--) dArea += `L ${x(i)} ${y(stacked ? base[i] : 0)} `;
      dArea += "Z";

      if (doFill) svg.appendChild(el("path", { d: dArea, fill: `url(#${gid})`, stroke: "none" }));
      const line = el("path", { d: dLine, fill: "none", stroke: c, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" });
      svg.appendChild(line);
      return { color: c, tops, name: sr.name };
    });

    // hover interaction
    const cursor = el("line", { y1: PT, y2: PT + ih, class: "grid-line", "stroke-dasharray": "none", opacity: 0 });
    cursor.style.stroke = "var(--muted-foreground)";
    svg.appendChild(cursor);
    const dots = layers.map((l) => {
      const d = el("circle", { r: 3.5, fill: l.color, stroke: "var(--background)", "stroke-width": 2, opacity: 0 });
      svg.appendChild(d);
      return d;
    });
    const tip = tipFor(container);
    svg.addEventListener("pointermove", (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - PL) / iw) * (n - 1))));
      cursor.setAttribute("x1", x(i)); cursor.setAttribute("x2", x(i));
      cursor.setAttribute("opacity", 0.5);
      layers.forEach((l, li) => {
        dots[li].setAttribute("cx", x(i));
        dots[li].setAttribute("cy", y(l.tops[i]));
        dots[li].setAttribute("opacity", 1);
      });
      tip.innerHTML = `<div class="fx-chart-tip-title">${labels[i]}</div>` +
        series.map((sr, si) => `<div class="fx-chart-tip-row"><span><i style="background:${layers[si].color}"></i>${sr.name}</span><b>${fmt(sr.data[i])}</b></div>`).join("");
      tip.classList.add("is-visible");
      const cw = container.getBoundingClientRect();
      const tx = ((x(i) / W) * cw.width) + 12;
      tip.style.left = Math.min(tx, cw.width - tip.offsetWidth - 8) + "px";
      tip.style.top = "12px";
    });
    svg.addEventListener("pointerleave", () => {
      tip.classList.remove("is-visible");
      cursor.setAttribute("opacity", 0);
      dots.forEach((d) => d.setAttribute("opacity", 0));
    });

    container.innerHTML = "";
    container.appendChild(svg);
    if (showLegend && allSeries.length > 1) legend(container, allSeries, opts, () => area(container, opts));
  }

  /* ---------- bars ---------- */
  function bars(container, opts) {
    const { labels, height = 260, stacked = false, showLegend = true } = opts;
    const allSeries = opts.series;
    const hid = opts._hidden || (opts._hidden = new Set());
    const series = allSeries.filter((s) => !hid.has(s.name));
    container.classList.add("fx-chart");
    const W = 720, H = height, PL = 42, PR = 8, PT = 12, PB = 26;
    const iw = W - PL - PR, ih = H - PT - PB;
    const n = labels.length;
    const totals = labels.map((_, i) => stacked ? series.reduce((s, sr) => s + sr.data[i], 0) : Math.max(...series.map((sr) => sr.data[i])));
    const minV = stacked ? 0 : Math.min(0, ...series.flatMap((sr) => sr.data));
    const max = Math.max(1, Math.max(...totals)) * 1.15;
    const min = minV * 1.15;
    const range = max - min;
    const y = (v) => PT + ih - ((v - min) / range) * ih;

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    for (let g = 0; g <= 4; g++) {
      const gy = PT + (ih * g) / 4;
      svg.appendChild(el("line", { x1: PL, x2: W - PR, y1: gy, y2: gy, class: "grid-line" }));
      const lbl = el("text", { x: PL - 8, y: gy + 4, "text-anchor": "end", class: "axis-label" });
      lbl.textContent = Math.round(max - (range * g) / 4).toLocaleString();
      svg.appendChild(lbl);
    }
    if (min < 0) {
      const zl = el("line", { x1: PL, x2: W - PR, y1: y(0), y2: y(0), class: "grid-line" });
      zl.style.strokeDasharray = "none";
      zl.style.stroke = "var(--muted-foreground)";
      zl.style.opacity = "0.5";
      svg.appendChild(zl);
    }
    const slot = iw / n;
    const groupW = slot * 0.62;
    const barW = stacked ? groupW : groupW / series.length;
    const colors = series.map((sr) => sr.color || chartColor(allSeries.indexOf(sr)));
    const groups = [];

    labels.forEach((l, i) => {
      const cx = PL + slot * i + slot / 2;
      const t = el("text", { x: cx, y: H - 8, "text-anchor": "middle", class: "axis-label" });
      if (n <= 14 || i % Math.ceil(n / 10) === 0) t.textContent = l;
      svg.appendChild(t);
      let accY = 0;
      const g = el("g", {});
      series.forEach((sr, si) => {
        const v = sr.data[i];
        let bx, by, bh;
        if (stacked) { bx = cx - groupW / 2; bh = (ih * v) / range; by = y(accY + v); accY += v; }
        else { bx = cx - groupW / 2 + si * barW; by = Math.min(y(v), y(0)); bh = Math.abs(y(v) - y(0)); }
        const r = Math.min(4, barW / 2);
        g.appendChild(el("rect", { x: bx, y: by, width: (stacked ? groupW : barW) - (stacked ? 0 : 2), height: Math.max(bh, 1), rx: r, fill: colors[si] }));
      });
      svg.appendChild(g);
      groups.push({ g, cx, label: l, i });
    });

    const tip = tipFor(container);
    svg.addEventListener("pointermove", (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.floor((px - PL) / slot)));
      groups.forEach((gr) => (gr.g.style.opacity = gr.i === i ? 1 : 0.55));
      tip.innerHTML = `<div class="fx-chart-tip-title">${labels[i]}</div>` +
        series.map((sr, si) => `<div class="fx-chart-tip-row"><span><i style="background:${colors[si]}"></i>${sr.name}</span><b>${fmt(sr.data[i])}</b></div>`).join("");
      tip.classList.add("is-visible");
      const cw = container.getBoundingClientRect();
      tip.style.left = Math.min(((PL + slot * i + slot / 2) / W) * cw.width + 12, cw.width - tip.offsetWidth - 8) + "px";
      tip.style.top = "12px";
    });
    svg.addEventListener("pointerleave", () => {
      tip.classList.remove("is-visible");
      groups.forEach((gr) => (gr.g.style.opacity = 1));
    });

    container.innerHTML = "";
    container.appendChild(svg);
    if (showLegend && allSeries.length > 1) legend(container, allSeries, opts, () => bars(container, opts));
  }

  /* ---------- donut ---------- */
  function donut(container, opts) {
    const { data, size = 200, thickness = 26, centerLabel, centerValue } = opts;
    container.classList.add("fx-chart");
    const R = size / 2, r = R - thickness / 2;
    const total = data.reduce((s, d) => s + d.value, 0);
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, role: "img", style: `max-width:${size}px;margin:0 auto` });
    let angle = -90;
    const segs = data.map((d, i) => {
      const frac = d.value / total;
      const a0 = (angle * Math.PI) / 180;
      angle += frac * 360;
      const a1 = (angle * Math.PI) / 180 - 0.03;
      const large = frac > 0.5 ? 1 : 0;
      const p = el("path", {
        d: `M ${R + r * Math.cos(a0)} ${R + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${R + r * Math.cos(a1)} ${R + r * Math.sin(a1)}`,
        fill: "none", stroke: d.color || chartColor(i), "stroke-width": thickness, "stroke-linecap": "butt",
      });
      p.style.transition = "opacity .15s";
      svg.appendChild(p);
      return { p, d, color: d.color || chartColor(i) };
    });
    if (centerValue) {
      const t1 = el("text", { x: R, y: R - 2, "text-anchor": "middle", style: "font-size:22px;font-weight:600", fill: "var(--foreground)" });
      t1.textContent = centerValue;
      const t2 = el("text", { x: R, y: R + 16, "text-anchor": "middle", class: "axis-label" });
      t2.textContent = centerLabel || "";
      svg.append(t1, t2);
    }
    const tip = tipFor(container);
    segs.forEach((s) => {
      s.p.addEventListener("pointerenter", () => {
        segs.forEach((o) => (o.p.style.opacity = o === s ? 1 : 0.4));
        tip.innerHTML = `<div class="fx-chart-tip-row"><span><i style="background:${s.color}"></i>${s.d.name}</span><b>${fmt(s.d.value)}</b></div>`;
        tip.classList.add("is-visible");
        tip.style.left = "50%"; tip.style.top = "0"; tip.style.transform = "translateX(-50%)";
      });
      s.p.addEventListener("pointerleave", () => {
        segs.forEach((o) => (o.p.style.opacity = 1));
        tip.classList.remove("is-visible");
      });
    });
    container.innerHTML = "";
    container.appendChild(svg);
    const lg = document.createElement("div");
    lg.className = "fx-chart-legend";
    lg.innerHTML = data.map((d, i) => `<span><i style="background:${d.color || chartColor(i)}"></i>${d.name}</span>`).join("");
    container.appendChild(lg);
  }

  /* ---------- sparkline ---------- */
  function spark(container, opts) {
    const { data, width = 120, height = 36, color, fill = true } = opts;
    const c = color || chartColor(0);
    const max = Math.max(...data) * 1.1, min = Math.min(...data) * 0.9;
    const x = (i) => (i / (data.length - 1)) * width;
    const y = (v) => height - ((v - min) / (max - min)) * (height - 4) - 2;
    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, style: `width:${width}px;height:${height}px`, preserveAspectRatio: "none" });
    let d = "";
    data.forEach((v, i) => (d += (i ? "L" : "M") + x(i) + " " + y(v) + " "));
    if (fill) {
      const gid = `fxs${Math.floor(Math.random() * 1e9)}`;
      const defs = el("defs", {});
      const grad = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
      grad.appendChild(el("stop", { offset: "0%", "stop-color": c, "stop-opacity": 0.4 }));
      grad.appendChild(el("stop", { offset: "100%", "stop-color": c, "stop-opacity": 0 }));
      defs.appendChild(grad);
      svg.appendChild(defs);
      svg.appendChild(el("path", { d: d + `L ${width} ${height} L 0 ${height} Z`, fill: `url(#${gid})` }));
    }
    svg.appendChild(el("path", { d, fill: "none", stroke: c, "stroke-width": 1.5, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    container.innerHTML = "";
    container.appendChild(svg);
  }

  /* ---------- horizontal bars ---------- */
  function hbars(container, opts) {
    const { data, height, color, showValues = true } = opts; // data: [{label, value}]
    container.classList.add("fx-chart");
    const W = 720, rowH = 34, PL = 110, PR = 60, PT = 8;
    const H = height || PT * 2 + data.length * rowH;
    const iw = W - PL - PR;
    const max = Math.max(...data.map((d) => d.value)) * 1.05;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    for (let g = 0; g <= 4; g++) {
      const gx = PL + (iw * g) / 4;
      svg.appendChild(el("line", { x1: gx, x2: gx, y1: PT, y2: H - PT, class: "grid-line" }));
    }
    const tip = tipFor(container);
    data.forEach((d, i) => {
      const cy = PT + i * rowH + rowH / 2;
      const lbl = el("text", { x: PL - 10, y: cy + 4, "text-anchor": "end", class: "axis-label" });
      lbl.textContent = d.label;
      svg.appendChild(lbl);
      const w = (d.value / max) * iw;
      const bar = el("rect", { x: PL, y: cy - 10, width: Math.max(w, 1), height: 20, rx: 4, fill: d.color || color || chartColor(0) });
      bar.style.transition = "opacity .12s";
      svg.appendChild(bar);
      if (showValues) {
        const vt = el("text", { x: PL + w + 8, y: cy + 4, class: "axis-label", style: "font-weight:600" });
        vt.textContent = fmt(d.value);
        svg.appendChild(vt);
      }
      bar.addEventListener("pointerenter", () => {
        svg.querySelectorAll("rect").forEach((r) => (r.style.opacity = r === bar ? 1 : 0.45));
        tip.innerHTML = `<div class="fx-chart-tip-row"><span><i style="background:${d.color || color || chartColor(0)}"></i>${d.label}</span><b>${fmt(d.value)}</b></div>`;
        tip.classList.add("is-visible");
        const cw = container.getBoundingClientRect();
        tip.style.left = Math.min(((PL + w) / W) * cw.width + 10, cw.width - 130) + "px";
        tip.style.top = ((cy - 10) / H) * container.querySelector("svg").getBoundingClientRect().height + "px";
      });
      bar.addEventListener("pointerleave", () => {
        svg.querySelectorAll("rect").forEach((r) => (r.style.opacity = 1));
        tip.classList.remove("is-visible");
      });
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  /* ---------- combo: bars + line ---------- */
  function combo(container, opts) {
    const { labels, bar, line, height = 260 } = opts; // bar/line: {name, data, color?}
    container.classList.add("fx-chart");
    const W = 720, H = height, PL = 42, PR = 42, PT = 12, PB = 26;
    const iw = W - PL - PR, ih = H - PT - PB;
    const n = labels.length;
    const bMax = Math.max(...bar.data) * 1.2;
    const lMax = Math.max(...line.data) * 1.2;
    const yB = (v) => PT + ih - (v / bMax) * ih;
    const yL = (v) => PT + ih - (v / lMax) * ih;
    const bc = bar.color || chartColor(0), lc = line.color || chartColor(1);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    for (let g = 0; g <= 4; g++) {
      const gy = PT + (ih * g) / 4;
      svg.appendChild(el("line", { x1: PL, x2: W - PR, y1: gy, y2: gy, class: "grid-line" }));
      const l1 = el("text", { x: PL - 8, y: gy + 4, "text-anchor": "end", class: "axis-label" });
      l1.textContent = Math.round(bMax * (1 - g / 4)).toLocaleString();
      svg.appendChild(l1);
      const l2 = el("text", { x: W - PR + 8, y: gy + 4, class: "axis-label" });
      l2.textContent = Math.round(lMax * (1 - g / 4)) + "%";
      svg.appendChild(l2);
    }
    const slot = iw / n, barW = slot * 0.55;
    const x = (i) => PL + slot * i + slot / 2;
    labels.forEach((l, i) => {
      const t = el("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "axis-label" });
      if (n <= 14 || i % 2 === 0) t.textContent = l;
      svg.appendChild(t);
      svg.appendChild(el("rect", { x: x(i) - barW / 2, y: yB(bar.data[i]), width: barW, height: ih - (yB(bar.data[i]) - PT), rx: 4, fill: bc, opacity: 0.85 }));
    });
    let d = "";
    line.data.forEach((v, i) => (d += (i ? "L" : "M") + x(i) + " " + yL(v) + " "));
    svg.appendChild(el("path", { d, fill: "none", stroke: lc, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    line.data.forEach((v, i) => svg.appendChild(el("circle", { cx: x(i), cy: yL(v), r: 3.5, fill: lc, stroke: "var(--background)", "stroke-width": 2 })));
    const tip = tipFor(container);
    svg.addEventListener("pointermove", (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.floor((px - PL) / slot)));
      tip.innerHTML = `<div class="fx-chart-tip-title">${labels[i]}</div>` +
        `<div class="fx-chart-tip-row"><span><i style="background:${bc}"></i>${bar.name}</span><b>${fmt(bar.data[i])}</b></div>` +
        `<div class="fx-chart-tip-row"><span><i style="background:${lc}"></i>${line.name}</span><b>${line.data[i]}%</b></div>`;
      tip.classList.add("is-visible");
      const cw = container.getBoundingClientRect();
      tip.style.left = Math.min((x(i) / W) * cw.width + 12, cw.width - tip.offsetWidth - 8) + "px";
      tip.style.top = "12px";
    });
    svg.addEventListener("pointerleave", () => tip.classList.remove("is-visible"));
    container.innerHTML = "";
    container.appendChild(svg);
    const lg = document.createElement("div");
    lg.className = "fx-chart-legend";
    lg.innerHTML = `<span><i style="background:${bc}"></i>${bar.name}</span><span><i style="background:${lc}"></i>${line.name}</span>`;
    container.appendChild(lg);
  }

  /* ---------- scatter ---------- */
  function scatter(container, opts) {
    const { series, height = 280, xLabel = "", yLabel = "" } = opts; // series: [{name, points:[[x,y],...], color?}]
    container.classList.add("fx-chart");
    const W = 720, H = height, PL = 46, PR = 12, PT = 12, PB = 30;
    const iw = W - PL - PR, ih = H - PT - PB;
    const all = series.flatMap((s) => s.points);
    const xMin = Math.min(...all.map((p) => p[0])), xMax = Math.max(...all.map((p) => p[0]));
    const yMin = Math.min(...all.map((p) => p[1])), yMax = Math.max(...all.map((p) => p[1]));
    const xPad = (xMax - xMin) * 0.08 || 1, yPad = (yMax - yMin) * 0.12 || 1;
    const x = (v) => PL + ((v - xMin + xPad) / (xMax - xMin + xPad * 2)) * iw;
    const y = (v) => PT + ih - ((v - yMin + yPad) / (yMax - yMin + yPad * 2)) * ih;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    for (let g = 0; g <= 4; g++) {
      const gy = PT + (ih * g) / 4;
      svg.appendChild(el("line", { x1: PL, x2: W - PR, y1: gy, y2: gy, class: "grid-line" }));
      const vy = yMax + yPad - ((yMax - yMin + yPad * 2) * g) / 4;
      const lbl = el("text", { x: PL - 8, y: gy + 4, "text-anchor": "end", class: "axis-label" });
      lbl.textContent = Math.round(vy).toLocaleString();
      svg.appendChild(lbl);
      const gx = PL + (iw * g) / 4;
      const vx = xMin - xPad + ((xMax - xMin + xPad * 2) * g) / 4;
      const xl = el("text", { x: gx, y: H - 10, "text-anchor": "middle", class: "axis-label" });
      xl.textContent = Math.round(vx).toLocaleString();
      svg.appendChild(xl);
    }
    if (xLabel) { const t = el("text", { x: W / 2, y: H - 0, "text-anchor": "middle", class: "axis-label", style: "font-weight:500" }); t.textContent = xLabel; svg.appendChild(t); }
    const tip = tipFor(container);
    const dots = [];
    series.forEach((s, si) => {
      const c = s.color || chartColor(si);
      s.points.forEach((p) => {
        const dot = el("circle", { cx: x(p[0]), cy: y(p[1]), r: 4.5, fill: c, "fill-opacity": 0.75, stroke: c, "stroke-width": 1 });
        dot.style.transition = "r .1s";
        dot.addEventListener("pointerenter", () => {
          dot.setAttribute("r", 6.5);
          tip.innerHTML = `<div class="fx-chart-tip-row"><span><i style="background:${c}"></i>${s.name}</span></div>
            <div class="fx-chart-tip-row"><span>${xLabel || "x"}</span><b>${fmt(p[0])}</b></div>
            <div class="fx-chart-tip-row"><span>${yLabel || "y"}</span><b>${fmt(p[1])}</b></div>`;
          tip.classList.add("is-visible");
          const cw = container.getBoundingClientRect();
          tip.style.left = Math.min((x(p[0]) / W) * cw.width + 12, cw.width - tip.offsetWidth - 8) + "px";
          tip.style.top = Math.max(4, (y(p[1]) / H) * container.querySelector("svg").getBoundingClientRect().height - 60) + "px";
        });
        dot.addEventListener("pointerleave", () => { dot.setAttribute("r", 4.5); tip.classList.remove("is-visible"); });
        svg.appendChild(dot);
        dots.push(dot);
      });
    });
    container.innerHTML = "";
    container.appendChild(svg);
    if (series.length > 1) {
      const lg = document.createElement("div");
      lg.className = "fx-chart-legend";
      lg.innerHTML = series.map((s, si) => `<span><i style="background:${s.color || chartColor(si)}"></i>${s.name}</span>`).join("");
      container.appendChild(lg);
    }
  }

  /* ---------- gauge ---------- */
  function gauge(container, opts) {
    const { value, max = 100, label = "", size = 170, color, suffix = "%" } = opts;
    container.classList.add("fx-chart");
    const c = color || chartColor(0);
    const R = size / 2, r = R - 13, TH = 13;
    const start = 135, sweep = 270;
    const frac = Math.max(0, Math.min(1, value / max));
    function arc(fracTo) {
      const a0 = ((start) * Math.PI) / 180;
      const a1 = ((start + sweep * fracTo) * Math.PI) / 180;
      const large = sweep * fracTo > 180 ? 1 : 0;
      return `M ${R + r * Math.cos(a0)} ${R + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${R + r * Math.cos(a1)} ${R + r * Math.sin(a1)}`;
    }
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, style: `max-width:${size}px;margin:0 auto` });
    const track = el("path", { d: arc(1), fill: "none", "stroke-width": TH, "stroke-linecap": "round" });
    track.style.stroke = "color-mix(in oklab, var(--muted-foreground) 18%, transparent)";
    svg.appendChild(track);
    const fill = el("path", { d: arc(frac || 0.001), fill: "none", stroke: c, "stroke-width": TH, "stroke-linecap": "round" });
    svg.appendChild(fill);
    const vt = el("text", { x: R, y: R + 2, "text-anchor": "middle", style: "font-size:26px;font-weight:650", fill: "var(--foreground)" });
    vt.textContent = fmt(value) + suffix;
    svg.appendChild(vt);
    const lt = el("text", { x: R, y: R + 22, "text-anchor": "middle", class: "axis-label" });
    lt.textContent = label;
    svg.appendChild(lt);
    container.innerHTML = "";
    container.appendChild(svg);
  }

  /* ---------- candlestick ---------- */
  function candles(container, opts) {
    const { data, height = 280 } = opts;
    container.classList.add("fx-chart");
    const W = 720, H = height, PL = 44, PR = 8, PT = 10, PB = 24;
    const iw = W - PL - PR, ih = H - PT - PB;
    const n = data.length;
    const lo = Math.min(...data.map((d) => d.l)), hi = Math.max(...data.map((d) => d.h));
    const pad = (hi - lo) * 0.06;
    const min = lo - pad, max = hi + pad;
    const y = (v) => PT + ih - ((v - min) / (max - min)) * ih;
    const xc = (i) => PL + ((i + 0.5) / n) * iw;
    const bw = Math.max(3, (iw / n) * 0.62);
    const cs = getComputedStyle(document.documentElement);
    const UP = cs.getPropertyValue("--success").trim() || "#22c55e";
    const DOWN = cs.getPropertyValue("--destructive").trim() || "#ef4444";

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    for (let g = 0; g <= 4; g++) {
      const gy = PT + (ih * g) / 4;
      svg.appendChild(el("line", { x1: PL, x2: W - PR, y1: gy, y2: gy, class: "grid-line" }));
      const lbl = el("text", { x: PL - 8, y: gy + 4, "text-anchor": "end", class: "axis-label" });
      lbl.textContent = (max - ((max - min) * g) / 4).toFixed(0);
      svg.appendChild(lbl);
    }
    const step = Math.ceil(n / 8);
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      const t = el("text", { x: xc(i), y: H - 6, "text-anchor": "middle", class: "axis-label" });
      t.textContent = d.t;
      svg.appendChild(t);
    });
    data.forEach((d, i) => {
      const up = d.c >= d.o;
      const color = up ? UP : DOWN;
      svg.appendChild(el("line", { x1: xc(i), x2: xc(i), y1: y(d.h), y2: y(d.l), stroke: color, "stroke-width": 1.25 }));
      const top = y(Math.max(d.o, d.c)), bot = y(Math.min(d.o, d.c));
      svg.appendChild(el("rect", {
        x: xc(i) - bw / 2, y: top, width: bw, height: Math.max(1.5, bot - top), rx: 1.5,
        fill: up ? color : color, "fill-opacity": up ? 0.9 : 0.9, stroke: color, "stroke-width": 1,
      }));
    });
    // crosshair
    const vline = el("line", { y1: PT, y2: PT + ih, opacity: 0, "stroke-dasharray": "3 3" });
    vline.style.stroke = "var(--muted-foreground)";
    const hline = el("line", { x1: PL, x2: W - PR, opacity: 0, "stroke-dasharray": "3 3" });
    hline.style.stroke = "var(--muted-foreground)";
    svg.append(vline, hline);
    const tip = tipFor(container);
    svg.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const py = ((e.clientY - r.top) / r.height) * H;
      const i = Math.min(n - 1, Math.max(0, Math.floor(((px - PL) / iw) * n)));
      const d = data[i];
      vline.setAttribute("x1", xc(i)); vline.setAttribute("x2", xc(i)); vline.setAttribute("opacity", 1);
      hline.setAttribute("y1", py); hline.setAttribute("y2", py); hline.setAttribute("opacity", 1);
      const up = d.c >= d.o;
      tip.innerHTML = `<b>${d.t}</b><br>O ${d.o.toLocaleString()} · H ${d.h.toLocaleString()}<br>L ${d.l.toLocaleString()} · C <span style="color:${up ? UP : DOWN}">${d.c.toLocaleString()}</span>`;
      const cr = container.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - cr.left + 12, cr.width - 160) + "px";
      tip.style.top = e.clientY - cr.top - 10 + "px";
      tip.style.opacity = 1;
    });
    svg.addEventListener("pointerleave", () => {
      vline.setAttribute("opacity", 0); hline.setAttribute("opacity", 0);
      tip.style.opacity = 0;
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  /* ---------- funnel ---------- */
  function funnel(container, opts) {
    const { steps, height = 240 } = opts;
    container.classList.add("fx-chart");
    const W = 720, H = height, PT = 30, PB = 40;
    const n = steps.length;
    const ih = H - PT - PB;
    const max = steps[0].value || 1;
    const gap = 36;                                  // slope gap between bars
    const bw = (W - gap * (n - 1)) / n;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    const c = chartColor(0);
    const barY = (v) => PT + ih - (v / max) * ih;

    steps.forEach((s, i) => {
      const bx = i * (bw + gap);
      const by = barY(s.value);
      const bh = PT + ih - by;
      // connector slope to next bar
      if (i < n - 1) {
        const ny = barY(steps[i + 1].value);
        const poly = el("polygon", {
          points: `${bx + bw},${by} ${bx + bw + gap},${ny} ${bx + bw + gap},${PT + ih} ${bx + bw},${PT + ih}`,
          fill: c, opacity: 0.14,
        });
        svg.appendChild(poly);
        const drop = steps[i].value ? Math.round((1 - steps[i + 1].value / steps[i].value) * 100) : 0;
        const dl = el("text", { x: bx + bw + gap / 2, y: Math.min(ny, by) - 8, "text-anchor": "middle", class: "axis-label" });
        dl.textContent = `−${drop}%`;
        svg.appendChild(dl);
      }
      const rect = el("rect", { x: bx, y: by, width: bw, height: Math.max(bh, 2), rx: 5, fill: c, opacity: 0.9 - i * (0.55 / Math.max(n - 1, 1)) });
      rect.classList.add("fx-funnel-bar");
      svg.appendChild(rect);
      // value on top
      const vt = el("text", { x: bx + bw / 2, y: by - 8, "text-anchor": "middle", style: "font-size:13px;font-weight:600", fill: "var(--foreground)" });
      vt.textContent = fmt(s.value);
      svg.appendChild(vt);
      // step name + conversion under axis
      const nt = el("text", { x: bx + bw / 2, y: PT + ih + 16, "text-anchor": "middle", class: "axis-label", style: "font-weight:550" });
      nt.textContent = s.name;
      svg.appendChild(nt);
      const ct = el("text", { x: bx + bw / 2, y: PT + ih + 30, "text-anchor": "middle", class: "axis-label" });
      ct.textContent = Math.round((s.value / max) * 100) + "%";
      svg.appendChild(ct);

      const tip = tipFor(container);
      rect.addEventListener("pointerenter", () => {
        const prev = i ? steps[i - 1].value : s.value;
        tip.innerHTML = `<b>${s.name}</b><br>${fmt(s.value)} · ${Math.round((s.value / max) * 100)}% of ${steps[0].name}` +
          (i ? `<br>${Math.round((s.value / prev) * 100)}% from ${steps[i - 1].name}` : "");
        tip.style.opacity = 1;
      });
      rect.addEventListener("pointermove", (e) => {
        const r = container.getBoundingClientRect();
        tip.style.left = Math.min(e.clientX - r.left + 12, r.width - 170) + "px";
        tip.style.top = e.clientY - r.top - 10 + "px";
      });
      rect.addEventListener("pointerleave", () => (tipFor(container).style.opacity = 0));
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  /* ---------- cohort retention grid ---------- */
  function cohort(container, opts) {
    const { rows, colLabel = "Week" } = opts;
    container.classList.add("fx-cohort");
    const maxCols = Math.max(...rows.map((r) => r.values.length));
    const cell = (pct, ri, ci) => {
      if (pct == null) return `<td class="fx-cohort-void"></td>`;
      const strength = Math.round(Math.pow(pct / 100, 0.85) * 88);
      const dark = pct >= 55;
      return `<td class="fx-cohort-cell${dark ? " is-strong" : ""}" data-ri="${ri}" data-ci="${ci}"
        style="background:color-mix(in oklab, var(--chart-1) ${strength}%, var(--card))">${pct}%</td>`;
    };
    container.innerHTML = `<div class="fx-cohort-wrap"><table>
      <thead><tr><th class="fx-cohort-name">Cohort</th><th class="fx-cohort-n">Users</th>
        ${Array.from({ length: maxCols }, (_, i) => `<th>${colLabel} ${i}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r, ri) =>
        `<tr><td class="fx-cohort-name">${r.label}</td><td class="fx-cohort-n">${fmt(r.n)}</td>` +
        Array.from({ length: maxCols }, (_, ci) => cell(r.values[ci] ?? null, ri, ci)).join("") + `</tr>`).join("")}
      </tbody></table></div>`;
    const tip = tipFor(container);
    container.addEventListener("pointermove", (e) => {
      const td = e.target.closest(".fx-cohort-cell");
      if (!td) { tip.style.opacity = 0; return; }
      const r = rows[+td.dataset.ri], ci = +td.dataset.ci;
      const users = Math.round((r.values[ci] / 100) * r.n);
      tip.innerHTML = `<b>${r.label}</b><br>${colLabel.toLowerCase()} ${ci}: ${r.values[ci]}% · ${fmt(users)} of ${fmt(r.n)} users`;
      const rect = container.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - rect.left + 12, rect.width - 180) + "px";
      tip.style.top = e.clientY - rect.top - 10 + "px";
      tip.style.opacity = 1;
    });
    container.addEventListener("pointerleave", () => (tip.style.opacity = 0));
  }

  /* re-render on theme/brand switch so token colors update */
  function register(fn, elc, opts) {
    registry.push({ fn, el: elc, opts });
    fn(elc, opts);
  }
  ["fx:theme", "fx:brand"].forEach((evt) =>
    document.addEventListener(evt, () => registry.forEach((r) => r.fn(r.el, r.opts)))
  );

  window.fxCharts = {
    area: (elc, o) => register(area, elc, o),
    bars: (elc, o) => register(bars, elc, o),
    donut: (elc, o) => register(donut, elc, o),
    spark: (elc, o) => register(spark, elc, o),
    hbars: (elc, o) => register(hbars, elc, o),
    combo: (elc, o) => register(combo, elc, o),
    scatter: (elc, o) => register(scatter, elc, o),
    gauge: (elc, o) => register(gauge, elc, o),
    funnel: (elc, o) => register(funnel, elc, o),
    cohort: (elc, o) => register(cohort, elc, o),
    candles: (elc, o) => register(candles, elc, o),
  };
})();
