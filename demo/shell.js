/*!
 * finix-ui demo · shell.js — injects the shared admin shell (sidebar, topbar,
 * command palette) into each demo page. Demo-only; the framework itself is
 * plain CSS/JS and does not require this file.
 */
(function () {
  "use strict";

  const I = {
    logo: "F",
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    forms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"/><path d="M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"/><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"/><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"/><path d="M9 7v10"/></svg>',
    data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
    overlays: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
    feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>',
    widgets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>',
    research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
    panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>',
    wand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  };

  const NAV = [
    { group: "Overview", items: [{ href: "index.html", icon: "dashboard", label: "Dashboard" }] },
    {
      group: "Components",
      items: [
        { href: "forms.html", icon: "forms", label: "Forms & Inputs" },
        { href: "data.html", icon: "data", label: "Data & Tables" },
        { href: "overlays.html", icon: "overlays", label: "Navigation & Overlays" },
        { href: "feedback.html", icon: "feedback", label: "Feedback & Status" },
      ],
    },
    {
      group: "Apps",
      items: [
        { href: "charts.html", icon: "chart", label: "Charts" },
        { href: "scheduling.html", icon: "calendar", label: "Projects" },
        { href: "ai.html", icon: "sparkles", label: "AI Assistant" },
        { href: "business.html", icon: "briefcase", label: "Business & CRM" },
        { href: "people.html", icon: "users", label: "People & HR" },
        { href: "editor.html", icon: "pen", label: "Editor & Media" },
        { href: "motion.html", icon: "wand", label: "Motion Lab" },
      ],
    },
    {
      group: "Reference",
      items: [
        { href: "auth.html", icon: "user", label: "Auth Pages" },
        { href: "research.html", icon: "research", label: "Research & Credits" },
      ],
    },
  ];

  const page = location.pathname.split("/").pop() || "index.html";
  const current = NAV.flatMap((g) => g.items).find((i) => i.href === page) || NAV[0].items[0];

  const shell = document.querySelector(".fx-shell");
  const main = document.querySelector(".fx-shell-main");
  if (!shell || !main) return;

  /* ---- sidebar ---- */
  const sidebar = document.createElement("aside");
  sidebar.className = "fx-sidebar";
  sidebar.innerHTML =
    `<div class="fx-sidebar-header">
       <div class="fx-sidebar-logo">${I.logo}</div>
       <div class="fx-sidebar-brand"><b>Finix UI</b><span>Admin framework</span></div>
     </div>
     <div class="fx-sidebar-content">` +
    NAV.map(
      (g) =>
        `<div class="fx-sidebar-group">
           <div class="fx-sidebar-group-label">${g.group}</div>` +
        g.items
          .map(
            (it) =>
              `<a class="fx-side-item" href="${it.href}" ${it.href === page ? 'aria-current="page"' : ""}>${I[it.icon]}<span>${it.label}</span></a>`
          )
          .join("") +
        `</div>`
    ).join("") +
    `</div>
     <div class="fx-sidebar-footer">
       <button class="fx-side-item" popovertarget="fx-user-menu">
         <span class="fx-avatar fx-avatar--sm" style="background:var(--sidebar-primary);color:var(--sidebar-primary-foreground)">RK</span>
         <span>Rakesh K.</span>
       </button>
     </div>`;
  shell.prepend(sidebar);

  /* ---- topbar ---- */
  const topbar = document.createElement("header");
  topbar.className = "fx-topbar";
  topbar.innerHTML =
    `<button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-fx-sidebar-toggle data-fx-tip="Toggle sidebar">${I.panel}</button>
     <div class="fx-separator fx-separator--v" style="height:1rem"></div>
     <ol class="fx-breadcrumb">
       <li><a href="index.html">Finix UI</a></li>
       <li><span aria-current="page">${current.label}</span></li>
     </ol>
     <div class="fx-topbar-spacer"></div>
     <button class="fx-search-trigger" data-fx-open="dialog.fx-cmd">
       ${I.search}<span>Search…</span><span class="fx-kbd">⌘K</span>
     </button>
     <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm fx-bell-dot" popovertarget="fx-notif-pop" data-fx-tip="Notifications" aria-label="Notifications">${I.feedback}</button>
     <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" popovertarget="fx-brand-menu" data-fx-tip="Brand theme">${I.palette}</button>
     <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" data-fx-toggle-theme data-fx-tip="Light / dark">${I.sun}</button>
     <button class="fx-btn fx-btn--ghost fx-btn--icon fx-btn--sm" popovertarget="fx-user-menu" style="border-radius:999px">
       <span class="fx-avatar fx-avatar--sm">RK</span>
     </button>`;
  main.prepend(topbar);

  /* ---- brand + user menus ---- */
  const brands = [
    ["finix", "Finix (warm sage)", "oklch(0.46 0.062 165)"],
    ["mono", "Mono (classic zinc)", "oklch(0.205 0 0)"],
    ["ocean", "Ocean (blue)", "oklch(0.546 0.245 262.881)"],
    ["forest", "Forest (emerald)", "oklch(0.596 0.145 163.225)"],
    ["sunset", "Sunset (orange)", "oklch(0.646 0.222 41.116)"],
  ];
  const menus = document.createElement("div");
  menus.innerHTML =
    `<div class="fx-menu" popover id="fx-brand-menu">
       <div class="fx-menu-label">Brand preset</div>
       <div class="fx-menu-sep"></div>` +
    brands
      .map(
        ([id, label, color]) =>
          `<button class="fx-menu-item" data-fx-set-brand="${id}">
             <i style="width:.625rem;height:.625rem;border-radius:999px;background:${color};flex-shrink:0"></i>${label}
           </button>`
      )
      .join("") +
    `</div>
     <div class="fx-menu" popover id="fx-user-menu" style="min-width:12rem">
       <div class="fx-menu-label">Rakesh K.<div class="fx-text-xs fx-muted" style="font-weight:400">rakesh@finix.dev</div></div>
       <div class="fx-menu-sep"></div>
       <button class="fx-menu-item">${I.user}Profile<span class="fx-menu-shortcut">⇧⌘P</span></button>
       <button class="fx-menu-item">${I.settings}Settings<span class="fx-menu-shortcut">⌘,</span></button>
       <div class="fx-menu-sep"></div>
       <button class="fx-menu-item fx-menu-item--destructive">${I.logout}Log out</button>
     </div>`;
  document.body.appendChild(menus);

  /* ---- notification center ---- */
  const NOTIFS = [
    { icon: I.dashboard, title: "Deployment succeeded", body: "finix-ui@1.5.0 is live in production.", time: "2m", unread: true },
    { icon: I.user, title: "New team member", body: "Noah Garcia accepted your invite.", time: "1h", unread: true },
    { icon: I.feedback, title: "Usage alert", body: "You've used 87% of build minutes.", time: "3h", unread: true },
    { icon: I.data, title: "Export ready", body: "orders-august.csv is ready to download.", time: "1d", unread: false },
    { icon: I.settings, title: "Policy update", body: "Two-factor auth is now required for admins.", time: "2d", unread: false },
  ];
  const notifPop = document.createElement("div");
  notifPop.className = "fx-menu fx-notif-panel";
  notifPop.setAttribute("popover", "");
  notifPop.id = "fx-notif-pop";
  notifPop.dataset.fxAlign = "end";
  notifPop.innerHTML =
    `<div class="fx-notif-head"><b>Notifications</b>
       <button class="fx-btn fx-btn--ghost fx-btn--sm" data-fx-notif-readall>Mark all read</button>
     </div>
     <div class="fx-notif-list">` +
    NOTIFS.map((n) =>
      `<div class="fx-notif" ${n.unread ? "data-unread" : ""} role="button" tabindex="0">
         <span class="fx-notif-icon">${n.icon}</span>
         <span class="fx-notif-title">${n.title}</span>
         <span class="fx-notif-time">${n.time}</span>
         <span class="fx-notif-body">${n.body}</span>
       </div>`).join("") +
    `</div>`;
  document.body.appendChild(notifPop);

  /* ---- command palette ---- */
  const cmd = document.createElement("dialog");
  cmd.className = "fx-dialog fx-cmd";
  cmd.innerHTML =
    `<div class="fx-cmd-input-wrap">${I.search}<input class="fx-cmd-input" placeholder="Type a command or search…" /></div>
     <div class="fx-cmd-list">
       <div data-fx-cmd-group>
         <div class="fx-cmd-group-label">Pages</div>` +
    NAV.flatMap((g) => g.items)
      .map((it) => `<button class="fx-menu-item" onclick="location.href='${it.href}'">${I[it.icon]}${it.label}</button>`)
      .join("") +
    `</div>
       <div data-fx-cmd-group>
         <div class="fx-cmd-group-label">Theme</div>
         <button class="fx-menu-item" data-fx-toggle-theme>${I.sun}Toggle light / dark<span class="fx-menu-shortcut">⌘T</span></button>` +
    brands.map(([id, label, color]) => `<button class="fx-menu-item" data-fx-set-brand="${id}"><i style="width:.625rem;height:.625rem;border-radius:999px;background:${color};flex-shrink:0"></i>Brand: ${label}</button>`).join("") +
    `</div>
       <div class="fx-cmd-empty" hidden>No results found.</div>
     </div>`;
  document.body.appendChild(cmd);
})();
