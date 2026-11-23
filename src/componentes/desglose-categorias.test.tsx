import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { DesgloseCategorias } from './desglose-categorias';

const filas = [
  { categoriaId: 'g1', nombre: 'Comida', tipo: 'gasto' as const, total: '20.50' },
  { categoriaId: 'i1', nombre: 'Sueldo', tipo: 'ingreso' as const, total: '100.00' },
];

describe('DesgloseCategorias', () => {
  it('en gastos titula "Gastos por categoría" y muestra sólo gastos', () => {
    render(<DesgloseCategorias filas={filas} moneda="PEN" tipo="gasto" />);
    expect(screen.getByRole('heading', { name: mensajes.dashboard.porCategoriaGastos })).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.queryByText('Sueldo')).toBeNull();
  });

  it('en ingresos titula "Ingresos por categoría" y muestra sólo ingresos', () => {
    render(<DesgloseCategorias filas={filas} moneda="PEN" tipo="ingreso" />);
    expect(screen.getByRole('heading', { name: mensajes.dashboard.porCategoriaIngresos })).toBeInTheDocument();
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
    expect(screen.queryByText('Comida')).toBeNull();
  });
});
