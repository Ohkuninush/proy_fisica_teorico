export const DAMAGE_LEVELS = [
  { level: 1, name: 'Roce', upTo: 25 },
  { level: 2, name: 'Leve', upTo: 60 },
  { level: 3, name: 'Fuerte', upTo: 110 },
  { level: 4, name: 'Severo', upTo: 200 },
  { level: 5, name: 'Destrucción total', upTo: Infinity },
];

export const RESILIENCE = { sedan: 1, sport: 0.85, pickup: 1.25, moto: 0.6, tank: 3 };

export function damageLevel(speedKmh, vehicleId = 'sedan') {
  const v = Math.abs(speedKmh);
  if (!(v > 0)) return 0;
  const eff = v / (RESILIENCE[vehicleId] ?? 1);
  return DAMAGE_LEVELS.find((l) => eff <= l.upTo).level;
}

export const levelInfo = (level) => DAMAGE_LEVELS[level - 1] ?? { level: 0, name: 'Sin daño', upTo: 0 };

export const DEBRIS_LIFETIME_S = 8;
