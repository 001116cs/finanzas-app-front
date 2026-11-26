import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const api = {};
vi.mock('@/lib/api/usar-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/usar-api')>()),
  useApi: () => api,
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
vi.mock('@/componentes/boton-nuevo', () => ({
  PanelMovimiento: ({ abierto, inicial }: { abierto: boolean; inicial?: { descripcion: string } }) =>
    abierto ? <div data-testid="panel">{inicial?.descripcion}</div> : null,
}));
vi.mock('@/lib/api/boletas', () => ({
  obtenerBoleta: vi.fn(),
  obtenerImagenBoleta: vi.fn(),
  editarBoleta: vi.fn(),
  agregarGastoBoleta: vi.fn(),
  eliminarBoleta: vi.fn(),
}));

import * as b from '@/lib/api/boletas';
import { ErrorApi } from '@/lib/api/cliente';
import { DetalleBoleta } from './detalle-boleta';

const gasto = {
  id: 'g1',
  descripcion: 'Leche',
  monto: '2.50',
  fecha: '2026-11-19',
  tipo: 'gasto',
  categoriaId: null,
  categoriaNombre: null,
};
const boleta = {
  id: 'b1',
  comercio: 'Supermercado Sol',
  fecha: '2026-11-19',
  totalImpreso: '23.40',
  createdAt: '2026-11-19T10:00:00Z',
  gastos: [gasto],
};
const crearUrl = vi.fn();
const revocarUrl = vi.fn();

describe('DetalleBoleta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = crearUrl;
    URL.revokeObjectURL = revocarUrl;
    crearUrl.mockReturnValue('blob:b1');
    vi.mocked(b.obtenerBoleta).mockResolvedValue(boleta as never);
    vi.mocked(b.obtenerImagenBoleta).mockResolvedValue(new Blob(['x']));
    vi.mocked(b.agregarGastoBoleta).mockResolvedValue(gasto as never);
    vi.mocked(b.eliminarBoleta).mockResolvedValue(undefined);
  });

  it('muestra comercio, foto y gastos', async () => {
    render(<DetalleBoleta id="b1" />);
    expect(await screen.findByDisplayValue('Supermercado Sol')).toBeInTheDocument();
    expect(await screen.findByAltText(mensajes.boletas.fotoAlt)).toHaveAttribute('src', 'blob:b1');
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Leche.*Sin categoría/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mensajes.boletas.detalle.volver })).toHaveAttribute(
      'href',
      '/boletas',
    );
  });

  it('pulsar un gasto abre el panel con ese gasto', async () => {
    render(<DetalleBoleta id="b1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Leche/ }));
    expect(screen.getByTestId('panel')).toHaveTextContent('Leche');
  });

  it('añade un gasto y recarga', async () => {
    render(<DetalleBoleta id="b1" />);
    await screen.findByText('Leche');
    const d = mensajes.boletas.detalle;
    await userEvent.type(screen.getByLabelText(d.descripcion), 'Pan');
    await userEvent.type(screen.getByLabelText(d.monto), '1,5');
    await userEvent.selectOptions(screen.getByLabelText(d.categoria), 'c1');
    await userEvent.click(screen.getByRole('button', { name: d.agregar }));
    await waitFor(() =>
      expect(b.agregarGastoBoleta).toHaveBeenCalledWith(api, 'b1', {
        descripcion: 'Pan',
        monto: '1.50',
        categoriaId: 'c1',
      }),
    );
    await waitFor(() => expect(b.obtenerBoleta).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText(d.descripcion)).toHaveValue('');
  });

  it('elimina tras confirmar', async () => {
    render(<DetalleBoleta id="b1" />);
    await screen.findByText('Leche');
    await userEvent.click(screen.getByRole('button', { name: mensajes.boletas.eliminar }));
    expect(b.eliminarBoleta).not.toHaveBeenCalled();
    expect(await screen.findByText(mensajes.boletas.confirmarEliminar)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: mensajes.acciones.eliminar }));
    await waitFor(() => expect(b.eliminarBoleta).toHaveBeenCalledWith(api, 'b1'));
    expect(push).toHaveBeenCalledWith('/boletas');
  });

  it('error de carga muestra alerta y el enlace de volver', async () => {
    vi.mocked(b.obtenerBoleta).mockRejectedValue(new Error('404'));
    render(<DetalleBoleta id="b1" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mensajes.boletas.detalle.volver })).toBeInTheDocument();
  });

  it('revoca la URL al desmontar', async () => {
    const { unmount } = render(<DetalleBoleta id="b1" />);
    await screen.findByAltText(mensajes.boletas.fotoAlt);
    unmount();
    expect(revocarUrl).toHaveBeenCalledWith('blob:b1');
  });

  it('si la imagen falla, se ve el detalle y se puede eliminar', async () => {
    vi.mocked(b.obtenerImagenBoleta).mockRejectedValue(new Error('img'));
    render(<DetalleBoleta id="b1" />);
    expect(await screen.findByDisplayValue('Supermercado Sol')).toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.boletas.eliminar })).toBeInTheDocument();
    expect(screen.queryByAltText(mensajes.boletas.fotoAlt)).not.toBeInTheDocument();
  });

  it('recargar no vuelve a pedir la imagen', async () => {
    render(<DetalleBoleta id="b1" />);
    await screen.findByAltText(mensajes.boletas.fotoAlt);
    await userEvent.type(screen.getByLabelText(mensajes.boletas.detalle.descripcion), 'Pan');
    await userEvent.type(screen.getByLabelText(mensajes.boletas.detalle.monto), '1.5');
    await userEvent.click(screen.getByRole('button', { name: mensajes.boletas.detalle.agregar }));
    await waitFor(() => expect(b.obtenerBoleta).toHaveBeenCalledTimes(2));
    expect(b.obtenerImagenBoleta).toHaveBeenCalledTimes(1);
  });

  it('el aviso de cambios guardados sobrevive a la recarga', async () => {
    vi.mocked(b.editarBoleta).mockResolvedValue(undefined as never);
    render(<DetalleBoleta id="b1" />);
    const campo = await screen.findByDisplayValue('Supermercado Sol');
    await userEvent.type(campo, 'X');
    vi.mocked(b.obtenerBoleta).mockResolvedValue({ ...boleta, comercio: 'Supermercado SolX' } as never);
    await userEvent.click(screen.getByRole('button', { name: mensajes.boletas.detalle.guardarCambios }));
    await screen.findByDisplayValue('Supermercado SolX');
    expect(await screen.findByRole('status')).toHaveTextContent(mensajes.boletas.detalle.cambiosGuardados);
  });

  it('si la recarga devuelve 404, vuelve a la galería', async () => {
    render(<DetalleBoleta id="b1" />);
    await screen.findByDisplayValue('Supermercado Sol');
    vi.mocked(b.obtenerBoleta).mockRejectedValue(new ErrorApi(404, 'no existe'));
    await userEvent.type(screen.getByLabelText(mensajes.boletas.detalle.descripcion), 'Pan');
    await userEvent.type(screen.getByLabelText(mensajes.boletas.detalle.monto), '1.5');
    await userEvent.click(screen.getByRole('button', { name: mensajes.boletas.detalle.agregar }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/boletas'));
  });
});
