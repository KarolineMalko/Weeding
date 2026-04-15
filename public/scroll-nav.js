(function () {
  const PAGES = ["/", "/church", "/venue", "/last", "/response"];
  const DEBOUNCE_MS = 80;
  const SWIPE_THRESHOLD = 24;
  const WHEEL_DELTA_THRESHOLD = 12;
  /** On the last page, going "back" needs a stronger gesture so normal scrolling does not leave the page. */
  const LAST_PAGE_IDX = PAGES.indexOf("/last");
  const LAST_PAGE_SCROLL_UP_SWIPE = 80;
  const LAST_PAGE_SCROLL_UP_WHEEL_ACCUM = 96;
  const RESPONSE_PAGE_IDX = PAGES.indexOf("/response");
  const INNER_SCROLL_EPS = 2;
  let lastPageScrollUpWheelAccum = 0;
  let lastPageWheelAccumResetTimer = null;

  function getResponseContentEl() {
    return document.querySelector(".page-response .content.response-content");
  }

  /** RSVP page: do not change to "More" while the column or a focused field can still scroll up. */
  function responseInnerScrollBlocksPageUp() {
    if (getCurrentPageIndex() !== RESPONSE_PAGE_IDX) return false;
    const main = getResponseContentEl();
    if (main && main.scrollTop > INNER_SCROLL_EPS) return true;
    const a = document.activeElement;
    if (!a || !a.closest || !a.closest("#rsvp-form")) return false;
    const tag = a.tagName;
    if (tag !== "TEXTAREA" && tag !== "INPUT") return false;
    if (a.scrollHeight <= a.clientHeight + 1) return false;
    return a.scrollTop > INNER_SCROLL_EPS;
  }

  function isLastPage() {
    return getCurrentPageIndex() === LAST_PAGE_IDX;
  }

  function resetLastPageScrollUpAccum() {
    lastPageScrollUpWheelAccum = 0;
    if (lastPageWheelAccumResetTimer) {
      clearTimeout(lastPageWheelAccumResetTimer);
      lastPageWheelAccumResetTimer = null;
    }
  }

  function normalizePagePath(path) {
    const p = (path || "/").replace(/\/$/, "") || "/";
    if (/^\/response\/\d+$/.test(p)) return "/response";
    if (/^\/\d+$/.test(p)) return "/";
    return p === "" ? "/" : p;
  }

  function getCurrentPageIndex() {
    const normalized = normalizePagePath(window.location.pathname);
    const idx = PAGES.indexOf(normalized);
    return idx >= 0 ? idx : 0;
  }

  function storePosition() {
    const indicator = document.querySelector(".nav-indicator");
    const nav = document.querySelector(".navbar");
    if (indicator && nav) {
      const rect = indicator.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      try {
        sessionStorage.setItem(
          "wedding-nav-from",
          JSON.stringify({
            left: rect.left - navRect.left,
            width: rect.width,
          })
        );
      } catch (_) {}
    }
  }

  async function goToPage(index) {
    if (index < 0 || index >= PAGES.length) return;
    resetLastPageScrollUpAccum();
    const responseIdx = PAGES.indexOf("/response");
    const currentIdx = getCurrentPageIndex();
    if (
      responseIdx >= 0 &&
      currentIdx === responseIdx &&
      index !== responseIdx &&
      typeof window.__weddingRsvpConfirmLeave === "function" &&
      !window.__weddingRsvpConfirmLeave()
    ) {
      return;
    }
    const path = PAGES[index];
    const url = path === "/" ? "/" : path;

    storePosition();

    try {
      const res = await fetch(url);
      if (!res.ok) {
        window.location.replace(path === "/" ? "/" : path);
        return;
      }
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      document.body.className = doc.body.className;
      document.body.innerHTML = doc.body.innerHTML;

      const title = doc.querySelector("title");
      if (title) document.title = title.textContent;

      document.querySelectorAll("video[autoplay]").forEach((v) => v.play().catch(() => {}));

      let displayPath = path === "/" ? "/" : path;
      if (displayPath === "/response") {
        const p = (window.location.pathname || "/").replace(/\/$/, "") || "/";
        const rm = /^\/response\/(\d+)$/.exec(p);
        if (rm) {
          const n = Number(rm[1], 10);
          if (Number.isInteger(n) && n >= 1 && n <= 99) {
            displayPath = `/response/${n}`;
          }
        } else {
          try {
            const s = sessionStorage.getItem("wedding-default-guests");
            if (s != null && s !== "") {
              const n = Number(s, 10);
              if (Number.isInteger(n) && n >= 1 && n <= 99) {
                displayPath = `/response/${n}`;
              }
            }
          } catch (_) {}
        }
      }
      history.replaceState(null, "", displayPath);
      window.dispatchEvent(new CustomEvent("wedding:pagechange"));
    } catch (_) {
      window.location.replace(path === "/" ? "/" : path);
    }
  }

  function handleScrollDown() {
    const idx = getCurrentPageIndex();
    if (idx < PAGES.length - 1) goToPage(idx + 1);
  }

  function handleScrollUp() {
    const idx = getCurrentPageIndex();
    if (idx > 0) goToPage(idx - 1);
  }

  let lastWheel = 0;
  function onWheel(e) {
    const now = Date.now();
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    const horizontalDominant = absX > absY && absX >= WHEEL_DELTA_THRESHOLD;
    const verticalDominant = absY >= absX && absY >= WHEEL_DELTA_THRESHOLD;

    if (horizontalDominant) {
      if (e.deltaX > 0) {
        resetLastPageScrollUpAccum();
        if (now - lastWheel < DEBOUNCE_MS) return;
        lastWheel = now;
        handleScrollDown();
        return;
      }
      if (e.deltaX < 0) {
        if (responseInnerScrollBlocksPageUp()) return;
        if (isLastPage()) {
          lastPageScrollUpWheelAccum += absX;
          clearTimeout(lastPageWheelAccumResetTimer);
          lastPageWheelAccumResetTimer = setTimeout(resetLastPageScrollUpAccum, 500);
          if (lastPageScrollUpWheelAccum < LAST_PAGE_SCROLL_UP_WHEEL_ACCUM) return;
          resetLastPageScrollUpAccum();
        } else {
          resetLastPageScrollUpAccum();
        }
        if (now - lastWheel < DEBOUNCE_MS) return;
        lastWheel = now;
        handleScrollUp();
        return;
      }
    }

    if (!verticalDominant) return;

    if (e.deltaY > 0) {
      resetLastPageScrollUpAccum();
      if (now - lastWheel < DEBOUNCE_MS) return;
      lastWheel = now;
      handleScrollDown();
      return;
    }

    if (e.deltaY < 0) {
      if (responseInnerScrollBlocksPageUp()) return;
      if (isLastPage()) {
        lastPageScrollUpWheelAccum += absY;
        clearTimeout(lastPageWheelAccumResetTimer);
        lastPageWheelAccumResetTimer = setTimeout(resetLastPageScrollUpAccum, 500);
        if (lastPageScrollUpWheelAccum < LAST_PAGE_SCROLL_UP_WHEEL_ACCUM) return;
        resetLastPageScrollUpAccum();
      } else {
        resetLastPageScrollUpAccum();
      }
      if (now - lastWheel < DEBOUNCE_MS) return;
      lastWheel = now;
      handleScrollUp();
    }
  }

  function trySwipe(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const now = Date.now();
    if (now - lastWheel < DEBOUNCE_MS) return;

    const upTh = isLastPage() ? LAST_PAGE_SCROLL_UP_SWIPE : SWIPE_THRESHOLD;

    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (dx > 0) {
        resetLastPageScrollUpAccum();
        lastWheel = now;
        handleScrollDown();
      } else if (dx < 0 && absX > upTh) {
        if (responseInnerScrollBlocksPageUp()) return;
        resetLastPageScrollUpAccum();
        lastWheel = now;
        handleScrollUp();
      }
      return;
    }

    if (absY >= absX && absY > SWIPE_THRESHOLD) {
      if (dy > SWIPE_THRESHOLD) {
        resetLastPageScrollUpAccum();
        lastWheel = now;
        handleScrollDown();
      } else if (dy < -upTh) {
        if (responseInnerScrollBlocksPageUp()) return;
        resetLastPageScrollUpAccum();
        lastWheel = now;
        handleScrollUp();
      }
    }
  }

  let activePointerId = null;
  let startX = 0;
  let startY = 0;

  function onPointerDown(e) {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
  }

  function onPointerUp(e) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    trySwipe(startX - e.clientX, startY - e.clientY);
  }

  function onPointerCancel(e) {
    if (e.pointerId === activePointerId) activePointerId = null;
  }

  let touchId = null;
  let touchStartX = 0;
  let touchStartY = 0;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchId = t.identifier;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function onTouchEnd(e) {
    const t = Array.from(e.changedTouches).find((c) => c.identifier === touchId);
    if (!t) return;
    touchId = null;
    trySwipe(touchStartX - t.clientX, touchStartY - t.clientY);
  }

  function onTouchCancel(e) {
    if (Array.from(e.changedTouches).some((c) => c.identifier === touchId)) {
      touchId = null;
    }
  }

  document.addEventListener("wheel", onWheel, { passive: true });

  if (typeof PointerEvent !== "undefined") {
    window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true, capture: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true, capture: true });
  }
  window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
  window.addEventListener("touchcancel", onTouchCancel, { passive: true, capture: true });

  window.addEventListener("wedding:goToPage", (e) => {
    if (e.detail != null && typeof e.detail.index === "number") {
      goToPage(e.detail.index);
    }
  });

  document.addEventListener("click", (e) => {
    const navLink = e.target.closest(".navbar a[href]");
    const goHomeLink = e.target.closest(".wedding-go-home");
    if (goHomeLink) {
      e.preventDefault();
      goToPage(0);
      return;
    }
    const link = navLink;
    if (!link || link.target === "_blank") return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;
    let path = href === "index.html" ? "/" : (href.startsWith("/") ? href : "/" + href.replace(".html", ""));
    if (/^\/response\/\d+$/.test(path)) path = "/response";
    if (/^\/\d+$/.test(path)) path = "/";
    if (PAGES.includes(path)) {
      e.preventDefault();
      storePosition();
      goToPage(PAGES.indexOf(path));
    }
  });

})();
