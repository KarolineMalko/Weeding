const translations = {
  en: {
    "nav.wedding": "Wedding",
    "nav.church": "Church",
    "nav.venue": "Venue",
    "nav.photo": "Photo",
    "nav.more": "More",
    "nav.response": "Resp",
    "home.welcome": "Welcome to our wedding",
    "home.names": "Karoline & Erik",
    "church.quote.word": "Love",
    "church.quote.line": "one another as I have loved you",
    "church.quote.cite": "John 15:12",
    "church.title": "Hedvig Eleonora kyrka",
    "church.time": "16:00",
    "church.address": "Storgatan 2, Stockholm",
    "venue.title": "Cello Slottet",
    "venue.time": "18:00",
    "venue.address": "Segersbyvägen 7, Norsborg",
    "photo.title": "Share your photos",
    "photo.scan": "Scan the QR code to upload",
    "last.honeymoon-poem": "No need for gifts, don't stress or dash.\nThe easiest thing…\njust honeymoon cash.",
    "last.dresscode": "Dress Code:",
    "last.dresscode-desc": "Semi-formal",
    "last.rsvp": "RSVP by:",
    "last.rsvp-date": "1 June 2026",
    "last.adults-only": "Parents deserve a night off too! Please join us for an adults-only celebration.",
    "last.contact": "Contact / Swish",
    "response.title": "RSVP",
    "response.can-come": "I can come 🤩❤️",
    "response.cannot-come": "I can not come 😢💔",
    "response.name": "Name",
    "response.name-required": "Please enter your name.",
    "response.guests": "Number of guests",
    "response.guests-invalid": "Please enter the number of guests (at least 1).",
    "response.guests-cap-hint":
      "Your invite is for up to {max} guests—you can lower the number, not raise it.",
    "response.message": "Message",
    "response.message-example": "e.g. Dietary restrictions, allergies, or anything else you'd like us to know.",
    "response.send": "Send answer",
    "response.thank-you": "Thank you for letting us know.",
    "response.thank-you-attending": "Thank you! We look forward to seeing you!",
    "response.change": "Change response",
    "response.back-home": "Back to home",
  },
  sv: {
    "nav.wedding": "Bröllop",
    "nav.church": "Kyrka",
    "nav.venue": "Plats",
    "nav.photo": "Foto",
    "nav.more": "Mer",
    "nav.response": "Svar",
    "home.welcome": "Välkommen\ntill vårt bröllop",
    "home.names": "Karoline & Erik",
    "church.quote.word": "Älska",
    "church.quote.line": "varandra så som jag har älskat er",
    "church.quote.cite": "John 15:12",
    "church.title": "Hedvig Eleonora kyrka",
    "church.time": "kl. 16:00",
    "church.address": "Storgatan 2, Stockholm",
    "venue.title": "Cello Slottet",
    "venue.time": "kl. 18:00",
    "venue.address": "Segersbyvägen 7, Norsborg",
    "photo.title": "Dela dina foton",
    "photo.scan": "Skanna QR-koden för att ladda upp",
    "last.honeymoon-poem": "Vill ni ge något, gör det lätt.\nEn slant till vår smekmånad blir helt rätt.",
    "last.dresscode": "Klädsel:",
    "last.dresscode-desc": "Kavaj",
    "last.rsvp": "OSA senast:",
    "last.rsvp-date": "1 juni 2026",
    "last.adults-only": "Föräldrar förtjänar en kväll utan barn! Välkommen till en fest endast för vuxna.",
    "last.contact": "Kontakt / Swish",
    "response.title": "OSA",
    "response.can-come": "Jag kan komma 🤩❤️",
    "response.cannot-come": "Jag kan inte komma 😢💔",
    "response.name": "Namn",
    "response.name-required": "Ange ditt namn.",
    "response.guests": "Antal gäster",
    "response.guests-invalid": "Ange antal gäster (minst 1).",
    "response.guests-cap-hint":
      "Din inbjudan gäller högst {max} gäster—du kan sänka antalet, inte höja det.",
    "response.message": "Meddelande",
    "response.message-example": "t.ex. Kostrestriktioner, allergier eller annat du vill att vi ska veta.",
    "response.send": "Skicka svar",
    "response.thank-you": "Tack för att du lät oss veta.",
    "response.thank-you-attending": "Tack! Vi ser fram emot att träffa dig!",
    "response.change": "Ändra svar",
    "response.back-home": "Tillbaka till startsidan",
  },
};

function getLang() {
  return localStorage.getItem("wedding-lang") || "en";
}

function setLang(lang) {
  localStorage.setItem("wedding-lang", lang);
  document.documentElement.lang = lang;
  applyTranslations();
  window.dispatchEvent(new Event("wedding:langchange"));
  updateLangDropdown();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (typeof window.__weddingUpdateNavIndicator === "function") {
        window.__weddingUpdateNavIndicator(false);
      }
    });
  });
}

function t(key) {
  const lang = getLang();
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = t(key);
    el.textContent = text;
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

function init() {
  document.documentElement.lang = getLang();
  applyTranslations();
  initLangDropdown();
  updateLangDropdown();
}

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("wedding:pagechange", init);
