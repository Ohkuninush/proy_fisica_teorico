import { DEFAULTS, msToKmh } from './physics/params.js';
import { createController } from './sim/controller.js';
import { createScene } from './render/scene.js';
import { createEffectsManager } from './render/effects.js';
import { createCharts } from './ui/charts.js';
import { createHud } from './ui/hud.js';
import { formatIndicators } from './ui/indicators.js';
import { controlsState } from './ui/controlsState.js';
import { createHistoryStore } from './history/store.js';
import { createHistoryPanel } from './ui/historyPanel.js';
import { createExperimentForm } from './ui/experimentForm.js';
import { createExportDialog } from './ui/exportDialog.js';
import { createVisualsPanel } from './ui/visualsPanel.js';
import { createVisualsStore } from './visuals/store.js';
import { defaultColorFor } from './visuals/catalog.js';
import { renderThumbnails } from './render/thumbnails.js';

const $ = (id) => document.getElementById(id);

const view = createScene($('view'));
const effects = createEffectsManager(view);
const charts = createCharts([$('c-x'), $('c-v'), $('c-a')]);
const hud = createHud($);
const controller = createController(DEFAULTS.MRU);
const form = createExperimentForm({ $, controller });
const visualsStore = createVisualsStore();
const visuals = createVisualsPanel({
  store: visualsStore,
  drawer: $('visuals-drawer'),
  backdrop: $('visuals-backdrop'),
  body: $('visuals-body'),
  openBtn: $('open-visuals'),
  closeBtn: $('close-visuals'),
  getThumbs: renderThumbnails,
  onChange(key, value) {
    if (key === 'view') view.setView(value);
    else if (key === 'scenery') view.setScenery(value);
    else if (key === 'obstacle') view.setObstacle(value);
    else if (key === 'vehicle') {
      const c = defaultColorFor(value); // each vehicle starts with its own colour; the picker can override it
      view.setVehicle(value);
      view.setCarColor(c);
      visuals.setColor(c);
      visualsStore.set({ vehicle: value, color: c });
      return;
    }
    visualsStore.set({ [key]: value });
  },
});
{
  const v = visualsStore.get();
  view.setView(v.view);
  view.setScenery(v.scenery);
  view.setVehicle(v.vehicle);
  view.setObstacle(v.obstacle);
  view.setCarColor(v.color);
}
const history = createHistoryStore();
createExportDialog({
  store: history,
  openBtn: $('open-export'),
  dialog: $('export-dialog'),
  backdrop: $('export-backdrop'),
  list: $('export-list'),
  countEl: $('export-count'),
  allBox: $('export-all'),
  goBtn: $('export-go'),
  cancelBtn: $('export-cancel'),
  closeBtn: $('close-export'),
  statusEl: $('export-status'),
});
createHistoryPanel({
  store: history,
  drawer: $('history-drawer'),
  backdrop: $('history-backdrop'),
  list: $('history-list'),
  count: $('history-count'),
  openBtn: $('open-history'),
  closeBtn: $('close-history'),
  badge: $('history-badge'),
});

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
  form.setEnabled(cs.configInputs);

  hud.update(snap);
  charts.update(controller.getHistory());
}

let latest = controller.getSnapshot();
let prevStatus = latest.status;
controller.subscribe((snap) => {
  latest = snap;
  renderUI(snap);
  // Auto-save once when a run ends (finished or collided).
  if (prevStatus === 'running' && (snap.status === 'finished' || snap.status === 'collided')) history.add(snap);
  prevStatus = snap.status;
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
  form.fill(p);
  controller.configure(p);
}

document.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => setModel(b.dataset.model)));
$('start').addEventListener('click', () => form.tryStart() && controller.start());
$('pause').addEventListener('click', () => (controller.status === 'paused' ? controller.resume() : controller.pause()));
$('reset').addEventListener('click', () => controller.reset());
$('defaults').addEventListener('click', () => setModel($('model').value));
$('color').addEventListener('input', () => {
  view.setCarColor($('color').value);
  visualsStore.set({ color: $('color').value });
});
$('fx').addEventListener('change', () => effects.setEnabled($('fx').checked));
window.addEventListener('resize', () => view.resize());

form.fill(DEFAULTS.MRU);
renderUI(latest);
requestAnimationFrame(loop);

// Test/debug hook.
window.__lab = { controller, effects, view };
