import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteSupabaseServidor } from '@/lib/supabase/servidor';

/**
 * Cierra la sesión en el servidor y vuelve a /login. Se usa cuando el back rechaza
 * el token (401) aunque Supabase aún considere la sesión válida: sin esto, /login
 * devolvería al usuario a / y entraría en un bucle de redirecciones.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await crearClienteSupabaseServidor();
    // scope local: sólo borra las cookies, sin depender de la red.
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Aun si falla, seguimos al login.
  }
  return NextResponse.redirect(new URL('/login?expirada=1', request.url));
}
