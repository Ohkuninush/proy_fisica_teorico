import { msToKmh } from '../../physics/params.js';
import { initialVelocity, launchInfo, projectileSummary } from '../../physics/projectile.js';
import { COLORS } from './layout.js';
import { fixed } from './text.js';

const parenthesized = (value) => (value < 0 ? `(${value})` : `${value}`);
const round = (value) => +Number(value).toFixed(3);

export function projectileKpis(entry) {
  const s = projectileSummary(entry.params);
  return [
    ['Tiempo de vuelo', fixed(s.tFlight), 's', COLORS.cyan],
    ['Alcance horizontal', fixed(s.range), 'm', COLORS.cyan],
    ['Altura máxima', fixed(s.hMax), 'm', COLORS.cyan],
    ['t de altura máx.', fixed(s.tPeak), 's', COLORS.cyan],
    ['Rapidez de impacto', fixed(s.vImpact), 'm/s', COLORS.lime],
    ['Rapidez de impacto', fixed(msToKmh(s.vImpact), 1), 'km/h', COLORS.lime],
    ['Ángulo de impacto', fixed(s.impactAngle, 1), '°', COLORS.amber],
    ['Aceleración', fixed(-entry.params.g), 'm/s²', COLORS.pink],
  ];
}

export function projectileOutcome(entry) {
  const { params, result } = entry;
  const s = projectileSummary(params);
  if (!result.impact) {
    return { title: 'Lanzamiento detenido antes de tocar el suelo', sentence: `Se guardó en t = ${fixed(result.t)} s, a ${fixed(result.y ?? 0)} m del suelo.` };
  }
  const where = s.range > 1e-6 ? ` a ${fixed(s.range)} m del punto de lanzamiento` : ' justo debajo del punto de lanzamiento';
  return {
    title: 'Impacto con el suelo',
    sentence: `Tocó el suelo${where} en t = ${fixed(s.tFlight)} s con rapidez ${fixed(s.vImpact)} m/s (${fixed(msToKmh(s.vImpact), 1)} km/h).`,
  };
}

export function projectileConditions(entry) {
  const { params } = entry;
  const { vx0, vy0 } = initialVelocity(params);
  const launch = launchInfo(params.launch);
  return [
    [
      ['Tipo de movimiento', launch.name],
      ['Altura inicial (h0)', `${fixed(params.h0)} m`],
      ['Rapidez inicial (v0)', params.launch === 'free' ? '0 m/s  (se suelta)' : `${fixed(Math.hypot(vx0, vy0))} m/s`],
      ['Ángulo (theta)', params.launch === 'oblique' ? `${fixed(params.angle, 1)}°` : '-'],
    ],
    [
      ['Gravedad (g)', `${fixed(params.g)} m/s²`],
      ['Velocidad horizontal (vx0)', `${fixed(vx0)} m/s`],
      ['Velocidad vertical (vy0)', `${fixed(vy0)} m/s`],
      ['Resistencia del aire', 'No (caso ideal)'],
    ],
  ];
}

export function projectileEquations(params) {
  const { vx0, vy0 } = initialVelocity(params);
  const h0 = parenthesized(round(params.h0));
  const vx = parenthesized(round(vx0));
  const vy = parenthesized(round(vy0));
  const g = round(params.g);
  return [
    ['Horizontal', 'x(t) = vx0*t', `x(t) = ${vx}*t`],
    ['Vertical', 'y(t) = h0 + vy0*t - (1/2)*g*t^2', `y(t) = ${h0} + ${vy}*t - (1/2)*${g}*t^2`],
    ['Vel. vertical', 'vy(t) = vy0 - g*t', `vy(t) = ${vy} - ${g}*t`],
  ];
}

export function projectileCaptions(params, series) {
  const s = projectileSummary(params);
  const end = series.impactTime !== null ? ` El último punto marca el impacto con el suelo (t = ${fixed(series.impactTime)} s).` : '';
  const peak = s.tPeak > 0 ? `sube hasta ${fixed(s.hMax)} m en t = ${fixed(s.tPeak)} s y luego cae` : 'cae desde el inicio';
  return {
    y: `Parábola: el objeto ${peak}; la curva se inclina cada vez más porque la rapidez de caída aumenta.${end}`,
    vy: `Recta descendente: vy disminuye ${fixed(params.g)} m/s cada segundo (pendiente = -g). Cruza el cero en la altura máxima.`,
    path: s.range > 1e-6
      ? `Trayectoria parabólica: avanza ${fixed(s.vx0)} m/s en horizontal (MRU) mientras cae con aceleración g (MRUV); alcance ${fixed(s.range)} m.`
      : 'Trayectoria vertical: no hay velocidad horizontal, así que el objeto sube y baja sobre la misma línea (x = 0).',
  };
}
