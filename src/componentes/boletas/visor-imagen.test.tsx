import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { VisorImagen } from './visor-imagen';

const z = mensajes.boletas.zoom;

function imagenAmpliada(): HTMLImageElement {
  return screen.getByTestId('visor-imagen-ampliada') as HTMLImageElement;
}

describe('VisorImagen', () => {
  it('muestra la miniatura y al pulsarla abre la imagen ampliada', async () => {
    render(<VisorImagen url="blob:foto" alt="Foto de la boleta" />);
    expect(screen.getByRole('img', { name: 'Foto de la boleta' })).toHaveAttribute('src', 'blob:foto');
    expect(screen.queryByTestId('visor-imagen-ampliada')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: z.abrir }));

    expect(imagenAmpliada()).toHaveAttribute('src', 'blob:foto');
    expect(imagenAmpliada().style.transform).toContain('scale(1)');
  });

  it('los botones acercan, alejan y restablecen el zoom', async () => {
    render(<VisorImagen url="blob:foto" alt="Foto de la boleta" />);
    await userEvent.click(screen.getByRole('button', { name: z.abrir }));

    await userEvent.click(screen.getByRole('button', { name: z.acercar }));
    expect(imagenAmpliada().style.transform).toContain('scale(1.5)');
    await userEvent.click(screen.getByRole('button', { name: z.acercar }));
    expect(imagenAmpliada().style.transform).toContain('scale(2.25)');

    await userEvent.click(screen.getByRole('button', { name: z.alejar }));
    expect(imagenAmpliada().style.transform).toContain('scale(1.5)');

    await userEvent.click(screen.getByRole('button', { name: z.restablecer }));
    expect(imagenAmpliada().style.transform).toContain('scale(1)');
  });

  it('un clic alterna entre tamaño original y ampliado', async () => {
    render(<VisorImagen url="blob:foto" alt="Foto de la boleta" />);
    await userEvent.click(screen.getByRole('button', { name: z.abrir }));

    await userEvent.click(imagenAmpliada());
    expect(imagenAmpliada().style.transform).toContain('scale(2.5)');
    await userEvent.click(imagenAmpliada());
    expect(imagenAmpliada().style.transform).toContain('scale(1)');
  });

  it('soltar tras arrastrar no cuenta como clic', async () => {
    render(<VisorImagen url="blob:foto" alt="Foto de la boleta" />);
    await userEvent.click(screen.getByRole('button', { name: z.abrir }));
    await userEvent.click(screen.getByRole('button', { name: z.acercar }));
    const area = imagenAmpliada().parentElement!;

    fireEvent.pointerDown(area, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(area, { pointerId: 1, clientX: 140, clientY: 120 });
    fireEvent.pointerUp(area, { pointerId: 1, clientX: 140, clientY: 120 });
    fireEvent.click(area, { clientX: 140, clientY: 120 });

    expect(imagenAmpliada().style.transform).toContain('scale(1.5)');
    expect(imagenAmpliada().style.transform).toContain('translate(40px, 20px)');
  });

  it('alejar está deshabilitado en el tamaño original', async () => {
    render(<VisorImagen url="blob:foto" alt="Foto de la boleta" />);
    await userEvent.click(screen.getByRole('button', { name: z.abrir }));
    expect(screen.getByRole('button', { name: z.alejar })).toBeDisabled();
  });
});
