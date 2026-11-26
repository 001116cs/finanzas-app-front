import { describe, expect, it } from 'vitest';
import { ESCALA_MAX, ESCALA_MIN, INICIAL, desplazar, zoomEnPunto } from './zoom';

describe('zoomEnPunto', () => {
  it('acerca manteniendo fijo el centro si el punto es (0, 0)', () => {
    expect(zoomEnPunto(INICIAL, 2, 0, 0)).toEqual({ escala: 2, x: 0, y: 0 });
  });

  it('acerca manteniendo fijo el punto indicado', () => {
    // El punto (100, 50) respecto al centro debe quedar en el mismo lugar de la pantalla.
    const e = zoomEnPunto(INICIAL, 2, 100, 50);
    expect(e.escala).toBe(2);
    // Posición en pantalla del punto de la imagen que estaba en (100, 50): x + 100 * 2.
    expect(e.x + 100 * 2).toBe(100);
    expect(e.y + 50 * 2).toBe(50);
  });

  it('no baja de la escala mínima ni sube de la máxima', () => {
    expect(zoomEnPunto(INICIAL, 0.2, 0, 0).escala).toBe(ESCALA_MIN);
    expect(zoomEnPunto(INICIAL, 50, 0, 0).escala).toBe(ESCALA_MAX);
  });

  it('al volver a la escala mínima recentra la imagen', () => {
    const acercado = zoomEnPunto(INICIAL, 3, 120, -40);
    expect(zoomEnPunto(acercado, ESCALA_MIN, 10, 10)).toEqual(INICIAL);
  });
});

describe('desplazar', () => {
  it('mueve la imagen cuando está ampliada', () => {
    const e = desplazar({ escala: 2, x: 0, y: 0 }, 30, -20);
    expect(e).toEqual({ escala: 2, x: 30, y: -20 });
  });

  it('no mueve la imagen sin zoom', () => {
    expect(desplazar(INICIAL, 30, -20)).toEqual(INICIAL);
  });
});
