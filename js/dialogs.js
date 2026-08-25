/* dialogs.js — native <dialog> plumbing plus copy-to-clipboard.
 *
 * <dialog> already gives us the backdrop, Escape-to-close, focus trapping
 * and inertness for free. All this adds is the open/close wiring, returning
 * focus to whatever opened it, and the copy button.
 */

import { emit } from "./bus.js";

export function initDialogs() {
  let opener = null;

  document.querySelectorAll("[data-dialog-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const dialog = document.getElementById(trigger.dataset.dialogOpen);
      if (!dialog) return;
      opener = trigger;
      dialog.showModal();
      emit("sound", { name: "open" });
      emit("dialog-open", { id: dialog.id });
    });
  });

  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    // Click the backdrop (i.e. the dialog element itself, not its card) to close.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", () => {
      emit("sound", { name: "close" });
      opener?.focus();
      opener = null;
    });
  });

  /* ------------------------------------------------------------ copy */

  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    const label = button.querySelector("[data-copy-label]");
    const status = document.querySelector("[data-copy-status]");
    let resetTimer = null;

    button.addEventListener("click", async () => {
      const value = button.dataset.copyEmail;
      let ok = false;

      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        // Clipboard API needs a secure context and permission. Fall back to
        // selecting the text so the user can hit Ctrl+C themselves.
        const input = document.querySelector("#email-address");
        if (input) { input.focus(); input.select(); }
      }

      if (label) label.textContent = ok ? "COPIED" : "SELECT + COPY";
      if (status) status.textContent = ok ? "COPIED TO CLIPBOARD" : "PRESS CTRL+C TO COPY";
      emit("sound", { name: ok ? "chime" : "error" });

      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (label) label.textContent = "COPY";
        if (status) status.textContent = "READY TO COPY";
      }, 2200);
    });
  });
}
