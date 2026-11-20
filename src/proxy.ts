import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { decidirRedireccion } from '@/lib/redireccion';

export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return respuesta;

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser valida el token con Supabase y refresca la sesión si hace falta.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destino = decidirRedireccion(request.nextUrl.pathname, !!user);
  if (!destino) return respuesta;

  const redireccion = NextResponse.redirect(new URL(destino, request.url));
  respuesta.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
  return redireccion;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
