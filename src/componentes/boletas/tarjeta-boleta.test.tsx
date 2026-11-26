import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFalsa = {};
vi.mock('@/lib/api/usar-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/usar-api')>()),
  useApi: () => apiFalsa,
}));
const obtenerImagen = vi.fn();
vi.mock('@/lib/api/boletas', () => ({
  obtenerImagenBoleta: (...a: unknown[]) => obtenerImagen(...a),
}));

import type { ResumenBoleta } from '@/lib/api/boletas';
import { TarjetaBoleta } from './tarjeta-boleta';

let disparar: () => void = () => {};
class FalsoObserver {
  constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {
    disparar = () => this.cb([{ isIntersecting: true }]);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const boleta: ResumenBoleta = {
  id: 'b1',
  comercio: 'Super',
  fecha: '2026-11-20',
  totalImpreso: '12.5',
  gastos: 3,
  sumaGastos: '9.00',
  createdAt: '2026-11-20T10:00:00Z',
};

const crear = vi.fn();
const revocar = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', FalsoObserver);
  crear.mockReturnValue('blob:miniatura');
  Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar });
  obtenerImagen.mockResolvedValue(new Blob(['x']));
});
afterEach(() => vi.unstubAllGlobals());

describe('TarjetaBoleta', () => {
  it('enlaza al detalle y muestra datos', () => {
    render(<TarjetaBoleta boleta={boleta} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/boletas/b1');
    expect(screen.getByText('Super')).toBeInTheDocument();
    expect(screen.getByText('12.50')).toBeInTheDocument();
    expect(screen.getByText('3 gastos')).toBeInTheDocument();
  });

  it('no pide la imagen hasta que es visible; luego muestra la URL y la revoca al desmontar', async () => {
    const { unmount } = render(<TarjetaBoleta boleta={boleta} />);
    expect(obtenerImagen).not.toHaveBeenCalled();
    act(() => disparar());
    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:miniatura'));
    expect(obtenerImagen).toHaveBeenCalledTimes(1);
    unmount();
    expect(revocar).toHaveBeenCalledWith('blob:miniatura');
  });

  it('muestra sumaGastos si totalImpreso es null', () => {
    render(<TarjetaBoleta boleta={{ ...boleta, totalImpreso: null }} />);
    expect(screen.getByText('9.00')).toBeInTheDocument();
  });
});
