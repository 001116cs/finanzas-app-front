import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const apiFalsa = {};
vi.mock('@/lib/api/usar-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/usar-api')>()),
  useApi: () => apiFalsa,
}));
const listar = vi.fn();
vi.mock('@/lib/api/boletas', () => ({
  listarBoletas: (...a: unknown[]) => listar(...a),
  obtenerImagenBoleta: () => new Promise(() => {}),
}));

import type { ResumenBoleta } from '@/lib/api/boletas';
import { GaleriaBoletas } from './galeria-boletas';

const b = (id: string, comercio: string): ResumenBoleta => ({
  id,
  comercio,
  fecha: '2026-11-20',
  totalImpreso: '10.00',
  gastos: 1,
  sumaGastos: '10.00',
  createdAt: '2026-11-20T10:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe('GaleriaBoletas', () => {
  it('renderiza la página 1 y "Cargar más" añade la página 2', async () => {
    listar
      .mockResolvedValueOnce({ items: [b('1', 'Uno'), b('2', 'Dos')], total: 3 })
      .mockResolvedValueOnce({ items: [b('3', 'Tres')], total: 3 });
    render(<GaleriaBoletas />);
    expect(screen.getByText(mensajes.boletas.galeria.cargando)).toBeInTheDocument();
    expect(await screen.findByText('Uno')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledWith(expect.anything(), 1);
    await userEvent.click(screen.getByRole('button', { name: mensajes.boletas.galeria.cargarMas }));
    expect(await screen.findByText('Tres')).toBeInTheDocument();
    expect(listar).toHaveBeenLastCalledWith(expect.anything(), 2);
    expect(screen.getByText('Uno')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: mensajes.boletas.galeria.cargarMas })).toBeNull();
  });

  it('sin items muestra el texto vacío', async () => {
    listar.mockResolvedValue({ items: [], total: 0 });
    render(<GaleriaBoletas />);
    expect(await screen.findByText(mensajes.boletas.galeria.vacia)).toBeInTheDocument();
  });

  it('error → role=alert', async () => {
    listar.mockRejectedValue(new Error('boom'));
    render(<GaleriaBoletas />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
