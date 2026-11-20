import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { SelectorPeriodo } from './selector-periodo';

describe('SelectorPeriodo', () => {
  it('emite el período al elegir mes anterior', async () => {
    const onCambio = vi.fn();
    render(<SelectorPeriodo valor={{ clave: 'este_mes' }} onCambio={onCambio} />);
    await userEvent.selectOptions(screen.getByLabelText(mensajes.periodo.etiqueta), 'mes_anterior');
    expect(onCambio).toHaveBeenCalledWith({ clave: 'mes_anterior' });
  });

  it('con desde > hasta muestra error y no emite', async () => {
    const onCambio = vi.fn();
    render(<SelectorPeriodo valor={{ clave: 'este_mes' }} onCambio={onCambio} />);
    await userEvent.selectOptions(screen.getByLabelText(mensajes.periodo.etiqueta), 'rango');
    fireEvent.change(screen.getByLabelText(mensajes.periodo.desde), { target: { value: '2026-02-10' } });
    fireEvent.change(screen.getByLabelText(mensajes.periodo.hasta), { target: { value: '2026-02-01' } });
    expect(screen.getByText(mensajes.periodo.rangoInvalido)).toBeInTheDocument();
    expect(onCambio).not.toHaveBeenCalled();
  });

  it('emite un rango válido', async () => {
    const onCambio = vi.fn();
    render(<SelectorPeriodo valor={{ clave: 'este_mes' }} onCambio={onCambio} />);
    await userEvent.selectOptions(screen.getByLabelText(mensajes.periodo.etiqueta), 'rango');
    fireEvent.change(screen.getByLabelText(mensajes.periodo.desde), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText(mensajes.periodo.hasta), { target: { value: '2026-02-10' } });
    expect(onCambio).toHaveBeenCalledWith({ clave: 'rango', desde: '2026-02-01', hasta: '2026-02-10' });
  });
});
