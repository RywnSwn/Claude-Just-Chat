/* theme.js — the skin switcher.
 *
 * The entire visual system is CSS custom properties defined per
 * <html data-palette>, so switching skins is one attribute write. No classes
 * to toggle on individual elements, no stylesheet swap, no reflow of the DOM.
 *
 * Other modules that draw to canvas (the background, the cursor) can't read
 * CSS variables cheaply every frame, so they listen for `rywn:palette` and
 * repaint themselves instead.
 */

import { emit, store } from "./bus.js";

const PALETTES = ["retro", "aero"];
const LABELS = { retro: "RETRO", aero: "AERO" };

export function currentPalette() {
  return document.documentElement.dataset.palette === "aero" ? "aero" : "retro";
}

export function initTheme() {
  const root = document.documentElement;
  const button = document.querySelector("#palette-toggle");

  function apply(name, { announce = true } = {}) {
    const palette = PALETTES.includes(name) ? name : "retro";
    root.dataset.palette = palette;

    const other = palette === "retro" ? "aero" : "retro";
    if (button) {
      button.querySelector("[data-palette-label]").textContent = LABELS[palette];
      button.setAttribute("aria-label", `Switch to the ${other} skin`);
    }

    // Keep the browser chrome in step with the page.
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", palette === "retro" ? "#8c2f42" : "#2a9fd8");

    if (announce) emit("palette", { palette });
  }

  // A saved choice wins over the attribute the HTML shipped with.
  apply(store.get("palette", root.dataset.palette || "retro"), { announce: false });

  button?.addEventListener("click", () => {
    const next = currentPalette() === "retro" ? "aero" : "retro";
    store.set("palette", next);
    apply(next);
    emit("sound", { name: "open" });
  });
}
