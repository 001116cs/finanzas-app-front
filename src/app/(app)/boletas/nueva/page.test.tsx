import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { descartarFotoPendiente, guardarFotoPendiente } from '@/lib/boletas/foto-pendiente';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const lectura = { comercio: 'Super', fecha: '2026-11-20', totalImpreso: null, productos: [] };
const imagen = new Blob(['x'], { type: 'image/jpeg' });
/** archivoInicial recibido en cada montaje del escáner. */
const iniciales: (File | null)[] = [];

vi.mock('@/componentes/boletas/escaner-boleta', () => ({
  EscanerBoleta: (p: { archivoInicial?: File | null; onLeida: (l: unknown, i: Blob) => void }) => {
    iniciales.push(p.archivoInicial ?? null);
    return (
      <button type="button" onClick={() => p.onLeida(lectura, imagen)}>
        escaner-falso
      </button>
    );
  },
}));
vi.mock('@/componentes/boletas/revision-boleta', () => ({
  RevisionBoleta: (p: { onCancelar: () => void }) => (
    <button type="button" onClick={p.onCancelar}>
      cancelar-revision
    </button>
  ),
}));

import NuevaBoleta from './page';

afterEach(() => {
  iniciales.length = 0;
  descartarFotoPendiente();
});

async function montar(consulta: Record<string, string>) {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <NuevaBoleta searchParams={Promise.resolve(consulta)} />
      </Suspense>,
    );
  });
}

describe('/boletas/nueva', () => {
  it('con ?foto=1 entrega la foto pendiente al escáner', async () => {
    const foto = new File(['a'], 'b.jpg', { type: 'image/jpeg' });
    guardarFotoPendiente(foto);
    await montar({ foto: '1' });
    expect(iniciales.at(-1)).toBe(foto);
  });

  it('al cancelar la revisión no vuelve a leer la misma foto', async () => {
    const foto = new File(['a'], 'b.jpg', { type: 'image/jpeg' });
    guardarFotoPendiente(foto);
    await montar({ foto: '1' });

    await userEvent.click(await screen.findByRole('button', { name: 'escaner-falso' }));
    await userEvent.click(await screen.findByRole('button', { name: 'cancelar-revision' }));

    expect(await screen.findByRole('button', { name: 'escaner-falso' })).toBeInTheDocument();
    expect(iniciales.at(-1)).toBeNull();
  });
});
