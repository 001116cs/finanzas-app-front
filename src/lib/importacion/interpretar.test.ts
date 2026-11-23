import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { components } from '@/lib/api/esquema';
import { detectarFormatoFecha, detectarFormatoMonto } from './formatos';
import { celdasColumna, interpretar, resolverDesconocidas, type FilaInterpretada, type Mapeo } from './interpretar';
import { leerArchivo } from './leer-archivo';
import type { Celda, Hoja } from './tipos';

type Categoria = components['schemas']['CategoriaRespuesta'];

function hojaDe(nombre: string): Hoja {
  const b = readFileSync(path.join(__dirname, '__fixtures__', nombre));
  return leerArchivo(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, nombre)[0];
}

const cat = (id: string, nombre: string, tipo: 'gasto' | 'ingreso'): Categoria => ({
  id,
  nombre,
  tipo,
  cantidadMovimientos: 0,
});

const CATEGORIAS: Categoria[] = [
  cat('c-comida', 'Comida', 'gasto'),
  cat('c-transporte', 'Transporte', 'gasto'),
  cat('c-servicios', 'Servicios', 'gasto'),
  cat('c-entretenimiento', 'Entretenimiento', 'gasto'),
  cat('c-salud', 'Salud', 'gasto'),
  cat('c-sueldo', 'Sueldo', 'ingreso'),
];

const suma = (filas: FilaInterpretada[], tipo: 'gasto' | 'ingreso') =>
  (filas.filter((f) => f.tipo === tipo).reduce((s, f) => s + Math.round(Number(f.monto) * 100), 0) / 100).toFixed(2);

const t = (s: string | null): Celda => ({ valor: s, texto: s ?? '' });

function hojaTexto(filas: (string | null)[][]): Hoja {
  return { nombre: 'h', filas: filas.map((f) => f.map(t)) };
}

describe('interpretar: fixture 1 (extracto banco)', () => {
  const hoja = hojaDe('1-extracto-banco.csv');
  const base: Mapeo = {
    encabezado: 0,
    fecha: 0,
    descripcion: 1,
    monto: 2,
    formatoMonto: 'coma_decimal',
    formatoFecha: 'dia_primero',
    tipoLote: 'gasto',
  };

  it('detección: coma decimal clara, día primero claro', () => {
    expect(detectarFormatoMonto(celdasColumna(hoja, 0, 2))).toEqual({ formato: 'coma_decimal', ambiguo: false });
    expect(detectarFormatoFecha(celdasColumna(hoja, 0, 0))).toEqual({ formato: 'dia_primero', ambiguo: false });
  });

  it('con "Ambos": 10 filas, 7 gastos (604.10) y 3 ingresos (3729.90), hayMixtos', () => {
    const r = interpretar(hoja, { ...base, signos: 'ambos' }, CATEGORIAS);
    expect(r.hayMixtos).toBe(true);
    expect(r.excluidas).toEqual([]);
    expect(r.filas).toHaveLength(10);
    expect(r.filas.filter((f) => f.tipo === 'gasto')).toHaveLength(7);
    expect(r.filas.filter((f) => f.tipo === 'ingreso')).toHaveLength(3);
    expect(suma(r.filas, 'gasto')).toBe('604.10');
    expect(suma(r.filas, 'ingreso')).toBe('3729.90');
    expect(r.filas[0]).toEqual({
      origen: 1,
      fecha: '2026-11-02',
      descripcion: 'PLIN-JUAN PEREZ',
      monto: '45.00',
      tipo: 'gasto',
      categoriaId: null,
      categoriaNombreArchivo: null,
    });
    expect(r.filas[1]).toMatchObject({ fecha: '2026-11-03', monto: '3500.00', tipo: 'ingreso' });
    expect(r.filas[7]).toMatchObject({ fecha: '2026-11-15', monto: '18.50', tipo: 'gasto' });
    expect(r.desconocidas).toEqual([]);
  });

  it('con "Negativos" y lote gasto: 7 filas, 3 excluidas por signo descartado', () => {
    const r = interpretar(hoja, { ...base, signos: 'negativos', tipoLote: 'gasto' }, CATEGORIAS);
    expect(r.filas).toHaveLength(7);
    expect(r.filas.every((f) => f.tipo === 'gasto')).toBe(true);
    expect(suma(r.filas, 'gasto')).toBe('604.10');
    expect(r.excluidas).toEqual([
      { fila: 2, motivo: 'signo_descartado' },
      { fila: 6, motivo: 'signo_descartado' },
      { fila: 9, motivo: 'signo_descartado' },
    ]);
    expect(r.hayMixtos).toBe(true);
  });

  it('con "Positivos" y lote ingreso: 3 ingresos', () => {
    const r = interpretar(hoja, { ...base, signos: 'positivos', tipoLote: 'ingreso' }, CATEGORIAS);
    expect(r.filas.map((f) => f.monto)).toEqual(['3500.00', '150.00', '79.90']);
    expect(r.filas.every((f) => f.tipo === 'ingreso')).toBe(true);
    expect(r.excluidas).toHaveLength(7);
  });
});

describe('interpretar: fixture 2 (gastos personales xlsx)', () => {
  const hoja = hojaDe('2-gastos-personales.xlsx');
  const mapeo: Mapeo = {
    encabezado: 2,
    fecha: 0,
    descripcion: 1,
    categoria: 2,
    monto: 3,
    formatoMonto: 'coma_decimal',
    formatoFecha: 'dia_primero',
    tipoLote: 'gasto',
  };

  it('detección: celdas numéricas y fechas ⇒ claro', () => {
    expect(detectarFormatoMonto(celdasColumna(hoja, 2, 3)).ambiguo).toBe(false);
    expect(detectarFormatoFecha(celdasColumna(hoja, 2, 0)).ambiguo).toBe(false);
  });

  it('9 filas (501.70), vacías saltadas, TOTAL excluida con motivo "total", categorías existentes', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    expect(r.filas).toHaveLength(9);
    expect(suma(r.filas, 'gasto')).toBe('501.70');
    expect(r.filas.every((f) => f.tipo === 'gasto')).toBe(true);
    expect(r.excluidas).toEqual([{ fila: 14, motivo: 'total' }]);
    expect(r.hayMixtos).toBe(false);
    expect(r.desconocidas).toEqual([]);
    expect(r.filas[0]).toEqual({
      origen: 3,
      fecha: '2026-11-01',
      descripcion: 'Almuerzo menú',
      monto: '12.50',
      tipo: 'gasto',
      categoriaId: 'c-comida',
      categoriaNombreArchivo: 'Comida',
    });
    expect(r.filas.map((f) => f.fecha)).toEqual([
      '2026-11-01',
      '2026-11-01',
      '2026-11-03',
      '2026-11-05',
      '2026-11-08',
      '2026-11-09',
      '2026-11-12',
      '2026-11-14',
      '2026-11-20',
    ]);
    expect(new Set(r.filas.map((f) => f.categoriaId))).toEqual(
      new Set(['c-comida', 'c-transporte', 'c-servicios', 'c-entretenimiento', 'c-salud']),
    );
  });
});

describe('interpretar: fixture 3 (ingresos freelance)', () => {
  const hoja = hojaDe('3-ingresos-freelance.csv');
  const mapeo: Mapeo = {
    encabezado: 0,
    fecha: 0,
    descripcion: 1,
    monto: 2,
    formatoMonto: 'punto_decimal',
    formatoFecha: 'dia_primero',
    tipoLote: 'ingreso',
  };

  it('detección: punto decimal claro, ISO claro', () => {
    expect(detectarFormatoMonto(celdasColumna(hoja, 0, 2))).toEqual({ formato: 'punto_decimal', ambiguo: false });
    expect(detectarFormatoFecha(celdasColumna(hoja, 0, 0)).ambiguo).toBe(false);
  });

  it('4 ingresos, total 5280.50', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    expect(r.filas.map((f) => f.monto)).toEqual(['1250.00', '480.00', '1250.00', '2300.50']);
    expect(r.filas.map((f) => f.fecha)).toEqual(['2026-10-05', '2026-10-19', '2026-11-02', '2026-11-16']);
    expect(r.filas.every((f) => f.tipo === 'ingreso')).toBe(true);
    expect(suma(r.filas, 'ingreso')).toBe('5280.50');
    expect(r.excluidas).toEqual([]);
    expect(r.hayMixtos).toBe(false);
  });
});

describe('interpretar: fixture 4 (lista sin fecha)', () => {
  const hoja = hojaDe('4-lista-sin-fecha.xlsx');
  const mapeo: Mapeo = {
    encabezado: 0,
    descripcion: 0,
    monto: 1,
    formatoMonto: 'coma_decimal',
    formatoFecha: 'dia_primero',
    tipoLote: 'gasto',
  };

  it('detección de montos: claro', () => {
    expect(detectarFormatoMonto(celdasColumna(hoja, 0, 1)).ambiguo).toBe(false);
  });

  it('3 filas sin fecha (188.40); Propina monto inválido, Ajuste monto cero', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    expect(r.filas.map((f) => [f.descripcion, f.monto, f.fecha])).toEqual([
      ['Café', '8.50', null],
      ['Libro', '59.90', null],
      ['Regalo cumpleaños', '120.00', null],
    ]);
    expect(suma(r.filas, 'gasto')).toBe('188.40');
    expect(r.excluidas).toEqual([
      { fila: 4, motivo: 'monto_invalido' },
      { fila: 5, motivo: 'monto_cero' },
    ]);
    expect(r.hayMixtos).toBe(false);
  });
});

describe('interpretar: reglas', () => {
  const mapeo: Mapeo = {
    encabezado: 0,
    fecha: 0,
    descripcion: 1,
    monto: 2,
    formatoMonto: 'coma_decimal',
    formatoFecha: 'dia_primero',
    tipoLote: 'gasto',
  };

  it('cambiar formatoMonto recalcula (Review Focus 5)', () => {
    const hoja = hojaTexto([
      ['Fecha', 'Desc', 'Monto'],
      ['01/11/2026', 'A', '1.250'],
      ['02/11/2026', 'B', '2.300'],
    ]);
    expect(detectarFormatoMonto(celdasColumna(hoja, 0, 2)).ambiguo).toBe(true);
    const coma = interpretar(hoja, { ...mapeo, formatoMonto: 'coma_decimal' }, []);
    expect(coma.filas.map((f) => f.monto)).toEqual(['1250.00', '2300.00']);
    const punto = interpretar(hoja, { ...mapeo, formatoMonto: 'punto_decimal' }, []);
    expect(punto.filas.map((f) => f.monto)).toEqual(['1.25', '2.30']);
  });

  it('cambiar formatoFecha recalcula', () => {
    const hoja = hojaTexto([
      ['Fecha', 'Desc', 'Monto'],
      ['03/11/2026', 'A', '5'],
    ]);
    expect(interpretar(hoja, mapeo, []).filas[0].fecha).toBe('2026-11-03');
    expect(interpretar(hoja, { ...mapeo, formatoFecha: 'mes_primero' }, []).filas[0].fecha).toBe('2026-03-11');
  });

  it('motivos de exclusión y filas vacías', () => {
    const hoja = hojaTexto([
      ['Fecha', 'Desc', 'Monto', 'Otra'],
      ['01/11/2026', 'ok', '10,00', 'x'],
      [null, null, null, 'ignorada: sólo columna no mapeada'],
      ['01/11/2026', 'decimales', '1,234', null],
      ['31/02/2026', 'fecha mala', '5', null],
      [null, 'sin fecha', '5', null],
      ['01/11/2026', '   ', '5', null],
      [null, 'Total del mes', '99', null],
      ['05/11/2026', 'Subtotal con fecha válida', '7', null],
      ['01/11/2026', 'vacío', '', null],
    ]);
    const r = interpretar(hoja, mapeo, []);
    expect(r.filas.map((f) => f.origen)).toEqual([1, 8]);
    expect(r.excluidas).toEqual([
      { fila: 3, motivo: 'demasiados_decimales' },
      { fila: 4, motivo: 'fecha_invalida' },
      { fila: 5, motivo: 'fecha_invalida' },
      { fila: 6, motivo: 'sin_descripcion' },
      { fila: 7, motivo: 'total' },
      { fila: 9, motivo: 'monto_invalido' },
    ]);
  });

  it('fórmula SUM en el monto ⇒ total aunque tenga fecha', () => {
    const hoja: Hoja = {
      nombre: 'h',
      filas: [
        [t('Fecha'), t('Desc'), t('Monto')],
        [t('01/11/2026'), t('Algo'), { valor: 30, texto: '30', formula: 'SUM(C1:C1)' }],
        [t('01/11/2026'), t('Otra'), { valor: 30, texto: '30', formula: 'C2*1' }],
      ],
    };
    const r = interpretar(hoja, mapeo, []);
    expect(r.excluidas).toEqual([{ fila: 1, motivo: 'total' }]);
    expect(r.filas.map((f) => f.origen)).toEqual([2]);
  });

  it('descripción recortada; columnas fuera de rango tratadas como vacías', () => {
    const hoja = hojaTexto([['Fecha', 'Desc', 'Monto'], ['01/11/2026', '  Café  ', '5']]);
    hoja.filas[1].length = 2; // fila corta: monto ausente
    hoja.filas.push([t('01/11/2026'), t('  Pan '), t('2')]);
    const r = interpretar(hoja, mapeo, []);
    expect(r.excluidas).toEqual([{ fila: 1, motivo: 'monto_invalido' }]);
    expect(r.filas[0].descripcion).toBe('Pan');
  });

  it('sin mixtos se ignora "signos" y todo va con el tipo del lote; monto siempre absoluto', () => {
    const hoja = hojaTexto([
      ['Fecha', 'Desc', 'Monto'],
      ['01/11/2026', 'A', '-5'],
      ['01/11/2026', 'B', '(7,50)'],
    ]);
    const r = interpretar(hoja, { ...mapeo, tipoLote: 'gasto', signos: 'positivos' }, []);
    expect(r.hayMixtos).toBe(false);
    expect(r.filas.map((f) => [f.monto, f.tipo])).toEqual([
      ['5.00', 'gasto'],
      ['7.50', 'gasto'],
    ]);
  });

  it('mixtos sin elección de signos ⇒ se interpreta como "Ambos"', () => {
    const hoja = hojaTexto([
      ['Fecha', 'Desc', 'Monto'],
      ['01/11/2026', 'A', '-5'],
      ['01/11/2026', 'B', '7'],
    ]);
    const r = interpretar(hoja, mapeo, []);
    expect(r.hayMixtos).toBe(true);
    expect(r.filas.map((f) => f.tipo)).toEqual(['gasto', 'ingreso']);
  });
});

describe('interpretar: categorías', () => {
  const mapeo: Mapeo = {
    encabezado: 0,
    descripcion: 0,
    monto: 1,
    categoria: 2,
    formatoMonto: 'coma_decimal',
    formatoFecha: 'dia_primero',
    tipoLote: 'gasto',
    signos: 'ambos',
  };
  const hoja = hojaTexto([
    ['Desc', 'Monto', 'Cat'],
    ['Almuerzo', '-10', 'comida '],
    ['Croquetas', '-20', 'Mascotas'],
    ['Veterinario', '-30', ' MASCOTAS'],
    ['Venta', '50', 'Comida'],
    ['Sin cat', '-5', null],
    ['Sueldo', '100', 'sueldo'],
    ['Sin cat ingreso', '7', ''],
  ]);

  it('busca por nombre y tipo de la fila; desconocidas agrupadas con su cantidad', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    expect(r.filas.map((f) => [f.descripcion, f.categoriaId, f.categoriaNombreArchivo])).toEqual([
      ['Almuerzo', 'c-comida', 'comida'],
      ['Croquetas', null, 'Mascotas'],
      ['Veterinario', null, 'MASCOTAS'],
      ['Venta', null, 'Comida'],
      ['Sin cat', null, null],
      ['Sueldo', 'c-sueldo', 'sueldo'],
      ['Sin cat ingreso', null, null],
    ]);
    expect(r.desconocidas).toEqual([
      { nombre: 'Mascotas', tipo: 'gasto', cantidad: 2 },
      { nombre: 'Comida', tipo: 'ingreso', cantidad: 1 },
    ]);
  });

  it('celda vacía ⇒ categoría del lote sólo si coincide el tipo', () => {
    const r = interpretar(hoja, { ...mapeo, categoriaLoteId: 'c-salud' }, CATEGORIAS);
    expect(r.filas.find((f) => f.descripcion === 'Sin cat')!.categoriaId).toBe('c-salud');
    expect(r.filas.find((f) => f.descripcion === 'Sin cat ingreso')!.categoriaId).toBeNull();
    expect(r.filas.find((f) => f.descripcion === 'Croquetas')!.categoriaId).toBeNull();
  });

  it('sin columna de categoría ⇒ categoría del lote', () => {
    const r = interpretar(hoja, { ...mapeo, categoria: undefined, categoriaLoteId: 'c-sueldo' }, CATEGORIAS);
    expect(r.filas.map((f) => f.categoriaId)).toEqual([null, null, null, 'c-sueldo', null, 'c-sueldo', 'c-sueldo']);
    expect(r.desconocidas).toEqual([]);
  });

  it('resolverDesconocidas("crear")', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    const { filas, categoriasNuevas } = resolverDesconocidas(r.filas, 'crear');
    expect(categoriasNuevas).toEqual([
      { nombre: 'Mascotas', tipo: 'gasto' },
      { nombre: 'Comida', tipo: 'ingreso' },
    ]);
    expect(filas[0]).toEqual({
      fecha: null,
      descripcion: 'Almuerzo',
      monto: '10.00',
      tipo: 'gasto',
      categoriaId: 'c-comida',
      categoriaNueva: null,
    });
    expect(filas[1]).toMatchObject({ categoriaId: null, categoriaNueva: 'Mascotas' });
    expect(filas[2]).toMatchObject({ categoriaId: null, categoriaNueva: 'Mascotas' });
    expect(filas[3]).toMatchObject({ categoriaId: null, categoriaNueva: 'Comida', tipo: 'ingreso' });
    expect(filas[4]).toMatchObject({ categoriaId: null, categoriaNueva: null });
    expect(Object.keys(filas[0]).sort()).toEqual(
      ['categoriaId', 'categoriaNueva', 'descripcion', 'fecha', 'monto', 'tipo'].sort(),
    );
  });

  it('crear sólo con la columna de prueba del brief: Mascotas', () => {
    const h = hojaTexto([
      ['Desc', 'Monto', 'Cat'],
      ['Almuerzo', '10', 'comida '],
      ['Croquetas', '20', 'Mascotas'],
    ]);
    const r = interpretar(h, { ...mapeo, signos: undefined }, CATEGORIAS);
    expect(r.desconocidas).toEqual([{ nombre: 'Mascotas', tipo: 'gasto', cantidad: 1 }]);
    const res = resolverDesconocidas(r.filas, 'crear');
    expect(res.categoriasNuevas).toEqual([{ nombre: 'Mascotas', tipo: 'gasto' }]);
    expect(res.filas[1].categoriaNueva).toBe('Mascotas');
    expect(res.filas[0].categoriaId).toBe('c-comida');
  });

  it('resolverDesconocidas("lote") asigna la del lote sólo a desconocidas de su tipo', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    const { filas, categoriasNuevas } = resolverDesconocidas(r.filas, 'lote', { id: 'c-salud', tipo: 'gasto' });
    expect(categoriasNuevas).toEqual([]);
    expect(filas.map((f) => f.categoriaId)).toEqual(['c-comida', 'c-salud', 'c-salud', null, null, 'c-sueldo', null]);
    expect(filas.every((f) => f.categoriaNueva === null)).toBe(true);
  });

  it('resolverDesconocidas("ninguna") deja sin categoría a las desconocidas', () => {
    const r = interpretar(hoja, mapeo, CATEGORIAS);
    const { filas, categoriasNuevas } = resolverDesconocidas(r.filas, 'ninguna');
    expect(categoriasNuevas).toEqual([]);
    expect(filas.map((f) => f.categoriaId)).toEqual(['c-comida', null, null, null, null, 'c-sueldo', null]);
  });
});
