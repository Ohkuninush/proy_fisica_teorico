// Time series for a finished experiment, recomputed from its parameters with the physics engine.
// Same engine as the live app, so reports match what was shown (and old history entries need no stored series).
import { createExperiment } from '../physics/experiment.js';

/** @returns {{ t:number[], x:number[], v:number[], a:number[], tEnd:number, impactTime:number|null }} */
export function buildSeries(params, samples = 240) {
  const exp = createExperiment(params);
  const n = Math.max(2, Math.floor(samples));
  const out = { t: [], x: [], v: [], a: [], tEnd: exp.tEnd, impactTime: exp.impactTime };
  for (let i = 0; i < n; i++) {
    const s = exp.evaluate((exp.tEnd * i) / (n - 1)); // last sample is exactly tEnd
    out.t.push(s.t);
    out.x.push(s.x);
    out.v.push(s.v);
    out.a.push(s.a);
  }
  return out;
}

/** Y-axis bounds that always include 0 so flat series (constant v, a = 0) read clearly. */
export function axisBounds(values) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  if (lo === hi) return { min: -1, max: 1 };
  const pad = (hi - lo) * 0.1;
  return { min: lo < 0 ? lo - pad : 0, max: hi > 0 ? hi + pad : 0 };
}
