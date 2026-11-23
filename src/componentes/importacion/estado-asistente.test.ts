import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, reductor } from './estado-asistente';

describe('reductor cambiar', () => {
  const base = { ...ESTADO_INICIAL, monto: 2, signos: 'negativos' as const };

  it('al cambiar la columna de monto se descarta la respuesta de signos', () => {
    expect(reductor(base, { tipo: 'cambiar', cambios: { monto: 3 } }).signos).toBeUndefined();
  });

  it('otros cambios (o el mismo monto) conservan signos', () => {
    expect(reductor(base, { tipo: 'cambiar', cambios: { fecha: 0 } }).signos).toBe('negativos');
    expect(reductor(base, { tipo: 'cambiar', cambios: { monto: 2 } }).signos).toBe('negativos');
  });

  it('elegir signos junto con monto respeta lo elegido', () => {
    expect(reductor(base, { tipo: 'cambiar', cambios: { monto: 3, signos: 'positivos' } }).signos).toBe('positivos');
  });
});
