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
const tx = (id: string, tipo: string) => ({
  id, tipo, monto: '1.00', fecha: '2026-11-01', descripcion: id,
  categoriaId: null, categoriaNombre: null, origen: 'manual', createdAt: 'x',
});
let soltarIngresos: ((v: unknown) => void) | null = null;
const get = vi.fn((ruta: string, opts: { params: { query: Record<string, unknown> } }) => {
  if (ruta === '/resumen') return Promise.resolve({ data: resumen });
  if (opts.params.query.tipo === 'ingreso') return new Promise((res) => { soltarIngresos = res; });
  return Promise.resolve({ data: { items: [tx('g1', 'gasto')], total: 60 } });
});
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get }),
}));

import type { TipoVista } from './tipo-vista';
import { useDatosPeriodo } from './usar-datos-periodo';

describe('useDatosPeriodo: al cambiar el tipo', () => {
  it('no deja visibles los movimientos del tipo anterior mientras carga el nuevo', async () => {
    const { result, rerender } = renderHook(
      ({ t }: { t: TipoVista }) => useDatosPeriodo({ clave: 'este_mes' }, t),
      { initialProps: { t: 'gasto' as TipoVista } },
    );
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['g1']));
    rerender({ t: 'ingreso' });
    await waitFor(() => expect(soltarIngresos).not.toBeNull());
    expect(result.current.cargando).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    await act(async () => { soltarIngresos!({ data: { items: [tx('i1', 'ingreso')], total: 1 } }); });
    expect(result.current.items.map((i) => i.id)).toEqual(['i1']);
  });

  it('refrescar (mismo período y tipo) conserva la lista mientras recarga', async () => {
    const { result } = renderHook(() => useDatosPeriodo({ clave: 'este_mes' }, 'gasto'));
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['g1']));
    act(() => result.current.refrescar());
    expect(result.current.items.map((i) => i.id)).toEqual(['g1']);
  });

  it('cargarMas no hace nada mientras carga', async () => {
    const { result, rerender } = renderHook(
      ({ t }: { t: TipoVista }) => useDatosPeriodo({ clave: 'este_mes' }, t),
      { initialProps: { t: 'gasto' as TipoVista } },
    );
    await waitFor(() => expect(result.current.cargando).toBe(false));
    rerender({ t: 'ingreso' });
    await waitFor(() => expect(result.current.cargando).toBe(true));
    const llamadas = get.mock.calls.length;
    await act(async () => { await result.current.cargarMas(); });
    expect(get.mock.calls.length).toBe(llamadas);
  });
});
