import { msToKmh } from '../physics/params.js';
import { $ } from '../ui/dom.js';
import { controlsState } from '../ui/controlsState.js';
import { formatIndicators } from '../ui/indicators.js';
import { hasGoal } from '../visuals/catalog.js';
import { damageLevel, levelInfo } from '../visuals/damage.js';

const VALUE_WITH_UNIT = /^(\S+)\s(.+)$/;

function setValueWithUnit(element, text) {
  const match = VALUE_WITH_UNIT.exec(text);
  element.textContent = match ? match[1] : text;
  if (!match) return;
  const unit = document.createElement('small');
  unit.textContent = match[2];
  element.appendChild(unit);
}

function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

export function createDashboard({ controller, form, hud, charts, visualsStore }) {
  let hadImpact = false;

  function showIndicators(snap, goal) {
    Object.entries(formatIndicators(snap, { goal })).forEach(([key, text]) => {
      if (key === 'status') {
        $('i-status').textContent = text;
        $('i-status').dataset.status = snap.status;
      } else {
        setValueWithUnit($(`i-${key}`), text);
      }
    });
    setValueWithUnit($('l-x'), `${snap.x.toFixed(1)} m`);
    setValueWithUnit($('l-v'), `${snap.v.toFixed(1)} m/s`);
    setValueWithUnit($('l-a'), `${snap.a.toFixed(1)} m/s²`);
  }

  function showTerms(goal) {
    $('gap-label').textContent = goal ? 'Distancia a la meta' : 'Distancia al obstáculo';
    $('hud-remaining-label').textContent = goal ? 'Distancia a la meta' : 'Distancia al obstáculo';
    $('kpi-remaining-label').textContent = goal ? 'A la meta' : 'Al obstáculo';
  }

  function showCollision(snap, goal) {
    const { impact } = snap;
    $('banner').hidden = !impact;
    if (impact) {
      const speedKmh = msToKmh(impact.v);
      const reading = `t = ${impact.t.toFixed(2)} s · v = ${impact.v.toFixed(1)} m/s (${speedKmh.toFixed(1)} km/h)`;
      const level = damageLevel(speedKmh, visualsStore.get().vehicle);
      $('banner').dataset.kind = goal ? 'goal' : 'crash';
      $('banner-title').textContent = goal ? '¡Meta alcanzada!' : '¡Colisión detectada!';
      $('banner-detail').textContent = goal ? reading : `${reading} · Daño: nivel ${level} (${levelInfo(level).name})`;
      if (!hadImpact && !goal) restartAnimation($('stage'), 'hit');
    }
    hadImpact = Boolean(impact);
  }

  function showControls(snap) {
    const state = controlsState(snap.status);
    $('start').disabled = !state.start;
    $('pause').disabled = !state.pause;
    $('pause').textContent = `${snap.status === 'paused' ? '▶' : '❚❚'} ${state.pauseLabel}`;
    $('reset').disabled = !state.reset;
    $('defaults').disabled = !state.defaults;
    form.setEnabled(state.configInputs);
  }

  return {
    render(snap) {
      const goal = hasGoal(visualsStore.get());
      showTerms(goal);
      showIndicators(snap, goal);
      showCollision(snap, goal);
      showControls(snap);
      hud.update(snap);
      charts.update(controller.getHistory());
    },
  };
}
