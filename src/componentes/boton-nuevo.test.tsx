import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./formulario-movimiento', () => ({
  FormularioMovimiento: () => <div data-testid="formulario-movimiento" />,
}));
const fotoWebcam = new File(['w'], 'foto.jpg', { type: 'image/jpeg' });
vi.mock('./boletas/camara-web', () => ({
  CamaraWeb: (p: { onCaptura: (f: File) => void }) => (
    <button type="button" onClick={() => p.onCaptura(fotoWebcam)}>
      webcam-falsa
    </button>
  ),
}));

/** Simula celular (puntero táctil) o PC; siempre pantalla estrecha (menú en Sheet). */
function simularDispositivo(tactil: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: tactil && q === '(pointer: coarse)',
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

import { descartarFotoPendiente, leerFotoPendiente } from '@/lib/boletas/foto-pendiente';
import { BotonNuevo } from './boton-nuevo';
import { ACEPTA_SUBIR } from './boletas/escaner-boleta';

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

function abrirMenu() {
  render(<BotonNuevo categorias={[]} tipoInicial="gasto" onGuardado={vi.fn()} />);
  return userEvent.click(screen.getByRole('button', { name: mensajes.dashboard.nuevo }));
}

describe('BotonNuevo', () => {
  it('al pulsar "+" muestra las dos opciones', async () => {
    await abrirMenu();
    expect(screen.getByText(mensajes.boletas.menu.titulo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.movimiento) })).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(mensajes.boletas.menu.boleta))).toBeInTheDocument();
    expect(screen.queryByTestId('formulario-movimiento')).not.toBeInTheDocument();
  });

  it('"Registrar movimiento" abre el formulario', async () => {
    await abrirMenu();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.movimiento) }));
    expect(await screen.findByTestId('formulario-movimiento')).toBeInTheDocument();
    expect(screen.getByText(mensajes.dashboard.nuevo)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('"Tomar foto" lleva la etiqueta de recomendado para celular', async () => {
    await abrirMenu();
    const opcion = screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.foto) });
    expect(opcion).toHaveTextContent(mensajes.boletas.menu.fotoRecomendado);
    const subir = screen.getByLabelText(new RegExp(mensajes.boletas.menu.boleta)).closest('label')!;
    expect(subir).not.toHaveTextContent(mensajes.boletas.menu.fotoRecomendado);
  });

  it('"Tomar foto" en celular abre la cámara nativa directamente y, con la foto hecha, va a leerla', async () => {
    simularDispositivo(true);
    const abrirSelector = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const { container } = render(<BotonNuevo categorias={[]} tipoInicial="gasto" onGuardado={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: mensajes.dashboard.nuevo }));
    await userEvent.click(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.foto) }));

    expect(abrirSelector).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    abrirSelector.mockRestore();

    const input = container.querySelector('input[capture]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', 'image/*');
    const foto = new File(['a'], 'b.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, foto);
    expect(leerFotoPendiente()).toBe(foto);
    expect(push).toHaveBeenCalledWith('/boletas/nueva?foto=1');
    descartarFotoPendiente();
  });

  it('"Tomar foto" en PC abre la webcam dentro de la app y, al usar la foto, va a leerla', async () => {
    simularDispositivo(false);
    const abrirSelector = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    await abrirMenu();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.foto) }));
    expect(abrirSelector).not.toHaveBeenCalled();
    abrirSelector.mockRestore();

    await userEvent.click(screen.getByRole('button', { name: 'webcam-falsa' }));
    expect(leerFotoPendiente()).toBe(fotoWebcam);
    expect(push).toHaveBeenCalledWith('/boletas/nueva?foto=1');
    expect(screen.queryByRole('button', { name: 'webcam-falsa' })).toBeNull();
    descartarFotoPendiente();
  });

  it('"Subir boleta" lleva el selector dentro de la opción (iOS ancla ahí su menú) y el menú sigue abierto hasta elegir', async () => {
    await abrirMenu();
    // El selector de archivos está dentro de la propia opción del menú, con su nombre.
    const input = screen.getByLabelText(new RegExp(mensajes.boletas.menu.boleta)) as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'file');
    expect(input).not.toHaveAttribute('capture');
    // El mismo selector que "Subir imagen" de /boletas/nueva (galería, archivos o cámara).
    expect(input).toHaveAttribute('accept', ACEPTA_SUBIR);
    expect(screen.getByText(mensajes.boletas.menu.titulo)).toBeInTheDocument();

    const imagen = new File(['a'], 'b.png', { type: 'image/png' });
    await userEvent.upload(input, imagen);
    expect(leerFotoPendiente()).toBe(imagen);
    expect(push).toHaveBeenCalledWith('/boletas/nueva?foto=1');
    await waitFor(() => expect(screen.queryByText(mensajes.boletas.menu.titulo)).toBeNull());
    descartarFotoPendiente();
  });
});
