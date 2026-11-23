/** Qué tipo de movimiento enfoca el dashboard. */
export type TipoVista = 'gasto' | 'ingreso';

/** Lee `?tipo=` de la URL; cualquier valor distinto de "ingreso" es "gasto" (el por defecto). */
export function tipoDesdeQuery(q: URLSearchParams): TipoVista {
  return q.get('tipo') === 'ingreso' ? 'ingreso' : 'gasto';
}

/** Une la query del período con la del tipo; el tipo por defecto no se escribe. */
export function construirQuery(periodoQuery: string, tipo: TipoVista): string {
  const partes = [periodoQuery, tipo === 'ingreso' ? 'tipo=ingreso' : ''];
  return partes.filter(Boolean).join('&');
}
