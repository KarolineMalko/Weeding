const translations = {
  en: {
    "nav.wedding": "Wedding",
    "nav.church": "Church",
    "nav.venue": "Venue",
    "nav.more": "More",
    "home.welcome": "Welcome to our wedding",
    "home.names": "Erik & Karoline",
    "church.title": "Hedvig Eleonora kyrka",
    "church.time": "16:00",
    "church.address": "Storgatan 2, 114 51 Stockholm",
    "venue.title": "Cello Slottet",
    "venue.time": "18:00",
    "venue.address": "Segersbyvägen 7, 145 63 Norsborg",
    "last.dresscode": "Dress Code:",
    "last.dresscode-desc": "Semi-formal",
    "last.rsvp": "RSVP by:",
    "last.rsvp-date": "01 juni 2026",
    "last.adults-only": "Parents deserve a night off too! Please join us for an adults-only celebration.",
    "last.contact": "Contact",
  },
  sv: {
    "nav.wedding": "Bröllop",
    "nav.church": "Kyrka",
    "nav.venue": "Plats",
    "nav.more": "Mer",
    "home.welcome": "Välkommen till vårt bröllop",
    "home.names": "Erik & Karoline",
    "church.title": "Hedvig Eleonora kyrka",
    "church.time": "16:00",
    "church.address": "Storgatan 2, 114 51 Stockholm",
    "venue.title": "Cello Slottet",
    "venue.time": "18:00",
    "venue.address": "Segersbyvägen 7, 145 63 Norsborg",
    "last.dresscode": "Klädsel:",
    "last.dresscode-desc": "Kavaj",
    "last.rsvp": "OSA senast:",
    "last.rsvp-date": "1 juni 2026",
    "last.adults-only": "Föräldrar förtjänar en kväll utan barn! Välkommen till en fest endast för vuxna.",
    "last.contact": "Kontakt",
  },
};

function getLang() {
  return localStorage.getItem("wedding-lang") || "en";
}

function setLang(lang) {
  localStorage.setItem("wedding-lang", lang);
  document.documentElement.lang = lang;
  applyTranslations();
  updateLangDropdown();
}

function t(key) {
  const lang = getLang();
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = t(key);
    if (text) el.textContent = text;
  });
}

function initLangDropdown() {
  const container = document.querySelector(".lang-dropdown");
  if (!container) return;

  const btn = container.querySelector(".lang-btn");
  const menu = container.querySelector(".lang-menu");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("lang-menu-open");
  });

  document.addEventListener("click", () => menu.classList.remove("lang-menu-open"));

  container.querySelectorAll("[data-lang]").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      setLang(option.getAttribute("data-lang"));
      menu.classList.remove("lang-menu-open");
    });
  });
}

function updateLangDropdown() {
  const curr = getLang();
  const btn = document.querySelector(".lang-btn");
  if (btn) btn.textContent = curr === "sv" ? "SV" : "EN";
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = getLang();
  applyTranslations();
  initLangDropdown();
  updateLangDropdown();
});
