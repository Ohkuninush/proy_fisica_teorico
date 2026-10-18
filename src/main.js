import { bindControls } from './app/controls.js';
import { createDashboard } from './app/dashboard.js';
import { saveFinishedRuns, setupHistory } from './app/history.js';
import { setupVisuals } from './app/visuals.js';
import { DEFAULTS } from './physics/params.js';
import { createEffectsManager } from './render/effects/index.js';
import { createScene } from './render/scene.js';
import { createController } from './sim/controller.js';
import { createCharts } from './ui/charts.js';
import { $ } from './ui/dom.js';
import { createExperimentForm } from './ui/experimentForm.js';
import { createHud } from './ui/hud.js';
import { hasGoal } from './visuals/catalog.js';

const MAX_FRAME_S = 0.05;

const view = createScene($('view'));
const effects = createEffectsManager(view);
const controller = createController(DEFAULTS.MRU);
const visualsStore = setupVisuals(view, {
  onGoalChange() {
    form.refresh();
    dashboard.render(latest);
  },
});
const form = createExperimentForm({ controller, isGoal: () => hasGoal(visualsStore.get()) });
const historyStore = setupHistory();
const dashboard = createDashboard({
  controller,
  form,
  visualsStore,
  hud: createHud(),
  charts: createCharts([$('c-x'), $('c-v'), $('c-a')]),
});

let latest = controller.getSnapshot();
controller.subscribe((snap) => {
  latest = snap;
  dashboard.render(snap);
});
saveFinishedRuns(controller, historyStore, visualsStore);
bindControls({ controller, form, effects, view });

let previousFrame = performance.now();
function renderFrame(now) {
  const dt = Math.min((now - previousFrame) / 1000, MAX_FRAME_S);
  previousFrame = now;
  view.update(latest);
  effects.update(latest, dt);
  view.render(now / 1000);
  requestAnimationFrame(renderFrame);
}

form.fill(DEFAULTS.MRU);
dashboard.render(latest);
requestAnimationFrame(renderFrame);
