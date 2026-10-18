import { msToKmh } from '../../physics/params.js';
import { damageLevel } from '../../visuals/damage.js';

export const impactSpeedKmh = (snap) => msToKmh(Math.abs(snap.impact.v));

export const impactLevel = (view, snap) => (snap.impact ? damageLevel(impactSpeedKmh(snap), view.vehicleKind) : 0);
