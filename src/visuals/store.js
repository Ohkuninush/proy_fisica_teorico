// Remembers the user's visual choices between sessions. Storage is injectable.
import { normalizeVisuals } from './catalog.js';

const KEY = 'physicslab3d.visuals.v1';

function defaultStorage() {
  try {
    const s = globalThis.localStorage;
    s.getItem(KEY);
    return s;
  } catch {
    return null;
  }
}

export function createVisualsStore(storage = defaultStorage(), key = KEY) {
  let current;
  try {
    current = normalizeVisuals(JSON.parse(storage?.getItem(key) ?? 'null'));
  } catch {
    current = normalizeVisuals(null);
  }
  return {
    get: () => ({ ...current }),
    /** Merge a partial change; invalid values are replaced by defaults. */
    set(patch) {
      current = normalizeVisuals({ ...current, ...patch });
      try {
        storage?.setItem(key, JSON.stringify(current));
      } catch {
        /* blocked or full storage: keep in memory */
      }
      return { ...current };
    },
  };
}
