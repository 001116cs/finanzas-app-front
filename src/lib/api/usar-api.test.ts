import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/cliente', () => ({ crearClienteSupabase: () => ({}) }));

import { mensajes } from '@/mensajes/es';
import { ErrorApi } from './cliente';
import { mensajeDeError } from './usar-api';

describe('mensajeDeError', () => {
  it.each([
    'DESTINO_INVALIDO',
    'FECHA_INVALIDA',
    'RANGO_INVALIDO',
    'VALIDACION',
    'AUTH_NO_DISPONIBLE',
    'MONTO_INVALIDO',
    'CATEGORIA_DUPLICADA',
  ] as const)('traduce %s', (codigo) => {
    const m = mensaje(new ErrorApi(400, 'x', codigo));
    expect(m).toBe(mensajes.errores[codigo]);
    expect(m).not.toBe(mensajes.errores.generico);
  });
  it('un 503 sin código conocido cae al genérico y un error de red a red', () => {
    expect(mensaje(new ErrorApi(503, 'x'))).toBe(mensajes.errores.generico);
    expect(mensaje(new TypeError('fetch failed'))).toBe(mensajes.errores.red);
  });
});

function mensaje(e: unknown) {
  return mensajeDeError(e);
}
