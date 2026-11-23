import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectarEncabezado } from './encabezado';
import { detectarFormatoFecha, detectarFormatoMonto, leerFecha, leerMonto } from './formatos';
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

  it('.xls que en realidad es una tabla HTML: las celdas quedan como texto y se interpretan con el formato', () => {
    const html =
      '<html><body><table>' +
      '<tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr>' +
      '<tr><td>02/11/2026</td><td>Café</td><td>-45,00</td></tr>' +
      '<tr><td>15/11/2026</td><td>Alquiler</td><td>1.250</td></tr>' +
      '</table></body></html>';
    const datos = new TextEncoder().encode(html).buffer as ArrayBuffer;
    const [h] = leerArchivo(datos, 'extracto.xls');
    expect(h.filas[1][2].valor).toBe('-45,00');
    expect(h.filas[2][2].valor).toBe('1.250');
    expect(h.filas[1][0].valor).toBe('02/11/2026');
    expect(h.filas[2][0].valor).toBe('15/11/2026');
    const montos = h.filas.slice(1).map((f) => f[2]);
    const fechas = h.filas.slice(1).map((f) => f[0]);
    const fm = detectarFormatoMonto(montos);
    const ff = detectarFormatoFecha(fechas);
    expect(leerMonto(montos[0], fm.formato)).toBe(-4500);
    expect(leerMonto(montos[1], 'coma_decimal')).toBe(125000);
    expect(leerFecha(fechas[0], ff.formato)).toBe('2026-11-02');
  });

  it('CSV en Windows-1252 se decodifica sin caracteres de reemplazo', () => {
    const bytes = Uint8Array.from(
      [...'Descripción;Monto\nPeñaranda;10,00\n'].map((ch) => ch.charCodeAt(0)),
    );
    const [h] = leerArchivo(bytes.buffer as ArrayBuffer, 'x.csv');
    expect(h.filas[0][0].texto).toBe('Descripción');
    expect(h.filas[1][0].texto).toBe('Peñaranda');
  });

  it('CSV en UTF-16LE con BOM', () => {
    const txt = 'Descripción,Monto\nPeñaranda,10.00\n';
    const b = new Uint8Array(2 + txt.length * 2);
    b[0] = 0xff;
    b[1] = 0xfe;
    for (let i = 0; i < txt.length; i++) {
      b[2 + i * 2] = txt.charCodeAt(i) & 0xff;
      b[3 + i * 2] = txt.charCodeAt(i) >> 8;
    }
    const [h] = leerArchivo(b.buffer as ArrayBuffer, 'x.csv');
    expect(h.filas[0].map((c) => c.texto)).toEqual(['Descripción', 'Monto']);
    expect(h.filas[1][0].texto).toBe('Peñaranda');
    expect(h.filas[1][1].texto).toBe('10.00');
  });

  it('CSV en UTF-16BE con BOM', () => {
    const txt = 'a,b\n1,2\n';
    const b = new Uint8Array(2 + txt.length * 2);
    b[0] = 0xfe;
    b[1] = 0xff;
    for (let i = 0; i < txt.length; i++) b[3 + i * 2] = txt.charCodeAt(i);
    const [h] = leerArchivo(b.buffer as ArrayBuffer, 'x.csv');
    expect(h.filas[1].map((c) => c.texto)).toEqual(['1', '2']);
  });
});
