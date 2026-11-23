import { detectarEncabezado, proponerMapeo } from '@/lib/importacion/encabezado';
import type { FormatoFecha, FormatoMonto } from '@/lib/importacion/formatos';
import type { Tipo } from '@/lib/importacion/interpretar';
import type { Hoja } from '@/lib/importacion/tipos';

export type Paso = 'archivo' | 'columnas' | 'categorias' | 'vista' | 'listo';
export type Eleccion = 'crear' | 'lote' | 'ninguna';
export type ModoDuplicadas = 'revisar' | 'incluir' | 'omitir';
export type Signos = 'positivos' | 'negativos' | 'ambos';
/** Formato elegido por el usuario para una columna concreta (`clave` identifica hoja+encabezado+columna). */
export type FormatoElegido<F> = { clave: string; valor: F };

export type Estado = {
  paso: Paso;
  nombreArchivo: string;
  hojas: Hoja[];
  hoja: number;
  encabezado: number;
  descripcion?: number;
  monto?: number;
  fecha?: number;
  categoria?: number;
  tipoLote: Tipo;
  categoriaLoteId?: string;
  signos?: Signos;
  formatoMonto?: FormatoElegido<FormatoMonto>;
  formatoFecha?: FormatoElegido<FormatoFecha>;
  eleccion: Eleccion;
  /** Orígenes (fila de la hoja) que el back ya tiene registrados. */
  duplicadas: number[];
  modoDuplicadas: ModoDuplicadas | null;
  /** Orígenes que el usuario desmarcó en la vista previa. */
  desmarcadas: number[];
  importadas: number;
};

export const ESTADO_INICIAL: Estado = {
  paso: 'archivo',
  nombreArchivo: '',
  hojas: [],
  hoja: 0,
  encabezado: 0,
  tipoLote: 'gasto',
  eleccion: 'crear',
  duplicadas: [],
  modoDuplicadas: null,
  desmarcadas: [],
  importadas: 0,
};

export type Accion =
  | { tipo: 'archivo'; nombre: string; hojas: Hoja[] }
  | { tipo: 'hoja'; indice: number }
  | { tipo: 'encabezado'; fila: number }
  | { tipo: 'cambiar'; cambios: Partial<Estado> }
  | { tipo: 'ir'; paso: Paso }
  | { tipo: 'duplicadas'; origenes: number[] }
  | { tipo: 'modo_duplicadas'; modo: ModoDuplicadas }
  | { tipo: 'alternar'; origen: number }
  | { tipo: 'listo'; importadas: number }
  | { tipo: 'reiniciar' };

/** Columnas, encabezado y formatos de una hoja recién elegida (propuesta heurística de §5.9). */
function mapeoDeHoja(hojas: Hoja[], indice: number, fila?: number): Partial<Estado> {
  const hoja = hojas[indice];
  const encabezado = fila ?? detectarEncabezado(hoja.filas);
  const p = proponerMapeo((hoja.filas[encabezado] ?? []).map((c) => c.texto));
  return {
    hoja: indice,
    encabezado,
    descripcion: p.descripcion,
    monto: p.monto,
    fecha: p.fecha,
    categoria: p.categoria,
    signos: undefined,
    formatoMonto: undefined,
    formatoFecha: undefined,
  };
}

/** La primera hoja que tenga datos (o la primera). */
function primeraConDatos(hojas: Hoja[]): number {
  const i = hojas.findIndex((h) => h.filas.some((f) => f.some((c) => c.texto.trim() !== '')));
  return i < 0 ? 0 : i;
}

export function reductor(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case 'archivo':
      if (a.hojas.length === 0) return ESTADO_INICIAL;
      return {
        ...ESTADO_INICIAL,
        nombreArchivo: a.nombre,
        hojas: a.hojas,
        ...mapeoDeHoja(a.hojas, primeraConDatos(a.hojas)),
      };
    case 'hoja':
      return { ...e, ...mapeoDeHoja(e.hojas, a.indice) };
    case 'encabezado':
      return { ...e, ...mapeoDeHoja(e.hojas, e.hoja, a.fila) };
    case 'cambiar':
      return { ...e, ...a.cambios };
    case 'ir':
      return { ...e, paso: a.paso };
    case 'duplicadas':
      return { ...e, duplicadas: a.origenes, modoDuplicadas: null, desmarcadas: [] };
    case 'modo_duplicadas':
      return {
        ...e,
        modoDuplicadas: a.modo,
        desmarcadas: a.modo === 'revisar' ? e.duplicadas : [],
        paso: 'vista',
      };
    case 'alternar':
      return {
        ...e,
        desmarcadas: e.desmarcadas.includes(a.origen)
          ? e.desmarcadas.filter((o) => o !== a.origen)
          : [...e.desmarcadas, a.origen],
      };
    case 'listo':
      return { ...e, paso: 'listo', importadas: a.importadas };
    case 'reiniciar':
      return ESTADO_INICIAL;
  }
}
