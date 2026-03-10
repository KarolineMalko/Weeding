(function () {
  const PAGE_SELECTORS = {
    "page-home": ".brand",
    "page-church": ".navbar .nav-link:nth-of-type(2)",
    "page-venue": ".navbar .nav-link:nth-of-type(3)",
    "page-photo": ".navbar .nav-link:nth-of-type(4)",
    "page-last": ".navbar .nav-link:nth-of-type(5)",
  };

  function updateIndicator(animateFromStored) {
    const indicator = document.querySelector(".nav-indicator");
    if (!indicator) return;

    const bodyClass = Array.from(document.body.classList).find((c) =>
      c.startsWith("page-")
    );
    const selector = bodyClass ? PAGE_SELECTORS[bodyClass] : PAGE_SELECTORS["page-home"];
    const activeLink = document.querySelector(selector);

    if (!activeLink) return;

    const nav = document.querySelector(".navbar");
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    const pad = 8;
    const targetLeft = linkRect.left - navRect.left - pad;
    const targetWidth = linkRect.width + pad * 2;

    let stored;
    try {
      stored = animateFromStored && sessionStorage.getItem("wedding-nav-from");
      if (stored) stored = JSON.parse(stored);
    } catch (_) {}

    if (stored) {
      indicator.style.left = stored.left + "px";
      indicator.style.width = stored.width + "px";
      indicator.style.visibility = "visible";
      try {
        sessionStorage.removeItem("wedding-nav-from");
      } catch (_) {}
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          indicator.style.left = targetLeft + "px";
          indicator.style.width = targetWidth + "px";
        });
      });
    } else {
      indicator.style.left = targetLeft + "px";
      indicator.style.width = targetWidth + "px";
      indicator.style.visibility = "visible";
    }
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

  function init() {
    updateIndicator(true);
    window.addEventListener("resize", () => updateIndicator(false));
    document.querySelector(".navbar")?.addEventListener("click", (e) => {
      if (e.target.closest("a")) storePosition();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("wedding:pagechange", () => updateIndicator(true));
})();
