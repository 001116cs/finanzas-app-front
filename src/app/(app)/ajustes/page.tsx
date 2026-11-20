import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormularioAjustes } from '@/componentes/formulario-ajustes';
import { crearClienteApi } from '@/lib/api/cliente';
import { crearClienteSupabaseServidor } from '@/lib/supabase/servidor';
import { mensajes } from '@/mensajes/es';

export default async function Ajustes() {
  const supabase = await crearClienteSupabaseServidor();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  if (!token) redirect('/login');
  const { data: perfil } = await crearClienteApi(async () => token).GET('/perfil');
  if (!perfil) throw new Error('sin perfil');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mensajes.ajustes.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormularioAjustes moneda={perfil.moneda} zonaHoraria={perfil.zonaHoraria} />
      </CardContent>
    </Card>
  );
}
