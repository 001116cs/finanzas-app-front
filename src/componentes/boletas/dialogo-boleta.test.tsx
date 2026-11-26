import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const get = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get, DELETE: del }),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { DialogoBoleta } from './dialogo-boleta';

const boleta = {
  id: 'b1',
  comercio: 'Supermercado Sol',
  fecha: '2026-11-19',
  totalImpreso: '23.40',
  createdAt: '2026-11-19T10:00:00Z',
};
const crearUrl = vi.fn();
const revocarUrl = vi.fn();

function montar(abierto = true) {
  const onCerrar = vi.fn();
  const onEliminada = vi.fn();
  const vista = render(
    <DialogoBoleta boletaId="b1" abierto={abierto} onCerrar={onCerrar} onEliminada={onEliminada} />,
  );
  return { onCerrar, onEliminada, ...vista };
}

describe('DialogoBoleta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = crearUrl;
    URL.revokeObjectURL = revocarUrl;
    crearUrl.mockReturnValue('blob:boleta-1');
    get.mockImplementation(async (ruta: string) =>
      ruta === '/boletas/{id}' ? { data: boleta } : { data: new Blob(['x'], { type: 'image/jpeg' }) },
    );
    del.mockResolvedValue({});
  });

  it('muestra el comercio, el total y la imagen', async () => {
    montar();
    expect(await screen.findByText('Supermercado Sol')).toBeInTheDocument();
    expect(screen.getByText(/23\.40/)).toBeInTheDocument();
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'blob:boleta-1');
  });

  it('eliminar pide confirmación y al confirmar llama a DELETE y onEliminada', async () => {
    const { onEliminada } = montar();
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: mensajes.boletas.eliminar }));
    expect(screen.getByText(mensajes.boletas.confirmarEliminar)).toBeInTheDocument();
    expect(del).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: mensajes.acciones.eliminar }));
    await waitFor(() => expect(onEliminada).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith('/boletas/{id}', { params: { path: { id: 'b1' } } });
  });

  it('revoca la URL al desmontar', async () => {
    const { unmount } = montar();
    await screen.findByRole('img');
    unmount();
    expect(revocarUrl).toHaveBeenCalledWith('blob:boleta-1');
  });

  it('revoca la URL al cerrarse', async () => {
    const { rerender, onCerrar, onEliminada } = montar();
    await screen.findByRole('img');
    rerender(
      <DialogoBoleta boletaId="b1" abierto={false} onCerrar={onCerrar} onEliminada={onEliminada} />,
    );
    expect(revocarUrl).toHaveBeenCalledWith('blob:boleta-1');
  });

  it('un error de carga se muestra en role="alert"', async () => {
    get.mockRejectedValue(new ErrorApi(500, 'x'));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent(mensajes.errores.generico);
  });
});
