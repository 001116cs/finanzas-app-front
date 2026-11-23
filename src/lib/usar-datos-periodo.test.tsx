import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const get = vi.fn(async (ruta: string) =>
  ruta === '/resumen'
    ? { data: { desde: '2026-11-01', hasta: '2026-11-30', moneda: 'PEN', totalGastos: '0.00', totalIngresos: '0.00', balance: '0.00', porCategoria: [] } }
    : { data: { items: [], total: 0 } },
);
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get }),
}));

import { useDatosPeriodo } from './usar-datos-periodo';

describe('useDatosPeriodo', () => {
  it('lista transacciones con el desde/hasta que devolvió /resumen', async () => {
    const { result } = renderHook(() => useDatosPeriodo({ clave: 'este_mes' }, 'gasto'));
    await waitFor(() => expect(result.current.resumen).not.toBeNull());
    expect(get).toHaveBeenCalledWith('/resumen', { params: { query: {} } });
    expect(get).toHaveBeenCalledWith('/transacciones', {
      params: { query: { desde: '2026-11-01', hasta: '2026-11-30', tipo: 'gasto', pagina: 1, tamano: 20 } },
    });
  });

  it('filtra la lista por el tipo elegido', async () => {
    get.mockClear();
    const { result } = renderHook(() => useDatosPeriodo({ clave: 'este_mes' }, 'ingreso'));
    await waitFor(() => expect(result.current.resumen).not.toBeNull());
    expect(get).toHaveBeenCalledWith('/transacciones', {
      params: { query: { desde: '2026-11-01', hasta: '2026-11-30', tipo: 'ingreso', pagina: 1, tamano: 20 } },
    });
  });
});
