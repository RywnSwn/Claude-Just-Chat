/* guestbook.js — a guestbook that lives in localStorage.
 *
 * Entries are per-browser: nobody else sees yours and you don't see theirs.
 * The status line says so plainly rather than implying a server exists.
 * Swapping in a real backend means replacing load() and save() and nothing
 * else — the render path already treats entries as untrusted data.
 */

import { emit, store } from "./bus.js";

const KEY = "guestbook";
const MAX_ENTRIES = 50;

const SEED = [
  { name: "rywnswn", message: "first :)", at: Date.now() - 1000 * 60 * 60 * 24 },
];

export function initGuestbook() {
  const form = document.querySelector("[data-guestbook-form]");
  const list = document.querySelector("[data-guestbook-list]");
  if (!form || !list) return;

  const nameInput = form.querySelector("[data-guestbook-name]");
  const messageInput = form.querySelector("[data-guestbook-message]");
  const status = document.querySelector("[data-guestbook-status]");
  const count = document.querySelector("[data-guestbook-count]");
  const states = document.querySelectorAll("[data-guestbook-state]");
  const storageLabel = document.querySelector("[data-guestbook-storage]");

  let entries = store.get(KEY, null) ?? SEED;

  const setState = (text) => states.forEach((el) => { el.textContent = text; });

  function setStatus(text, tone = "") {
    if (!status) return;
    status.textContent = text;
    status.classList.remove("is-error", "is-ok");
    if (tone) status.classList.add(tone);
  }

  function relative(timestamp) {
    const seconds = Math.round((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  function render() {
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "guestbook-empty";
      empty.textContent = "NO ENTRIES YET. BE THE FIRST.";
      list.append(empty);
    } else {
      for (const entry of entries) {
        const item = document.createElement("li");
        item.className = "guestbook-entry";

        const head = document.createElement("div");
        head.className = "guestbook-entry-head";

        const who = document.createElement("span");
        who.className = "guestbook-entry-name";
        // textContent, never innerHTML — this is user input, even if the
        // only user is you.
        who.textContent = entry.name;

        const when = document.createElement("time");
        when.className = "guestbook-entry-time";
        when.dateTime = new Date(entry.at).toISOString();
        when.textContent = relative(entry.at);

        const body = document.createElement("p");
        body.className = "guestbook-entry-body";
        body.textContent = entry.message;

        head.append(who, when);
        item.append(head, body);
        list.append(item);
      }
    }

    if (count) count.textContent = `${entries.length} ENTR${entries.length === 1 ? "Y" : "IES"}`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    for (const [field, value] of [[nameInput, name], [messageInput, message]]) {
      field.setAttribute("aria-invalid", String(!value));
    }

    if (!name || !message) {
      setStatus("BOTH FIELDS ARE REQUIRED", "is-error");
      emit("sound", { name: "error" });
      (!name ? nameInput : messageInput).focus();
      return;
    }

    entries = [{ name, message, at: Date.now() }, ...entries].slice(0, MAX_ENTRIES);
    const saved = store.set(KEY, entries);

    render();
    messageInput.value = "";
    messageInput.removeAttribute("aria-invalid");
    nameInput.removeAttribute("aria-invalid");
    setStatus(saved ? "SIGNED. THANK YOU." : "SIGNED, BUT NOT SAVED (STORAGE BLOCKED)", saved ? "is-ok" : "is-error");
    setState("SIGNED");
    emit("sound", { name: "chime" });
    emit("guestbook-sign", { name });

    setTimeout(() => {
      setStatus("Saved in your browser only · cloud hook ready");
      setState("READY");
    }, 3000);
  });

  // If storage is unavailable, say so up front instead of silently losing
  // the entry after someone has typed it.
  if (!store.set("probe", 1)) {
    if (storageLabel) storageLabel.textContent = "STORAGE BLOCKED";
    setStatus("BROWSER STORAGE BLOCKED · ENTRIES WON'T PERSIST", "is-error");
  }

  render();
}
