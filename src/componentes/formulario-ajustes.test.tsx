import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '@/lib/api/cliente';
import { mensajes } from '@/mensajes/es';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
}));
vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const patch = vi.fn();
vi.mock('@/lib/api/cliente', async (original) => ({
  ...(await original<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ PATCH: patch }),
}));

import { FormularioAjustes } from './formulario-ajustes';

describe('FormularioAjustes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envía PATCH /perfil con los valores cambiados y muestra éxito', async () => {
    patch.mockResolvedValue({ data: {} });
    render(<FormularioAjustes moneda="PEN" zonaHoraria="America/Lima" />);
    const u = userEvent.setup();
    expect(screen.getByLabelText(mensajes.ajustes.zonaHoraria)).toHaveValue('America/Lima');
    await u.selectOptions(screen.getByLabelText(mensajes.perfil.moneda), 'USD');
    await u.selectOptions(screen.getByLabelText(mensajes.ajustes.zonaHoraria), 'UTC');
    await u.click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/perfil', {
        body: { moneda: 'USD', zonaHoraria: 'UTC' },
      }),
    );
    expect(await screen.findByText(mensajes.ajustes.guardado)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('si falla muestra el mensaje en español', async () => {
    patch.mockRejectedValue(new ErrorApi(400, 'Zona horaria inválida (IANA)', 'VALIDACION'));
    render(<FormularioAjustes moneda="PEN" zonaHoraria="America/Lima" />);
    await userEvent.setup().click(screen.getByRole('button', { name: mensajes.acciones.guardar }));
    expect(await screen.findByText(mensajes.errores.VALIDACION)).toBeInTheDocument();
    expect(screen.queryByText(mensajes.ajustes.guardado)).toBeNull();
  });

  it('incluye la zona actual aunque el navegador no la liste', () => {
    render(<FormularioAjustes moneda="PEN" zonaHoraria="Zona/Rara" />);
    expect(screen.getByLabelText(mensajes.ajustes.zonaHoraria)).toHaveValue('Zona/Rara');
  });
});
