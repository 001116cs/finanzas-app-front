import type { DatosGuardarBoleta, LecturaBoleta } from '@/lib/api/boletas';
import { normalizarMontoEntrada } from '@/lib/monto';

export interface Fila {
  id: string;
  incluir: boolean;
  descripcion: string;
  monto: string;
  categoriaId: string | null;
}

export interface EstadoRevision {
  comercio: string;
  fecha: string;
  totalImpreso: string | null;
  filas: Fila[];
}

export type AccionRevision =
  | { tipo: 'editarCabecera'; campos: Partial<Pick<EstadoRevision, 'comercio' | 'fecha'>> }
  | { tipo: 'editarFila'; id: string; campos: Partial<Omit<Fila, 'id'>> }
  | { tipo: 'alternarFila'; id: string }
  | { tipo: 'agregarFila' }
  | { tipo: 'quitarFila'; id: string };

let contador = 0;
const nuevoId = () => `fila-${++contador}`;

export function estadoInicial(lectura: LecturaBoleta, hoy: string): EstadoRevision {
  return {
    comercio: lectura.comercio,
    fecha: lectura.fecha ?? hoy,
    totalImpreso: lectura.totalImpreso,
    filas: lectura.productos.map((p) => ({
      id: nuevoId(),
      incluir: true,
      descripcion: p.descripcion,
      monto: p.monto,
      categoriaId: p.categoriaId,
    })),
  };
}

export function reducirRevision(estado: EstadoRevision, accion: AccionRevision): EstadoRevision {
  switch (accion.tipo) {
    case 'editarCabecera':
      return { ...estado, ...accion.campos };
    case 'editarFila':
      return {
        ...estado,
        filas: estado.filas.map((f) => (f.id === accion.id ? { ...f, ...accion.campos } : f)),
      };
    case 'alternarFila':
      return {
        ...estado,
        filas: estado.filas.map((f) => (f.id === accion.id ? { ...f, incluir: !f.incluir } : f)),
      };
    case 'agregarFila':
      return {
        ...estado,
        filas: [
          ...estado.filas,
          { id: nuevoId(), incluir: true, descripcion: '', monto: '', categoriaId: null },
        ],
      };
    case 'quitarFila':
      return { ...estado, filas: estado.filas.filter((f) => f.id !== accion.id) };
  }
}

/** "12.50" -> 1250. Sólo para montos ya normalizados (2 decimales). */
function centavos(normalizado: string): number {
  return Number(normalizado.replace('.', ''));
}

export function sumaCentavos(estado: EstadoRevision): number {
  let suma = 0;
  for (const f of estado.filas) {
    if (!f.incluir) continue;
    const m = normalizarMontoEntrada(f.monto);
    if (m !== null) suma += centavos(m);
  }
  return suma;
}

export function diferenciaConTotal(estado: EstadoRevision): number | null {
  if (estado.totalImpreso === null) return null;
  const total = normalizarMontoEntrada(estado.totalImpreso);
  if (total === null) return null;
  return centavos(total) - sumaCentavos(estado);
}

export function filaInvalida(fila: Fila): 'monto' | 'descripcion' | null {
  if (normalizarMontoEntrada(fila.monto.trim()) === null) return 'monto';
  if (fila.descripcion.trim() === '') return 'descripcion';
  return null;
}

export function puedeGuardar(estado: EstadoRevision): boolean {
  const incluidas = estado.filas.filter((f) => f.incluir);
  return (
    incluidas.length > 0 &&
    estado.comercio.trim() !== '' &&
    estado.fecha !== '' &&
    incluidas.every((f) => filaInvalida(f) === null)
  );
}

export function aDatosGuardar(estado: EstadoRevision): DatosGuardarBoleta {
  return {
    comercio: estado.comercio.trim(),
    fecha: estado.fecha,
    totalImpreso: estado.totalImpreso,
    productos: estado.filas
      .filter((f) => f.incluir)
      .map((f) => ({
        descripcion: f.descripcion.trim(),
        monto: normalizarMontoEntrada(f.monto.trim()) as string,
        categoriaId: f.categoriaId,
      })),
  };
}
