import { DEFAULTS, validateParams, msToKmh } from './physics/params.js';
import { createController } from './sim/controller.js';
import { createScene } from './render/scene.js';
import { createEffectsManager } from './render/effects.js';
import { createCharts } from './ui/charts.js';
import { createHud } from './ui/hud.js';
import { formatIndicators } from './ui/indicators.js';
import { controlsState } from './ui/controlsState.js';

const $ = (id) => document.getElementById(id);
const FIELDS = ['x0', 'v0', 'a', 'duration', 'gap'];

const view = createScene($('view'));
const effects = createEffectsManager(view);
const charts = createCharts([$('c-x'), $('c-v'), $('c-a')]);
const hud = createHud($);
const controller = createController(DEFAULTS.MRU);

function fillForm(p) {
  $('model').value = p.model;
  FIELDS.forEach((k) => ($(k).value = p[k]));
  $('row-a').hidden = p.model === 'MRU';
  document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.model === p.model));
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

/** "20.00 m/s" -> value + dimmed unit. */
function setValue(el, text) {
  const m = /^(\S+)\s(.+)$/.exec(text);
  el.textContent = m ? m[1] : text;
  if (m) {
    const u = document.createElement('small');
    u.textContent = m[2];
    el.appendChild(u);
  }
}

let wasImpact = false;
function renderUI(snap) {
  const ind = formatIndicators(snap);
  Object.entries(ind).forEach(([k, v]) => {
    if (k === 'status') {
      $('i-status').textContent = v;
      $('i-status').dataset.status = snap.status;
    } else setValue($(`i-${k}`), v);
  });
  setValue($('l-x'), `${snap.x.toFixed(1)} m`);
  setValue($('l-v'), `${snap.v.toFixed(1)} m/s`);
  setValue($('l-a'), `${snap.a.toFixed(1)} m/s²`);

  $('banner').hidden = !snap.impact;
  if (snap.impact) {
    $('banner-detail').textContent = `t = ${snap.impact.t.toFixed(2)} s · v = ${snap.impact.v.toFixed(1)} m/s (${msToKmh(snap.impact.v).toFixed(1)} km/h)`;
  }
  if (snap.impact && !wasImpact) {
    const stage = $('stage');
    stage.classList.remove('hit');
    void stage.offsetWidth; // restart CSS animation
    stage.classList.add('hit');
  }
  wasImpact = !!snap.impact;

  const cs = controlsState(snap.status);
  $('start').disabled = !cs.start;
  $('pause').disabled = !cs.pause;
  $('pause').textContent = `${snap.status === 'paused' ? '▶' : '❚❚'} ${cs.pauseLabel}`;
  $('reset').disabled = !cs.reset;
  $('defaults').disabled = !cs.defaults;
  FIELDS.concat('model').forEach((k) => ($(k).disabled = !cs.configInputs));
  document.querySelectorAll('.seg-btn').forEach((b) => (b.disabled = !cs.configInputs));

  hud.update(snap);
  charts.update(controller.getHistory());
}

let latest = controller.getSnapshot();
controller.subscribe((snap) => {
  latest = snap;
  renderUI(snap);
});

// Continuous render loop: animations (beacons, particles) keep running while paused or finished.
let prev = performance.now();
function loop(now) {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  view.update(latest);
  effects.update(latest, dt);
  view.render(now / 1000);
  requestAnimationFrame(loop);
}

function setModel(model) {
  const p = DEFAULTS[model];
  fillForm(p);
  $('error').textContent = '';
  controller.configure(p);
}

document.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => setModel(b.dataset.model)));
FIELDS.forEach((k) => $(k).addEventListener('change', applyForm));
$('start').addEventListener('click', () => applyForm() && controller.start());
$('pause').addEventListener('click', () => (controller.status === 'paused' ? controller.resume() : controller.pause()));
$('reset').addEventListener('click', () => controller.reset());
$('defaults').addEventListener('click', () => setModel($('model').value));
$('color').addEventListener('input', () => view.setCarColor($('color').value));
$('fx').addEventListener('change', () => effects.setEnabled($('fx').checked));
window.addEventListener('resize', () => view.resize());

fillForm(DEFAULTS.MRU);
view.setCarColor($('color').value);
renderUI(latest);
requestAnimationFrame(loop);

// Test/debug hook.
window.__lab = { controller, effects };
