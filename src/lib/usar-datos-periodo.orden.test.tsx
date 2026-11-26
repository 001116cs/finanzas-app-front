import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));

const resumen = {
  desde: '2026-11-01', hasta: '2026-11-30', moneda: 'PEN',
  totalGastos: '5.00', totalIngresos: '9.00', balance: '4.00', porCategoria: [],
};
const tx = (id: string) => ({
  id, tipo: 'gasto', monto: '1.00', fecha: '2026-11-01', descripcion: id,
  categoriaId: null, categoriaNombre: null, origen: 'manual', createdAt: 'x',
});
let soltarFecha: ((v: unknown) => void) | null = null;
let bloquear = false;
const get = vi.fn((ruta: string, opts: { params: { query: Record<string, unknown> } }) => {
  if (ruta === '/resumen') return Promise.resolve({ data: resumen });
  if (bloquear && opts.params.query.orden === 'fecha')
    return new Promise((res) => { soltarFecha = res; });
  return Promise.resolve({ data: { items: [tx(`${opts.params.query.orden}-${opts.params.query.pagina}`)], total: 60 } });
});
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get }),
}));

import type { OrdenVista } from './orden-vista';
import { useDatosPeriodo } from './usar-datos-periodo';

describe('useDatosPeriodo: orden', () => {
  it('con orden fecha envía orden=fecha en la carga inicial y en cargar más', async () => {
    get.mockClear();
    const { result } = renderHook(() => useDatosPeriodo({ clave: 'este_mes' }, 'gasto', 'fecha'));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    expect(get).toHaveBeenCalledWith('/transacciones', expect.objectContaining({
      params: { query: expect.objectContaining({ orden: 'fecha', pagina: 1 }) },
    }));
    await act(async () => { await result.current.cargarMas(); });
    expect(get).toHaveBeenLastCalledWith('/transacciones', expect.objectContaining({
      params: { query: expect.objectContaining({ orden: 'fecha', pagina: 2 }) },
    }));
  });

  it('cambiar de orden recarga y vacía la lista', async () => {
    get.mockClear();
    soltarFecha = null;
    bloquear = true;
    const { result, rerender } = renderHook(
      ({ o }: { o: OrdenVista }) => useDatosPeriodo({ clave: 'este_mes' }, 'gasto', o),
      { initialProps: { o: 'reciente' as OrdenVista } },
    );
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['reciente-1']));
    rerender({ o: 'fecha' });
    await waitFor(() => expect(soltarFecha).not.toBeNull());
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    await act(async () => { soltarFecha!({ data: { items: [tx('f1')], total: 1 } }); });
    expect(result.current.items.map((i) => i.id)).toEqual(['f1']);
  });
});
