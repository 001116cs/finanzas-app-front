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
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get, POST: post }),
}));
const reducir = vi.fn();
vi.mock('@/lib/boletas/reducir-imagen', async (orig) => ({
  ...(await orig<typeof import('@/lib/boletas/reducir-imagen')>()),
  reducirImagen: (f: File) => reducir(f),
}));

const fotoWebcam = new File(['w'], 'foto.jpg', { type: 'image/jpeg' });
vi.mock('./camara-web', () => ({
  CamaraWeb: (p: { onCaptura: (f: File) => void }) => (
    <button type="button" onClick={() => p.onCaptura(fotoWebcam)}>
      webcam-falsa
    </button>
  ),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { EscanerBoleta } from './escaner-boleta';

const uso = (o: Record<string, unknown> = {}) => ({
  mes: '2026-11',
  boletas: { usadas: 3, limite: 20 },
  intentosFallidos: { usados: 0, limite: 5 },
  globalAgotado: false,
  ...o,
});
const lectura = { comercio: 'Super', fecha: '2026-11-20', totalImpreso: '10.00', productos: [] };
const blob = new Blob(['x'], { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: uso() });
  reducir.mockResolvedValue(blob);
  post.mockResolvedValue({ data: lectura });
});

describe('EscanerBoleta', () => {
  it('muestra el contador de uso', async () => {
    render(<EscanerBoleta onLeida={vi.fn()} />);
    expect(await screen.findByText('3/20 boletas este mes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.boletas.tomarFoto })).toBeEnabled();
  });

  it('deshabilita con el límite de boletas y avisa', async () => {
    get.mockResolvedValue({ data: uso({ boletas: { usadas: 20, limite: 20 } }) });
    render(<EscanerBoleta onLeida={vi.fn()} />);
    expect(await screen.findByText(mensajes.errores.LIMITE_BOLETAS)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.boletas.tomarFoto })).toBeDisabled();
    expect(screen.getByRole('button', { name: mensajes.boletas.subirImagen })).toBeDisabled();
  });

  it('deshabilita con el tope global agotado', async () => {
    get.mockResolvedValue({ data: uso({ globalAgotado: true }) });
    render(<EscanerBoleta onLeida={vi.fn()} />);
    expect(await screen.findByText(mensajes.errores.LIMITE_GLOBAL_IA)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.boletas.subirImagen })).toBeDisabled();
  });

  it('deshabilita con intentos fallidos agotados', async () => {
    get.mockResolvedValue({ data: uso({ intentosFallidos: { usados: 5, limite: 5 } }) });
    render(<EscanerBoleta onLeida={vi.fn()} />);
    expect(await screen.findByText(mensajes.errores.LIMITE_INTENTOS_FALLIDOS)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.boletas.tomarFoto })).toBeDisabled();
  });

  it('con archivoInicial lee esa foto sin esperar a que se elija otra, una sola vez', async () => {
    const onLeida = vi.fn();
    const foto = new File(['a'], 'b.jpg', { type: 'image/jpeg' });
    const { rerender } = render(<EscanerBoleta onLeida={onLeida} archivoInicial={foto} />);
    expect(screen.getByRole('status')).toHaveTextContent(mensajes.boletas.leyendo);
    await waitFor(() => expect(onLeida).toHaveBeenCalledWith(lectura, blob));
    expect(reducir).toHaveBeenCalledWith(foto);
    rerender(<EscanerBoleta onLeida={onLeida} archivoInicial={foto} />);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('en PC, "Tomar foto" abre la webcam y lee la foto capturada', async () => {
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const abrirSelector = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onLeida = vi.fn();
    render(<EscanerBoleta onLeida={onLeida} />);
    await screen.findByText('3/20 boletas este mes');
    await userEvent.click(screen.getByRole('button', { name: mensajes.boletas.tomarFoto }));
    expect(abrirSelector).not.toHaveBeenCalled();
    abrirSelector.mockRestore();
    await userEvent.click(screen.getByRole('button', { name: 'webcam-falsa' }));
    await waitFor(() => expect(onLeida).toHaveBeenCalledWith(lectura, blob));
    expect(reducir).toHaveBeenCalledWith(fotoWebcam);
  });

  it('entrega la lectura y la imagen al escanear', async () => {
    const onLeida = vi.fn();
    const { container } = render(<EscanerBoleta onLeida={onLeida} />);
    await screen.findByText('3/20 boletas este mes');
    const input = container.querySelector('input[type=file]:not([capture])') as HTMLInputElement;
    await userEvent.upload(input, new File(['a'], 'b.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(onLeida).toHaveBeenCalledWith(lectura, blob));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('muestra el error de la API en un alert y recarga el contador', async () => {
    post.mockRejectedValue(new ErrorApi(422, 'x', 'BOLETA_ILEGIBLE'));
    const onLeida = vi.fn();
    const { container } = render(<EscanerBoleta onLeida={onLeida} />);
    await screen.findByText('3/20 boletas este mes');
    const input = container.querySelector('input[capture]') as HTMLInputElement;
    await userEvent.upload(input, new File(['a'], 'b.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensajes.errores.BOLETA_ILEGIBLE);
    expect(onLeida).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('muestra IMAGEN_INVALIDA si la imagen no se puede decodificar', async () => {
    reducir.mockRejectedValue(new Error('IMAGEN_NO_SOPORTADA'));
    const { container } = render(<EscanerBoleta onLeida={vi.fn()} />);
    await screen.findByText('3/20 boletas este mes');
    const input = container.querySelector('input[capture]') as HTMLInputElement;
    await userEvent.upload(input, new File(['a'], 'b.heic', { type: 'image/heic' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensajes.errores.IMAGEN_INVALIDA);
    expect(post).not.toHaveBeenCalled();
  });

  it('con permitirCamara=false no hay "Tomar foto" ni input capture', async () => {
    const { container } = render(<EscanerBoleta permitirCamara={false} onLeida={vi.fn()} />);
    await screen.findByText('3/20 boletas este mes');
    expect(screen.queryByRole('button', { name: mensajes.boletas.tomarFoto })).not.toBeInTheDocument();
    expect(container.querySelector('input[capture]')).toBeNull();
    expect(screen.getByRole('button', { name: mensajes.boletas.subirImagen })).toBeInTheDocument();
  });
});
