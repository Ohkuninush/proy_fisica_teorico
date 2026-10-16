// Selectable visual options. Pure data: ids are the contract with the render modules.

export const SCENERIES = [
  { id: 'city', name: 'Ciudad al atardecer', emoji: '🌆', swatch: 'linear-gradient(180deg,#2a1b5c 0%,#b5468f 55%,#ff8a4c 100%)' },
  { id: 'sunny', name: 'Día soleado', emoji: '☀️', swatch: 'linear-gradient(180deg,#2f7be0 0%,#8cc6f5 60%,#5aa63c 61%,#3f8a2e 100%)' },
  { id: 'forest', name: 'Bosque', emoji: '🌲', swatch: 'linear-gradient(180deg,#86b3a4 0%,#cfe5d2 45%,#1f5e3a 46%,#16402a 100%)' },
  { id: 'mountains', name: 'Montañas', emoji: '🏔️', swatch: 'linear-gradient(180deg,#2f5fa8 0%,#c7d8ee 55%,#7e8aa5 56%,#4a5d52 100%)' },
  { id: 'beach', name: 'Playa', emoji: '🏖️', swatch: 'linear-gradient(180deg,#3aa0ee 0%,#ffe7c2 40%,#1fb5d4 41%,#18a0c0 62%,#e6cf9a 63%)' },
];

export const VEHICLES = [
  { id: 'sedan', name: 'Carro', color: '#e5484d' },
  { id: 'sport', name: 'Deportivo', color: '#ffd23f' },
  { id: 'moto', name: 'Moto', color: '#ff7a1a' },
  { id: 'pickup', name: 'Camioneta', color: '#2ec4b6' },
  { id: 'tank', name: 'Tanque', color: '#6b7f3a' },
];

export const OBSTACLES = [
  { id: 'barrier', name: 'Barrera de concreto' },
  { id: 'wall', name: 'Muro de ladrillos' },
  { id: 'container', name: 'Contenedor' },
  { id: 'rock', name: 'Roca' },
  { id: 'truck', name: 'Camión detenido' },
  { id: 'tree', name: 'Árbol' },
];

export const DEFAULT_VISUALS = Object.freeze({ scenery: 'city', vehicle: 'sedan', obstacle: 'barrier', color: '#e5484d' });

const has = (list, id) => list.some((o) => o.id === id);
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Returns a complete, valid selection; unknown or missing fields fall back to the defaults. */
export function normalizeVisuals(input) {
  const v = input && typeof input === 'object' ? input : {};
  return {
    scenery: has(SCENERIES, v.scenery) ? v.scenery : DEFAULT_VISUALS.scenery,
    vehicle: has(VEHICLES, v.vehicle) ? v.vehicle : DEFAULT_VISUALS.vehicle,
    obstacle: has(OBSTACLES, v.obstacle) ? v.obstacle : DEFAULT_VISUALS.obstacle,
    color: typeof v.color === 'string' && HEX.test(v.color) ? v.color : DEFAULT_VISUALS.color,
  };
}

export const defaultColorFor = (vehicleId) => VEHICLES.find((v) => v.id === vehicleId)?.color ?? DEFAULT_VISUALS.color;
