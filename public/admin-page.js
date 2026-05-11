(function () {
  const tokenInput = document.getElementById("admin-token");
  const tokenToggle = document.getElementById("admin-token-toggle");
  const loadBtn = document.getElementById("admin-load-btn");
  const errorEl = document.getElementById("admin-error");
  const tableWrap = document.getElementById("admin-table-wrap");
  const tbody = document.getElementById("admin-tbody");
  const summaryEl = document.getElementById("admin-summary");

  const addDialog = document.getElementById("admin-add-dialog");
  const openAddBtn = document.getElementById("admin-add-open");
  const dialogCloseBtn = document.getElementById("admin-add-dialog-close");
  const cancelBtn = document.getElementById("admin-add-cancel");

  const attendingSelect = document.getElementById("admin-add-attending");
  const yesFields = document.getElementById("admin-add-yes-fields");
  const noFields = document.getElementById("admin-add-no-fields");
  const guestsInput = document.getElementById("admin-add-guests");
  const guestNamesInput = document.getElementById("admin-add-guest-names");
  const nameNoInput = document.getElementById("admin-add-name-no");
  const addSubmitBtn = document.getElementById("admin-add-submit");

  const STORAGE_KEY = "wedding-admin-token";
  const MAX_GUESTS = 99;

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && tokenInput) tokenInput.value = saved;
  } catch (_) {}

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseNameParts(str) {
    return String(str || "")
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function toggleAttFields() {
    if (!attendingSelect || !yesFields || !noFields) return;
    const yes = attendingSelect.value === "yes";
    yesFields.hidden = !yes;
    noFields.hidden = yes;
  }

  function resetAddDialog() {
    if (attendingSelect) attendingSelect.value = "yes";
    if (guestsInput) guestsInput.value = "1";
    if (guestNamesInput) guestNamesInput.value = "";
    if (nameNoInput) nameNoInput.value = "";
    toggleAttFields();
  }

  function closeAddDialog() {
    if (addDialog && typeof addDialog.close === "function") {
      addDialog.close();
    }
  }

  function openAddDialog() {
    showError("");
    resetAddDialog();
    if (addDialog && typeof addDialog.showModal === "function") {
      addDialog.showModal();
      requestAnimationFrame(() => {
        if (attendingSelect && attendingSelect.value === "yes") {
          guestsInput?.focus();
        } else {
          nameNoInput?.focus();
        }
      });
    }
  }

  function buildAddPayload() {
    const body = {};

    if (attendingSelect?.value === "no") {
      const name = nameNoInput?.value?.trim() ?? "";
      if (!name) {
        showError("Enter a name for the declined response.");
        return null;
      }
      return { ...body, attending: "no", name };
    }

    const rawN = guestsInput?.value?.trim() ?? "";
    const n = parseInt(rawN, 10);
    if (!rawN || !Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > MAX_GUESTS) {
      showError("Enter a valid number of guests (1–" + MAX_GUESTS + ").");
      return null;
    }

    const parts = parseNameParts(guestNamesInput?.value ?? "");
    if (parts.length !== n) {
      showError(
        "Guest names must be comma or newline separated, exactly " +
          n +
          " full name(s) (you have " +
          parts.length +
          ")."
      );
      return null;
    }

    return {
      ...body,
      attending: "yes",
      name: parts[0],
      guestCount: n,
      guestNameList: parts,
    };
  }

  async function addRow() {
    showError("");
    const token = tokenInput?.value?.trim() ?? "";
    if (!token) {
      showError("Enter the admin token.");
      closeAddDialog();
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch (_) {}

    const payload = buildAddPayload();
    if (!payload) return;

    if (addSubmitBtn) addSubmitBtn.disabled = true;
    try {
      const res = await fetch("/api/admin/rsvps", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error || "Could not add row (check token and server).");
        return;
      }
      closeAddDialog();
      resetAddDialog();
      await load();
    } catch {
      showError("Network error.");
    } finally {
      if (addSubmitBtn) addSubmitBtn.disabled = false;
    }
  }

  async function load() {
    showError("");
    const token = tokenInput?.value?.trim() ?? "";
    if (!token) {
      showError("Enter the admin token.");
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch (_) {}

    loadBtn.disabled = true;
    try {
      const res = await fetch("/api/admin/rsvps", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error || "Could not load (check token and server).");
        tableWrap.hidden = true;
        return;
      }
      const rows = data.rows || [];
      tbody.innerHTML = rows
        .map((r) => {
          let names = "";
          if (r.attending === "yes") {
            try {
              const arr = JSON.parse(r.guest_names || "[]");
              names = Array.isArray(arr) ? arr.join(", ") : r.guest_names;
            } catch {
              names = r.guest_names || "";
            }
          } else {
            names = r.decline_name || "";
          }
          const rowId = r.id != null && r.id !== "" ? String(r.id) : "";
          const removeBtn = rowId
            ? `<button type="button" class="admin-row-delete" data-id="${escapeHtml(rowId)}">Remove</button>`
            : `<button type="button" class="admin-row-delete" disabled>—</button>`;
          return `<tr>
            <td>${escapeHtml(r.created_at || "")}</td>
            <td>${escapeHtml(r.attending || "")}</td>
            <td>${escapeHtml(r.invite_code || "—")}</td>
            <td>${escapeHtml(names)}</td>
            <td>${r.attendee_count != null ? escapeHtml(String(r.attendee_count)) : "—"}</td>
            <td>${escapeHtml(r.message || "")}</td>
            <td class="admin-col-actions">${removeBtn}</td>
          </tr>`;
        })
        .join("");

      const yesRows = rows.filter((r) => r.attending === "yes");
      const totalGuests = yesRows.reduce((sum, r) => sum + (Number(r.attendee_count) || 0), 0);
      const noCount = rows.filter((r) => r.attending === "no").length;
      summaryEl.textContent = `${rows.length} response(s): ${yesRows.length} attending (${totalGuests} guests total), ${noCount} declined.`;
      tableWrap.hidden = false;
    } finally {
      loadBtn.disabled = false;
    }
  }

  async function removeRow(btn) {
    const id = btn.getAttribute("data-id");
    if (!id) return;
    const token = tokenInput?.value?.trim() ?? "";
    if (!token) {
      showError("Enter the admin token.");
      return;
    }
    if (!window.confirm("Remove this RSVP permanently? This cannot be undone.")) return;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "…";
    showError("");
    try {
      const res = await fetch("/api/admin/rsvps/" + encodeURIComponent(id), {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error || "Could not remove row.");
        btn.disabled = false;
        btn.textContent = label;
        return;
      }
      await load();
    } catch {
      showError("Network error.");
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest(".admin-row-delete");
      if (!btn || btn.disabled || !tbody.contains(btn)) return;
      e.preventDefault();
      removeRow(btn);
    });
  }

  if (loadBtn) loadBtn.addEventListener("click", load);
  if (openAddBtn) openAddBtn.addEventListener("click", openAddDialog);
  if (addSubmitBtn) addSubmitBtn.addEventListener("click", addRow);
  if (cancelBtn) cancelBtn.addEventListener("click", closeAddDialog);
  if (dialogCloseBtn) dialogCloseBtn.addEventListener("click", closeAddDialog);
  if (attendingSelect) attendingSelect.addEventListener("change", toggleAttFields);
  toggleAttFields();

  if (tokenInput) {
    tokenInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") load();
    });
  }
  if (tokenToggle && tokenInput) {
    tokenToggle.addEventListener("click", () => {
      const visible = tokenInput.type === "text";
      tokenInput.type = visible ? "password" : "text";
      tokenToggle.setAttribute("aria-pressed", visible ? "false" : "true");
      tokenToggle.setAttribute("aria-label", visible ? "Show admin token" : "Hide admin token");
      tokenToggle.textContent = visible ? "Show" : "Hide";
    });
  }
})();
