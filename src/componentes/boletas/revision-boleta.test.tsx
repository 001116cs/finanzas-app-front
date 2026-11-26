import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const post = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: vi.fn(), POST: post }),
}));
vi.mock('@/lib/usar-datos-periodo', () => ({
  useCategorias: () => ({
    categorias: [
      { id: 'c1', nombre: 'Comida', tipo: 'gasto', cantidadMovimientos: 0 },
      { id: 'c2', nombre: 'Sueldo', tipo: 'ingreso', cantidadMovimientos: 0 },
    ],
    cargadas: true,
    error: null,
    recargar: vi.fn(),
  }),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { RevisionBoleta } from './revision-boleta';

const lectura = {
  comercio: 'Super',
  fecha: '2026-11-20',
  totalImpreso: '10.00',
  productos: [
    { descripcion: 'Pan', monto: '4.50', categoriaId: 'c1' },
    { descripcion: 'Descuento', monto: '-3.00', categoriaId: null },
    { descripcion: 'Leche', monto: '5.00', categoriaId: null },
  ],
};
const imagen = new Blob(['x'], { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:foto');
  URL.revokeObjectURL = vi.fn();
  post.mockResolvedValue({ data: { id: 'b1', gastosCreados: 2 } });
});

const montar = (onGuardada = vi.fn(), onCancelar = vi.fn()) =>
  render(
    <RevisionBoleta lectura={lectura} imagen={imagen} onGuardada={onGuardada} onCancelar={onCancelar} />,
  );

describe('RevisionBoleta', () => {
  it('renderiza las filas de la lectura', () => {
    montar();
    expect(screen.getAllByRole('checkbox', { name: mensajes.boletas.incluir })).toHaveLength(3);
    expect(screen.getByDisplayValue('Pan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Super')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-11-20')).toBeInTheDocument();
  });

  it('muestra el aviso de diferencia cuando no cuadra', () => {
    montar();
    // incluidas: 4.50 + (-3.00 inválido) + 5.00 = 9.50 vs 10.00
    expect(screen.getByText(/no coincide con el total impreso/)).toBeInTheDocument();
  });

  it('deshabilita guardar con una fila negativa incluida y habilita al desmarcarla', async () => {
    const user = userEvent.setup();
    montar();
    const guardar = screen.getByRole('button', { name: mensajes.boletas.guardar });
    expect(guardar).toBeDisabled();
    expect(screen.getByText(mensajes.boletas.montosNegativos)).toBeInTheDocument();
    expect(screen.getByDisplayValue('-3.00')).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getAllByRole('checkbox', { name: mensajes.boletas.incluir })[1]);
    expect(guardar).toBeEnabled();
    expect(screen.queryByText(mensajes.boletas.montosNegativos)).not.toBeInTheDocument();
  });

  it('al guardar envía sólo las filas marcadas y llama a onGuardada', async () => {
    const user = userEvent.setup();
    const onGuardada = vi.fn();
    montar(onGuardada);
    await user.click(screen.getAllByRole('checkbox', { name: mensajes.boletas.incluir })[1]);
    await user.click(screen.getByRole('button', { name: mensajes.boletas.guardar }));
    await waitFor(() => expect(onGuardada).toHaveBeenCalled());
    const form = post.mock.calls[0][1].bodySerializer() as FormData;
    expect(JSON.parse(form.get('datos') as string)).toEqual({
      comercio: 'Super',
      fecha: '2026-11-20',
      totalImpreso: '10.00',
      productos: [
        { descripcion: 'Pan', monto: '4.50', categoriaId: 'c1' },
        { descripcion: 'Leche', monto: '5.00', categoriaId: null },
      ],
    });
  });

  it('error 400 muestra el mensaje en role=alert y no llama a onGuardada', async () => {
    const user = userEvent.setup();
    post.mockRejectedValue(new ErrorApi(400, 'x', 'PRODUCTOS_INVALIDOS'));
    const onGuardada = vi.fn();
    montar(onGuardada);
    await user.click(screen.getAllByRole('checkbox', { name: mensajes.boletas.incluir })[1]);
    await user.click(screen.getByRole('button', { name: mensajes.boletas.guardar }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensajes.errores.PRODUCTOS_INVALIDOS);
    expect(onGuardada).not.toHaveBeenCalled();
  });

  it('agrega y quita filas, y cancelar llama a onCancelar', async () => {
    const user = userEvent.setup();
    const onCancelar = vi.fn();
    montar(vi.fn(), onCancelar);
    await user.click(screen.getByRole('button', { name: mensajes.boletas.agregarProducto }));
    expect(screen.getAllByRole('checkbox', { name: mensajes.boletas.incluir })).toHaveLength(4);
    await user.click(screen.getAllByRole('button', { name: mensajes.boletas.quitar })[0]);
    expect(screen.getAllByRole('checkbox', { name: mensajes.boletas.incluir })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: mensajes.acciones.cancelar }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
