import { describe, expect, it } from 'vitest';
import { construirQuery, tipoDesdeQuery } from './tipo-vista';

describe('tipoDesdeQuery', () => {
  it('devuelve ingreso sólo con tipo=ingreso', () => {
    expect(tipoDesdeQuery(new URLSearchParams('tipo=ingreso'))).toBe('ingreso');
  });
  it.each(['', 'tipo=gasto', 'tipo=xyz', 'periodo=mes_anterior'])(
    'devuelve gasto por defecto o ante valores inválidos (%s)',
    (q) => {
      expect(tipoDesdeQuery(new URLSearchParams(q))).toBe('gasto');
    },
  );
});

describe('construirQuery', () => {
  it('vacía cuando no hay período ni tipo distinto del por defecto', () => {
    expect(construirQuery('', 'gasto')).toBe('');
  });
  it('agrega tipo=ingreso a la query del período', () => {
    expect(construirQuery('periodo=mes_anterior', 'ingreso')).toBe(
      'periodo=mes_anterior&tipo=ingreso',
    );
  });
  it('sólo tipo cuando el período es el por defecto', () => {
    expect(construirQuery('', 'ingreso')).toBe('tipo=ingreso');
  });
  it('nunca escribe tipo=gasto', () => {
    expect(construirQuery('desde=2026-01-01&hasta=2026-01-31', 'gasto')).toBe(
      'desde=2026-01-01&hasta=2026-01-31',
    );
  });
});
