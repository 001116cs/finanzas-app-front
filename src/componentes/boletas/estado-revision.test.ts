import { describe, expect, it } from 'vitest';
import {
  aDatosGuardar,
  diferenciaConTotal,
  estadoInicial,
  filaInvalida,
  puedeGuardar,
  reducirRevision,
  sumaCentavos,
  type EstadoRevision,
} from './estado-revision';

const lectura = {
  comercio: 'Super',
  fecha: '2026-11-20',
  totalImpreso: '10.00' as string | null,
  productos: [
    { descripcion: 'Pan', monto: '4.50', categoriaId: null },
    { descripcion: 'Leche', monto: '5.00', categoriaId: 'c1' },
  ],
};
const inicial = () => estadoInicial(lectura, '2026-11-26');
const conMontos = (montos: string[]): EstadoRevision => ({
  ...inicial(),
  filas: montos.map((monto, i) => ({
    id: `f${i}`,
    incluir: true,
    descripcion: `p${i}`,
    monto,
    categoriaId: null,
  })),
});

describe('estadoInicial', () => {
  it('crea una fila incluida por producto', () => {
    const e = inicial();
    expect(e.comercio).toBe('Super');
    expect(e.filas).toHaveLength(2);
    expect(e.filas.every((f) => f.incluir)).toBe(true);
    expect(e.filas[1]).toMatchObject({ descripcion: 'Leche', monto: '5.00', categoriaId: 'c1' });
    expect(new Set(e.filas.map((f) => f.id)).size).toBe(2);
  });
  it('fecha null usa hoy', () => {
    expect(estadoInicial({ ...lectura, fecha: null }, '2026-11-26').fecha).toBe('2026-11-26');
  });
});

describe('reducirRevision', () => {
  it('edita cabecera y fila, alterna, agrega y quita', () => {
    let e = inicial();
    e = reducirRevision(e, { tipo: 'editarCabecera', campos: { comercio: 'Otro' } });
    expect(e.comercio).toBe('Otro');
    expect(e.fecha).toBe('2026-11-20');
    const id = e.filas[0].id;
    e = reducirRevision(e, { tipo: 'editarFila', id, campos: { monto: '9' } });
    expect(e.filas[0].monto).toBe('9');
    expect(e.filas[0].descripcion).toBe('Pan');
    e = reducirRevision(e, { tipo: 'alternarFila', id });
    expect(e.filas[0].incluir).toBe(false);
    e = reducirRevision(e, { tipo: 'agregarFila' });
    expect(e.filas).toHaveLength(3);
    expect(e.filas[2]).toMatchObject({ incluir: true, descripcion: '', monto: '', categoriaId: null });
    e = reducirRevision(e, { tipo: 'quitarFila', id });
    expect(e.filas).toHaveLength(2);
  });
});

describe('derivados', () => {
  it('suma ignora desmarcadas e inválidas', () => {
    const e = conMontos(['4.50', '5', 'x']);
    e.filas[1].incluir = false;
    expect(sumaCentavos(e)).toBe(450);
  });
  it('0.1 + 0.2 = 30 centavos', () => {
    expect(sumaCentavos(conMontos(['0.1', '0.2']))).toBe(30);
  });
  it('diferencia', () => {
    expect(diferenciaConTotal({ ...conMontos(['9.50']), totalImpreso: null })).toBeNull();
    expect(diferenciaConTotal({ ...conMontos(['9.50']), totalImpreso: '10.00' })).toBe(50);
    expect(diferenciaConTotal({ ...conMontos(['10']), totalImpreso: '10.00' })).toBe(0);
  });
  it('filaInvalida', () => {
    const f = { id: 'a', incluir: true, descripcion: 'x', monto: '1', categoriaId: null };
    expect(filaInvalida(f)).toBeNull();
    expect(filaInvalida({ ...f, monto: '-3.00' })).toBe('monto');
    expect(filaInvalida({ ...f, monto: '0' })).toBe('monto');
    expect(filaInvalida({ ...f, monto: '' })).toBe('monto');
    expect(filaInvalida({ ...f, descripcion: '  ' })).toBe('descripcion');
  });
  it('puedeGuardar', () => {
    const e = conMontos(['4.50', '-3.00']);
    expect(puedeGuardar(e)).toBe(false);
    e.filas[1].incluir = false;
    expect(puedeGuardar(e)).toBe(true);
    e.filas[0].incluir = false;
    expect(puedeGuardar(e)).toBe(false);
    e.filas[0].incluir = true;
    expect(puedeGuardar({ ...e, comercio: ' ' })).toBe(false);
    expect(puedeGuardar({ ...e, fecha: '' })).toBe(false);
  });
  it('aDatosGuardar sólo incluidas y normalizadas', () => {
    const e = conMontos(['4,5', '-3.00', '2']);
    e.filas[1].incluir = false;
    e.filas[2].categoriaId = 'c9';
    expect(aDatosGuardar(e)).toEqual({
      comercio: 'Super',
      fecha: '2026-11-20',
      totalImpreso: '10.00',
      productos: [
        { descripcion: 'p0', monto: '4.50', categoriaId: null },
        { descripcion: 'p2', monto: '2.00', categoriaId: 'c9' },
      ],
    });
  });
});
