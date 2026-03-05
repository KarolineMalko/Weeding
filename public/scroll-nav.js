(function () {
  const PAGES = ["/", "/church", "/venue", "/last"];
  const DEBOUNCE_MS = 400;

  function getCurrentPageIndex() {
    const path = (window.location.pathname || "/").replace(/\/$/, "") || "/";
    const normalized = path === "" ? "/" : path;
    const idx = PAGES.indexOf(normalized);
    return idx >= 0 ? idx : 0;
  }

  function goToPage(index) {
    if (index < 0 || index >= PAGES.length) return;
    const indicator = document.querySelector(".nav-indicator");
    if (indicator) {
      const rect = indicator.getBoundingClientRect();
      const nav = document.querySelector(".navbar");
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
    const path = PAGES[index];
    window.location.href = path === "/" ? "/" : path;
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
    if (now - lastWheel < DEBOUNCE_MS) return;
    lastWheel = now;
    if (e.deltaY > 0) handleScrollDown();
    else if (e.deltaY < 0) handleScrollUp();
  }

  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;
  function onTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    const now = Date.now();
    if (now - lastWheel < DEBOUNCE_MS) return;
    lastWheel = now;
    if (diff > SWIPE_THRESHOLD) handleScrollDown();
    else if (diff < -SWIPE_THRESHOLD) handleScrollUp();
  }

  document.addEventListener("wheel", onWheel, { passive: true });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
})();
