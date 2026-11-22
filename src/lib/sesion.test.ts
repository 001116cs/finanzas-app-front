import { describe, expect, it, vi } from 'vitest';
import { haySesionValida, type AuthConClaims } from './sesion';

function authFalso(resultado: Awaited<ReturnType<AuthConClaims['getClaims']>>) {
  return { getClaims: vi.fn().mockResolvedValue(resultado) };
}

describe('haySesionValida', () => {
  it('true cuando getClaims devuelve claims con sub', async () => {
    const auth = authFalso({ data: { claims: { sub: 'u-1' } }, error: null });
    await expect(haySesionValida(auth)).resolves.toBe(true);
    expect(auth.getClaims).toHaveBeenCalledTimes(1);
  });

  it('false cuando no hay sesión (data null)', async () => {
    await expect(haySesionValida(authFalso({ data: null, error: null }))).resolves.toBe(false);
  });

  it('false cuando getClaims devuelve error (token inválido o expirado sin refresco)', async () => {
    const auth = authFalso({ data: null, error: new Error('invalid JWT') });
    await expect(haySesionValida(auth)).resolves.toBe(false);
  });

  it('false cuando los claims no traen sub', async () => {
    await expect(
      haySesionValida(authFalso({ data: { claims: {} }, error: null })),
    ).resolves.toBe(false);
  });

  it('false (no lanza) si getClaims rechaza, p. ej. Supabase inalcanzable', async () => {
    const auth = { getClaims: vi.fn().mockRejectedValue(new TypeError('fetch failed')) };
    await expect(haySesionValida(auth)).resolves.toBe(false);
  });
});
