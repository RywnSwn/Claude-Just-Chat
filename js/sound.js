/* sound.js — interface sounds, synthesised.
 *
 * There are no audio files in this repo. Every sound is a couple of
 * oscillators built at call time, which means the whole sound design is
 * ~40 lines and adds zero bytes to the page weight.
 *
 * Usage: put data-sound="tap" on anything clickable. One delegated
 * listener handles all of them, so new buttons need no wiring.
 */

import { on, store } from "./bus.js";

let ctx = null;
let enabled = store.get("sound", false);

const RECIPES = {
  //        freq  →  freq   type        dur    gain
  tap:     { from: 880, to: 1320, type: "triangle", dur: 0.06, gain: 0.05 },
  open:    { from: 520, to: 1040, type: "sine",     dur: 0.16, gain: 0.06 },
  close:   { from: 760, to: 300,  type: "sine",     dur: 0.14, gain: 0.06 },
  chime:   { from: 990, to: 1480, type: "sine",     dur: 0.22, gain: 0.07 },
  error:   { from: 260, to: 180,  type: "sawtooth", dur: 0.18, gain: 0.05 },
};

function audio() {
  // Created lazily: browsers refuse an AudioContext before a user gesture.
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function play(name) {
  if (!enabled) return;
  const recipe = RECIPES[name];
  const ac = recipe && audio();
  if (!ac) return;

  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = recipe.type;
  osc.frequency.setValueAtTime(recipe.from, t);
  osc.frequency.exponentialRampToValueAtTime(recipe.to, t + recipe.dur);

  // Fast attack, exponential release — anything slower reads as a "boop".
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(recipe.gain, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + recipe.dur);

  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + recipe.dur + 0.02);
}

function syncToggle(button) {
  if (!button) return;
  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", enabled ? "Disable interface sounds" : "Enable interface sounds");
  button.title = enabled ? "Disable interface sounds" : "Enable interface sounds";
  button.querySelector("[data-sound-label]").textContent = enabled ? "on" : "off";
  button.querySelector(".sound-on")?.classList.toggle("hidden", !enabled);
  button.querySelector(".sound-off")?.classList.toggle("hidden", enabled);
}

export function initSound() {
  const toggle = document.querySelector("#sound-toggle");
  syncToggle(toggle);

  toggle?.addEventListener("click", () => {
    enabled = !enabled;
    store.set("sound", enabled);
    syncToggle(toggle);
    if (enabled) play("chime");   // confirm it works, immediately
  });

  // One listener for every [data-sound] element on the page, now or later.
  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest?.("[data-sound]");
    if (target && !target.disabled) play(target.dataset.sound);
  });

  // Other modules can ask for a sound without importing this file.
  on("sound", (event) => play(event.detail?.name ?? "tap"));
}
