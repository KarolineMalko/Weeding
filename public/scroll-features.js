(function () {
  const PAGES = ["/", "/church", "/venue", "/last"];

  function getPageIndex() {
    const path = (window.location.pathname || "/").replace(/\/$/, "") || "/";
    const normalized = path === "" ? "/" : path;
    const idx = PAGES.indexOf(normalized);
    return idx >= 0 ? idx : 0;
  }

  function updateScrollProgress() {
    const idx = getPageIndex();
    document.querySelectorAll(".scroll-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === idx);
    });
  }

  function triggerEasterEgg() {
    if (getPageIndex() !== 3) return;
    if (sessionStorage.getItem("wedding-confetti")) return;
    sessionStorage.setItem("wedding-confetti", "1");

    const hearts = ["❤️", "💕", "💗", "💖"];
    const container = document.createElement("div");
    container.className = "easter-egg-hearts";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);

    for (let i = 0; i < 12; i++) {
      const heart = document.createElement("span");
      heart.style.cssText = `
        position: fixed;
        left: ${Math.random() * 100}vw;
        top: -20px;
        font-size: ${20 + Math.random() * 24}px;
        animation: heart-fall ${3 + Math.random() * 2}s ease-in forwards;
        animation-delay: ${Math.random() * 0.5}s;
        pointer-events: none;
        z-index: 9999;
      `;
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      container.appendChild(heart);
    }

    setTimeout(() => container.remove(), 6000);
  }

  const style = document.createElement("style");
  style.textContent = `
    @keyframes heart-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(360deg); opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);

  function init() {
    updateScrollProgress();
    triggerEasterEgg();
  }

  window.addEventListener("wedding:pagechange", init);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
