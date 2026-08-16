/*!
 * finix-ui · finix-canvas.js — workflow node canvas
 * fxCanvas: pan/zoom node graph with bezier edges, drag-arrange nodes,
 * status chips, animated running edges, minimap. Read-and-arrange scope:
 * v1 has no edge re-connection dragging.
 * fxSchemaForm: tiny schema-driven form renderer for node config panels.
 */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const STATUS = {
    idle: "",
    running: '<span class="fx-node-status is-running">Running</span>',
    success: '<span class="fx-node-status is-success">Done</span>',
    failed: '<span class="fx-node-status is-failed">Failed</span>',
  };

  window.fxCanvas = function (root, opts = {}) {
    const nodes = opts.nodes || [];
    const edges = opts.edges || [];
    let view = { x: 40, y: 40, z: 1 };
    let selected = null;
    const NODE_W = 200;

    root.classList.add("fx-canvas");
    root.innerHTML = `
      <div class="fx-canvas-viewport">
        <svg class="fx-canvas-edges" width="1" height="1"></svg>
        <div class="fx-canvas-nodes"></div>
      </div>
      <div class="fx-canvas-minimap"><div class="fx-mm-nodes"></div><div class="fx-mm-view"></div></div>
      <div class="fx-canvas-zoom">
        <button data-cz="out" aria-label="Zoom out">−</button>
        <button data-cz="fit" aria-label="Fit view" class="fx-cz-pct">100%</button>
        <button data-cz="in" aria-label="Zoom in">+</button>
      </div>`;
    const viewport = root.querySelector(".fx-canvas-viewport");
    const svg = root.querySelector(".fx-canvas-edges");
    const nodesEl = root.querySelector(".fx-canvas-nodes");
    const mm = root.querySelector(".fx-canvas-minimap");
    const mmNodes = mm.querySelector(".fx-mm-nodes");
    const mmView = mm.querySelector(".fx-mm-view");

    const byId = (id) => nodes.find((n) => n.id === id);

    function nodeHtml(n) {
      return `<div class="fx-node ${n.status === "running" ? "is-running fx-beam" : ""} ${selected === n.id ? "is-sel" : ""}"
        data-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px;width:${NODE_W}px">
        <div class="fx-node-head">
          <span class="fx-node-icon">${n.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h6v6H9z"/></svg>'}</span>
          <div class="fx-node-titles">
            <span class="fx-node-title">${esc(n.title)}</span>
            <span class="fx-node-sub">${esc(n.sub || "")}</span>
          </div>
          ${STATUS[n.status || "idle"]}
        </div>
      </div>`;
    }

    function renderNodes() {
      nodesEl.innerHTML = nodes.map(nodeHtml).join("");
    }
    function nodeSize(id) {
      const el = nodesEl.querySelector(`[data-node="${id}"]`);
      return { w: el ? el.offsetWidth : NODE_W, h: el ? el.offsetHeight : 52 };
    }
    function drawEdges() {
      const b = bbox();
      const W = b.x + b.w + 200, H = b.y + b.h + 200;
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.style.width = W + "px";
      svg.style.height = H + "px";
      svg.innerHTML = edges.map((e) => {
        const a = byId(e.from), b = byId(e.to);
        if (!a || !b) return "";
        const sa = nodeSize(a.id), sb = nodeSize(b.id);
        const x1 = a.x + sa.w, y1 = a.y + sa.h / 2;
        const x2 = b.x, y2 = b.y + sb.h / 2;
        const dx = Math.min(Math.max(Math.abs(x2 - x1) / 2, 40), 120);
        return `<path class="fx-edge ${e.status === "running" ? "is-running" : ""}"
          d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}"/>`;
      }).join("");
    }
    function applyView() {
      viewport.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
      root.querySelector(".fx-cz-pct").textContent = Math.round(view.z * 100) + "%";
      drawMinimap();
    }
    function bbox() {
      if (!nodes.length) return { x: 0, y: 0, w: 100, h: 100 };
      const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) + NODE_W + 20 - x, h: Math.max(...ys) + 80 - y };
    }
    function drawMinimap() {
      const b = bbox();
      const s = Math.min((mm.clientWidth - 8) / b.w, (mm.clientHeight - 8) / b.h);
      mmNodes.innerHTML = nodes.map((n) => {
        const sz = nodeSize(n.id);
        return `<i style="left:${(n.x - b.x) * s + 4}px;top:${(n.y - b.y) * s + 4}px;width:${sz.w * s}px;height:${sz.h * s}px"
          class="${n.status === "running" ? "is-running" : ""}"></i>`;
      }).join("");
      const vw = root.clientWidth / view.z, vh = root.clientHeight / view.z;
      const vx = -view.x / view.z, vy = -view.y / view.z;
      mmView.style.left = (vx - b.x) * s + 4 + "px";
      mmView.style.top = (vy - b.y) * s + 4 + "px";
      mmView.style.width = Math.min(vw * s, mm.clientWidth) + "px";
      mmView.style.height = Math.min(vh * s, mm.clientHeight) + "px";
    }
    function refresh() { renderNodes(); drawEdges(); applyView(); }

    function fit() {
      const b = bbox();
      const pad = 40;
      const z = Math.min(1.25, Math.max(0.5,
        Math.min((root.clientWidth - pad * 2) / b.w, (root.clientHeight - pad * 2) / b.h)));
      view = {
        z,
        x: (root.clientWidth - b.w * z) / 2 - b.x * z,
        y: (root.clientHeight - b.h * z) / 2 - b.y * z,
      };
      applyView();
    }

    /* pan (background) + node drag */
    let pan = null, drag = null;
    root.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".fx-canvas-zoom, .fx-canvas-minimap")) return;
      const nodeEl = e.target.closest(".fx-node");
      if (nodeEl) {
        const n = byId(nodeEl.dataset.node);
        drag = { n, el: nodeEl, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
        nodeEl.classList.add("is-dragging");
      } else {
        pan = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
        root.classList.add("is-panning");
      }
      try { root.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    root.addEventListener("pointermove", (e) => {
      if (drag) {
        const dx = (e.clientX - drag.sx) / view.z, dy = (e.clientY - drag.sy) / view.z;
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
        drag.n.x = Math.round(drag.ox + dx);
        drag.n.y = Math.round(drag.oy + dy);
        drag.el.style.left = drag.n.x + "px";
        drag.el.style.top = drag.n.y + "px";
        drawEdges();
        drawMinimap();
      } else if (pan) {
        view.x = pan.ox + (e.clientX - pan.sx);
        view.y = pan.oy + (e.clientY - pan.sy);
        applyView();
      }
    });
    ["pointerup", "pointercancel"].forEach((ev) => root.addEventListener(ev, (e) => {
      if (drag) {
        drag.el.classList.remove("is-dragging");
        if (!drag.moved) select(drag.n.id);
        drag = null;
      }
      if (pan) { pan = null; root.classList.remove("is-panning"); }
    }));

    /* wheel zoom around cursor */
    root.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = root.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const nz = Math.min(1.5, Math.max(0.5, view.z * (e.deltaY < 0 ? 1.12 : 0.89)));
      view.x = cx - ((cx - view.x) / view.z) * nz;
      view.y = cy - ((cy - view.y) / view.z) * nz;
      view.z = nz;
      applyView();
    }, { passive: false });

    root.addEventListener("click", (e) => {
      const cz = e.target.closest("[data-cz]");
      if (!cz) return;
      if (cz.dataset.cz === "fit") return fit();
      const r = root.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const nz = Math.min(1.5, Math.max(0.5, view.z * (cz.dataset.cz === "in" ? 1.2 : 0.83)));
      view.x = cx - ((cx - view.x) / view.z) * nz;
      view.y = cy - ((cy - view.y) / view.z) * nz;
      view.z = nz;
      applyView();
    });

    function select(id) {
      selected = id;
      nodesEl.querySelectorAll(".fx-node").forEach((el) => el.classList.toggle("is-sel", el.dataset.node === id));
      opts.onSelect?.(byId(id));
    }
    function setStatus(id, status) {
      const n = byId(id);
      if (!n) return;
      n.status = status;
      const el = nodesEl.querySelector(`[data-node="${id}"]`);
      if (el) {
        el.classList.toggle("is-running", status === "running");
        el.classList.toggle("fx-beam", status === "running");
        el.querySelector(".fx-node-status")?.remove();
        if (STATUS[status]) el.querySelector(".fx-node-head").insertAdjacentHTML("beforeend", STATUS[status]);
      }
      drawMinimap();
    }
    function setEdgeStatus(from, to, status) {
      const e = edges.find((x) => x.from === from && x.to === to);
      if (e) { e.status = status; drawEdges(); }
    }

    refresh();
    requestAnimationFrame(() => { drawEdges(); fit(); });
    return {
      fit, refresh, select, setStatus, setEdgeStatus,
      get nodes() { return nodes; }, get edges() { return edges; },
      get view() { return view; },
    };
  };

  /* ---------- schema-driven config form ---------- */
  window.fxSchemaForm = function (root, schema, values = {}, onChange) {
    root.innerHTML = (schema.fields || []).map((f) => {
      const v = values[f.key] ?? f.default ?? "";
      if (f.type === "toggle")
        return `<div class="fx-row" style="justify-content:space-between;min-height:2rem">
          <div><div class="fx-label">${esc(f.label)}</div>${f.desc ? `<div class="fx-field-desc">${esc(f.desc)}</div>` : ""}</div>
          <input type="checkbox" class="fx-switch" data-sf="${esc(f.key)}" ${v ? "checked" : ""}>
        </div>`;
      if (f.type === "select")
        return `<div class="fx-field"><label class="fx-label">${esc(f.label)}</label>
          <select class="fx-select" data-sf="${esc(f.key)}">
            ${(f.options || []).map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}
          </select></div>`;
      if (f.type === "textarea")
        return `<div class="fx-field"><label class="fx-label">${esc(f.label)}</label>
          <textarea class="fx-textarea" rows="3" data-sf="${esc(f.key)}">${esc(v)}</textarea></div>`;
      return `<div class="fx-field"><label class="fx-label">${esc(f.label)}</label>
        <input class="fx-input ${f.mono ? "fx-mono-input" : ""}" data-sf="${esc(f.key)}" value="${esc(v)}" ${f.type === "number" ? 'inputmode="decimal"' : ""}>
        ${f.desc ? `<span class="fx-field-desc">${esc(f.desc)}</span>` : ""}</div>`;
    }).join("");
    root.__sfValues = values;
    root.__sfOnChange = onChange;
    if (!root.__sfWired) {
      root.__sfWired = true;
      root.addEventListener("change", (e) => {
        const el = e.target.closest("[data-sf]");
        if (!el) return;
        const vals = root.__sfValues;
        vals[el.dataset.sf] = el.type === "checkbox" ? el.checked : el.value;
        root.__sfOnChange?.(el.dataset.sf, vals[el.dataset.sf], vals);
      });
    }
    return { values };
  };
})();
