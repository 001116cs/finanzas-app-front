import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { mensajes } from '@/mensajes/es';

describe('Button', () => {
  it('renderiza el texto tomado de mensajes', () => {
    render(<Button>{mensajes.acciones.guardar}</Button>);
    expect(
      screen.getByRole('button', { name: mensajes.acciones.guardar }),
    ).toBeInTheDocument();
  });
});
