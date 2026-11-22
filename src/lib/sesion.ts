/** La parte de `supabase.auth` que necesitamos: permite probar sin Supabase real. */
export type AuthConClaims = {
  getClaims(): Promise<{ data: { claims: { sub?: string } } | null; error: unknown }>;
};

/**
 * Indica si la petición trae una sesión válida.
 *
 * Usa `getClaims()`: con claves JWT asimétricas valida la firma en local con el JWKS
 * en caché (sin ida y vuelta a Supabase en cada navegación, a diferencia de `getUser()`),
 * y refresca la sesión primero si el token está por expirar.
 */
export async function haySesionValida(auth: AuthConClaims): Promise<boolean> {
  try {
    const { data, error } = await auth.getClaims();
    return !error && !!data?.claims?.sub;
  } catch {
    return false;
  }
}
