import { crearClienteApi } from '@/lib/api/cliente';
import { crearClienteSupabase } from '@/lib/supabase/cliente';

export const MONEDAS = ['PEN', 'USD', 'EUR', 'MXN', 'COP', 'CLP', 'ARS', 'BOB'] as const;
export const OTRA = 'OTRA';

export function zonaDelNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Devuelve el código ISO a enviar, o null si la opción "Otra" no es válida. */
export function resolverMoneda(seleccion: string, otra: string): string | null {
  if (seleccion !== OTRA) return seleccion;
  const codigo = otra.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(codigo) ? codigo : null;
}

export async function crearPerfil(moneda: string): Promise<void> {
  const supabase = crearClienteSupabase();
  const api = crearClienteApi(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  });
  await api.POST('/perfil', {
    body: { moneda, zonaHoraria: zonaDelNavegador() },
  });
}

export async function actualizarPerfil(cambios: {
  moneda?: string;
  zonaHoraria?: string;
}): Promise<void> {
  const supabase = crearClienteSupabase();
  const api = crearClienteApi(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  });
  await api.PATCH('/perfil', { body: cambios });
}
