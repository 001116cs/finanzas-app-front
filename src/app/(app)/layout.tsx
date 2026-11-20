import { BotonCerrarSesion } from '@/componentes/boton-cerrar-sesion';
import { mensajes } from '@/mensajes/es';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { crearClienteApi, ErrorApi } from '@/lib/api/cliente';
import { crearClienteSupabaseServidor } from '@/lib/supabase/servidor';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteSupabaseServidor();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  if (!token) redirect('/login');

  try {
    await crearClienteApi(async () => token).GET('/perfil');
  } catch (e) {
    if (e instanceof ErrorApi && e.status === 401) redirect('/salir');
    if (e instanceof ErrorApi && e.codigo === 'PERFIL_REQUERIDO') {
      redirect('/completar-perfil');
    }
    throw e;
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{mensajes.app.nombre}</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/">{mensajes.navegacion.inicio}</Link>
          <Link href="/categorias">{mensajes.navegacion.categorias}</Link>
          <Link href="/ajustes">{mensajes.navegacion.ajustes}</Link>
        </nav>
        <BotonCerrarSesion />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
