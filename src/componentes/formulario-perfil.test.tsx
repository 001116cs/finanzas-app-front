import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
}));
vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const post = vi.fn();
vi.mock('@/lib/api/cliente', () => ({
  crearClienteApi: () => ({ POST: post }),
}));

import { FormularioPerfil } from './formulario-perfil';

describe('FormularioPerfil', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envía POST /perfil y navega a /', async () => {
    post.mockResolvedValue({ data: { id: '1' } });
    render(<FormularioPerfil />);
    const u = userEvent.setup();
    await u.selectOptions(screen.getByLabelText(mensajes.perfil.moneda), 'USD');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(post).toHaveBeenCalledWith('/perfil', {
      body: {
        moneda: 'USD',
        zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  });

  it('si falla muestra error y no navega', async () => {
    post.mockRejectedValue(new Error('x'));
    render(<FormularioPerfil />);
    await userEvent.setup().click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    expect(await screen.findByText(mensajes.errores.generico)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
