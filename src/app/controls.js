import { DEFAULTS } from '../physics/params.js';
import { $ } from '../ui/dom.js';

export function bindControls({ controller, form, effects, view }) {
  function loadModelDefaults(model) {
    form.fill(DEFAULTS[model]);
    controller.configure(DEFAULTS[model]);
  }

  document.querySelectorAll('.seg-btn').forEach((button) => button.addEventListener('click', () => loadModelDefaults(button.dataset.model)));
  $('start').addEventListener('click', () => form.tryStart() && controller.start());
  $('pause').addEventListener('click', () => (controller.status === 'paused' ? controller.resume() : controller.pause()));
  $('reset').addEventListener('click', () => controller.reset());
  $('defaults').addEventListener('click', () => loadModelDefaults($('model').value));
  $('fx').addEventListener('change', () => effects.setEnabled($('fx').checked));
  window.addEventListener('resize', () => view.resize());
}
