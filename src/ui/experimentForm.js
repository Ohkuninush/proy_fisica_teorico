import { analyzeFeasibility } from '../physics/feasibility.js';
import { LAUNCH_DEFAULTS, LIMITS, validateParams } from '../physics/params.js';
import { LAUNCHES, launchInfo } from '../physics/projectile.js';
import { FLAT_TRACK, TRACKS, trackInfo } from '../physics/track.js';
import { $, el } from './dom.js';
import { describeFeasibility } from './feasibilityText.js';
import { toGoalWording } from './wording.js';
import { ALL_FIELDS, isFieldVisible, isProjectileModel, MODEL_HINT, TRACK_HINT_PREFIX, V0_LABEL } from './fieldRules.js';

const modelButtons = () => document.querySelectorAll('.seg-btn');

export function createExperimentForm({ controller, isGoal = () => false }) {
  const inputs = Object.fromEntries(ALL_FIELDS.map((field) => [field, $(field)]));
  const fieldErrors = {};
  const feasibilityBox = $('feas');
  const feasibilityTitle = $('feas-title');
  const feasibilityDetail = $('feas-detail');
  const fixButton = $('feas-fix');
  const startButton = $('start');
  const trackSelect = $('track');
  const launchSelect = $('launch');
  const addOptions = (select, items) =>
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      select.append(option);
    });
  addOptions(trackSelect, TRACKS);
  addOptions(launchSelect, LAUNCHES);
  launchSelect.value = 'oblique';

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
  const currentTrack = () => trackSelect.value || FLAT_TRACK;
  const currentLaunch = () => launchSelect.value || 'oblique';
  const visibility = () => ({ track: currentTrack(), launch: currentLaunch() });
  const readValues = () => ({
    model: currentModel(),
    track: currentTrack(),
    launch: currentLaunch(),
    ...Object.fromEntries(ALL_FIELDS.map((field) => [field, inputs[field].value])),
  });

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
    const track = currentTrack();
    const projectile = isProjectileModel(model);
    ALL_FIELDS.forEach((field) => (inputs[field].closest('label').hidden = !isFieldVisible(model, field, visibility())));
    $('model-hint').textContent = MODEL_HINT[model];
    $('track-field').hidden = $('track-hint').hidden = projectile;
    $('launch-field').hidden = $('launch-hint').hidden = !projectile;
    $('track-hint').textContent = track === FLAT_TRACK ? trackInfo(track).desc : `${trackInfo(track).desc}. ${TRACK_HINT_PREFIX}`;
    $('launch-hint').textContent = launchInfo(currentLaunch()).desc;
    $('v0-label').textContent = projectile ? V0_LABEL[currentLaunch()] ?? 'Rapidez inicial' : 'Velocidad inicial';
    modelButtons().forEach((button) => button.classList.toggle('active', button.dataset.model === model));
  }

  function showFieldErrors(errors) {
    ALL_FIELDS.forEach((field) => {
      const message = isFieldVisible(currentModel(), field, visibility()) ? errors[field] ?? '' : '';
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
    const goalWording = isGoal() && !isProjectileModel(validation.params.model);
    showFeasibility(goalWording ? { ...text, title: toGoalWording(text.title), detail: toGoalWording(text.detail) } : text);
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
  trackSelect.addEventListener('change', applyEdit);
  // Cada tipo de lanzamiento arranca con valores que lo muestran bien (g se conserva).
  launchSelect.addEventListener('change', () => {
    Object.entries(LAUNCH_DEFAULTS[currentLaunch()]).forEach(([field, value]) => (inputs[field].value = value));
    applyEdit();
  });
  fixButton.addEventListener('click', () => {
    inputs.duration.value = fixButton.dataset.value;
    applyEdit();
  });

  return {
    fill(params) {
      $('model').value = params.model;
      trackSelect.value = params.track ?? FLAT_TRACK;
      if (params.launch) launchSelect.value = params.launch;
      ALL_FIELDS.forEach((field) => (inputs[field].value = params[field] ?? ''));
      evaluate();
    },
    setEnabled(enabled) {
      ALL_FIELDS.forEach((field) => (inputs[field].disabled = !enabled));
      $('model').disabled = !enabled;
      trackSelect.disabled = !enabled;
      launchSelect.disabled = !enabled;
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
