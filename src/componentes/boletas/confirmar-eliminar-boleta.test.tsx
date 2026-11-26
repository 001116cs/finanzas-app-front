import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { ConfirmarEliminarBoleta } from './confirmar-eliminar-boleta';

const o = mensajes.boletas.eliminarOpciones;

function montar(numGastos: number, eliminando = false) {
  const onElegir = vi.fn();
  render(
    <ConfirmarEliminarBoleta
      abierto
      onAbiertoChange={vi.fn()}
      numGastos={numGastos}
      eliminando={eliminando}
      onElegir={onElegir}
    />,
  );
  return onElegir;
}

describe('ConfirmarEliminarBoleta', () => {
  it('con 3 gastos muestra la pregunta y ambas opciones', () => {
    montar(3);
    expect(screen.getByText(o.pregunta(3))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(o.soloBoleta) })).toBeInTheDocument();
    expect(screen.getByText(o.soloBoletaDetalle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar boleta y sus 3 gastos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mensajes.acciones.cancelar })).toBeInTheDocument();
  });

  it('cada botón llama a onElegir con su modo', async () => {
    const onElegir = montar(3);
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: new RegExp(o.soloBoleta) }));
    expect(onElegir).toHaveBeenLastCalledWith('conservar');
    await u.click(screen.getByRole('button', { name: o.conGastos(3) }));
    expect(onElegir).toHaveBeenLastCalledWith('eliminar');
  });

  it('con 1 gasto usa el singular', () => {
    montar(1);
    expect(
      screen.getByText('Esta boleta tiene 1 gasto. ¿Qué hacemos con él?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar boleta y su gasto' })).toBeInTheDocument();
  });

  it('con 0 gastos muestra la confirmación simple', async () => {
    const onElegir = montar(0);
    expect(screen.getByText(mensajes.boletas.confirmarEliminar)).toBeInTheDocument();
    expect(screen.queryByText(o.soloBoletaDetalle)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: mensajes.acciones.eliminar }));
    expect(onElegir).toHaveBeenCalledWith('conservar');
  });

  it('con eliminando todos los botones están deshabilitados', () => {
    montar(3, true);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });

  it('con eliminando y 0 gastos también están deshabilitados', () => {
    montar(0, true);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });
});
