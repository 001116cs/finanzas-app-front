import { describe, expect, it } from 'vitest';
import { calcularDimensiones } from './reducir-imagen';

describe('calcularDimensiones', () => {
  it('reduce el lado largo a 2000 manteniendo proporción', () => {
    expect(calcularDimensiones(4000, 3000)).toEqual({ ancho: 2000, alto: 1500 });
    expect(calcularDimensiones(3000, 4000)).toEqual({ ancho: 1500, alto: 2000 });
  });
  it('no cambia lo que ya cabe', () => {
    expect(calcularDimensiones(1000, 800)).toEqual({ ancho: 1000, alto: 800 });
  });
  it('redondea a enteros y respeta el borde', () => {
    expect(calcularDimensiones(2001, 1)).toEqual({ ancho: 2000, alto: 1 });
  });
});
