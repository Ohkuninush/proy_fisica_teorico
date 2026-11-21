// Caída libre y lanzamientos (caso ideal, sin resistencia del aire).
//
// Ejes: x horizontal (positivo hacia adelante), y vertical (positivo hacia
// arriba, y = 0 es el suelo). El objeto parte de (0, h0) y la única aceleración
// es la gravedad: a = (0, −g).
//
//   x(t)  = vx0·t
//   y(t)  = h0 + vy0·t − ½·g·t²
//   vx(t) = vx0
//   vy(t) = vy0 − g·t

export const PROJECTILE = 'PROY';
export const EARTH_G = 9.81;

export const LAUNCHES = [
  { id: 'free', name: 'Caída libre', short: 'Caída libre', desc: 'Se suelta desde la altura h₀ con v₀ = 0.' },
  { id: 'vertical', name: 'Lanzamiento vertical', short: 'Vertical', desc: 'v₀ positiva hacia arriba, negativa hacia abajo.' },
  { id: 'horizontal', name: 'Lanzamiento horizontal', short: 'Horizontal', desc: 'Sale horizontal desde la altura h₀ con rapidez v₀.' },
  { id: 'oblique', name: 'Tiro parabólico', short: 'Parabólico', desc: 'Sale con rapidez v₀ y ángulo θ sobre la horizontal.' },
];

export const isLaunch = (id) => LAUNCHES.some((launch) => launch.id === id);
export const launchInfo = (id) => LAUNCHES.find((launch) => launch.id === id) ?? LAUNCHES[0];
export const isProjectile = (params) => params?.model === PROJECTILE;

const RAD = Math.PI / 180;

// Componentes de la velocidad inicial según el tipo de lanzamiento.
export function initialVelocity(params) {
  const { launch, v0 = 0, angle = 0 } = params;
  switch (launch) {
    case 'free':
      return { vx0: 0, vy0: 0 };
    case 'vertical':
      return { vx0: 0, vy0: v0 };
    case 'horizontal':
      return { vx0: v0, vy0: 0 };
    default:
      return { vx0: v0 * Math.cos(angle * RAD), vy0: v0 * Math.sin(angle * RAD) };
  }
}

// Magnitudes clave del movimiento, todas en forma cerrada.
export function projectileSummary(params) {
  const { h0, g } = params;
  const { vx0, vy0 } = initialVelocity(params);
  // Raíz positiva de h0 + vy0·t − ½·g·t² = 0.
  const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  const rises = vy0 > 0;
  const tPeak = rises ? vy0 / g : 0;
  const hMax = rises ? h0 + (vy0 * vy0) / (2 * g) : h0;
  const vyImpact = vy0 - g * tFlight;
  const vImpact = Math.hypot(vx0, vyImpact);
  return {
    vx0,
    vy0,
    v0: Math.hypot(vx0, vy0),
    tFlight,
    tPeak,
    hMax,
    range: vx0 * tFlight,
    xPeak: vx0 * tPeak,
    vyImpact,
    vImpact,
    // Ángulo bajo la horizontal con el que llega al suelo (90° = vertical).
    impactAngle: Math.atan2(-vyImpact, vx0) / RAD,
  };
}

export function stateAtProjectile(params, t) {
  const { h0, g } = params;
  const { vx0, vy0 } = initialVelocity(params);
  const vy = vy0 - g * t;
  return {
    t,
    x: vx0 * t,
    y: h0 + vy0 * t - 0.5 * g * t * t,
    vx: vx0,
    vy,
    v: Math.hypot(vx0, vy),
    a: -g,
  };
}

export function createProjectileExperiment(params) {
  const summary = projectileSummary(params);
  const tEnd = summary.tFlight;
  const flies = tEnd > 1e-9;

  function evaluate(t) {
    const tc = Math.min(Math.max(t, 0), tEnd);
    const s = stateAtProjectile(params, tc);
    const landed = flies && tc >= tEnd;
    if (landed) s.y = 0;
    return { ...s, h: s.y, slope: 0, collided: landed, finished: tc >= tEnd };
  }

  return {
    params,
    tEnd,
    impactTime: flies ? tEnd : null,
    obstacleX: summary.range,
    vPeak: Math.max(summary.v0, summary.vImpact),
    summary,
    evaluate,
    // Para el panel: "recorrido" = distancia horizontal, "restante" = altura sobre el suelo.
    progress: (s) => ({ traveled: s.x, remaining: Math.max(0, s.y) }),
  };
}
