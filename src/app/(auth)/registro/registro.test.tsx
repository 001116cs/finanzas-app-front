import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push, refresh }),
}));

const signUp = vi.fn();
vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: {
      signUp,
      getSession: async () => ({ data: { session: { access_token: 'tok' } } }),
    },
  }),
}));

const post = vi.fn();
vi.mock('@/lib/api/cliente', () => ({
  crearClienteApi: () => ({ POST: post }),
}));

import Registro from './page';

async function llenar(email = 'a@b.com', clave = 'secreta123') {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText(mensajes.auth.correo), email);
  await u.type(screen.getByLabelText(mensajes.auth.contrasena), clave);
  return u;
}

describe('Registro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signUp.mockResolvedValue({ data: {}, error: null });
    post.mockResolvedValue({ data: { id: '1' } });
  });

  it('exige contraseña de al menos 8 caracteres', async () => {
    render(<Registro />);
    const u = await llenar('a@b.com', 'corta');
    await u.click(screen.getByRole('button', { name: mensajes.auth.crearCuenta }));
    expect(await screen.findByText(mensajes.auth.contrasenaCorta)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('preselecciona PEN', () => {
    render(<Registro />);
    expect(screen.getByLabelText(mensajes.perfil.moneda)).toHaveValue('PEN');
  });

  it('registra, crea el perfil con la zona del navegador y va a /', async () => {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
    render(<Registro />);
    const u = await llenar();
    await u.click(screen.getByRole('button', { name: mensajes.auth.crearCuenta }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secreta123' });
    expect(post).toHaveBeenCalledWith('/perfil', {
      body: { moneda: 'PEN', zonaHoraria: zona },
    });
  });

  it('si signUp falla muestra el error y no llama a /perfil', async () => {
    signUp.mockResolvedValue({
      data: {},
      error: { code: 'user_already_exists', message: 'User already registered' },
    });
    render(<Registro />);
    const u = await llenar();
    await u.click(screen.getByRole('button', { name: mensajes.auth.crearCuenta }));
    expect(await screen.findByText(mensajes.auth.errores.user_already_exists)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('si /perfil falla navega a /completar-perfil', async () => {
    post.mockRejectedValue(new Error('x'));
    render(<Registro />);
    const u = await llenar();
    await u.click(screen.getByRole('button', { name: mensajes.auth.crearCuenta }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/completar-perfil'));
  });

  it('con "Otra" envía el código ISO escrito', async () => {
    render(<Registro />);
    const u = await llenar();
    await u.selectOptions(screen.getByLabelText(mensajes.perfil.moneda), 'OTRA');
    await u.type(screen.getByLabelText(mensajes.perfil.codigoIso), 'brl');
    await u.click(screen.getByRole('button', { name: mensajes.auth.crearCuenta }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1].body.moneda).toBe('BRL');
  });
});
