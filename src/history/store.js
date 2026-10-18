import { browserStorage, readJson, writeJson } from '../storage.js';

export const MAX_COMMENT = 200;
export const MAX_NAME = 60;

const STORAGE_KEY = 'physicslab3d.history.v1';

const pad = (n) => String(n).padStart(2, '0');

export function formatTimestamp(d) {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date} ${time}`;
}

const isValidState = (state) => Boolean(state) && Array.isArray(state.entries) && Number.isFinite(state.seq);

function buildEntry(snap, seq, now, visuals) {
  return {
    id: `${now.getTime()}-${seq}`,
    savedAt: formatTimestamp(now),
    name: `Prueba ${seq}`,
    comment: '',
    visuals: visuals ? { vehicle: visuals.vehicle, obstacle: visuals.obstacle, goal: visuals.goal } : null,
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
}

function applyPatch(entry, patch) {
  const next = { ...entry };
  if ('name' in patch) {
    const name = String(patch.name).trim();
    if (!name || name.length > MAX_NAME) return null;
    next.name = name;
  }
  if ('comment' in patch) {
    const comment = String(patch.comment);
    if (comment.length > MAX_COMMENT) return null;
    next.comment = comment;
  }
  return next;
}

export function createHistoryStore(storage = browserStorage(), key = STORAGE_KEY) {
  const saved = readJson(storage, key);
  let state = isValidState(saved) ? saved : { seq: 0, entries: [] };
  const listeners = new Set();

  const list = () => [...state.entries].reverse();

  function commit(next) {
    state = next;
    writeJson(storage, key, state);
    listeners.forEach((listener) => listener(list()));
  }

  return {
    list,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add(snap, now = new Date(), visuals = null) {
      const seq = state.seq + 1;
      const entry = buildEntry(snap, seq, now, visuals);
      commit({ seq, entries: [...state.entries, entry] });
      return entry;
    },
    update(id, patch) {
      const index = state.entries.findIndex((entry) => entry.id === id);
      if (index < 0) return false;
      const next = applyPatch(state.entries[index], patch);
      if (!next) return false;
      const entries = state.entries.slice();
      entries[index] = next;
      commit({ ...state, entries });
      return true;
    },
    remove(id) {
      const entries = state.entries.filter((entry) => entry.id !== id);
      if (entries.length === state.entries.length) return false;
      commit({ ...state, entries });
      return true;
    },
  };
}
