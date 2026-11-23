import type { Celda, PropuestaMapeo } from './tipos';

const MAX_FILAS_ENCABEZADO = 20;

const vacia = (c: Celda) => c.valor === null || c.texto.trim() === '';
const esTexto = (c: Celda) => typeof c.valor === 'string' && c.texto.trim() !== '';

/** Índice 0-based de la fila de encabezado (§5.3); 0 si ninguna califica. */
export function detectarEncabezado(filas: Celda[][]): number {
  const limite = Math.min(filas.length, MAX_FILAS_ENCABEZADO);
  for (let i = 0; i < limite; i++) {
    if (filas[i].filter(esTexto).length < 2) continue;
    const hayDatos = filas.slice(i + 1).some((f) => f.some((c) => !vacia(c)));
    if (hayDatos) return i;
  }
  return 0;
}

const PALABRAS: Record<keyof PropuestaMapeo, string[]> = {
  fecha: ['fecha', 'date', 'dia', 'day'],
  descripcion: ['descripcion', 'concepto', 'detalle', 'description', 'glosa'],
  monto: ['monto', 'importe', 'amount', 'valor'],
  categoria: ['categoria', 'category', 'rubro'],
};

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Propuesta heurística de mapeo por nombre de columna (§5.9). */
export function proponerMapeo(encabezados: string[]): PropuestaMapeo {
  const palabras = encabezados.map((e) => normalizar(e).split(/[^a-z0-9]+/).filter(Boolean));
  const mapeo: PropuestaMapeo = {};
  const usadas = new Set<number>();
  for (const campo of ['fecha', 'monto', 'descripcion', 'categoria'] as const) {
    const idx = palabras.findIndex((p, i) => !usadas.has(i) && p.some((w) => PALABRAS[campo].includes(w)));
    if (idx >= 0) {
      mapeo[campo] = idx;
      usadas.add(idx);
    }
  }
  return mapeo;
}
