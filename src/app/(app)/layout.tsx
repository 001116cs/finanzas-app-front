import { BotonCerrarSesion } from '@/componentes/boton-cerrar-sesion';
import { NavegacionApp } from '@/componentes/navegacion-app';
import { mensajes } from '@/mensajes/es';
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
      {/* Celular: título y "Cerrar sesión" arriba, navegación debajo a todo el ancho.
          Desde sm: todo en una fila (título, navegación, cerrar sesión). */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-3">
        <h1 className="text-xl font-semibold">{mensajes.app.nombre}</h1>
        <div className="sm:order-last">
          <BotonCerrarSesion />
        </div>
        <NavegacionApp className="order-last -mx-3 w-full sm:order-none sm:mx-0 sm:w-auto" />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
