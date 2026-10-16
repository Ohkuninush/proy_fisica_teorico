import { DEFAULTS, validateParams } from './physics/params.js';
import { createController } from './sim/controller.js';
import { createScene } from './render/scene.js';
import { createEffectsManager } from './render/effects.js';
import { createCharts } from './ui/charts.js';
import { formatIndicators } from './ui/indicators.js';
import { controlsState } from './ui/controlsState.js';

const $ = (id) => document.getElementById(id);
const FIELDS = ['x0', 'v0', 'a', 'duration', 'gap'];

const view = createScene($('view'));
const effects = createEffectsManager(view);
const charts = createCharts([$('c-x'), $('c-v'), $('c-a')]);
const controller = createController(DEFAULTS.MRU);

function fillForm(p) {
  $('model').value = p.model;
  FIELDS.forEach((k) => ($(k).value = p[k]));
  $('row-a').hidden = p.model === 'MRU';
}

function readForm() {
  const raw = { model: $('model').value };
  FIELDS.forEach((k) => (raw[k] = $(k).value));
  return raw;
}

function applyForm() {
  const { ok, errors, params } = validateParams(readForm());
  $('error').textContent = ok ? '' : errors.join('. ');
  if (ok) controller.configure(params);
  return ok;
}

function render(snap) {
  const ind = formatIndicators(snap);
  Object.entries(ind).forEach(([k, v]) => ($(`i-${k}`).textContent = v));
  $('banner').hidden = !snap.impact;
  const cs = controlsState(snap.status);
  $('start').disabled = !cs.start;
  $('pause').disabled = !cs.pause;
  $('pause').textContent = cs.pauseLabel;
  $('reset').disabled = !cs.reset;
  $('defaults').disabled = !cs.defaults;
  FIELDS.concat('model').forEach((k) => ($(k).disabled = !cs.configInputs));
  view.update(snap);
  effects.update(snap);
  charts.update(controller.getHistory());
}

controller.subscribe(render);

$('model').addEventListener('change', () => {
  const p = DEFAULTS[$('model').value];
  fillForm(p);
  $('error').textContent = '';
  controller.configure(p);
});
FIELDS.forEach((k) => $(k).addEventListener('change', applyForm));
$('start').addEventListener('click', () => applyForm() && controller.start());
$('pause').addEventListener('click', () => (controller.status === 'paused' ? controller.resume() : controller.pause()));
$('reset').addEventListener('click', () => controller.reset());
$('defaults').addEventListener('click', () => {
  const p = DEFAULTS[$('model').value];
  fillForm(p);
  $('error').textContent = '';
  controller.configure(p);
});
$('color').addEventListener('input', () => view.setCarColor($('color').value));
$('fx').addEventListener('change', () => {
  effects.setEnabled($('fx').checked);
  render(controller.getSnapshot());
});
window.addEventListener('resize', () => {
  view.resize();
  render(controller.getSnapshot());
});

fillForm(DEFAULTS.MRU);
view.setCarColor($('color').value);
render(controller.getSnapshot());

// Test/debug hook.
window.__lab = { controller, effects };
