const RUTAS_PUBLICAS = ['/login', '/registro'];
/** Cierra la sesión del servidor; debe ser alcanzable con o sin sesión para romper bucles. */
const RUTAS_LIBRES = ['/salir'];

/** Destino de redirección para una ruta según haya sesión, o null si se deja pasar. */
export function decidirRedireccion(ruta: string, haySesion: boolean): string | null {
  if (RUTAS_LIBRES.includes(ruta)) return null;
  const esPublica = RUTAS_PUBLICAS.includes(ruta);
  if (!haySesion && !esPublica) return '/login';
  if (haySesion && esPublica) return '/';
  return null;
}
