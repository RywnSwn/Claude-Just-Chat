/* main.js — boot.
 *
 * Each module is independent and defensive: if one throws, the rest still
 * come up and the page stays usable. That's the point of the split.
 */

import { initSound } from "./sound.js";
import { initCursor } from "./cursor.js";
import { initAurora } from "./aurora.js";
import { initWindows } from "./windows.js";
import { initDialogs } from "./dialogs.js";
import { initStatus } from "./status.js";
import { initGuestbook } from "./guestbook.js";

const MODULES = [
  ["sound", initSound],
  ["cursor", initCursor],
  ["aurora", initAurora],
  ["windows", initWindows],
  ["dialogs", initDialogs],
  ["status", initStatus],
  ["guestbook", initGuestbook],
];

for (const [name, init] of MODULES) {
  try {
    init();
  } catch (error) {
    console.error(`[rywnswn] "${name}" failed to start:`, error);
  }
}
