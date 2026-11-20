import { mensajes } from '@/mensajes/es';

type ErrorSupabase = { code?: string; message?: string; name?: string };

export function mensajeDeErrorAuth(error: unknown): string {
  const e = error as ErrorSupabase | null;
  const codigo = e?.code as keyof typeof mensajes.auth.errores | undefined;
  if (codigo && codigo in mensajes.auth.errores) return mensajes.auth.errores[codigo];
  if (
    e?.name === 'AuthRetryableFetchError' ||
    e instanceof TypeError ||
    /fetch|network/i.test(e?.message ?? '')
  ) {
    return mensajes.errores.red;
  }
  return mensajes.errores.generico;
}
