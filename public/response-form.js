(function () {
  function init() {
    const form = document.getElementById("rsvp-form");
    const formFields = document.getElementById("form-fields");
    const guestsField = document.getElementById("guests-field");
    const messageExample = document.getElementById("message-example");
    const attendanceRadios = form?.querySelectorAll('input[name="attendance"]');
    const nameInput = document.getElementById("rsvp-name");
    const guestsInput = document.getElementById("rsvp-guests");

    if (!form || !formFields || !attendanceRadios?.length) return;

    function toggleFields() {
      const isYes = form.querySelector('input[name="attendance"]:checked')?.value === "yes";
      formFields.hidden = false;
      if (guestsField) guestsField.hidden = !isYes;
      if (messageExample) messageExample.hidden = !isYes;
      if (guestsInput) {
        guestsInput.required = isYes;
        if (!isYes) guestsInput.removeAttribute("required");
      }
    }

    attendanceRadios.forEach((radio) => {
      radio.addEventListener("change", toggleFields);
    });
    if (guestsInput) {
      guestsInput.addEventListener("input", () => guestsInput.setCustomValidity(""));
    }
    toggleFields();
    requestAnimationFrame(() => toggleFields());

    const thankYou = document.getElementById("thank-you");
    const changeBtn = document.getElementById("change-response-btn");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
      const name = form.querySelector("#rsvp-name")?.value?.trim() || "";
      const message = form.querySelector("#rsvp-message")?.value?.trim() || "";
      const guestsInputEl = form.querySelector("#rsvp-guests");

      const isYes = attendance === "yes";

      if (isYes && guestsInputEl) {
        guestsInputEl.setCustomValidity("");
        const raw = guestsInputEl.value?.trim() ?? "";
        const n = Number(raw);
        const ok =
          raw !== "" &&
          Number.isFinite(n) &&
          Number.isInteger(n) &&
          n >= 1;
        if (!ok) {
          guestsInputEl.setCustomValidity(
            typeof t === "function"
              ? t("response.guests-invalid")
              : "Please enter the number of guests (at least 1)."
          );
          guestsInputEl.reportValidity();
          return;
        }
      }

      const guests = guestsInputEl?.value?.trim() || "";

      let body;
      if (isYes) {
        body = `RSVP Wedding\nAnswer: Yes\nName: ${name}\nGuests: ${guests}`;
        if (message) body += `\nMessage: ${message}`;
      } else {
        body = `Name: ${name}\nAnswer: No`;
        if (message) body += `\nMessage: ${message}`;
      }

      window.location.href = "sms:+46700534084?body=" + encodeURIComponent(body);

      form.hidden = true;
      if (thankYou) {
        const msg = thankYou.querySelector(".rsvp-thank-you-msg");
        if (msg) msg.textContent = (typeof t === "function" ? t(isYes ? "response.thank-you-attending" : "response.thank-you") : (isYes ? "Thank you! We look forward to seeing you!" : "Thank you for letting us know."));
        thankYou.hidden = false;
      }
    });

    if (changeBtn) {
      changeBtn.addEventListener("click", () => {
        if (thankYou) thankYou.hidden = true;
        form.hidden = false;
        form.querySelector('input[name="attendance"][value="yes"]').checked = true;
        const gi = form.querySelector("#rsvp-guests");
        if (gi) {
          gi.value = "";
          gi.setCustomValidity("");
        }
        toggleFields();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("wedding:pagechange", init);
})();
