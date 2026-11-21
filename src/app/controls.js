import { DEFAULTS, LAUNCH_DEFAULTS, LIMITS } from '../physics/params.js';
import { $ } from '../ui/dom.js';

export function bindControls({ controller, form, effects, view }) {
  // Cambiar de modelo o restaurar valores conserva el recorrido elegido.
  function loadModelDefaults(model) {
    if (model === 'PROY') {
      const launch = $('launch').value || DEFAULTS.PROY.launch;
      const params = { ...DEFAULTS.PROY, launch, ...LAUNCH_DEFAULTS[launch] };
      form.fill(params);
      controller.configure(params);
      return;
    }
    const slope = Number($('slope').value);
    const params = { ...DEFAULTS[model], track: $('track').value || DEFAULTS[model].track, slope: slope >= LIMITS.slope[0] && slope <= LIMITS.slope[1] ? slope : DEFAULTS[model].slope };
    form.fill(params);
    controller.configure(params);
  }

  document.querySelectorAll('.seg-btn').forEach((button) => button.addEventListener('click', () => loadModelDefaults(button.dataset.model)));
  $('start').addEventListener('click', () => form.tryStart() && controller.start());
  $('pause').addEventListener('click', () => (controller.status === 'paused' ? controller.resume() : controller.pause()));
  $('reset').addEventListener('click', () => controller.reset());
  $('defaults').addEventListener('click', () => loadModelDefaults($('model').value));
  $('fx').addEventListener('change', () => effects.setEnabled($('fx').checked));
  window.addEventListener('resize', () => view.resize());
}
