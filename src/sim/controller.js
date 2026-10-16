import { createExperiment } from '../physics/experiment.js';

export const STATUS = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
  COLLIDED: 'collided',
});

const MAX_DT = 0.1;

export function createController(initialParams, deps = {}) {
  const raf = deps.raf ?? ((fn) => requestAnimationFrame(fn));
  const caf = deps.caf ?? ((id) => cancelAnimationFrame(id));

  let experiment = createExperiment(initialParams);
  let status = STATUS.IDLE;
  let t = 0;
  let lastTs = null;
  let rafId = null;
  let vMax = 0;
  let impact = null;
  let history = [];
  const listeners = new Set();

  function sample() {
    const s = experiment.evaluate(t);
    vMax = Math.max(vMax, Math.abs(s.v));
    if (s.collided && !impact) impact = { t: s.t, x: s.x, v: s.v };
    return s;
  }

  function snapshot() {
    const s = experiment.evaluate(t);
    const { params } = experiment;
    const traveled = s.x - params.x0;
    return {
      status,
      params,
      t: s.t,
      x: s.x,
      v: s.v,
      a: s.a,
      traveled,
      remaining: Math.max(0, params.gap - traveled),
      vMax,
      impact,
      obstacleX: experiment.obstacleX,
      tEnd: experiment.tEnd,
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  function resetState() {
    t = 0;
    lastTs = null;
    vMax = 0;
    impact = null;
    history = [];
    const s = sample();
    history.push({ t: s.t, x: s.x, v: s.v, a: s.a });
  }

  function stopLoop() {
    if (rafId !== null) caf(rafId);
    rafId = null;
    lastTs = null;
  }

  function advance(dt) {
    if (status !== STATUS.RUNNING) return;
    t = Math.min(t + Math.min(Math.max(dt, 0), MAX_DT), experiment.tEnd);
    const s = sample();
    history.push({ t: s.t, x: s.x, v: s.v, a: s.a });
    if (s.finished) {
      status = s.collided ? STATUS.COLLIDED : STATUS.FINISHED;
      stopLoop();
    }
    emit();
  }

  function frame(ts) {
    rafId = null;
    if (status !== STATUS.RUNNING) return;
    if (lastTs !== null) advance((ts - lastTs) / 1000);
    lastTs = ts;
    if (status === STATUS.RUNNING && rafId === null) rafId = raf(frame);
  }

  function runLoop() {
    if (rafId === null) rafId = raf(frame);
  }

  resetState();

  return {
    get status() {
      return status;
    },
    getSnapshot: snapshot,
    getHistory: () => history,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    advance,
    start() {
      if (status !== STATUS.IDLE) return false;
      status = STATUS.RUNNING;
      emit();
      runLoop();
      return true;
    },
    pause() {
      if (status !== STATUS.RUNNING) return false;
      status = STATUS.PAUSED;
      stopLoop();
      emit();
      return true;
    },
    resume() {
      if (status !== STATUS.PAUSED) return false;
      status = STATUS.RUNNING;
      lastTs = null;
      emit();
      runLoop();
      return true;
    },
    reset() {
      stopLoop();
      status = STATUS.IDLE;
      resetState();
      emit();
    },
    configure(params) {
      if (status === STATUS.RUNNING || status === STATUS.PAUSED) return false;
      experiment = createExperiment(params);
      stopLoop();
      status = STATUS.IDLE;
      resetState();
      emit();
      return true;
    },
  };
}
