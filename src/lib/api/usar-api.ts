'use client';

import { useMemo } from 'react';
import { crearClienteApi, ErrorApi } from '@/lib/api/cliente';
import { crearClienteSupabase } from '@/lib/supabase/cliente';
import { mensajes } from '@/mensajes/es';

/** Cliente de la API con el token de la sesión del navegador. */
export function useApi() {
  return useMemo(() => {
    const supabase = crearClienteSupabase();
    return crearClienteApi(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });
  }, []);
}

/** Mensaje en español para un error al llamar a la API. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorApi) {
    const m = mensajes.errores as Record<string, string>;
    if (e.codigo && m[e.codigo]) return m[e.codigo];
    if (e.status === 401) return mensajes.errores.sesionExpirada;
    return mensajes.errores.generico;
  }
  return mensajes.errores.red;
}
