'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { crearClienteSupabase } from '@/lib/supabase/cliente';
import { mensajes } from '@/mensajes/es';

export function BotonCerrarSesion() {
  const router = useRouter();
  async function salir() {
    await crearClienteSupabase().auth.signOut();
    router.push('/login');
    router.refresh();
  }
  return (
    <Button variant="outline" size="sm" onClick={salir}>
      {mensajes.acciones.cerrarSesion}
    </Button>
  );
}
