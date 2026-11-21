import { describe, expect, it } from 'vitest';
import { damageOf } from '../src/report/pdf/damage.js';
import { reportFileName, toLatin1 } from '../src/report/pdf/text.js';

describe('pdf helpers', () => {
  it('keeps Latin-1 text and replaces unsupported characters', () => {
    expect(toLatin1('Aceleración ñandú ² ·')).toBe('Aceleración ñandú ² ·');
    expect(toLatin1('Prueba 😀 ₀')).toBe('Prueba ? ?');
    expect(toLatin1('“hola” – adiós…')).toBe('"hola" - adiós...');
  });
  it('builds readable file names', () => {
    const d = new Date(2026, 9, 16, 12, 5, 9);
    expect(reportFileName([{ name: 'Frenado MRUV #1' }], d)).toBe('PhysicsLab3D_Frenado-MRUV-1_20261016_120509.pdf');
    expect(reportFileName([{ name: 'a' }, { name: 'b' }], d)).toBe('PhysicsLab3D_reporte_2-pruebas_20261016_120509.pdf');
    expect(reportFileName([{ name: '😀' }], d)).toBe('PhysicsLab3D_prueba_20261016_120509.pdf');
  });
});

describe('damageOf', () => {
  const entry = (v, visuals) => ({ result: { impact: v === null ? null : { t: 1, v } }, visuals });
  it('derives the level from impact speed and the recorded vehicle', () => {
    expect(damageOf(entry(20, { vehicle: 'sedan', obstacle: 'tree' }))).toMatchObject({ level: 3, name: 'Fuerte', vehicle: 'Carro', obstacle: 'Árbol', assumed: false });
    expect(damageOf(entry(20, { vehicle: 'tank' })).level).toBe(1);
  });
  it('assumes the sedan for older entries without visuals, and has none without impact', () => {
    expect(damageOf(entry(20, null))).toMatchObject({ level: 3, assumed: true, obstacle: null });
    expect(damageOf(entry(null, null))).toBeNull();
  });
});
