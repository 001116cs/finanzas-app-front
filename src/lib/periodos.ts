export type Periodo =
  | { clave: 'este_mes' }
  | { clave: 'mes_anterior' }
  | { clave: 'rango'; desde: string; hasta: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha local de hoy como YYYY-MM-DD. */
export function hoyISO(ahora: Date = new Date()): string {
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

/** `este_mes` devuelve {} para que el back use el mes actual en la zona del usuario. */
export function periodoAParams(p: Periodo, hoy: string): { desde?: string; hasta?: string } {
  if (p.clave === 'este_mes') return {};
  if (p.clave === 'rango') return { desde: p.desde, hasta: p.hasta };
  const [anio, mes] = hoy.split('-').map(Number);
  const a = mes === 1 ? anio - 1 : anio;
  const m = mes === 1 ? 12 : mes - 1;
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { desde: `${a}-${dos(m)}-01`, hasta: `${a}-${dos(m)}-${dos(ultimo)}` };
}

export function periodoDesdeQuery(q: URLSearchParams): Periodo {
  const desde = q.get('desde');
  const hasta = q.get('hasta');
  if (desde && hasta && FECHA.test(desde) && FECHA.test(hasta)) {
    return { clave: 'rango', desde, hasta };
  }
  if (q.get('periodo') === 'mes_anterior') return { clave: 'mes_anterior' };
  return { clave: 'este_mes' };
}

export function periodoAQuery(p: Periodo): string {
  if (p.clave === 'mes_anterior') return 'periodo=mes_anterior';
  if (p.clave === 'rango') return `desde=${p.desde}&hasta=${p.hasta}`;
  return '';
}
