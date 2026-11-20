import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import ErrorRaiz from './error';
import ErrorGlobal from './global-error';

describe('páginas de error raíz', () => {
  it('error.tsx muestra texto en español y reintenta', async () => {
    const reset = vi.fn();
    render(<ErrorRaiz error={new Error('x')} reset={reset} />);
    expect(screen.getByRole('alert')).toHaveTextContent(mensajes.errores.paginaFallo);
    await userEvent.setup().click(screen.getByRole('button', { name: mensajes.errores.reintentar }));
    expect(reset).toHaveBeenCalled();
  });

  it('global-error.tsx muestra texto en español y reintenta', async () => {
    const reset = vi.fn();
    // <html> dentro de un div genera un aviso de anidación en jsdom; no afecta a la prueba.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorGlobal error={new Error('x')} reset={reset} />);
    expect(screen.getByText(mensajes.errores.paginaFallo)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: mensajes.errores.reintentar }));
    expect(reset).toHaveBeenCalled();
  });
});
