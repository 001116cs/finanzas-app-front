import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));

const resumenDe = (d: string, h: string) => ({
  desde: d, hasta: h, moneda: 'PEN', totalGastos: '0.00', totalIngresos: '0.00', balance: '0.00', porCategoria: [],
});
const tx = (id: string) => ({
  id, tipo: 'gasto', monto: '1.00', fecha: '2026-11-01', descripcion: id,
  categoriaId: null, categoriaNombre: null, origen: 'manual', createdAt: 'x',
});
let pendiente: ((v: unknown) => void) | null = null;
const get = vi.fn((ruta: string, opts: { params: { query: Record<string, unknown> } }) => {
  const q = opts.params.query;
  if (ruta === '/resumen') {
    return Promise.resolve({ data: q.desde ? resumenDe(q.desde as string, q.hasta as string) : resumenDe('2026-11-01', '2026-11-30') });
  }
  if (q.pagina === 2) return new Promise((res) => { pendiente = res; });
  return Promise.resolve({ data: { items: [tx(`p1-${q.desde}`)], total: 40 } });
});
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get }),
}));

import type { Periodo } from './periodos';
import { useDatosPeriodo } from './usar-datos-periodo';

describe('useDatosPeriodo: cargarMas obsoleto', () => {
  it('descarta la página 2 si el período cambió antes de que responda', async () => {
    const { result, rerender } = renderHook(({ p }: { p: Periodo }) => useDatosPeriodo(p), {
      initialProps: { p: { clave: 'este_mes' } as Periodo },
    });
    await waitFor(() => expect(result.current.resumen).not.toBeNull());
    act(() => { void result.current.cargarMas(); });
    await waitFor(() => expect(pendiente).not.toBeNull());
    rerender({ p: { clave: 'rango', desde: '2026-01-01', hasta: '2026-01-31' } });
    await waitFor(() => expect(result.current.resumen?.desde).toBe('2026-01-01'));
    await act(async () => { pendiente!({ data: { items: [tx('viejo-p2')], total: 99 } }); });
    expect(result.current.items.map((i) => i.id)).toEqual(['p1-2026-01-01']);
    expect(result.current.total).toBe(40);
  });
});
