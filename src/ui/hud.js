// Stage overlay: speedometer arc and distance-to-obstacle bar. Display only.
import { msToKmh } from '../physics/params.js';

const ARC_LEN = Math.PI * 80; // semicircle radius 80 in the SVG

/** Gauge scale from the experiment parameters (stable during a run). */
export function gaugeMaxKmh(params) {
  const vEnd = params.v0 + (params.model === 'MRU' ? 0 : params.a) * params.duration;
  const peak = msToKmh(Math.max(Math.abs(params.v0), Math.abs(vEnd)));
  return Math.max(60, Math.ceil(peak / 20) * 20);
}

export function createHud($) {
  const arc = $('hud-arc');
  const kmh = $('hud-kmh');
  const max = $('hud-max');
  const fill = $('hud-bar-fill');
  const marker = $('hud-car');
  const remain = $('hud-remaining');
  arc.style.strokeDasharray = `${ARC_LEN}`;

  return {
    update(snap) {
      const top = gaugeMaxKmh(snap.params);
      const k = Math.min(1, Math.abs(msToKmh(snap.v)) / top);
      arc.style.strokeDashoffset = `${ARC_LEN * (1 - k)}`;
      kmh.textContent = Math.abs(msToKmh(snap.v)).toFixed(0);
      max.textContent = `${top}`;
      const p = Math.min(1, Math.max(0, snap.traveled / snap.params.gap));
      fill.style.width = `${p * 100}%`;
      marker.style.left = `${p * 100}%`;
      remain.textContent = `${snap.remaining.toFixed(1)} m`;
    },
  };
}
