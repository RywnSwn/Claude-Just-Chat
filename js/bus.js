/* bus.js — a 6-line event bus.
 *
 * Modules never import each other. They shout into `window` and whoever
 * cares listens. That's how the sound module can chirp when a window opens
 * without either module knowing the other exists.
 */

export const NS = "rywn";

export function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(`${NS}:${name}`, { detail }));
}

export function on(name, handler) {
  window.addEventListener(`${NS}:${name}`, handler);
  return () => window.removeEventListener(`${NS}:${name}`, handler);
}

/* localStorage that never throws — private mode, blocked cookies, quota. */
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`${NS}.${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`${NS}.${key}`, JSON.stringify(value)); return true; }
    catch { return false; }
  },
};
