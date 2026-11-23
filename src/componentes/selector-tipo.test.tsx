import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { SelectorTipo } from './selector-tipo';

describe('SelectorTipo', () => {
  it('es un radiogroup con la opción actual marcada y en el orden de tabulación', () => {
    render(<SelectorTipo valor="gasto" onCambio={() => {}} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    const gastos = screen.getByRole('radio', { name: mensajes.tipoVista.gasto });
    const ingresos = screen.getByRole('radio', { name: mensajes.tipoVista.ingreso });
    expect(gastos).toHaveAttribute('aria-checked', 'true');
    expect(gastos).toHaveAttribute('tabindex', '0');
    expect(ingresos).toHaveAttribute('aria-checked', 'false');
    expect(ingresos).toHaveAttribute('tabindex', '-1');
  });

  it('al tocar Ingresos avisa el cambio', async () => {
    const onCambio = vi.fn();
    render(<SelectorTipo valor="gasto" onCambio={onCambio} />);
    await userEvent.click(screen.getByRole('radio', { name: mensajes.tipoVista.ingreso }));
    expect(onCambio).toHaveBeenCalledWith('ingreso');
  });

  it('con flecha derecha cambia a Ingresos y le pasa el foco', async () => {
    const onCambio = vi.fn();
    render(<SelectorTipo valor="gasto" onCambio={onCambio} />);
    screen.getByRole('radio', { name: mensajes.tipoVista.gasto }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onCambio).toHaveBeenCalledWith('ingreso');
    expect(screen.getByRole('radio', { name: mensajes.tipoVista.ingreso })).toHaveFocus();
  });
});
