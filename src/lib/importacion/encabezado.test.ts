import { describe, expect, it } from 'vitest';
import { detectarEncabezado, proponerMapeo } from './encabezado';
import type { Celda } from './tipos';

const c = (v: string | number | null): Celda => ({ valor: v, texto: v == null ? '' : String(v) });
const fila = (...v: (string | number | null)[]) => v.map(c);

describe('detectarEncabezado', () => {
  it('salta título de una celda y fila vacía', () => {
    const filas = [fila('Mis gastos'), fila(null, null), fila('Fecha', 'Monto'), fila('01/01/2026', 5)];
    expect(detectarEncabezado(filas)).toBe(2);
  });
  it('exige una fila con datos después', () => {
    const filas = [fila('a', 'b'), fila(null, null)];
    expect(detectarEncabezado(filas)).toBe(0); // sin candidato válido: por defecto 0
  });
  it('solo mira las primeras 20 filas', () => {
    const filas = [...Array.from({ length: 25 }, () => fila(null)), fila('a', 'b'), fila(1, 2)];
    expect(detectarEncabezado(filas)).toBe(0);
  });
  it('vacío devuelve 0', () => {
    expect(detectarEncabezado([])).toBe(0);
  });
});

describe('proponerMapeo', () => {
  it('español', () => {
    expect(proponerMapeo(['Día', 'Concepto', 'Categoría', 'Monto (S/)'])).toEqual({
      fecha: 0,
      descripcion: 1,
      categoria: 2,
      monto: 3,
    });
  });
  it('inglés sin descripción', () => {
    expect(proponerMapeo(['date', 'client', 'amount', 'currency'])).toEqual({ fecha: 0, monto: 2 });
  });
  it('extracto', () => {
    expect(proponerMapeo(['Fecha', 'Descripción', 'Monto', 'Saldo'])).toEqual({
      fecha: 0,
      descripcion: 1,
      monto: 2,
    });
  });
  it('no reutiliza una columna', () => {
    const m = proponerMapeo(['Importe', 'Detalle']);
    expect(m).toEqual({ monto: 0, descripcion: 1 });
  });
});
