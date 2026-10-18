import { renderThumbnails } from '../render/thumbnails.js';
import { $ } from '../ui/dom.js';
import { createVisualsPanel } from '../ui/visualsPanel.js';
import { defaultColorFor } from '../visuals/catalog.js';
import { createVisualsStore } from '../visuals/store.js';

export function setupVisuals(view, { onGoalChange } = {}) {
  const store = createVisualsStore();

  const appliers = {
    view: (id) => view.setView(id),
    scenery: (id) => view.setScenery(id),
    obstacle: (id) => view.setObstacle(id),
    goal: (id) => {
      view.setGoal(id);
      onGoalChange?.();
    },
  };

  const panel = createVisualsPanel({
    store,
    drawer: $('visuals-drawer'),
    backdrop: $('visuals-backdrop'),
    body: $('visuals-body'),
    openBtn: $('open-visuals'),
    closeBtn: $('close-visuals'),
    getThumbs: renderThumbnails,
    onChange(group, id) {
      if (group === 'vehicle') {
        const color = defaultColorFor(id);
        view.setVehicle(id);
        view.setCarColor(color);
        panel.setColor(color);
        store.set({ vehicle: id, color });
        return;
      }
      store.set({ [group]: id });
      appliers[group](id);
    },
  });

  const saved = store.get();
  view.setView(saved.view);
  view.setScenery(saved.scenery);
  view.setVehicle(saved.vehicle);
  view.setObstacle(saved.obstacle);
  view.setGoal(saved.goal);
  view.setCarColor(saved.color);

  $('color').addEventListener('input', () => {
    view.setCarColor($('color').value);
    store.set({ color: $('color').value });
  });

  return store;
}
