import { describe, expect, it } from 'vitest';
import { formatearFecha } from './fechas';

describe('formatearFecha', () => {
  it('formatea YYYY-MM-DD en español sin desfase de día', () => {
    expect(formatearFecha('2026-11-19')).toMatch(/^19 nov\.? 2026$/);
    expect(formatearFecha('2026-01-01')).toMatch(/^1 ene\.? 2026$/);
    expect(formatearFecha('2026-12-31')).toMatch(/^31 dic\.? 2026$/);
  });
});
