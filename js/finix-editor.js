/*!
 * finix-ui · finix-editor.js — rich-text editor + image cropper
 * fxEditor: Notion-style block editing (toolbar, bubble menu, slash commands,
 *           markdown shortcuts) — pattern source: Novel/Tiptap UX, vanilla port.
 * fxCropper: drag/resize crop box with aspect lock and canvas output —
 *            pattern source: classic Origin UI / Kibo Image Crop.
 */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);

  /* ================================ editor ================================ */
  const TB = [
    { cmd: "bold", tip: "Bold (⌘B)", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></svg>' },
    { cmd: "italic", tip: "Italic (⌘I)", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>' },
    { cmd: "underline", tip: "Underline (⌘U)", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></svg>' },
    { cmd: "strikeThrough", tip: "Strikethrough", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>' },
  ];
  const BLOCKS = [
    { label: "Text", block: "p", hint: "Plain paragraph" },
    { label: "Heading 1", block: "h1", hint: "Large section heading" },
    { label: "Heading 2", block: "h2", hint: "Medium heading" },
    { label: "Heading 3", block: "h3", hint: "Small heading" },
    { label: "Bullet list", cmd: "insertUnorderedList", hint: "Simple bulleted list" },
    { label: "Numbered list", cmd: "insertOrderedList", hint: "Ordered list" },
    { label: "Quote", block: "blockquote", hint: "Callout quotation" },
    { label: "Code block", block: "pre", hint: "Monospaced block" },
    { label: "Divider", html: "<hr>", hint: "Horizontal rule" },
  ];

  window.fxEditor = function (root, opts = {}) {
    root.classList.add("fx-editor");
    root.innerHTML =
      `<div class="fx-editor-toolbar">
         <select class="fx-select" data-blocksel style="width:8rem;height:1.75rem;padding-block:0;font-size:.8125rem">
           <option value="p">Paragraph</option><option value="h1">Heading 1</option>
           <option value="h2">Heading 2</option><option value="h3">Heading 3</option>
           <option value="blockquote">Quote</option><option value="pre">Code block</option>
         </select>
         <hr class="fx-separator fx-separator--v">` +
      TB.map((t) => `<button class="fx-editor-btn" data-cmd="${t.cmd}" data-fx-tip="${t.tip}" aria-label="${t.tip}">${t.svg}</button>`).join("") +
      `<hr class="fx-separator fx-separator--v">
         <button class="fx-editor-btn" data-cmd="insertUnorderedList" data-fx-tip="Bullet list" aria-label="Bullet list"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
         <button class="fx-editor-btn" data-cmd="insertOrderedList" data-fx-tip="Numbered list" aria-label="Numbered list"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>
         <button class="fx-editor-btn" data-link data-fx-tip="Link" aria-label="Link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
         <hr class="fx-separator fx-separator--v">
         <button class="fx-editor-btn" data-cmd="undo" data-fx-tip="Undo (⌘Z)" aria-label="Undo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
         <button class="fx-editor-btn" data-cmd="redo" data-fx-tip="Redo" aria-label="Redo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
         <span style="flex:1"></span>
         <span class="fx-text-xs fx-muted">Type <span class="fx-kbd">/</span> for blocks</span>
       </div>
       <div class="fx-editor-content fx-prose" contenteditable="true" data-placeholder="Type '/' for commands, or just start writing…"></div>
       <div class="fx-editor-foot"><span data-words>0 words</span><span>Markdown shortcuts: # ## - 1. > ---</span></div>`;

    const content = $(".fx-editor-content", root);
    if (opts.html) content.innerHTML = opts.html;

    /* toolbar */
    root.querySelector(".fx-editor-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cmd]");
      if (btn) { content.focus(); document.execCommand(btn.dataset.cmd, false, null); paintActive(); }
      const link = e.target.closest("[data-link]");
      if (link) {
        content.focus();
        const url = prompt("Link URL:", "https://");
        if (url) document.execCommand("createLink", false, url);
      }
    });
    const blockSel = $("[data-blocksel]", root);
    blockSel.addEventListener("change", () => { content.focus(); document.execCommand("formatBlock", false, blockSel.value); });

    function paintActive() {
      root.querySelectorAll("[data-cmd]").forEach((b) => {
        try { b.classList.toggle("is-active", document.queryCommandState(b.dataset.cmd)); } catch (e) {}
      });
      try {
        const block = (document.queryCommandValue("formatBlock") || "p").toLowerCase();
        if ([...blockSel.options].some((o) => o.value === block)) blockSel.value = block;
      } catch (e) {}
    }
    document.addEventListener("selectionchange", () => {
      if (root.contains(document.getSelection().anchorNode)) { paintActive(); bubble(); }
    });

    /* bubble menu on selection */
    let bub = null;
    function bubble() {
      const sel = document.getSelection();
      const has = sel && !sel.isCollapsed && content.contains(sel.anchorNode);
      if (!has) { if (bub) bub.remove(), (bub = null); return; }
      if (!bub) {
        bub = document.createElement("div");
        bub.className = "fx-bubblemenu";
        bub.innerHTML = TB.slice(0, 3).map((t) => `<button class="fx-editor-btn" data-cmd="${t.cmd}">${t.svg}</button>`).join("") +
          `<button class="fx-editor-btn" data-bcode><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>`;
        bub.addEventListener("mousedown", (e) => e.preventDefault());
        bub.addEventListener("click", (e) => {
          const b = e.target.closest("[data-cmd]");
          if (b) document.execCommand(b.dataset.cmd, false, null);
          if (e.target.closest("[data-bcode]")) {
            const s = document.getSelection();
            if (!s.isCollapsed) {
              const code = document.createElement("code");
              try { s.getRangeAt(0).surroundContents(code); } catch (err) {}
            }
          }
          paintActive();
        });
        document.body.appendChild(bub);
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      bub.style.left = Math.max(8, r.left + r.width / 2 - bub.offsetWidth / 2) + "px";
      bub.style.top = (r.top - bub.offsetHeight - 8) + "px";
    }

    /* slash menu */
    let slash = null, slashRange = null;
    function closeSlash() { if (slash) slash.remove(), (slash = null), (slashRange = null); }
    function openSlash() {
      closeSlash();
      slash = document.createElement("div");
      slash.className = "fx-menu";
      slash.style.position = "fixed";
      slash.style.zIndex = 70;
      slash.style.minWidth = "13rem";
      slash.innerHTML = BLOCKS.map((b, i) => `<button class="fx-menu-item" data-i="${i}" ${i === 0 ? 'aria-selected="true"' : ""}>
        <span style="display:flex;flex-direction:column;align-items:flex-start"><b style="font-weight:500">${b.label}</b><span class="fx-text-xs fx-muted">${b.hint}</span></span></button>`).join("");
      slash.addEventListener("mousedown", (e) => e.preventDefault());
      slash.addEventListener("click", (e) => {
        const item = e.target.closest("[data-i]");
        if (item) applyBlock(BLOCKS[+item.dataset.i]);
      });
      document.body.appendChild(slash);
      const r = document.getSelection().getRangeAt(0).getBoundingClientRect();
      slash.style.left = Math.max(8, r.left) + "px";
      slash.style.top = Math.min(innerHeight - slash.offsetHeight - 8, r.bottom + 6) + "px";
      slashRange = document.getSelection().getRangeAt(0).cloneRange();
    }
    function applyBlock(b) {
      // remove the typed "/" query, then re-anchor the caret inside the SAME
      // block — clearing the text node otherwise collapses selection into the
      // previous block and formatBlock converts the wrong element.
      const sel = document.getSelection();
      const node = sel.anchorNode;
      let block = node && (node.nodeType === 3 ? node.parentElement : node);
      if (block && block !== content) {
        while (block.parentElement && block.parentElement !== content) block = block.parentElement;
      }
      if (node && node.nodeType === 3) {
        const idx = node.textContent.lastIndexOf("/");
        if (idx > -1) node.textContent = node.textContent.slice(0, idx);
      }
      if (block && block !== content && content.contains(block)) {
        if (!block.textContent) block.innerHTML = "<br>";
        const r = document.createRange();
        r.selectNodeContents(block);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      content.focus();
      if (b.block) document.execCommand("formatBlock", false, b.block);
      else if (b.cmd) document.execCommand(b.cmd, false, null);
      else if (b.html) document.execCommand("insertHTML", false, b.html + "<p><br></p>");
      closeSlash();
      count();
    }
    content.addEventListener("keyup", (e) => {
      const sel = document.getSelection();
      const node = sel.anchorNode;
      const text = node && node.nodeType === 3 ? node.textContent.slice(0, sel.anchorOffset) : "";
      if (slash) {
        const q = (text.split("/").pop() || "").toLowerCase();
        let any = false;
        slash.querySelectorAll(".fx-menu-item").forEach((it) => {
          const hit = it.textContent.toLowerCase().includes(q);
          it.hidden = !hit; if (hit) any = true;
        });
        if (!text.includes("/") || e.key === "Escape" || !any) closeSlash();
      } else if (e.key === "/" && (text === "/" || text.endsWith(" /"))) openSlash();
      // markdown shortcuts on space
      if (e.key === " " && node && node.nodeType === 3) {
        const t = node.textContent;
        const map = { "# ": "h1", "## ": "h2", "### ": "h3", "> ": "blockquote" };
        for (const k in map) {
          if (t === k || t === k.trimEnd() + " ") {
            node.textContent = "";
            document.execCommand("formatBlock", false, map[k]);
            return;
          }
        }
        if (t === "- " || t === "- ") { node.textContent = ""; document.execCommand("insertUnorderedList", false, null); }
        if (t === "1. " || t === "1. ") { node.textContent = ""; document.execCommand("insertOrderedList", false, null); }
        if (t === "--- " || t === "--- ") { node.textContent = ""; document.execCommand("insertHTML", false, "<hr><p><br></p>"); }
      }
      count();
    });
    content.addEventListener("keydown", (e) => {
      if (slash && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        e.preventDefault();
        const items = [...slash.querySelectorAll(".fx-menu-item:not([hidden])")];
        const cur = items.findIndex((i) => i.getAttribute("aria-selected") === "true");
        if (e.key === "Enter") { applyBlock(BLOCKS[+items[Math.max(0, cur)].dataset.i]); return; }
        const next = e.key === "ArrowDown" ? items[(cur + 1) % items.length] : items[(cur - 1 + items.length) % items.length];
        items.forEach((i) => i.setAttribute("aria-selected", i === next ? "true" : "false"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); document.execCommand("bold"); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") { e.preventDefault(); document.execCommand("italic"); }
    });
    document.addEventListener("click", (e) => { if (slash && !slash.contains(e.target)) closeSlash(); });

    function count() {
      const words = content.innerText.trim().split(/\s+/).filter(Boolean).length;
      $("[data-words]", root).textContent = words + " word" + (words === 1 ? "" : "s");
    }
    count();
    return { content, getHTML: () => content.innerHTML };
  };

  /* ================================ cropper ================================ */
  window.fxCropper = function (root, opts) {
    const { src, previewEl, onCrop } = opts;
    root.classList.add("fx-cropper");
    root.innerHTML = `<img src="${src}" draggable="false">
      <div class="fx-crop-box"><img src="${src}" draggable="false">
        <div class="fx-crop-handle" data-h="nw"></div><div class="fx-crop-handle" data-h="ne"></div>
        <div class="fx-crop-handle" data-h="sw"></div><div class="fx-crop-handle" data-h="se"></div>
      </div>`;
    const baseImg = root.querySelector(":scope > img");
    const box = root.querySelector(".fx-crop-box");
    const boxImg = box.querySelector("img");
    let aspect = opts.aspect || null; // null = free
    const crop = { x: 40, y: 30, w: 220, h: 150 };

    function bounds() { return { W: baseImg.clientWidth, H: baseImg.clientHeight }; }
    function paint() {
      const { W, H } = bounds();
      crop.w = Math.min(crop.w, W); crop.h = Math.min(crop.h, H);
      crop.x = Math.max(0, Math.min(crop.x, W - crop.w));
      crop.y = Math.max(0, Math.min(crop.y, H - crop.h));
      box.style.left = crop.x + "px"; box.style.top = crop.y + "px";
      box.style.width = crop.w + "px"; box.style.height = crop.h + "px";
      boxImg.style.width = W + "px"; boxImg.style.height = H + "px";
      boxImg.style.left = -crop.x + "px"; boxImg.style.top = -crop.y + "px";
      preview();
    }
    function preview() {
      if (!previewEl) return;
      const canvas = previewEl.tagName === "CANVAS" ? previewEl : previewEl.querySelector("canvas");
      if (!canvas || !baseImg.naturalWidth) return;
      const { W, H } = bounds();
      const sx = (crop.x / W) * baseImg.naturalWidth, sy = (crop.y / H) * baseImg.naturalHeight;
      const sw = (crop.w / W) * baseImg.naturalWidth, sh = (crop.h / H) * baseImg.naturalHeight;
      const scale = Math.min(1, 260 / sw);
      canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
      canvas.getContext("2d").drawImage(baseImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    let drag = null;
    box.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const h = e.target.closest(".fx-crop-handle")?.dataset.h;
      drag = { h: h || "move", sx: e.clientX, sy: e.clientY, o: { ...crop } };
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
    });
    box.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      const o = drag.o, { W, H } = bounds();
      if (drag.h === "move") { crop.x = o.x + dx; crop.y = o.y + dy; }
      else {
        if (drag.h.includes("e")) crop.w = Math.max(50, o.w + dx);
        if (drag.h.includes("s")) crop.h = Math.max(50, o.h + dy);
        if (drag.h.includes("w")) { crop.w = Math.max(50, o.w - dx); crop.x = o.x + (o.w - crop.w); }
        if (drag.h.includes("n")) { crop.h = Math.max(50, o.h - dy); crop.y = o.y + (o.h - crop.h); }
        if (aspect) {
          crop.h = crop.w / aspect;
          if (drag.h.includes("n")) crop.y = o.y + o.h - crop.h;
          if (crop.y + crop.h > H) { crop.h = H - crop.y; crop.w = crop.h * aspect; }
        }
      }
      paint();
    });
    box.addEventListener("pointerup", () => (drag = null));
    baseImg.addEventListener("load", paint);
    if (baseImg.complete) paint();

    return {
      setAspect(a) {
        aspect = a;
        if (a) { crop.h = crop.w / a; }
        paint();
      },
      apply() {
        preview();
        if (onCrop) onCrop();
      },
      get crop() { return { ...crop }; },
    };
  };
})();
