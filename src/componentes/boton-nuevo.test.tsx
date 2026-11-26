import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./formulario-movimiento', () => ({
  FormularioMovimiento: () => <div data-testid="formulario-movimiento" />,
}));

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

  it('"Subir boleta" navega a /boletas/nueva', async () => {
    await abrirMenu();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(mensajes.boletas.menu.boleta) }));
    expect(push).toHaveBeenCalledWith('/boletas/nueva');
  });
});
