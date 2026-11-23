import type { components } from '@/lib/api/esquema';
import { analizarMonto, leerFecha, type FormatoFecha, type FormatoMonto } from './formatos';
import type { Celda, Hoja } from './tipos';

type CategoriaRespuesta = components['schemas']['CategoriaRespuesta'];
export type Tipo = CategoriaRespuesta['tipo'];
/** Cuerpo de una fila de `POST /importaciones`. */
export type FilaParaEnviar = components['schemas']['FilaImportacionDto'];
export type CategoriaNueva = components['schemas']['CategoriaNuevaDto'];

/** Mapeo confirmado por el usuario (índices de columna 0-based; `encabezado` = fila 0-based). */
export type Mapeo = {
  encabezado: number;
  descripcion: number;
  monto: number;
  fecha?: number;
  categoria?: number;
  formatoMonto: FormatoMonto;
  formatoFecha: FormatoFecha;
  tipoLote: Tipo;
  /** Sólo se aplica si la columna tiene montos mixtos; sin elegir se interpreta como 'ambos'. */
  signos?: 'positivos' | 'negativos' | 'ambos';
  categoriaLoteId?: string;
};

export type MotivoExclusion =
  | 'total'
  | 'monto_invalido'
  | 'monto_cero'
  | 'fecha_invalida'
  | 'sin_descripcion'
  | 'descripcion_larga'
  | 'signo_descartado'
  | 'demasiados_decimales';

export type FilaInterpretada = {
  /** Índice 0-based de la fila en la hoja. */
  origen: number;
  fecha: string | null;
  descripcion: string;
  /** Valor absoluto con 2 decimales. */
  monto: string;
  tipo: Tipo;
  categoriaId: string | null;
  /** Texto de la celda de categoría (recortado), o null si vacía / sin columna. */
  categoriaNombreArchivo: string | null;
};

/** `nombreLargo`: supera el máximo del back; no se puede crear (§ límites del back). */
export type Desconocida = { nombre: string; tipo: Tipo; cantidad: number; nombreLargo: boolean };

/** Límites del back (Transaccion.descripcion 1..200, Categoria.nombre 1..50). */
export const MAX_DESCRIPCION = 200;
export const MAX_NOMBRE_CATEGORIA = 50;

export type Interpretacion = {
  filas: FilaInterpretada[];
  excluidas: { fila: number; motivo: MotivoExclusion }[];
  hayMixtos: boolean;
  desconocidas: Desconocida[];
};

const VACIA: Celda = { valor: null, texto: '' };

const esVacia = (c: Celda) => c.valor === null || (typeof c.valor === 'string' && c.valor.trim() === '');
const clave = (nombre: string) => nombre.trim().toLowerCase();
const SUMA = /\bSUM\s*\(/i;

/** Celdas de una columna por debajo del encabezado (para las detecciones de formato). */
export function celdasColumna(hoja: Hoja, encabezado: number, columna: number): Celda[] {
  return hoja.filas.slice(encabezado + 1).map((f) => f[columna] ?? VACIA);
}

function aMontoTexto(centavos: number): string {
  const a = Math.abs(centavos);
  return `${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
}

type Candidata = {
  origen: number;
  fecha: string | null;
  descripcion: string;
  centavos: number;
  categoria: string | null;
};

/** Aplica las reglas de §5.3 a la hoja con el mapeo y formatos elegidos. Función pura. */
export function interpretar(hoja: Hoja, mapeo: Mapeo, categorias: CategoriaRespuesta[]): Interpretacion {
  const pasos: (Candidata | { fila: number; motivo: MotivoExclusion })[] = [];

  for (let i = mapeo.encabezado + 1; i < hoja.filas.length; i++) {
    const fila = hoja.filas[i];
    const celda = (col: number | undefined) => (col === undefined ? undefined : (fila[col] ?? VACIA));
    const cDesc = celda(mapeo.descripcion)!;
    const cMonto = celda(mapeo.monto)!;
    const cFecha = celda(mapeo.fecha);
    const cCat = celda(mapeo.categoria);
    if ([cDesc, cMonto, cFecha, cCat].every((c) => c === undefined || esVacia(c))) continue;

    const descripcion = cDesc.texto.trim();
    const fecha = cFecha ? leerFecha(cFecha, mapeo.formatoFecha) : null;
    const excluir = (motivo: MotivoExclusion) => pasos.push({ fila: i, motivo });

    if ((/total/i.test(descripcion) && fecha === null) || SUMA.test(cMonto.formula ?? '')) {
      excluir('total');
      continue;
    }
    const monto = analizarMonto(cMonto, mapeo.formatoMonto);
    if (!('centavos' in monto)) {
      excluir(monto.motivo);
      continue;
    }
    if (monto.centavos === 0) {
      excluir('monto_cero');
      continue;
    }
    if (cFecha && fecha === null) {
      excluir('fecha_invalida');
      continue;
    }
    if (descripcion === '') {
      excluir('sin_descripcion');
      continue;
    }
    if (descripcion.length > MAX_DESCRIPCION) {
      excluir('descripcion_larga'); // nunca truncar en silencio
      continue;
    }
    const cat = cCat && !esVacia(cCat) ? cCat.texto.trim() : null;
    pasos.push({ origen: i, fecha, descripcion, centavos: monto.centavos, categoria: cat || null });
  }

  const candidatas = pasos.filter((p): p is Candidata => 'origen' in p);
  const hayMixtos = candidatas.some((c) => c.centavos < 0) && candidatas.some((c) => c.centavos > 0);
  const signos = hayMixtos ? (mapeo.signos ?? 'ambos') : null;

  const porNombre = new Map<string, CategoriaRespuesta>();
  for (const c of categorias) porNombre.set(`${c.tipo}|${clave(c.nombre)}`, c);
  const loteCat = categorias.find((c) => c.id === mapeo.categoriaLoteId);

  const filas: FilaInterpretada[] = [];
  const excluidas: Interpretacion['excluidas'] = [];
  const desconocidas = new Map<string, Desconocida>();

  for (const p of pasos) {
    if (!('origen' in p)) {
      excluidas.push(p);
      continue;
    }
    const negativo = p.centavos < 0;
    if ((signos === 'positivos' && negativo) || (signos === 'negativos' && !negativo)) {
      excluidas.push({ fila: p.origen, motivo: 'signo_descartado' });
      continue;
    }
    const tipo: Tipo = signos === 'ambos' ? (negativo ? 'gasto' : 'ingreso') : mapeo.tipoLote;

    let categoriaId: string | null = null;
    if (p.categoria !== null) {
      const k = `${tipo}|${clave(p.categoria)}`;
      const existente = porNombre.get(k);
      if (existente) categoriaId = existente.id;
      else {
        const d = desconocidas.get(k);
        if (d) d.cantidad++;
        else
          desconocidas.set(k, {
            nombre: p.categoria,
            tipo,
            cantidad: 1,
            nombreLargo: p.categoria.length > MAX_NOMBRE_CATEGORIA,
          });
      }
    } else if (loteCat && loteCat.tipo === tipo) {
      categoriaId = loteCat.id;
    }

    filas.push({
      origen: p.origen,
      fecha: p.fecha,
      descripcion: p.descripcion,
      monto: aMontoTexto(p.centavos),
      tipo,
      categoriaId,
      categoriaNombreArchivo: p.categoria,
    });
  }

  return { filas, excluidas, hayMixtos, desconocidas: [...desconocidas.values()] };
}

/**
 * Aplica la elección única para las categorías desconocidas (§5.1 paso 3) y arma el cuerpo de
 * `POST /importaciones`. Con 'lote', la categoría del lote sólo se asigna a filas de su mismo tipo.
 * Con 'crear', los nombres de más de `MAX_NOMBRE_CATEGORIA` no se crean: esas filas usan la
 * categoría del lote si coincide el tipo, y si no quedan sin categoría.
 */
export function resolverDesconocidas(
  filas: FilaInterpretada[],
  eleccion: 'crear' | 'lote' | 'ninguna',
  categoriaLote?: Pick<CategoriaRespuesta, 'id' | 'tipo'>,
): { filas: FilaParaEnviar[]; categoriasNuevas: CategoriaNueva[] } {
  const nuevas = new Map<string, CategoriaNueva>();
  const resultado = filas.map((f): FilaParaEnviar => {
    const base = { fecha: f.fecha, descripcion: f.descripcion, monto: f.monto, tipo: f.tipo };
    const desconocida = f.categoriaId === null && f.categoriaNombreArchivo !== null;
    if (!desconocida) return { ...base, categoriaId: f.categoriaId, categoriaNueva: null };
    const nombreLargo = f.categoriaNombreArchivo!.length > MAX_NOMBRE_CATEGORIA;
    if (eleccion === 'crear' && !nombreLargo) {
      const k = `${f.tipo}|${clave(f.categoriaNombreArchivo!)}`;
      let nueva = nuevas.get(k);
      if (!nueva) {
        nueva = { nombre: f.categoriaNombreArchivo!, tipo: f.tipo };
        nuevas.set(k, nueva);
      }
      return { ...base, categoriaId: null, categoriaNueva: nueva.nombre };
    }
    if ((eleccion === 'lote' || eleccion === 'crear') && categoriaLote && categoriaLote.tipo === f.tipo) {
      return { ...base, categoriaId: categoriaLote.id, categoriaNueva: null };
    }
    return { ...base, categoriaId: null, categoriaNueva: null };
  });
  return { filas: resultado, categoriasNuevas: [...nuevas.values()] };
}
