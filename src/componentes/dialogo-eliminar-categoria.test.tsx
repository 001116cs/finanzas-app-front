import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const del = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ DELETE: del }),
}));

import { DialogoEliminarCategoria } from './dialogo-eliminar-categoria';

const todas = [
  { id: 'g1', nombre: 'Comida', tipo: 'gasto' as const, cantidadMovimientos: 3 },
  { id: 'g2', nombre: 'Hogar', tipo: 'gasto' as const, cantidadMovimientos: 0 },
  { id: 'i1', nombre: 'Sueldo', tipo: 'ingreso' as const, cantidadMovimientos: 0 },
];

function abrir(categoria = todas[0]) {
  const onEliminada = vi.fn();
  render(
    <DialogoEliminarCategoria
      categoria={categoria}
      categorias={todas}
      onEliminada={onEliminada}
      onCerrar={vi.fn()}
    />,
  );
  return onEliminada;
}
const eliminarBtn = () => screen.getByRole('button', { name: mensajes.acciones.eliminar });

describe('DialogoEliminarCategoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    del.mockResolvedValue({});
  });

  it('sin movimientos sólo confirma y llama a DELETE sin modo', async () => {
    const onEliminada = abrir(todas[1]);
    expect(screen.getByText(mensajes.categorias.confirmarSimple)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
    await userEvent.setup().click(eliminarBtn());
    await waitFor(() => expect(onEliminada).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith('/categorias/{id}', {
      params: { path: { id: 'g2' }, query: {} },
    });
  });

  it('con 3 movimientos muestra el conteo y las tres opciones', () => {
    abrir();
    expect(screen.getByText('Esta categoría tiene 3 movimientos')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByLabelText(mensajes.categorias.modoEliminar)).toBeInTheDocument();
    expect(screen.getByLabelText(mensajes.categorias.modoConservar)).toBeInTheDocument();
    expect(screen.getByLabelText(mensajes.categorias.modoMover)).toBeInTheDocument();
  });

  it('mover: select del mismo tipo sin ella misma; confirmar deshabilitado hasta elegir', async () => {
    abrir();
    const u = userEvent.setup();
    await u.click(screen.getByLabelText(mensajes.categorias.modoMover));
    const sel = screen.getByLabelText(mensajes.categorias.destino);
    expect(within(sel).getByRole('option', { name: 'Hogar' })).toBeInTheDocument();
    expect(within(sel).queryByRole('option', { name: 'Comida' })).toBeNull();
    expect(within(sel).queryByRole('option', { name: 'Sueldo' })).toBeNull();
    expect(eliminarBtn()).toBeDisabled();
    await u.selectOptions(sel, 'g2');
    expect(eliminarBtn()).toBeEnabled();
    await u.click(eliminarBtn());
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('/categorias/{id}', {
        params: { path: { id: 'g1' }, query: { modo: 'mover', destinoId: 'g2' } },
      }),
    );
  });

  it('eliminar todos pide segunda confirmación antes de llamar', async () => {
    const onEliminada = abrir();
    const u = userEvent.setup();
    await u.click(screen.getByLabelText(mensajes.categorias.modoEliminar));
    await u.click(eliminarBtn());
    expect(
      screen.getByText('Se eliminarán 3 movimientos. Esta acción no se puede deshacer'),
    ).toBeInTheDocument();
    expect(del).not.toHaveBeenCalled();
    await u.click(eliminarBtn());
    await waitFor(() => expect(onEliminada).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith('/categorias/{id}', {
      params: { path: { id: 'g1' }, query: { modo: 'eliminar_movimientos' } },
    });
  });

  it('conservar sin categoría llama con ese modo', async () => {
    abrir();
    const u = userEvent.setup();
    await u.click(screen.getByLabelText(mensajes.categorias.modoConservar));
    await u.click(eliminarBtn());
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('/categorias/{id}', {
        params: { path: { id: 'g1' }, query: { modo: 'conservar_sin_categoria' } },
      }),
    );
  });
});
