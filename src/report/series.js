import { createExperiment } from '../physics/experiment.js';

export function buildSeries(params, samples = 240) {
  const exp = createExperiment(params);
  const n = Math.max(2, Math.floor(samples));
  const out = { t: [], x: [], v: [], a: [], tEnd: exp.tEnd, impactTime: exp.impactTime };
  for (let i = 0; i < n; i++) {
    const s = exp.evaluate((exp.tEnd * i) / (n - 1));
    out.t.push(s.t);
    out.x.push(s.x);
    out.v.push(s.v);
    out.a.push(s.a);
  }
  return out;
}

export function axisBounds(values) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  if (lo === hi) return { min: -1, max: 1 };
  const pad = (hi - lo) * 0.1;
  return { min: lo < 0 ? lo - pad : 0, max: hi > 0 ? hi + pad : 0 };
}
