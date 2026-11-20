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
const post = vi.fn();
const patch = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get, POST: post, PATCH: patch, DELETE: vi.fn() }),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { GestorCategorias } from './gestor-categorias';

const lista = [
  { id: 'g1', nombre: 'Comida', tipo: 'gasto', cantidadMovimientos: 2 },
  { id: 'i1', nombre: 'Sueldo', tipo: 'ingreso', cantidadMovimientos: 0 },
];

describe('GestorCategorias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: lista });
  });

  it('muestra por pestaña las categorías con su conteo', async () => {
    render(<GestorCategorias />);
    expect(await screen.findByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('2 movimientos')).toBeInTheDocument();
    expect(screen.queryByText('Sueldo')).toBeNull();
    await userEvent.setup().click(screen.getByRole('tab', { name: mensajes.categorias.ingresos }));
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
  });

  it('crear con nombre duplicado muestra el mensaje de CATEGORIA_DUPLICADA', async () => {
    post.mockRejectedValue(new ErrorApi(409, 'x', 'CATEGORIA_DUPLICADA'));
    render(<GestorCategorias />);
    await screen.findByText('Comida');
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(mensajes.categorias.nombreNueva), 'comida');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.agregar }));
    expect(await screen.findByText(mensajes.errores.CATEGORIA_DUPLICADA)).toBeInTheDocument();
  });

  it('crear envía nombre y tipo, y vuelve a cargar la lista', async () => {
    post.mockResolvedValue({ data: {} });
    render(<GestorCategorias />);
    await screen.findByText('Comida');
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(mensajes.categorias.nombreNueva), ' Cine ');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.agregar }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(post).toHaveBeenCalledWith('/categorias', { body: { nombre: 'Cine', tipo: 'gasto' } });
  });

  it('renombrar inline envía PATCH', async () => {
    patch.mockResolvedValue({ data: {} });
    render(<GestorCategorias />);
    await screen.findByText('Comida');
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: mensajes.categorias.renombrar }));
    const campo = screen.getByLabelText(mensajes.categorias.nombre);
    await u.clear(campo);
    await u.type(campo, 'Alimentos');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/categorias/{id}', {
        params: { path: { id: 'g1' } },
        body: { nombre: 'Alimentos' },
      }),
    );
  });

  it('Escape cancela el renombrado', async () => {
    render(<GestorCategorias />);
    await screen.findByText('Comida');
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: mensajes.categorias.renombrar }));
    await u.type(screen.getByLabelText(mensajes.categorias.nombre), '{Escape}');
    expect(screen.queryByLabelText(mensajes.categorias.nombre)).toBeNull();
    expect(patch).not.toHaveBeenCalled();
  });

  it('renombrar con nombre duplicado muestra el mensaje y mantiene la edición', async () => {
    patch.mockRejectedValue(new ErrorApi(409, 'x', 'CATEGORIA_DUPLICADA'));
    render(<GestorCategorias />);
    await screen.findByText('Comida');
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: mensajes.categorias.renombrar }));
    await u.type(screen.getByLabelText(mensajes.categorias.nombre), 'x');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    expect(await screen.findByText(mensajes.errores.CATEGORIA_DUPLICADA)).toBeInTheDocument();
    expect(screen.getByLabelText(mensajes.categorias.nombre)).toBeInTheDocument();
  });

  it('si falla la carga muestra reintentar, no el mensaje de vacío, y reintenta', async () => {
    get.mockRejectedValueOnce(new ErrorApi(500, 'x'));
    render(<GestorCategorias />);
    expect(await screen.findByText(mensajes.errores.generico)).toBeInTheDocument();
    expect(screen.queryByText(mensajes.categorias.vacia)).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: mensajes.errores.reintentar }));
    expect(await screen.findByText('Comida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: mensajes.errores.reintentar })).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('pestañas: panel enlazado, ArrowRight cambia de pestaña y tabIndex rodante', async () => {
    render(<GestorCategorias />);
    await screen.findByText('Comida');
    const gastos = screen.getByRole('tab', { name: mensajes.categorias.gastos });
    const ingresos = screen.getByRole('tab', { name: mensajes.categorias.ingresos });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', gastos.id);
    expect(gastos).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(gastos).toHaveAttribute('tabindex', '0');
    expect(ingresos).toHaveAttribute('tabindex', '-1');
    gastos.focus();
    await userEvent.setup().keyboard('{ArrowRight}');
    expect(ingresos).toHaveAttribute('aria-selected', 'true');
    expect(ingresos).toHaveFocus();
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
  });
});
