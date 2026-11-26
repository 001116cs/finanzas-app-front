import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { SelectorOrden } from './selector-orden';

describe('SelectorOrden', () => {
  it('marca el valor actual y tiene etiqueta accesible', () => {
    render(<SelectorOrden valor="reciente" onCambio={() => {}} />);
    expect(screen.getByRole('group', { name: mensajes.dashboard.orden.etiqueta })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.dashboard.orden.reciente })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: mensajes.dashboard.orden.fecha })).toHaveAttribute('aria-pressed', 'false');
  });
  it('pulsar el otro llama a onCambio', async () => {
    const onCambio = vi.fn();
    render(<SelectorOrden valor="reciente" onCambio={onCambio} />);
    await userEvent.click(screen.getByRole('button', { name: mensajes.dashboard.orden.fecha }));
    expect(onCambio).toHaveBeenCalledWith('fecha');
  });
  it('marca fecha cuando es el valor', () => {
    render(<SelectorOrden valor="fecha" onCambio={() => {}} />);
    expect(screen.getByRole('button', { name: mensajes.dashboard.orden.fecha })).toHaveAttribute('aria-pressed', 'true');
  });

  it('con "Por fecha" muestra la dirección; con "Recientes" no', () => {
    const { rerender } = render(<SelectorOrden valor="reciente" onCambio={() => {}} />);
    expect(screen.queryByRole('group', { name: mensajes.dashboard.orden.direccion })).toBeNull();
    rerender(<SelectorOrden valor="fecha" onCambio={() => {}} />);
    expect(screen.getByRole('group', { name: mensajes.dashboard.orden.direccion })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.dashboard.orden.masRecientes })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: mensajes.dashboard.orden.masAntiguos })).toHaveAttribute('aria-pressed', 'false');
  });
  it('"Más antiguos" pide fecha_asc y "Más recientes" fecha', async () => {
    const onCambio = vi.fn();
    const { rerender } = render(<SelectorOrden valor="fecha" onCambio={onCambio} />);
    await userEvent.click(screen.getByRole('button', { name: mensajes.dashboard.orden.masAntiguos }));
    expect(onCambio).toHaveBeenLastCalledWith('fecha_asc');
    rerender(<SelectorOrden valor="fecha_asc" onCambio={onCambio} />);
    expect(screen.getByRole('button', { name: mensajes.dashboard.orden.fecha })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: mensajes.dashboard.orden.masRecientes }));
    expect(onCambio).toHaveBeenLastCalledWith('fecha');
  });
});
