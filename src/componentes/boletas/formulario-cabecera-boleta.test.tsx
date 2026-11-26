import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { FormularioCabeceraBoleta } from './formulario-cabecera-boleta';

const d = mensajes.boletas.detalle;
const inicial = { comercio: 'Sol', fecha: '2026-11-19', totalImpreso: '23.40' };

function montar(onGuardar = vi.fn().mockResolvedValue(undefined)) {
  render(<FormularioCabeceraBoleta inicial={inicial} onGuardar={onGuardar} />);
  return onGuardar;
}
const guardar = () => screen.getByRole('button', { name: d.guardarCambios });

describe('FormularioCabeceraBoleta', () => {
  it('sin cambios, guardar está deshabilitado', () => {
    montar();
    expect(guardar()).toBeDisabled();
  });

  it('cambiar sólo la fecha envía { fecha } y muestra el aviso', async () => {
    const onGuardar = montar();
    const campo = screen.getByLabelText(mensajes.boletas.fecha);
    await userEvent.clear(campo);
    await userEvent.type(campo, '2026-11-20');
    expect(screen.getByText(d.avisoFecha)).toBeInTheDocument();
    await userEvent.click(guardar());
    await waitFor(() => expect(onGuardar).toHaveBeenCalledWith({ fecha: '2026-11-20' }));
    expect(await screen.findByRole('status')).toHaveTextContent(d.cambiosGuardados);
  });

  it('total vacío envía null', async () => {
    const onGuardar = montar();
    await userEvent.clear(screen.getByLabelText(mensajes.boletas.totalImpreso));
    await userEvent.click(guardar());
    await waitFor(() => expect(onGuardar).toHaveBeenCalledWith({ totalImpreso: null }));
  });

  it('total inválido muestra error y no llama', async () => {
    const onGuardar = montar();
    const campo = screen.getByLabelText(mensajes.boletas.totalImpreso);
    await userEvent.clear(campo);
    await userEvent.type(campo, 'abc');
    await userEvent.click(guardar());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('muestra el error del guardado', async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error('x'));
    montar(onGuardar);
    const campo = screen.getByLabelText(mensajes.boletas.comercio);
    await userEvent.type(campo, 'Z');
    await userEvent.click(guardar());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('fecha vacía no permite guardar', async () => {
    const onGuardar = montar();
    await userEvent.clear(screen.getByLabelText(mensajes.boletas.fecha));
    expect(guardar()).toBeDisabled();
    await userEvent.click(guardar());
    expect(onGuardar).not.toHaveBeenCalled();
  });
});
