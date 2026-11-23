import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { ResumenTotales } from './resumen-totales';

const base = { gastos: '33.40', ingresos: '100.00', balance: '-33.40', moneda: 'PEN' };

describe('ResumenTotales', () => {
  it('en gastos muestra sólo la tarjeta Gastado', () => {
    render(<ResumenTotales tipo="gasto" {...base} />);
    expect(screen.getByText(mensajes.dashboard.gastado)).toBeInTheDocument();
    expect(screen.queryByText(mensajes.dashboard.ganado)).toBeNull();
  });

  it('en ingresos muestra sólo la tarjeta Ganado', () => {
    render(<ResumenTotales tipo="ingreso" {...base} />);
    expect(screen.getByText(mensajes.dashboard.ganado)).toBeInTheDocument();
    expect(screen.queryByText(mensajes.dashboard.gastado)).toBeNull();
  });

  it('muestra el balance en pequeño, en rojo si es negativo', () => {
    render(<ResumenTotales tipo="gasto" {...base} />);
    const balance = screen.getByTestId('balance-monto');
    expect(balance).toHaveTextContent('33,40');
    expect(balance).toHaveClass('text-red-600');
  });

  it('balance positivo sin rojo', () => {
    render(<ResumenTotales tipo="ingreso" {...base} balance="66.60" />);
    expect(screen.getByTestId('balance-monto')).not.toHaveClass('text-red-600');
  });
});
