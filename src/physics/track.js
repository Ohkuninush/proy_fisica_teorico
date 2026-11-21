import { CAR_LENGTH } from './constants.js';

// Recorridos con rampas de subida, plataformas y rampas de bajada.
//
// La pista se describe como una lista de tramos rectos medidos A LO LARGO de la
// superficie (longitud de camino). Cada tramo tiene un ángulo θ respecto de la
// horizontal: θ > 0 sube, θ < 0 baja y θ = 0 es plano (suelo o plataforma).
//
// Coordenada de camino `u`: 0 es el frente del vehículo al inicio y `gap` es la
// cara del obstáculo o la línea de meta. Antes del primer tramo y después del
// último la pista es plana y se extiende sin límite.

export const G = 9.81;
export const FLAT_TRACK = 'flat';
export const MIN_TRACK_GAP = 30;
export const DEFAULT_SLOPE = 10;

const UP = 1;
const DOWN = -1;
const LEVEL = 0;

// Cada preset es una secuencia de piezas con longitudes relativas (unidades).
// `ramp` usa el ángulo elegido; `platform` y `flat` son horizontales.
export const TRACKS = [
  { id: FLAT_TRACK, name: 'Plano', desc: 'Sin rampas: MRU / MRUV clásico', pieces: [] },
  {
    id: 'platform',
    name: 'Subida, plataforma y bajada',
    desc: 'Rampa de subida, plataforma elevada y rampa de bajada',
    pieces: [[UP, 1], [LEVEL, 1.3], [DOWN, 1]],
  },
  {
    id: 'hill',
    name: 'Colina',
    desc: 'Rampa de subida y rampa de bajada con una cima corta',
    pieces: [[UP, 1], [LEVEL, 0.15], [DOWN, 1]],
  },
  {
    id: 'double',
    name: 'Doble plataforma',
    desc: 'Dos bloques de subida, plataforma y bajada',
    pieces: [[UP, 1], [LEVEL, 1], [DOWN, 1], [LEVEL, 1], [UP, 1], [LEVEL, 1], [DOWN, 1]],
  },
  {
    id: 'steps',
    name: 'Escalonada',
    desc: 'Dos subidas con plataformas y una bajada larga',
    pieces: [[UP, 1], [LEVEL, 0.8], [UP, 1], [LEVEL, 0.8], [DOWN, 2]],
  },
];

const LEAD_FRACTION = 0.15;
const TAIL_FRACTION = 0.2;
const MAX_UNIT_M = 40;

export const isTrack = (id) => TRACKS.some((track) => track.id === id);
export const trackInfo = (id) => TRACKS.find((track) => track.id === id) ?? TRACKS[0];
export const hasRamps = (params) => Boolean(params?.track) && params.track !== FLAT_TRACK;

// Tramos en coordenada de camino `u`: [{ u0, u1, theta }] (theta en radianes).
export function buildSegments(trackId, slopeDeg, gap) {
  const { pieces } = trackInfo(trackId);
  if (!pieces.length) return [];
  const theta = (Math.abs(slopeDeg) * Math.PI) / 180;
  const lead = gap * LEAD_FRACTION;
  const tail = Math.max(gap * TAIL_FRACTION, CAR_LENGTH + 1);
  const available = Math.max(gap - lead - tail, 0);
  const units = pieces.reduce((sum, [, length]) => sum + length, 0);
  const unit = Math.min(available / units, MAX_UNIT_M);
  let u = lead + (available - unit * units) / 2;
  return pieces.map(([direction, length]) => {
    const segment = { u0: u, u1: u + unit * length, theta: direction * theta };
    u = segment.u1;
    return segment;
  });
}

// Geometría de la pista: convierte la coordenada de camino en (horizontal, altura).
export function createTrack(params) {
  const segments = hasRamps(params) ? buildSegments(params.track, params.slope ?? DEFAULT_SLOPE, params.gap) : [];

  // Puntos de quiebre en coordenadas horizontales (s) y altura (h) al inicio de cada tramo.
  const nodes = [];
  let s = segments.length ? segments[0].u0 : 0;
  let h = 0;
  for (const seg of segments) {
    nodes.push({ u: seg.u0, s, h });
    const length = seg.u1 - seg.u0;
    s += length * Math.cos(seg.theta);
    h += length * Math.sin(seg.theta);
  }
  const end = { u: segments.at(-1)?.u1 ?? 0, s, h };

  function segmentAt(u) {
    for (const seg of segments) if (u >= seg.u0 && u < seg.u1) return seg;
    return null;
  }

  // Posición horizontal (relativa al frente inicial) y altura para una coordenada de camino.
  function pointAt(u) {
    if (!segments.length || u <= segments[0].u0) return { s: u, h: 0 };
    if (u >= end.u) return { s: end.s + (u - end.u), h: end.h };
    const i = segments.findIndex((seg) => u < seg.u1);
    const seg = segments[i];
    const node = nodes[i];
    const along = u - seg.u0;
    return { s: node.s + along * Math.cos(seg.theta), h: node.h + along * Math.sin(seg.theta) };
  }

  const thetaAt = (u) => segmentAt(u)?.theta ?? 0;
  const maxHeight = Math.max(0, ...nodes.map((node) => node.h), end.h);

  return { segments, pointAt, thetaAt, maxHeight };
}

// El vehículo ocupa [d - L, d] en la coordenada de camino (d = recorrido); la
// pendiente que siente es la del tramo bajo su centro. Por eso los límites de
// los tramos, expresados en recorrido d, se desplazan medio largo de vehículo.
export function physicsSegments(params) {
  const { segments } = createTrack(params);
  return segments.map((seg) => ({ d0: seg.u0 + CAR_LENGTH / 2, d1: seg.u1 + CAR_LENGTH / 2, theta: seg.theta }));
}
