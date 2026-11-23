import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ POST: post, PATCH: patch, DELETE: del }),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { FormularioMovimiento } from './formulario-movimiento';

const categorias = [
  { id: 'g1', nombre: 'Comida', tipo: 'gasto' as const, cantidadMovimientos: 0 },
  { id: 'g2', nombre: 'Hogar', tipo: 'gasto' as const, cantidadMovimientos: 0 },
  { id: 'i1', nombre: 'Sueldo', tipo: 'ingreso' as const, cantidadMovimientos: 0 },
];

describe('FormularioMovimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 19, 12) });
  });
  afterEach(() => vi.useRealTimers());

  it('la fecha por defecto es hoy', () => {
    render(<FormularioMovimiento categorias={categorias} onGuardado={vi.fn()} />);
    expect(screen.getByLabelText(mensajes.movimiento.fecha)).toHaveValue('2026-11-19');
  });

  it('al cambiar el tipo ofrece sólo categorías de ese tipo y limpia la elegida', async () => {
    render(<FormularioMovimiento categorias={categorias} onGuardado={vi.fn()} />);
    const u = userEvent.setup({ advanceTimers: () => {} });
    const cat = screen.getByLabelText(mensajes.movimiento.categoria);
    expect(within(cat).queryByRole('option', { name: 'Sueldo' })).toBeNull();
    await u.selectOptions(cat, 'g1');
    expect(cat).toHaveValue('g1');
    await u.selectOptions(screen.getByLabelText(mensajes.movimiento.tipo), 'ingreso');
    expect(cat).toHaveValue('');
    expect(within(cat).getByRole('option', { name: 'Sueldo' })).toBeInTheDocument();
    expect(within(cat).queryByRole('option', { name: 'Comida' })).toBeNull();
  });

  it('con monto inválido deshabilita el botón y muestra mensaje', async () => {
    render(<FormularioMovimiento categorias={categorias} onGuardado={vi.fn()} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(mensajes.movimiento.descripcion), 'Café');
    await u.type(screen.getByLabelText(mensajes.movimiento.monto), 'abc');
    expect(screen.getByText(mensajes.movimiento.montoInvalido)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.acciones.guardar })).toBeDisabled();
  });

  it('con "12,5" envía monto "12.50"', async () => {
    post.mockResolvedValue({ data: {} });
    const onGuardado = vi.fn();
    render(<FormularioMovimiento categorias={categorias} onGuardado={onGuardado} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(mensajes.movimiento.monto), '12,5');
    await u.type(screen.getByLabelText(mensajes.movimiento.descripcion), 'Almuerzo');
    await u.selectOptions(screen.getByLabelText(mensajes.movimiento.categoria), 'g1');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/transacciones', {
      body: {
        tipo: 'gasto',
        monto: '12.50',
        fecha: '2026-11-19',
        descripcion: 'Almuerzo',
        categoriaId: 'g1',
      },
    });
  });

  it('muestra el mensaje en español de un error de la API', async () => {
    post.mockRejectedValue(new ErrorApi(400, 'x', 'CATEGORIA_INCOMPATIBLE'));
    const onGuardado = vi.fn();
    render(<FormularioMovimiento categorias={categorias} onGuardado={onGuardado} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(mensajes.movimiento.monto), '5');
    await u.type(screen.getByLabelText(mensajes.movimiento.descripcion), 'x');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    expect(await screen.findByText(mensajes.errores.CATEGORIA_INCOMPATIBLE)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
  });

  describe('edición', () => {
    const inicial = {
      id: 't1',
      tipo: 'ingreso' as const,
      monto: '100.00',
      fecha: '2026-11-05',
      descripcion: 'Pago',
      categoriaId: 'i1',
      categoriaNombre: 'Sueldo',
      origen: 'manual' as const,
      createdAt: '2026-11-05T10:00:00Z',
    };

    it('precarga los valores y guarda con PATCH', async () => {
      patch.mockResolvedValue({ data: {} });
      const onGuardado = vi.fn();
      render(<FormularioMovimiento categorias={categorias} inicial={inicial} onGuardado={onGuardado} />);
      expect(screen.getByLabelText(mensajes.movimiento.tipo)).toHaveValue('ingreso');
      expect(screen.getByLabelText(mensajes.movimiento.monto)).toHaveValue('100.00');
      expect(screen.getByLabelText(mensajes.movimiento.fecha)).toHaveValue('2026-11-05');
      expect(screen.getByLabelText(mensajes.movimiento.descripcion)).toHaveValue('Pago');
      expect(screen.getByLabelText(mensajes.movimiento.categoria)).toHaveValue('i1');
      await userEvent.setup().click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
      await waitFor(() => expect(onGuardado).toHaveBeenCalled());
      expect(patch).toHaveBeenCalledWith('/transacciones/{id}', {
        params: { path: { id: 't1' } },
        body: {
          tipo: 'ingreso',
          monto: '100.00',
          fecha: '2026-11-05',
          descripcion: 'Pago',
          categoriaId: 'i1',
        },
      });
    });

    it('no pierde la categoría si las categorías no están cargadas', async () => {
      patch.mockResolvedValue({ data: {} });
      const onGuardado = vi.fn();
      render(<FormularioMovimiento categorias={[]} inicial={inicial} onGuardado={onGuardado} />);
      await userEvent.setup().click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
      await waitFor(() => expect(onGuardado).toHaveBeenCalled());
      expect(patch.mock.calls[0][1].body.categoriaId).toBe('i1');
    });

    it('Eliminar pide confirmación y luego borra', async () => {
      del.mockResolvedValue({ data: undefined });
      const onGuardado = vi.fn();
      render(<FormularioMovimiento categorias={categorias} inicial={inicial} onGuardado={onGuardado} />);
      const u = userEvent.setup();
      await u.click(screen.getByRole('button', { name: mensajes.acciones.eliminar }));
      expect(del).not.toHaveBeenCalled();
      expect(await screen.findByText(mensajes.movimiento.confirmarTitulo)).toBeInTheDocument();
      const dialogo = screen.getByRole('alertdialog');
      await u.click(within(dialogo).getByRole('button', { name: mensajes.acciones.eliminar }));
      await waitFor(() => expect(del).toHaveBeenCalledWith('/transacciones/{id}', {
        params: { path: { id: 't1' } },
      }));
      await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    });

    it('en modo creación no hay botón Eliminar', () => {
      render(<FormularioMovimiento categorias={categorias} onGuardado={vi.fn()} />);
      expect(screen.queryByRole('button', { name: mensajes.acciones.eliminar })).toBeNull();
    });
  });

  it('sin movimiento previo empieza con el tipo indicado por tipoInicial', () => {
    render(<FormularioMovimiento categorias={categorias} tipoInicial="ingreso" onGuardado={vi.fn()} />);
    expect(screen.getByLabelText(mensajes.movimiento.tipo)).toHaveValue('ingreso');
  });

  it('al editar usa el tipo del movimiento aunque tipoInicial diga otro', () => {
    const existente = {
      id: 'x1', tipo: 'gasto' as const, monto: '5.00', fecha: '2026-11-10', descripcion: 'pan',
      categoriaId: 'g1', categoriaNombre: 'Comida', origen: 'manual' as const, createdAt: '2026-11-10T00:00:00Z',
    };
    render(
      <FormularioMovimiento categorias={categorias} inicial={existente} tipoInicial="ingreso" onGuardado={vi.fn()} />,
    );
    expect(screen.getByLabelText(mensajes.movimiento.tipo)).toHaveValue('gasto');
  });
});

