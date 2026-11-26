import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const abrir = vi.fn();
const detener = vi.fn();
const capturar = vi.fn();
vi.mock('@/lib/boletas/camara-web', async (orig) => ({
  ...(await orig<typeof import('@/lib/boletas/camara-web')>()),
  abrirCamara: () => abrir(),
  detenerCamara: (s: MediaStream) => detener(s),
  capturarFotograma: (v: HTMLVideoElement) => capturar(v),
}));

import { CamaraWeb } from './camara-web';

const c = mensajes.boletas.camara;
const stream = { getTracks: () => [] } as unknown as MediaStream;
const foto = new File(['f'], 'foto.jpg', { type: 'image/jpeg' });
const error = (name: string) => Object.assign(new Error(name), { name });

beforeEach(() => {
  vi.clearAllMocks();
  abrir.mockResolvedValue(stream);
  capturar.mockResolvedValue(foto);
  // jsdom no implementa la reproducción de vídeo ni las URL de objetos.
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
  URL.createObjectURL = vi.fn(() => 'blob:captura');
  URL.revokeObjectURL = vi.fn();
});

function montar(props: Partial<Parameters<typeof CamaraWeb>[0]> = {}) {
  const onCaptura = vi.fn();
  const onCerrar = vi.fn();
  const onSubirEnSuLugar = vi.fn();
  const r = render(
    <CamaraWeb onCaptura={onCaptura} onCerrar={onCerrar} onSubirEnSuLugar={onSubirEnSuLugar} {...props} />,
  );
  return { ...r, onCaptura, onCerrar, onSubirEnSuLugar };
}

describe('CamaraWeb', () => {
  it('abre la cámara y muestra la vista en directo con "Capturar"', async () => {
    montar();
    expect(screen.getByRole('status')).toHaveTextContent(c.iniciando);
    expect(await screen.findByRole('button', { name: c.capturar })).toBeEnabled();
    expect(abrir).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText(c.video) as HTMLVideoElement).srcObject).toBe(stream);
  });

  it('capturar muestra la foto; "Repetir" vuelve al directo y "Usar foto" la entrega y apaga la cámara', async () => {
    const { onCaptura, onCerrar } = montar();
    await userEvent.click(await screen.findByRole('button', { name: c.capturar }));
    expect(await screen.findByRole('img', { name: c.capturada })).toHaveAttribute('src', 'blob:captura');

    await userEvent.click(screen.getByRole('button', { name: c.repetir }));
    expect(screen.getByRole('button', { name: c.capturar })).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:captura');

    await userEvent.click(screen.getByRole('button', { name: c.capturar }));
    await userEvent.click(await screen.findByRole('button', { name: c.usar }));
    expect(onCaptura).toHaveBeenCalledWith(foto);
    expect(detener).toHaveBeenCalledWith(stream);
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('sin permiso muestra el motivo y ofrece subir una imagen', async () => {
    abrir.mockRejectedValue(error('NotAllowedError'));
    const { onSubirEnSuLugar } = montar();
    expect(await screen.findByRole('alert')).toHaveTextContent(c.errores.permiso);
    expect(screen.queryByRole('button', { name: c.capturar })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: c.subirEnSuLugar }));
    expect(onSubirEnSuLugar).toHaveBeenCalled();
  });

  it('sin cámara muestra su mensaje', async () => {
    abrir.mockRejectedValue(error('NotFoundError'));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent(c.errores.sin_camara);
  });

  it('al desmontar apaga la cámara', async () => {
    const { unmount } = montar();
    await screen.findByRole('button', { name: c.capturar });
    unmount();
    await waitFor(() => expect(detener).toHaveBeenCalledWith(stream));
  });

  it('si se desmonta antes de que la cámara responda, la apaga igualmente', async () => {
    let resolver!: (s: MediaStream) => void;
    abrir.mockReturnValue(new Promise<MediaStream>((r) => (resolver = r)));
    const { unmount } = montar();
    unmount();
    resolver(stream);
    await waitFor(() => expect(detener).toHaveBeenCalledWith(stream));
  });
});
