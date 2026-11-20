import { describe, expect, it } from 'vitest';
import { periodoAParams, periodoDesdeQuery, periodoAQuery } from './periodos';

describe('periodoAParams', () => {
  it('este_mes devuelve {} para que el back use la zona del usuario', () => {
    expect(periodoAParams({ clave: 'este_mes' })).toEqual({});
  });
  it('mes_anterior delega al back (zona del perfil, no la del navegador)', () => {
    expect(periodoAParams({ clave: 'mes_anterior' })).toEqual({ periodo: 'mes_anterior' });
  });
  it('rango devuelve sus fechas', () => {
    expect(periodoAParams({ clave: 'rango', desde: '2026-02-01', hasta: '2026-02-10' })).toEqual({
      desde: '2026-02-01',
      hasta: '2026-02-10',
    });
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

describe('periodoDesdeQuery con rangos inválidos', () => {
  it.each([
    'desde=2026-02-10&hasta=2026-02-01',
    'desde=2026-13-45&hasta=2026-14-01',
    'desde=2026-02-30&hasta=2026-03-01',
  ])('%s cae a este_mes', (q) => {
    expect(periodoDesdeQuery(new URLSearchParams(q))).toEqual({ clave: 'este_mes' });
  });
});
