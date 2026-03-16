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
    toggleFields();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
      const name = form.querySelector("#rsvp-name")?.value?.trim() || "";
      const message = form.querySelector("#rsvp-message")?.value?.trim() || "";
      const guests = form.querySelector("#rsvp-guests")?.value?.trim() || "";

      const isYes = attendance === "yes";
      const formspreeId = form.getAttribute("data-formspree-id");
      const submitBtn = form.querySelector(".rsvp-submit");
      const originalBtnText = submitBtn?.textContent || "Send answer";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      if (formspreeId) {
        try {
          const res = await fetch("https://formspree.io/f/" + formspreeId, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attendance: isYes ? "Attending" : "Not attending",
              name,
              guests: isYes ? guests : "",
              message,
            }),
          });
          if (res.ok) {
            alert(isYes ? "Thank you! We look forward to seeing you!" : "Thank you for letting us know.");
            form.reset();
            form.querySelector('input[name="attendance"][value="yes"]').checked = true;
            const gi = form.querySelector("#rsvp-guests");
            if (gi) gi.value = "1";
            toggleFields();
          } else {
            throw new Error("Send failed");
          }
        } catch (err) {
          mailtoFallback();
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        }
      } else {
        mailtoFallback();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }

      function mailtoFallback() {
        const body = `RSVP Wedding\n${isYes ? "Attending" : "Not attending"}\nName: ${name}${isYes && guests ? `\nGuests: ${guests}` : ""}${message ? `\nMessage: ${message}` : ""}`;
        const email = form.getAttribute("data-rsvp-email") || "your@email.com";
        alert(isYes ? "Thank you! We look forward to seeing you!" : "Thank you for letting us know.");
        window.location.href = "mailto:" + email + "?subject=RSVP%20Wedding&body=" + encodeURIComponent(body);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("wedding:pagechange", init);
})();
