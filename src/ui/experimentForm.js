import { analyzeFeasibility } from '../physics/feasibility.js';
import { LIMITS, validateParams } from '../physics/params.js';
import { $, el } from './dom.js';
import { describeFeasibility } from './feasibilityText.js';
import { toGoalWording } from './wording.js';
import { ALL_FIELDS, isFieldVisible, MODEL_HINT } from './fieldRules.js';

const modelButtons = () => document.querySelectorAll('.seg-btn');

export function createExperimentForm({ controller, isGoal = () => false }) {
  const inputs = Object.fromEntries(ALL_FIELDS.map((field) => [field, $(field)]));
  const fieldErrors = {};
  const feasibilityBox = $('feas');
  const feasibilityTitle = $('feas-title');
  const feasibilityDetail = $('feas-detail');
  const fixButton = $('feas-fix');
  const startButton = $('start');

  ALL_FIELDS.forEach((field) => {
    const [min, max] = LIMITS[field];
    const input = inputs[field];
    input.min = min;
    input.max = max;
    input.title = `Entre ${min} y ${max}`;
    const error = el('small', 'field-error');
    error.id = `err-${field}`;
    input.closest('label').append(error);
    input.setAttribute('aria-describedby', error.id);
    fieldErrors[field] = error;
  });

  const currentModel = () => $('model').value;
  const readValues = () => ({ model: currentModel(), ...Object.fromEntries(ALL_FIELDS.map((field) => [field, inputs[field].value])) });

  function showFeasibility({ state, title, detail, fixDuration = null }) {
    feasibilityBox.dataset.state = state;
    feasibilityTitle.textContent = title;
    feasibilityDetail.textContent = detail;
    fixButton.hidden = fixDuration === null;
    fixButton.dataset.value = fixDuration ?? '';
    fixButton.textContent = fixDuration === null ? '' : `Usar duración de ${fixDuration.toFixed(1)} s`;
    startButton.classList.toggle('blocked', state !== 'ok');
  }

  function showModel() {
    const model = currentModel();
    ALL_FIELDS.forEach((field) => (inputs[field].closest('label').hidden = !isFieldVisible(model, field)));
    $('model-hint').textContent = MODEL_HINT[model];
    modelButtons().forEach((button) => button.classList.toggle('active', button.dataset.model === model));
  }

  function showFieldErrors(errors) {
    ALL_FIELDS.forEach((field) => {
      const message = isFieldVisible(currentModel(), field) ? errors[field] ?? '' : '';
      fieldErrors[field].textContent = message;
      inputs[field].classList.toggle('invalid', Boolean(message));
      inputs[field].setAttribute('aria-invalid', String(Boolean(message)));
    });
  }

  function evaluate() {
    showModel();
    const validation = validateParams(readValues());
    showFieldErrors(validation.fieldErrors);
    if (!validation.ok) {
      showFeasibility({ state: 'bad', title: 'Revisa los datos', detail: 'Corrige los campos marcados en rojo para poder iniciar.' });
      return { ok: false, params: null };
    }
    const feasibility = analyzeFeasibility(validation.params);
    const text = describeFeasibility(feasibility, validation.params);
    showFeasibility(isGoal() ? { ...text, title: toGoalWording(text.title), detail: toGoalWording(text.detail) } : text);
    return { ok: feasibility.ok, params: validation.params };
  }

  function shakeFeasibility() {
    feasibilityBox.classList.remove('shake');
    void feasibilityBox.offsetWidth;
    feasibilityBox.classList.add('shake');
    feasibilityBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function applyEdit() {
    const { params } = evaluate();
    if (params) controller.configure(params);
  }

  ALL_FIELDS.forEach((field) => {
    inputs[field].addEventListener('input', evaluate);
    inputs[field].addEventListener('change', applyEdit);
  });
  fixButton.addEventListener('click', () => {
    inputs.duration.value = fixButton.dataset.value;
    applyEdit();
  });

  return {
    fill(params) {
      $('model').value = params.model;
      ALL_FIELDS.forEach((field) => (inputs[field].value = params[field]));
      evaluate();
    },
    setEnabled(enabled) {
      ALL_FIELDS.forEach((field) => (inputs[field].disabled = !enabled));
      $('model').disabled = !enabled;
      fixButton.disabled = !enabled;
      modelButtons().forEach((button) => (button.disabled = !enabled));
    },
    refresh: evaluate,
    tryStart() {
      const { ok, params } = evaluate();
      if (params) controller.configure(params);
      if (!ok) shakeFeasibility();
      return ok;
    },
  };
}
