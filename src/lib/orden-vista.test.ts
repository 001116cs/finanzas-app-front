import { describe, expect, it } from 'vitest';
import { ordenDesdeQuery } from './orden-vista';

describe('ordenDesdeQuery', () => {
  it('sin parámetro es reciente', () => {
    expect(ordenDesdeQuery(new URLSearchParams(''))).toBe('reciente');
  });
  it('orden=fecha es fecha', () => {
    expect(ordenDesdeQuery(new URLSearchParams('orden=fecha'))).toBe('fecha');
  });
  it('orden=fecha_asc es fecha_asc', () => {
    expect(ordenDesdeQuery(new URLSearchParams('orden=fecha_asc'))).toBe('fecha_asc');
  });
  it.each(['orden=xyz', 'orden=', 'orden=reciente', 'orden=FECHA'])('valor raro es reciente (%s)', (q) => {
    expect(ordenDesdeQuery(new URLSearchParams(q))).toBe('reciente');
  });
});
