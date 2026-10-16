// Crash damage rules. Pure data/functions: how violent an impact looks, never how it moves.

export const DAMAGE_LEVELS = [
  { level: 1, name: 'Roce', upTo: 25 },
  { level: 2, name: 'Leve', upTo: 60 },
  { level: 3, name: 'Fuerte', upTo: 110 },
  { level: 4, name: 'Severo', upTo: 200 },
  { level: 5, name: 'Destrucción total', upTo: Infinity },
];

/** Higher = survives faster impacts at the same level (thresholds above are for the sedan). */
export const RESILIENCE = { sedan: 1, sport: 0.85, pickup: 1.25, moto: 0.6, tank: 3 };

/** @param speedKmh impact speed @returns 0 (no impact) or 1..5 */
export function damageLevel(speedKmh, vehicleId = 'sedan') {
  const v = Math.abs(speedKmh);
  if (!(v > 0)) return 0;
  const eff = v / (RESILIENCE[vehicleId] ?? 1);
  return DAMAGE_LEVELS.find((l) => eff <= l.upTo).level;
}

export const levelInfo = (level) => DAMAGE_LEVELS[level - 1] ?? { level: 0, name: 'Sin daño', upTo: 0 };

/** Seconds after the impact when loose debris and particles are gone. */
export const DEBRIS_LIFETIME_S = 8;
