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
    if (e instanceof ErrorApi && e.codigo === 'PERFIL_REQUERIDO') {
      redirect('/completar-perfil');
    }
    throw e;
  }
  return <>{children}</>;
}
