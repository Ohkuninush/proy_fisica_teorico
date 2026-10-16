// Experiment form: per-model fields, per-field validation and the "will it reach the obstacle?" check.
import { validateParams, LIMITS, msToKmh } from '../physics/params.js';
import { obstacleX } from '../physics/collision.js';
import { analyzeFeasibility, REASON } from '../physics/feasibility.js';
import { ALL_FIELDS, MODEL_HINT, isFieldVisible } from './fieldRules.js';

const n = (v, d = 2) => Number(v).toFixed(d);

/** Spanish copy for each feasibility outcome. */
export function describeFeasibility(f, params) {
  const { v0, gap, duration, model } = params;
  const a = model === 'MRU' ? 0 : params.a;
  const wall = `Obstáculo en x = ${n(obstacleX(params), 1)} m.`;
  switch (f.reason) {
    case REASON.OK:
      return { state: 'ok', title: `Choque estimado en t = ${n(f.tImpact)} s`, detail: `Velocidad de impacto: ${n(f.vImpact, 1)} m/s (${n(msToKmh(f.vImpact), 1)} km/h). ${wall}` };
    case REASON.STATIONARY:
      return { state: 'bad', title: 'El auto no se mueve', detail: model === 'MRU' ? 'Con v₀ = 0 nunca llega al obstáculo. Usa v₀ > 0.' : 'Con v₀ = 0 y a = 0 nunca llega al obstáculo. Usa v₀ > 0 o a > 0.' };
    case REASON.MOVING_AWAY:
      return {
        state: 'bad',
        title: 'Nunca alcanza el obstáculo',
        detail: model === 'MRU' ? `Con v₀ = ${n(v0, 1)} m/s el auto se aleja. Usa v₀ > 0.` : `Con v₀ = ${n(v0, 1)} m/s y a = ${n(a, 1)} m/s² el auto retrocede o se queda quieto. Necesita v₀ > 0 o a > 0.`,
      };
    case REASON.STOPS_SHORT:
      return { state: 'bad', title: 'Frena antes de llegar al obstáculo', detail: `Se detiene a ${n(gap - f.stopDistance)} m del obstáculo (frenado: ${n(f.stopDistance)} m; distancia: ${n(gap)} m). Reduce la desaceleración, aumenta v₀ o acerca el obstáculo.` };
    case REASON.STOPS_AT_OBSTACLE:
      return { state: 'bad', title: 'Llega con velocidad 0: no hay choque', detail: `Se detiene justo en el obstáculo (t = ${n(f.tImpact)} s). Ajusta v₀, a o la distancia.` };
    case REASON.DURATION_TOO_SHORT: {
      const max = LIMITS.duration[1];
      const fixable = Math.ceil(f.minDuration * 10) / 10 + 0.1 <= max;
      return {
        state: 'warn',
        title: 'La duración no alcanza',
        detail: `Llegaría al obstáculo en t = ${n(f.tImpact)} s, pero la duración es ${n(duration, 1)} s.${fixable ? '' : ` Supera el máximo de ${max} s: cambia v₀, a o la distancia.`}`,
        fixDuration: fixable ? Math.ceil(f.minDuration * 10) / 10 + 0.1 : null,
      };
    }
    default:
      return { state: 'bad', title: 'Configuración no válida', detail: '' };
  }
}

export function createExperimentForm({ $, controller }) {
  const inputs = Object.fromEntries(ALL_FIELDS.map((k) => [k, $(k)]));
  const errorEls = {};
  ALL_FIELDS.forEach((k) => {
    const [min, max] = LIMITS[k];
    inputs[k].min = min;
    inputs[k].max = max;
    inputs[k].title = `Entre ${min} y ${max}`;
    const small = document.createElement('small');
    small.className = 'field-error';
    small.id = `err-${k}`;
    inputs[k].closest('label').append(small);
    inputs[k].setAttribute('aria-describedby', small.id);
    errorEls[k] = small;
  });

  const feas = $('feas');
  const feasTitle = $('feas-title');
  const feasDetail = $('feas-detail');
  const fixBtn = $('feas-fix');
  const startBtn = $('start');
  let last = { ok: false, params: null };

  const model = () => $('model').value;
  const read = () => ({ model: model(), ...Object.fromEntries(ALL_FIELDS.map((k) => [k, inputs[k].value])) });

  function setFeas(state, title, detail, fix = null) {
    feas.dataset.state = state;
    feasTitle.textContent = title;
    feasDetail.textContent = detail;
    fixBtn.hidden = fix === null;
    fixBtn.dataset.value = fix ?? '';
    fixBtn.textContent = fix === null ? '' : `Usar duración de ${n(fix, 1)} s`;
    startBtn.classList.toggle('blocked', state !== 'ok');
  }

  function applyVisibility() {
    const m = model();
    ALL_FIELDS.forEach((k) => (inputs[k].closest('label').hidden = !isFieldVisible(m, k)));
    $('model-hint').textContent = MODEL_HINT[m];
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.model === m));
  }

  /** Re-check everything and update the messages. Returns { ok, params, feasibility }. */
  function evaluate() {
    applyVisibility();
    const res = validateParams(read());
    ALL_FIELDS.forEach((k) => {
      const msg = isFieldVisible(model(), k) ? res.fieldErrors[k] ?? '' : '';
      errorEls[k].textContent = msg;
      inputs[k].classList.toggle('invalid', !!msg);
      inputs[k].setAttribute('aria-invalid', String(!!msg));
    });
    if (!res.ok) {
      setFeas('bad', 'Revisa los datos', 'Corrige los campos marcados en rojo para poder iniciar.');
      last = { ok: false, params: null };
      return last;
    }
    const f = analyzeFeasibility(res.params);
    const d = describeFeasibility(f, res.params);
    setFeas(d.state, d.title, d.detail, d.fixDuration ?? null);
    last = { ok: f.ok, params: res.params, feasibility: f };
    return last;
  }

  /** Called by Iniciar: configure and allow the start only when the run will end in an impact. */
  function tryStart() {
    const r = evaluate();
    if (r.params) controller.configure(r.params);
    if (!r.ok) {
      feas.classList.remove('shake');
      void feas.offsetWidth; // restart animation
      feas.classList.add('shake');
      feas.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    return r.ok;
  }

  function onEdit() {
    const r = evaluate();
    if (r.params) controller.configure(r.params);
  }

  ALL_FIELDS.forEach((k) => {
    inputs[k].addEventListener('input', evaluate);
    inputs[k].addEventListener('change', onEdit);
  });
  fixBtn.addEventListener('click', () => {
    inputs.duration.value = fixBtn.dataset.value;
    onEdit();
  });

  return {
    fill(p) {
      $('model').value = p.model;
      ALL_FIELDS.forEach((k) => (inputs[k].value = p[k]));
      evaluate();
    },
    setEnabled(on) {
      ALL_FIELDS.forEach((k) => (inputs[k].disabled = !on));
      $('model').disabled = !on;
      fixBtn.disabled = !on;
      document.querySelectorAll('.seg-btn').forEach((b) => (b.disabled = !on));
    },
    evaluate,
    tryStart,
  };
}
