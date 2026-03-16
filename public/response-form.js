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

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
      const name = form.querySelector("#rsvp-name")?.value?.trim() || "";
      const message = form.querySelector("#rsvp-message")?.value?.trim() || "";
      const guests = form.querySelector("#rsvp-guests")?.value?.trim() || "";

      const isYes = attendance === "yes";
      let body = `RSVP Wedding\n${isYes ? "Attending" : "Not attending"}\nName: ${name}`;
      if (isYes && guests) body += `\nGuests: ${guests}`;
      if (message) body += `\nMessage: ${message}`;

      alert(isYes ? "Thank you! We look forward to seeing you!" : "Thank you for letting us know.");
      window.location.href = "sms:+46700534084?body=" + encodeURIComponent(body);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("wedding:pagechange", init);
})();
