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

  function guestCapGlobal() {
    return parseDefaultGuestCount() ?? GUEST_RANGE.max;
  }

  function parseCombinedGuestNames(str) {
    return String(str || "")
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function init() {
    const form = document.getElementById("rsvp-form");
    const formFields = document.getElementById("form-fields");
    const guestsField = document.getElementById("guests-field");
    const messageExample = document.getElementById("message-example");
    const attendanceRadios = form?.querySelectorAll('input[name="attendance"]');
    const nameInput = document.getElementById("rsvp-name");
    const nameGroup = document.getElementById("rsvp-name-group");
    const guestsInput = document.getElementById("rsvp-guests");
    const guestNamesWrap = document.getElementById("rsvp-guest-names-wrap");
    const guestNamesCombined = document.getElementById("rsvp-guest-names-combined");
    const guestsCapHintEl = document.getElementById("rsvp-guests-cap-hint");
    let capHintHideTimer = null;

    if (!form || !formFields || !attendanceRadios?.length) return;

    function hideGuestCapHint() {
      if (capHintHideTimer) {
        clearTimeout(capHintHideTimer);
        capHintHideTimer = null;
      }
      if (guestsCapHintEl) guestsCapHintEl.hidden = true;
    }

    function showGuestCapHint() {
      if (!guestsCapHintEl || parseDefaultGuestCount() == null) return;
      const cap = guestCap();
      const template =
        typeof t === "function"
          ? t("response.guests-cap-hint")
          : "Your invite is for up to {max} guests—you can lower the number, not raise it.";
      guestsCapHintEl.textContent = template.replace(/\{max\}/g, String(cap));
      guestsCapHintEl.hidden = false;
      if (capHintHideTimer) clearTimeout(capHintHideTimer);
      capHintHideTimer = setTimeout(hideGuestCapHint, 5500);
    }

    /** Always read fresh (path/session/query) so cap is never stale after navigation. */
    function guestCap() {
      return parseDefaultGuestCount() ?? GUEST_RANGE.max;
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
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) return;
      const cap = guestCap();
      const triedAboveCap = parseDefaultGuestCount() != null && n > cap;
      let next = n;
      if (next > cap) next = cap;
      if (next < GUEST_RANGE.min) next = GUEST_RANGE.min;
      if (next !== n) {
        guestsInput.value = String(next);
        updateGuestNamesUI();
      }
      if (triedAboveCap) showGuestCapHint();
    }

    /** Invite links: empty field snaps back to the allowed count (mobile often skips input events). */
    function normalizeGuestsOnBlur() {
      if (!guestsInput) return;
      applyGuestInputLimits();
      const invite = parseDefaultGuestCount();
      const raw = String(guestsInput.value ?? "").trim();
      if (raw === "" && invite != null) {
        guestsInput.value = String(invite);
        guestsInput.setCustomValidity("");
        updateGuestNamesUI();
        return;
      }
      clampGuestsValue();
      updateGuestNamesUI();
    }

    function syncGuestsBeforeSubmit() {
      if (!guestsInput) return;
      applyGuestInputLimits();
      const invite = parseDefaultGuestCount();
      const raw = String(guestsInput.value ?? "").trim();
      if (raw === "" && invite != null) {
        guestsInput.value = String(invite);
      }
      clampGuestsValue();
      updateGuestNamesUI();
    }

    /** One guest: show contact name field. Two+: single comma-separated list (all full names). */
    function updateGuestNamesUI() {
      if (!guestsInput) return;
      const raw = String(guestsInput.value ?? "").trim();
      const n = parseInt(raw, 10);
      if (!guestNamesWrap || !guestNamesCombined) return;

      if (!Number.isFinite(n) || n < GUEST_RANGE.min) {
        guestNamesWrap.hidden = true;
        guestNamesCombined.removeAttribute("required");
        if (nameGroup) {
          nameGroup.hidden = false;
        }
        if (nameInput) nameInput.required = true;
        return;
      }

      const count = Math.min(n, guestCap());
      if (count === 1) {
        guestNamesWrap.hidden = true;
        guestNamesCombined.removeAttribute("required");
        guestNamesCombined.value = "";
        if (nameGroup) nameGroup.hidden = false;
        if (nameInput) nameInput.required = true;
      } else {
        guestNamesWrap.hidden = false;
        guestNamesCombined.required = true;
        if (nameGroup) nameGroup.hidden = true;
        if (nameInput) {
          nameInput.removeAttribute("required");
          nameInput.value = "";
          nameInput.setCustomValidity("");
        }
      }
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
          if (guestNamesCombined) {
            guestNamesCombined.value = "";
            guestNamesCombined.removeAttribute("required");
          }
          if (guestNamesWrap) guestNamesWrap.hidden = true;
          if (nameGroup) nameGroup.hidden = false;
          hideGuestCapHint();
        } else {
          applyGuestInputLimits();
          const invite = parseDefaultGuestCount();
          if (invite != null && !String(guestsInput.value ?? "").trim()) {
            guestsInput.value = String(invite);
          }
          clampGuestsValue();
          updateGuestNamesUI();
        }
      }
      if (nameInput && !isYes) {
        nameInput.required = true;
        nameInput.setCustomValidity("");
      }
    }

    if (!form.dataset.rsvpBound) {
      form.dataset.rsvpBound = "1";

      attendanceRadios.forEach((radio) => {
        radio.addEventListener("change", toggleFields);
      });

      if (guestsInput) {
        const onGuestsInteraction = () => {
          clampGuestsValue();
          guestsInput.setCustomValidity("");
          updateGuestNamesUI();
        };
        guestsInput.addEventListener("input", onGuestsInteraction);
        guestsInput.addEventListener("change", onGuestsInteraction);
        guestsInput.addEventListener("blur", normalizeGuestsOnBlur);

        guestsInput.addEventListener(
          "keydown",
          (e) => {
            if (parseDefaultGuestCount() == null) return;
            const cap = guestCap();
            const raw = String(guestsInput.value ?? "").trim();
            const v = raw === "" ? NaN : parseInt(raw, 10);
            if (!Number.isFinite(v)) return;
            if (e.key === "ArrowUp" || e.key === "PageUp") {
              if (v >= cap) {
                e.preventDefault();
                showGuestCapHint();
              }
            }
          },
          true
        );

        guestsInput.addEventListener(
          "wheel",
          (e) => {
            if (parseDefaultGuestCount() == null) return;
            const cap = guestCap();
            const raw = String(guestsInput.value ?? "").trim();
            const v = raw === "" ? NaN : parseInt(raw, 10);
            if (!Number.isFinite(v)) return;
            if (e.deltaY < 0 && v >= cap) {
              e.preventDefault();
              showGuestCapHint();
            }
          },
          { passive: false }
        );

        guestsInput.addEventListener("beforeinput", (e) => {
          if (parseDefaultGuestCount() == null) return;
          if (e.inputType !== "stepUp" && e.inputType !== "historyStepUp") return;
          const cap = guestCap();
          const raw = String(guestsInput.value ?? "").trim();
          const v = raw === "" ? NaN : parseInt(raw, 10);
          if (Number.isFinite(v) && v >= cap) {
            e.preventDefault();
            showGuestCapHint();
          }
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
        const isYes = attendance === "yes";

        if (isYes) {
          if (guestsInput) guestsInput.setCustomValidity("");
          syncGuestsBeforeSubmit();
          const raw = guestsInput?.value?.trim() ?? "";
          const n = parseInt(raw, 10);
          const cap = guestCap();
          const ok =
            raw !== "" &&
            /^\d+$/.test(raw) &&
            Number.isFinite(n) &&
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

          updateGuestNamesUI();

          let guestNameList;
          let contactName;

          if (n === 1) {
            contactName = form.querySelector("#rsvp-name")?.value?.trim() || "";
            if (!contactName) {
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
            guestNameList = [contactName];
          } else {
            guestNameList = parseCombinedGuestNames(guestNamesCombined?.value ?? "");
            if (guestNameList.length !== n || guestNameList.some((s) => !s)) {
              const template =
                typeof t === "function"
                  ? t("response.guest-names-wrong-count")
                  : "Please enter exactly {n} names, separated by commas.";
              if (errBox) {
                errBox.textContent = template.replace(/\{n\}/g, String(n));
                errBox.hidden = false;
              }
              guestNamesCombined?.focus();
              return;
            }
            contactName = guestNameList[0];
          }

          const saved = await submitRsvpApi({
            attending: "yes",
            name: contactName,
            guestCount: n,
            guestNameList,
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

        const declineName = form.querySelector("#rsvp-name")?.value?.trim() || "";
        if (!declineName) {
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

        const saved = await submitRsvpApi({
          attending: "no",
          name: declineName,
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
          if (guestNamesCombined) guestNamesCombined.value = "";
          toggleFields();
        });
      }

      if (nameInput) {
        nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
      }
      if (guestNamesCombined) {
        guestNamesCombined.addEventListener("input", () => {
          const errBox = document.getElementById("rsvp-submit-error");
          if (errBox) {
            errBox.textContent = "";
            errBox.hidden = true;
          }
        });
      }

      form._updateGuestNamesUI = updateGuestNamesUI;
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

  if (!window.__weddingRsvpCapHintLangListener) {
    window.__weddingRsvpCapHintLangListener = true;
    window.addEventListener("wedding:langchange", () => {
      const f = document.getElementById("rsvp-form");
      if (f && typeof f._updateGuestNamesUI === "function") {
        f._updateGuestNamesUI();
      }
      const el = document.getElementById("rsvp-guests-cap-hint");
      if (!el || el.hidden) return;
      if (parseDefaultGuestCount() == null) return;
      const cap = guestCapGlobal();
      const template =
        typeof t === "function" ? t("response.guests-cap-hint") : "";
      el.textContent = template.replace(/\{max\}/g, String(cap));
    });
  }
})();
