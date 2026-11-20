import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

let query = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

import { AvisoSesionExpirada } from './aviso-sesion-expirada';

describe('AvisoSesionExpirada', () => {
  it('con expirada=1 muestra el aviso', () => {
    query = 'expirada=1';
    render(<AvisoSesionExpirada />);
    expect(screen.getByRole('status')).toHaveTextContent(mensajes.errores.sesionExpirada);
  });
  it('sin el parámetro no muestra nada', () => {
    query = '';
    render(<AvisoSesionExpirada />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
