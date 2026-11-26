import type { OrdenVista } from './orden-vista';

/** Qué tipo de movimiento enfoca el dashboard. */
export type TipoVista = 'gasto' | 'ingreso';

/** Lee `?tipo=` de la URL; cualquier valor distinto de "ingreso" es "gasto" (el por defecto). */
export function tipoDesdeQuery(q: URLSearchParams): TipoVista {
  return q.get('tipo') === 'ingreso' ? 'ingreso' : 'gasto';
}

/** Une la query del período con las de tipo y orden; los valores por defecto no se escriben. */
export function construirQuery(periodoQuery: string, tipo: TipoVista, orden: OrdenVista = 'reciente'): string {
  const partes = [periodoQuery, tipo === 'ingreso' ? 'tipo=ingreso' : '', orden !== 'reciente' ? `orden=${orden}` : ''];
  return partes.filter(Boolean).join('&');
}
