import { obstacleX } from '../physics/collision.js';
import { REASON } from '../physics/feasibility.js';
import { LIMITS, msToKmh } from '../physics/params.js';

const fixed = (value, digits = 2) => Number(value).toFixed(digits);

const roundedUp = (seconds) => Math.ceil(seconds * 10) / 10 + 0.1;

export function describeFeasibility(feasibility, params) {
  const { v0, gap, duration, model } = params;
  const a = model === 'MRU' ? 0 : params.a;
  const obstaclePosition = `Obstáculo en x = ${fixed(obstacleX(params), 1)} m.`;

  switch (feasibility.reason) {
    case REASON.OK:
      return {
        state: 'ok',
        title: `Choque estimado en t = ${fixed(feasibility.tImpact)} s`,
        detail: `Velocidad de impacto: ${fixed(feasibility.vImpact, 1)} m/s (${fixed(msToKmh(feasibility.vImpact), 1)} km/h). ${obstaclePosition}`,
      };
    case REASON.STATIONARY:
      return {
        state: 'bad',
        title: 'El auto no se mueve',
        detail: model === 'MRU' ? 'Con v₀ = 0 nunca llega al obstáculo. Usa v₀ > 0.' : 'Con v₀ = 0 y a = 0 nunca llega al obstáculo. Usa v₀ > 0 o a > 0.',
      };
    case REASON.MOVING_AWAY:
      return {
        state: 'bad',
        title: 'Nunca alcanza el obstáculo',
        detail:
          model === 'MRU'
            ? `Con v₀ = ${fixed(v0, 1)} m/s el auto se aleja. Usa v₀ > 0.`
            : `Con v₀ = ${fixed(v0, 1)} m/s y a = ${fixed(a, 1)} m/s² el auto retrocede o se queda quieto. Necesita v₀ > 0 o a > 0.`,
      };
    case REASON.STOPS_SHORT:
      return {
        state: 'bad',
        title: 'Frena antes de llegar al obstáculo',
        detail: `Se detiene a ${fixed(gap - feasibility.stopDistance)} m del obstáculo (frenado: ${fixed(feasibility.stopDistance)} m; distancia: ${fixed(gap)} m). Reduce la desaceleración, aumenta v₀ o acerca el obstáculo.`,
      };
    case REASON.STOPS_AT_OBSTACLE:
      return {
        state: 'bad',
        title: 'Llega con velocidad 0: no hay choque',
        detail: `Se detiene justo en el obstáculo (t = ${fixed(feasibility.tImpact)} s). Ajusta v₀, a o la distancia.`,
      };
    case REASON.DURATION_TOO_SHORT: {
      const maxDuration = LIMITS.duration[1];
      const suggested = roundedUp(feasibility.minDuration);
      const fixable = suggested <= maxDuration;
      return {
        state: 'warn',
        title: 'La duración no alcanza',
        detail: `Llegaría al obstáculo en t = ${fixed(feasibility.tImpact)} s, pero la duración es ${fixed(duration, 1)} s.${fixable ? '' : ` Supera el máximo de ${maxDuration} s: cambia v₀, a o la distancia.`}`,
        fixDuration: fixable ? suggested : null,
      };
    }
    default:
      return { state: 'bad', title: 'Configuración no válida', detail: '' };
  }
}
