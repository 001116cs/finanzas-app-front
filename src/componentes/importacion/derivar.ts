import type { components } from '@/lib/api/esquema';
import {
  detectarFormatoFecha,
  detectarFormatoMonto,
  type Deteccion,
  type FormatoFecha,
  type FormatoMonto,
} from '@/lib/importacion/formatos';
import {
  celdasColumna,
  interpretar,
  type Interpretacion,
  type Mapeo,
} from '@/lib/importacion/interpretar';
import type { Hoja } from '@/lib/importacion/tipos';
import type { Estado } from './estado-asistente';

type Categoria = components['schemas']['CategoriaRespuesta'];

export type Derivados = {
  hoja: Hoja | null;
  detMonto: Deteccion<FormatoMonto> | null;
  detFecha: Deteccion<FormatoFecha> | null;
  formatoMonto: FormatoMonto;
  formatoFecha: FormatoFecha;
  /** Falta confirmar el formato porque la detección fue ambigua y el usuario no lo tocó. */
  montoPendiente: boolean;
  fechaPendiente: boolean;
  mapeo: Mapeo | null;
  interpretacion: Interpretacion | null;
  /** Con montos mixtos y "Ambos" el tipo sale del signo de cada fila. */
  esAmbos: boolean;
  /** Categoría del lote efectiva (tipo coincidente y sin "Ambos"). */
  categoriaLote: Pick<Categoria, 'id' | 'tipo'> | undefined;
};

/** Todo lo que se deduce del archivo, el mapeo y los formatos elegidos (sin efectos). */
export type EntradaDerivar = Pick<
  Estado,
  | 'hojas'
  | 'hoja'
  | 'encabezado'
  | 'descripcion'
  | 'monto'
  | 'fecha'
  | 'categoria'
  | 'tipoLote'
  | 'categoriaLoteId'
  | 'signos'
  | 'formatoMonto'
  | 'formatoFecha'
>;

export function derivar(e: EntradaDerivar, categorias: Categoria[]): Derivados {
  const hoja = e.hojas[e.hoja] ?? null;
  const vacio: Derivados = {
    hoja,
    detMonto: null,
    detFecha: null,
    formatoMonto: 'coma_decimal',
    formatoFecha: 'dia_primero',
    montoPendiente: false,
    fechaPendiente: false,
    mapeo: null,
    interpretacion: null,
    esAmbos: false,
    categoriaLote: undefined,
  };
  if (!hoja) return vacio;

  const detMonto =
    e.monto === undefined ? null : detectarFormatoMonto(celdasColumna(hoja, e.encabezado, e.monto));
  const detFecha =
    e.fecha === undefined ? null : detectarFormatoFecha(celdasColumna(hoja, e.encabezado, e.fecha));
  const claveMonto = `${e.hoja}|${e.encabezado}|${e.monto}`;
  const claveFecha = `${e.hoja}|${e.encabezado}|${e.fecha}`;
  const elegidoMonto = e.formatoMonto?.clave === claveMonto ? e.formatoMonto.valor : undefined;
  const elegidoFecha = e.formatoFecha?.clave === claveFecha ? e.formatoFecha.valor : undefined;
  const formatoMonto = elegidoMonto ?? detMonto?.formato ?? 'coma_decimal';
  const formatoFecha = elegidoFecha ?? detFecha?.formato ?? 'dia_primero';
  const base = {
    ...vacio,
    detMonto,
    detFecha,
    formatoMonto,
    formatoFecha,
    montoPendiente: !!detMonto?.ambiguo && elegidoMonto === undefined,
    fechaPendiente: !!detFecha?.ambiguo && elegidoFecha === undefined,
  };
  if (e.descripcion === undefined || e.monto === undefined) return base;

  const lote = categorias.find((c) => c.id === e.categoriaLoteId && c.tipo === e.tipoLote);
  const mapeoCon = (categoriaLoteId: string | undefined): Mapeo => ({
    encabezado: e.encabezado,
    descripcion: e.descripcion!,
    monto: e.monto!,
    fecha: e.fecha,
    categoria: e.categoria,
    formatoMonto,
    formatoFecha,
    tipoLote: e.tipoLote,
    signos: e.signos,
    categoriaLoteId,
  });
  let mapeo = mapeoCon(lote?.id);
  let interpretacion = interpretar(hoja, mapeo, categorias);
  const esAmbos = interpretacion.hayMixtos && (e.signos ?? 'ambos') === 'ambos';
  if (esAmbos && lote) {
    mapeo = mapeoCon(undefined);
    interpretacion = interpretar(hoja, mapeo, categorias);
  }
  return {
    ...base,
    mapeo,
    interpretacion,
    esAmbos,
    categoriaLote: esAmbos || !lote ? undefined : { id: lote.id, tipo: lote.tipo },
  };
}
