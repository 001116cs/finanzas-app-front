import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./formulario-movimiento', () => ({
  FormularioMovimiento: () => <div data-testid="formulario-movimiento" />,
}));

import { descartarFotoPendiente, leerFotoPendiente } from '@/lib/boletas/foto-pendiente';
import { BotonNuevo } from './boton-nuevo';

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
    expect(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.boleta) })).toBeInTheDocument();
    expect(screen.queryByTestId('formulario-movimiento')).not.toBeInTheDocument();
  });

  it('"Registrar movimiento" abre el formulario', async () => {
    await abrirMenu();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.movimiento) }));
    expect(await screen.findByTestId('formulario-movimiento')).toBeInTheDocument();
    expect(screen.getByText(mensajes.dashboard.nuevo)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('"Tomar foto" abre la cámara directamente y, con la foto hecha, va a leerla', async () => {
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

  it('"Subir boleta" navega a /boletas/nueva', async () => {
    await abrirMenu();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.boleta) }));
    expect(push).toHaveBeenCalledWith('/boletas/nueva');
  });
});
