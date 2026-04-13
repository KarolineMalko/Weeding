(function () {
  const GUEST_RANGE = { min: 1, max: 99 };
  const GUEST_DEFAULT_STORAGE = "wedding-default-guests";

  (function applyRootGuestPath() {
    const pathname = (window.location.pathname || "/").replace(/\/$/, "") || "/";
    const rootMatch = /^\/(\d+)$/.exec(pathname);
    if (!rootMatch) return;
    const n = Number(rootMatch[1], 10);
    if (
      !Number.isInteger(n) ||
      n < GUEST_RANGE.min ||
      n > GUEST_RANGE.max
    ) {
      return;
    }
    try {
      sessionStorage.setItem(GUEST_DEFAULT_STORAGE, String(n));
    } catch (_) {}
    try {
      history.replaceState(null, "", "/");
    } catch (_) {}
  })();

  function parseDefaultGuestCount() {
    const pathname = (window.location.pathname || "/").replace(/\/$/, "") || "/";
    const pathMatch = /^\/response\/(\d+)$/.exec(pathname);
    if (pathMatch) {
      const n = Number(pathMatch[1], 10);
      if (
        Number.isInteger(n) &&
        n >= GUEST_RANGE.min &&
        n <= GUEST_RANGE.max
      ) {
        return n;
      }
    }
    try {
      const stored = sessionStorage.getItem(GUEST_DEFAULT_STORAGE);
      if (stored != null && stored !== "") {
        const n = Number(stored, 10);
        if (
          Number.isInteger(n) &&
          n >= GUEST_RANGE.min &&
          n <= GUEST_RANGE.max
        ) {
          return n;
        }
      }
    } catch (_) {}
    const q = new URLSearchParams(window.location.search).get("guests");
    if (q != null && q !== "") {
      const n = Number(q, 10);
      if (
        Number.isInteger(n) &&
        n >= GUEST_RANGE.min &&
        n <= GUEST_RANGE.max
      ) {
        return n;
      }
    }
    return null;
  }

  function init() {
    const urlDefaultGuests = parseDefaultGuestCount();
    const form = document.getElementById("rsvp-form");
    const formFields = document.getElementById("form-fields");
    const guestsField = document.getElementById("guests-field");
    const messageExample = document.getElementById("message-example");
    const attendanceRadios = form?.querySelectorAll('input[name="attendance"]');
    const nameInput = document.getElementById("rsvp-name");
    const guestsInput = document.getElementById("rsvp-guests");

    if (!form || !formFields || !attendanceRadios?.length) return;

    function guestCap() {
      return urlDefaultGuests != null ? urlDefaultGuests : GUEST_RANGE.max;
    }

    function applyGuestInputLimits() {
      if (!guestsInput) return;
      const cap = guestCap();
      guestsInput.min = String(GUEST_RANGE.min);
      guestsInput.max = String(Math.min(cap, GUEST_RANGE.max));
    }

    function clampGuestsValue() {
      if (!guestsInput) return;
      const raw = String(guestsInput.value ?? "").trim();
      if (raw === "") return;
      const n = Number(raw, 10);
      if (!Number.isFinite(n)) return;
      const cap = guestCap();
      let next = n;
      if (next > cap) next = cap;
      if (next < GUEST_RANGE.min) next = GUEST_RANGE.min;
      if (next !== n) guestsInput.value = String(next);
    }

    function toggleFields() {
      const isYes = form.querySelector('input[name="attendance"]:checked')?.value === "yes";
      formFields.hidden = false;
      if (guestsField) guestsField.hidden = !isYes;
      if (messageExample) messageExample.hidden = !isYes;

      if (guestsInput) {
        guestsInput.required = isYes;
        if (!isYes) {
          guestsInput.removeAttribute("required");
          guestsInput.value = "";
          guestsInput.setCustomValidity("");
        } else {
          applyGuestInputLimits();
          if (
            urlDefaultGuests != null &&
            !String(guestsInput.value ?? "").trim()
          ) {
            guestsInput.value = String(urlDefaultGuests);
          }
          clampGuestsValue();
        }
      }
      if (nameInput) {
        nameInput.required = true;
        if (!isYes) nameInput.setCustomValidity("");
      }
    }

    if (!form.dataset.rsvpBound) {
      form.dataset.rsvpBound = "1";

      attendanceRadios.forEach((radio) => {
        radio.addEventListener("change", toggleFields);
      });

      if (guestsInput) {
        guestsInput.addEventListener("input", () => {
          clampGuestsValue();
          guestsInput.setCustomValidity("");
        });
      }

      const thankYou = document.getElementById("thank-you");
      const changeBtn = document.getElementById("change-response-btn");

      async function submitRsvpApi(payload) {
        const errBox = document.getElementById("rsvp-submit-error");
        try {
          const res = await fetch("/api/rsvp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const text = await res.text();
          let data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = {
              error: `Server error (${res.status}). ${text ? text.slice(0, 200) : ""}`,
            };
          }
          if (!res.ok) {
            const msg = data.error || "Could not save. Try again.";
            if (errBox) {
              errBox.textContent = msg;
              errBox.hidden = false;
            } else {
              alert(msg);
            }
            return false;
          }
          if (errBox) {
            errBox.textContent = "";
            errBox.hidden = true;
          }
          return true;
        } catch {
          const msg = "Network error. Check your connection and try again.";
          if (errBox) {
            errBox.textContent = msg;
            errBox.hidden = false;
          } else {
            alert(msg);
          }
          return false;
        }
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errBox = document.getElementById("rsvp-submit-error");
        if (errBox) {
          errBox.textContent = "";
          errBox.hidden = true;
        }

        const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
        const message = form.querySelector("#rsvp-message")?.value?.trim() || "";
        const name = form.querySelector("#rsvp-name")?.value?.trim() || "";
        const isYes = attendance === "yes";

        if (!name) {
          if (nameInput) {
            nameInput.setCustomValidity(
              typeof t === "function"
                ? t("response.name-required")
                : "Please enter your name."
            );
            nameInput.reportValidity();
          }
          return;
        }
        if (nameInput) nameInput.setCustomValidity("");

        if (isYes) {
          if (guestsInput) guestsInput.setCustomValidity("");
          const raw = guestsInput?.value?.trim() ?? "";
          const n = Number(raw);
          const cap = guestCap();
          const ok =
            raw !== "" &&
            Number.isFinite(n) &&
            Number.isInteger(n) &&
            n >= GUEST_RANGE.min &&
            n <= cap;
          if (!ok) {
            if (guestsInput) {
              guestsInput.setCustomValidity(
                typeof t === "function"
                  ? t("response.guests-invalid")
                  : "Please enter the number of guests (at least 1)."
              );
              guestsInput.reportValidity();
            }
            return;
          }

          const saved = await submitRsvpApi({
            attending: "yes",
            name,
            guestCount: n,
            message,
          });
          if (!saved) return;

          form.hidden = true;
          if (thankYou) {
            const thankMsg = thankYou.querySelector(".rsvp-thank-you-msg");
            if (thankMsg) {
              thankMsg.textContent =
                typeof t === "function"
                  ? t("response.thank-you-attending")
                  : "Thank you! We look forward to seeing you!";
            }
            thankYou.hidden = false;
          }
          return;
        }

        const saved = await submitRsvpApi({
          attending: "no",
          name,
          message,
        });
        if (!saved) return;

        form.hidden = true;
        if (thankYou) {
          const thankMsg = thankYou.querySelector(".rsvp-thank-you-msg");
          if (thankMsg) {
            thankMsg.textContent =
              typeof t === "function" ? t("response.thank-you") : "Thank you for letting us know.";
          }
          thankYou.hidden = false;
        }
      });

      if (changeBtn) {
        changeBtn.addEventListener("click", () => {
          if (thankYou) thankYou.hidden = true;
          form.hidden = false;
          form.querySelector('input[name="attendance"][value="yes"]').checked = true;
          if (nameInput) {
            nameInput.value = "";
            nameInput.setCustomValidity("");
          }
          if (guestsInput) {
            guestsInput.value = "";
            guestsInput.setCustomValidity("");
          }
          toggleFields();
        });
      }

      if (nameInput) {
        nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
      }
    }

    toggleFields();
    requestAnimationFrame(() => toggleFields());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("wedding:pagechange", init);
})();
