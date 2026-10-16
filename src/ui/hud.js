import { msToKmh } from '../physics/params.js';
import { $ } from './dom.js';

const GAUGE_ARC_LENGTH = Math.PI * 80;
const MIN_GAUGE_KMH = 60;
const GAUGE_STEP_KMH = 20;

function gaugeMaxKmh(params) {
  const finalSpeed = params.v0 + (params.model === 'MRU' ? 0 : params.a) * params.duration;
  const peakKmh = msToKmh(Math.max(Math.abs(params.v0), Math.abs(finalSpeed)));
  return Math.max(MIN_GAUGE_KMH, Math.ceil(peakKmh / GAUGE_STEP_KMH) * GAUGE_STEP_KMH);
}

export function createHud() {
  const arc = $('hud-arc');
  const speed = $('hud-kmh');
  const maxSpeed = $('hud-max');
  const progressFill = $('hud-bar-fill');
  const carMarker = $('hud-car');
  const remaining = $('hud-remaining');
  arc.style.strokeDasharray = `${GAUGE_ARC_LENGTH}`;

  return {
    update(snap) {
      const gaugeMax = gaugeMaxKmh(snap.params);
      const speedKmh = Math.abs(msToKmh(snap.v));
      arc.style.strokeDashoffset = `${GAUGE_ARC_LENGTH * (1 - Math.min(1, speedKmh / gaugeMax))}`;
      speed.textContent = speedKmh.toFixed(0);
      maxSpeed.textContent = `${gaugeMax}`;

      const progress = Math.min(1, Math.max(0, snap.traveled / snap.params.gap)) * 100;
      progressFill.style.width = `${progress}%`;
      carMarker.style.left = `${progress}%`;
      remaining.textContent = `${snap.remaining.toFixed(1)} m`;
    },
  };
}
