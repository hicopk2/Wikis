/* =========================================================
   Hicopk - Wikipedia-style tribute page
   Interactions: appearance toggle, table of contents,
   scroll spy, in-page search, reference previews, mobile nav.
   ========================================================= */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Appearance / theme ---------------- */

  var THEME_KEY = "hicopk-wiki-theme";
  var themeToggle = document.getElementById("theme-toggle");
  var themeLabel = themeToggle ? themeToggle.querySelector(".theme-label") : null;

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  function storeTheme(value) {
    try {
      window.localStorage.setItem(THEME_KEY, value);
    } catch (err) {
      /* storage unavailable (private mode / sandboxed frame) - ignore */
    }
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      if (themeLabel) themeLabel.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    }
  }

  var storedTheme = readStoredTheme();
  if (storedTheme === "dark" || storedTheme === "light") {
    applyTheme(storedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  } else {
    applyTheme("light");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
    });
  }

  /* ---------------- Table of contents ---------------- */

  var toc = document.getElementById("toc");
  var tocToggle = document.getElementById("toc-toggle");
  var tocList = document.getElementById("toc-list");
  var tocLinks = tocList ? Array.prototype.slice.call(tocList.querySelectorAll('a[href^="#"]')) : [];

  function setTocCollapsed(collapsed) {
    if (!toc || !tocToggle || !tocList) return;
    toc.classList.toggle("is-collapsed", collapsed);
    tocToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    tocToggle.textContent = collapsed ? "show" : "hide";
    tocList.hidden = collapsed;
  }

  if (tocToggle) {
    tocToggle.addEventListener("click", function () {
      setTocCollapsed(tocToggle.getAttribute("aria-expanded") === "true");
    });
  }

  /* ---------------- Scroll spy ---------------- */

  var targets = tocLinks
    .map(function (link) {
      var id = link.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      return el ? { link: link, el: el } : null;
    })
    .filter(Boolean);

  var activeLink = null;

  function setActive(link) {
    if (link === activeLink) return;
    if (activeLink) activeLink.classList.remove("is-active");
    if (link) {
      link.classList.add("is-active");
      if (link.scrollIntoView && toc && toc.scrollHeight > toc.clientHeight + 4) {
        link.scrollIntoView({ block: "nearest" });
      }
    }
    activeLink = link;
  }

  function updateSpy() {
    if (!targets.length) return;
    var offset = 0;
    var header = document.querySelector(".site-header");
    offset = (header ? header.offsetHeight : 0) + 24;

    var current = null;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.getBoundingClientRect().top - offset <= 0) {
        current = targets[i];
      } else {
        break;
      }
    }
    setActive(current ? current.link : null);
  }

  var spyTicking = false;
  function onScroll() {
    if (spyTicking) return;
    spyTicking = true;
    window.requestAnimationFrame(function () {
      updateSpy();
      hidePopover();
      spyTicking = false;
    });
  }

  if (targets.length) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateSpy();
  }

  /* ---------------- In-page search ---------------- */

  var searchForm = document.getElementById("search-form");
  var searchInput = document.getElementById("site-search");
  var searchStatus = document.getElementById("search-status");

  function runFilter(query) {
    var q = query.trim().toLowerCase();
    var visible = 0;

    if (!q) {
      tocLinks.forEach(function (link) {
        link.parentElement.classList.remove("is-filtered");
      });
      if (searchStatus) searchStatus.textContent = "";
      return;
    }

    tocLinks.forEach(function (link) {
      var match = link.textContent.toLowerCase().indexOf(q) !== -1;
      link.parentElement.classList.toggle("is-filtered", !match);
      if (match) visible++;
    });

    if (activeLink) activeLink.classList.remove("is-active");
    activeLink = null;

    if (searchStatus) {
      searchStatus.textContent = visible === 1 ? "1 match" : visible + " matches";
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      runFilter(searchInput.value);
    });

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        searchInput.value = "";
        runFilter("");
        searchInput.blur();
      }
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var first = tocLinks.filter(function (link) {
        return !link.parentElement.classList.contains("is-filtered");
      })[0];
      if (!first) return;
      var target = document.getElementById(first.getAttribute("href").slice(1));
      if (!target) return;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
      setActive(first);
      if (searchStatus) searchStatus.textContent = "Jumped to " + first.textContent.trim();
    });
  }

  /* ---------------- Reference previews ---------------- */

  var popover = document.getElementById("ref-popover");
  var hideTimer = null;

  function findCitation(href) {
    if (!href || href.charAt(0) !== "#") return null;
    var note = document.getElementById(href.slice(1));
    if (!note) return null;
    var textEl = note.querySelector(".reflist__text");
    return textEl ? textEl.cloneNode(true) : note.cloneNode(true);
  }

  function showPopover(anchor) {
    if (!popover) return;
    var citation = findCitation(anchor.getAttribute("href"));
    if (!citation) return;

    window.clearTimeout(hideTimer);
    popover.innerHTML = "";
    var label = document.createElement("span");
    label.className = "ref-popover__label";
    label.textContent = "Reference";
    popover.appendChild(label);
    popover.appendChild(citation);
    popover.hidden = false;

    var rect = anchor.getBoundingClientRect();
    var width = popover.offsetWidth;
    var left = rect.left + window.scrollX + rect.width / 2 - width / 2;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - width - 12;
    left = Math.max(window.scrollX + 12, Math.min(left, maxLeft));

    popover.style.left = left + "px";
    popover.style.top = rect.bottom + window.scrollY + 8 + "px";
  }

  function hidePopover() {
    if (!popover || popover.hidden) return;
    popover.hidden = true;
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hidePopover, 120);
  }

  var refAnchors = document.querySelectorAll('sup.reference a[href^="#cite_note"]');
  Array.prototype.forEach.call(refAnchors, function (anchor) {
    anchor.addEventListener("mouseenter", function () {
      showPopover(anchor);
    });
    anchor.addEventListener("focus", function () {
      showPopover(anchor);
    });
    anchor.addEventListener("mouseleave", scheduleHide);
    anchor.addEventListener("blur", scheduleHide);
  });

  if (popover) {
    popover.addEventListener("mouseenter", function () {
      window.clearTimeout(hideTimer);
    });
    popover.addEventListener("mouseleave", scheduleHide);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hidePopover();
  });

  /* ---------------- Mobile navigation ---------------- */

  var menuToggle = document.getElementById("menu-toggle");
  var sidebar = document.getElementById("sidebar");

  function closeNav() {
    document.body.classList.remove("nav-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open main menu");
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      var open = !document.body.classList.contains("nav-open");
      document.body.classList.toggle("nav-open", open);
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "Close main menu" : "Open main menu");
    });
  }

  if (sidebar) {
    sidebar.addEventListener("click", function (event) {
      if (event.target.closest("a") && window.matchMedia("(max-width: 900px)").matches) {
        closeNav();
      }
    });
  }

  document.addEventListener("click", function (event) {
    if (!document.body.classList.contains("nav-open")) return;
    if (sidebar && sidebar.contains(event.target)) return;
    if (menuToggle && menuToggle.contains(event.target)) return;
    closeNav();
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeNav();
  });

  /* ---------------- Reference highlight on arrival ---------------- */

  window.addEventListener("hashchange", function () {
    var id = window.location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("is-target");
    window.setTimeout(function () {
      el.classList.remove("is-target");
    }, 1600);
  });
})();
