/* status.js — the small living details.
 *
 * Rotating profile status, the taskbar clock, the "N ITEMS" counters, and
 * file-row selection in the projects window. All of it degrades to a
 * perfectly good static page if this module never runs.
 */

import { on } from "./bus.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

function initRotatingStatus() {
  const target = document.querySelector("[data-profile-status-text]");
  const options = [...document.querySelectorAll("[data-profile-status-option]")]
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  if (!target || options.length < 2) return;

  // Start on whichever line is already rendered, so the first swap isn't a
  // repeat of what the visitor just read.
  let index = Math.max(0, options.indexOf(target.textContent.trim()));

  function next() {
    index = (index + 1) % options.length;
    target.style.opacity = "0";
    setTimeout(() => {
      target.textContent = options[index];
      target.style.opacity = "1";
    }, REDUCED.matches ? 0 : 220);
  }

  target.style.transition = "opacity 220ms ease";
  setInterval(next, 7000);

  // Clicking the status skips ahead — people will poke it, let them.
  const box = target.closest(".profile-status");
  if (box) {
    box.style.cursor = "pointer";
    box.title = "Click for another one";
    box.addEventListener("click", next);
  }
}

function initClock() {
  const clock = document.querySelector("[data-clock]");
  if (!clock) return;

  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit",
    });
  };
  tick();
  setInterval(tick, 15000);
}

function initUptime() {
  const target = document.querySelector("[data-uptime]");
  if (!target) return;

  const start = Date.now();
  const tick = () => {
    const total = Math.floor((Date.now() - start) / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    target.textContent = `${mm}:${ss}`;
  };
  tick();
  setInterval(tick, 1000);
}

function initCounters() {
  const bookmarks = document.querySelectorAll(".contact-grid .contact-card").length;
  const bookmarkLabel = document.querySelector("[data-bookmark-count]");
  if (bookmarkLabel) bookmarkLabel.textContent = `${bookmarks} ITEM${bookmarks === 1 ? "" : "S"}`;

  const files = document.querySelectorAll(".file-list .file-row").length;
  const fileLabel = document.querySelector("[data-projects-count]");
  if (fileLabel) fileLabel.textContent = `${files} FILE${files === 1 ? "" : "S"}`;
}

function initFileSelection() {
  const rows = [...document.querySelectorAll(".file-list .file-row")];
  const readout = document.querySelector("[data-projects-selected]");
  if (!rows.length) return;

  function select(row) {
    rows.forEach((r) => r.classList.toggle("is-selected", r === row));
    if (!readout) return;
    readout.textContent = row
      ? `${row.querySelector(".file-name strong")?.textContent ?? "ITEM"} SELECTED`
      : "NOTHING SELECTED";
  }

  rows.forEach((row) => {
    row.addEventListener("pointerdown", () => select(row));
  });

  // Dragging a marquee on the desktop clears the selection, same as a real
  // file browser. This is the whole reason the bus exists.
  on("desktop-marquee", () => select(null));
}

export function initStatus() {
  initRotatingStatus();
  initClock();
  initUptime();
  initCounters();
  initFileSelection();
}
