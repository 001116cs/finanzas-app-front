/**
 * Cómo se ordena la lista de movimientos: por lo último registrado, o por fecha
 * (la más reciente primero, o la más antigua primero).
 */
export type OrdenVista = 'reciente' | 'fecha' | 'fecha_asc';

/** Lee `?orden=` de la URL; cualquier valor desconocido es "reciente" (el por defecto). */
export function ordenDesdeQuery(q: URLSearchParams): OrdenVista {
  const o = q.get('orden');
  return o === 'fecha' || o === 'fecha_asc' ? o : 'reciente';
}

export const esPorFecha = (o: OrdenVista) => o === 'fecha' || o === 'fecha_asc';
