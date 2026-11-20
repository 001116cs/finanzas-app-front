import { describe, expect, it } from 'vitest';
import { periodoAParams, periodoDesdeQuery, periodoAQuery } from './periodos';

describe('periodoAParams', () => {
  it('este_mes devuelve {} para que el back use la zona del usuario', () => {
    expect(periodoAParams({ clave: 'este_mes' }, '2026-01-15')).toEqual({});
  });
  it('mes_anterior cruzando año', () => {
    expect(periodoAParams({ clave: 'mes_anterior' }, '2026-01-15')).toEqual({
      desde: '2025-12-01',
      hasta: '2025-12-31',
    });
  });
  it('mes_anterior con febrero bisiesto', () => {
    expect(periodoAParams({ clave: 'mes_anterior' }, '2024-03-10')).toEqual({
      desde: '2024-02-01',
      hasta: '2024-02-29',
    });
  });
  it('rango devuelve sus fechas', () => {
    expect(
      periodoAParams({ clave: 'rango', desde: '2026-02-01', hasta: '2026-02-10' }, '2026-03-01'),
    ).toEqual({ desde: '2026-02-01', hasta: '2026-02-10' });
  });
});

describe('periodo <-> query', () => {
  it('lee y escribe la URL', () => {
    expect(periodoDesdeQuery(new URLSearchParams(''))).toEqual({ clave: 'este_mes' });
    expect(periodoDesdeQuery(new URLSearchParams('periodo=mes_anterior'))).toEqual({
      clave: 'mes_anterior',
    });
    expect(periodoDesdeQuery(new URLSearchParams('desde=2026-02-01&hasta=2026-02-10'))).toEqual({
      clave: 'rango',
      desde: '2026-02-01',
      hasta: '2026-02-10',
    });
    expect(periodoDesdeQuery(new URLSearchParams('desde=x&hasta=y'))).toEqual({ clave: 'este_mes' });
    expect(periodoAQuery({ clave: 'este_mes' })).toBe('');
    expect(periodoAQuery({ clave: 'mes_anterior' })).toBe('periodo=mes_anterior');
    expect(periodoAQuery({ clave: 'rango', desde: '2026-02-01', hasta: '2026-02-10' })).toBe(
      'desde=2026-02-01&hasta=2026-02-10',
    );
  });
});
