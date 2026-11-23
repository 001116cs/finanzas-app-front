import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const get = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get }),
}));

import { useCategorias } from './usar-datos-periodo';

describe('useCategorias', () => {
  it('recargar() vuelve a pedir las categorías y actualiza la lista', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 'a', nombre: 'Comida', tipo: 'gasto', cantidadMovimientos: 0 }] });
    const { result } = renderHook(() => useCategorias());
    await waitFor(() => expect(result.current.cargadas).toBe(true));
    expect(result.current.categorias).toHaveLength(1);

    get.mockResolvedValueOnce({
      data: [
        { id: 'a', nombre: 'Comida', tipo: 'gasto', cantidadMovimientos: 0 },
        { id: 'b', nombre: 'Nueva', tipo: 'gasto', cantidadMovimientos: 0 },
      ],
    });
    act(() => result.current.recargar());
    await waitFor(() => expect(result.current.categorias).toHaveLength(2));
    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.cargadas).toBe(true);
  });
});
