import { browserStorage, readJson, writeJson } from '../storage.js';
import { normalizeVisuals } from './catalog.js';

const STORAGE_KEY = 'physicslab3d.visuals.v1';

export function createVisualsStore(storage = browserStorage(), key = STORAGE_KEY) {
  let current = normalizeVisuals(readJson(storage, key));

  return {
    get: () => ({ ...current }),
    set(patch) {
      current = normalizeVisuals({ ...current, ...patch });
      writeJson(storage, key, current);
      return { ...current };
    },
  };
}
