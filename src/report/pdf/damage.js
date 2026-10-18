import { msToKmh } from '../../physics/params.js';
import { hasGoal, OBSTACLES, VEHICLES } from '../../visuals/catalog.js';
import { damageLevel, levelInfo } from '../../visuals/damage.js';

export function damageOf(entry) {
  const impact = entry.result?.impact;
  if (!impact || hasGoal(entry.visuals)) return null;
  const vehicleId = entry.visuals?.vehicle ?? 'sedan';
  const level = damageLevel(msToKmh(Math.abs(impact.v)), vehicleId);
  return {
    level,
    name: levelInfo(level).name,
    vehicle: VEHICLES.find((vehicle) => vehicle.id === vehicleId)?.name ?? 'Carro',
    obstacle: OBSTACLES.find((obstacle) => obstacle.id === entry.visuals?.obstacle)?.name ?? null,
    assumed: !entry.visuals?.vehicle,
  };
}
