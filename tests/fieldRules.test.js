import { describe, expect, it } from 'vitest';
import { DEFAULTS, validateParams } from '../src/physics/params.js';
import { fieldsFor, isFieldVisible } from '../src/ui/fieldRules.js';

describe('form rules', () => {
  it('MRU hides acceleration, MRUV shows it', () => {
    expect(fieldsFor('MRU')).not.toContain('a');
    expect(isFieldVisible('MRUV', 'a')).toBe(true);
    expect(isFieldVisible('MRU', 'v0')).toBe(true);
  });
  it('validateParams reports Spanish per-field errors', () => {
    const r = validateParams({ ...DEFAULTS.MRUV, v0: '', gap: -1 });
    expect(r.ok).toBe(false);
    expect(r.fieldErrors.v0).toMatch(/número/);
    expect(r.fieldErrors.gap).toMatch(/entre/);
    expect(validateParams({ ...DEFAULTS.MRU, a: 'abc' }).ok).toBe(true);
  });
});
