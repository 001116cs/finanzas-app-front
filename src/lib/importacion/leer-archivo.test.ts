import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectarEncabezado } from './encabezado';
import { leerArchivo } from './leer-archivo';

function fixture(nombre: string): ArrayBuffer {
  const b = readFileSync(path.join(__dirname, '__fixtures__', nombre));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

describe('leerArchivo', () => {
  it('CSV con ; : 1 hoja, 11 filas, texto crudo', () => {
    const hojas = leerArchivo(fixture('1-extracto-banco.csv'), '1-extracto-banco.csv');
    expect(hojas).toHaveLength(1);
    expect(hojas[0].filas).toHaveLength(11);
    expect(hojas[0].filas[0].map((c) => c.texto)).toEqual(['Fecha', 'Descripción', 'Monto', 'Saldo']);
    expect(hojas[0].filas[1][2].texto).toBe('-45,00');
    expect(hojas[0].filas[2][2].texto).toBe('3.500,00');
  });

  it('CSV con , y comillas: "1,250.00" en una celda', () => {
    const [h] = leerArchivo(fixture('3-ingresos-freelance.csv'), '3-ingresos-freelance.csv');
    expect(h.filas).toHaveLength(5);
    expect(h.filas[1]).toHaveLength(4);
    expect(h.filas[1][2].texto).toBe('1,250.00');
  });

  it('CSV con tab y BOM', () => {
    const txt = '﻿a\tb\n1\t2\n';
    const datos = new TextEncoder().encode(txt).buffer as ArrayBuffer;
    const [h] = leerArchivo(datos, 'x.csv');
    expect(h.filas[0].map((c) => c.texto)).toEqual(['a', 'b']);
    expect(h.filas[1].map((c) => c.texto)).toEqual(['1', '2']);
  });

  it('xlsx: encabezado en fila 2, fechas como Date, fórmula SUM en TOTAL', () => {
    const [h] = leerArchivo(fixture('2-gastos-personales.xlsx'), '2-gastos-personales.xlsx');
    expect(detectarEncabezado(h.filas)).toBe(2);
    const f = h.filas[3][0].valor;
    expect(f).toBeInstanceOf(Date);
    const d = f as Date;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 1]);
    const total = h.filas.find((fila) => fila.some((c) => /total/i.test(c.texto)));
    expect(total).toBeDefined();
    expect(total!.some((c) => c.formula?.includes('SUM'))).toBe(true);
  });

  it('xlsx 4: encabezado 0', () => {
    const [h] = leerArchivo(fixture('4-lista-sin-fecha.xlsx'), '4-lista-sin-fecha.xlsx');
    expect(detectarEncabezado(h.filas)).toBe(0);
  });

  it('detecta encabezado 0 en los CSV', () => {
    for (const n of ['1-extracto-banco.csv', '3-ingresos-freelance.csv']) {
      const [h] = leerArchivo(fixture(n), n);
      expect(detectarEncabezado(h.filas)).toBe(0);
    }
  });
});
