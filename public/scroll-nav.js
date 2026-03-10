(function () {
  const PAGES = ["/", "/church", "/venue", "/last"];
  const DEBOUNCE_MS = 120;
  const SWIPE_THRESHOLD = 40;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getCurrentPageIndex() {
    const path = (window.location.pathname || "/").replace(/\/$/, "") || "/";
    const normalized = path === "" ? "/" : path;
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
    const path = PAGES[index];
    const url = path === "/" ? "/" : path;

    storePosition();

    const useTransition = !prefersReducedMotion();
    const duration = 120;

    try {
      const [html] = await Promise.all([
        fetch(url).then((r) => r.text()),
        useTransition
          ? new Promise((resolve) => {
              document.body.style.transition = `opacity ${duration}ms ease-out`;
              document.body.style.opacity = "0";
              setTimeout(resolve, duration);
            })
          : Promise.resolve(),
      ]);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      document.body.className = doc.body.className;
      document.body.innerHTML = doc.body.innerHTML;

      const title = doc.querySelector("title");
      if (title) document.title = title.textContent;

      document.querySelectorAll("video[autoplay]").forEach((v) => v.play().catch(() => {}));

      history.replaceState(null, "", path === "/" ? "/" : path);
      window.dispatchEvent(new CustomEvent("wedding:pagechange"));

      if (useTransition) {
        document.body.style.opacity = "0";
        document.body.style.transition = `opacity ${duration}ms ease-in`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.body.style.opacity = "1";
          });
        });
      }
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
    if (now - lastWheel < DEBOUNCE_MS) return;
    lastWheel = now;
    if (e.deltaY > 0) handleScrollDown();
    else if (e.deltaY < 0) handleScrollUp();
  }

  let touchStartY = 0;
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

  document.addEventListener("click", (e) => {
    const link = e.target.closest(".navbar a[href]");
    if (!link || link.target === "_blank") return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;
    const path = href === "index.html" ? "/" : (href.startsWith("/") ? href : "/" + href.replace(".html", ""));
    if (PAGES.includes(path)) {
      e.preventDefault();
      storePosition();
      goToPage(PAGES.indexOf(path));
    }
  });

})();
