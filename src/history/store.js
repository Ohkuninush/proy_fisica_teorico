// Persistent history of finished experiments. Storage is injectable (localStorage by default).
// Entries keep raw numbers; formatting happens in the UI.

export const MAX_COMMENT = 200;
export const MAX_NAME = 60;
const KEY = 'physicslab3d.history.v1';

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** AAAA-MM-DD HH:MM:SS (local time). */
export function formatTimestamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function defaultStorage() {
  try {
    const s = globalThis.localStorage;
    s.setItem('__probe', '1');
    s.removeItem?.('__probe');
    return s;
  } catch {
    return memoryStorage();
  }
}

export function createHistoryStore(storage = defaultStorage(), key = KEY) {
  let state = { seq: 0, entries: [] };
  const listeners = new Set();

  try {
    const parsed = JSON.parse(storage.getItem(key) ?? 'null');
    if (parsed && Array.isArray(parsed.entries) && Number.isFinite(parsed.seq)) state = parsed;
  } catch {
    /* corrupted data: start empty */
  }

  function commit(next) {
    state = next;
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota or blocked storage: keep working in memory */
    }
    listeners.forEach((fn) => fn(list()));
  }

  const list = () => [...state.entries].reverse(); // newest first

  return {
    list,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Save a finished experiment snapshot. */
    /** `visuals` ({ vehicle, obstacle }) is kept so reports can derive the damage level. */
    add(snap, now = new Date(), visuals = null) {
      const seq = state.seq + 1;
      const entry = {
        id: `${now.getTime()}-${seq}`,
        savedAt: formatTimestamp(now),
        name: `Prueba ${seq}`,
        comment: '',
        visuals: visuals ? { vehicle: visuals.vehicle, obstacle: visuals.obstacle } : null,
        params: { ...snap.params },
        result: {
          status: snap.status,
          t: snap.t,
          x: snap.x,
          traveled: snap.traveled,
          v: snap.v,
          a: snap.a,
          remaining: snap.remaining,
          vMax: snap.vMax,
          impact: snap.impact ? { ...snap.impact } : null,
        },
      };
      commit({ seq, entries: [...state.entries, entry] });
      return entry;
    },
    /** Rename and/or comment. Invalid values are rejected (returns false). */
    update(id, patch) {
      const idx = state.entries.findIndex((e) => e.id === id);
      if (idx < 0) return false;
      const next = { ...state.entries[idx] };
      if ('name' in patch) {
        const name = String(patch.name).trim();
        if (!name || name.length > MAX_NAME) return false;
        next.name = name;
      }
      if ('comment' in patch) {
        const comment = String(patch.comment);
        if (comment.length > MAX_COMMENT) return false;
        next.comment = comment;
      }
      const entries = state.entries.slice();
      entries[idx] = next;
      commit({ ...state, entries });
      return true;
    },
    remove(id) {
      const entries = state.entries.filter((e) => e.id !== id);
      if (entries.length === state.entries.length) return false;
      commit({ ...state, entries });
      return true;
    },
  };
}
