import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const get = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get, DELETE: del }),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { HistorialImportaciones } from './historial-importaciones';

const h = mensajes.importar.historial;
const lote = (id: string, nombreArchivo: string, filasImportadas: number, createdAt: string) => ({
  id,
  nombreArchivo,
  filasImportadas,
  createdAt,
});
const lista = [
  lote('2', 'extracto.csv', 10, '2026-11-22T15:30:00Z'),
  lote('1', 'gastos.xlsx', 1, '2026-11-20T10:00:00Z'),
];

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: lista });
  del.mockResolvedValue({});
});

describe('HistorialImportaciones', () => {
  it('lista nombre, fecha y cantidad en el orden recibido', async () => {
    render(<HistorialImportaciones recarga={0} />);
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('extracto.csv');
    expect(items[0]).toHaveTextContent('10 movimientos');
    expect(items[0]).toHaveTextContent(/2026/);
    expect(items[1]).toHaveTextContent('gastos.xlsx');
    expect(items[1]).toHaveTextContent('1 movimiento');
    expect(get).toHaveBeenCalledWith('/importaciones');
  });

  it('sin importaciones muestra el texto vacío', async () => {
    get.mockResolvedValue({ data: [] });
    render(<HistorialImportaciones recarga={0} />);
    expect(await screen.findByText('Aún no has importado archivos')).toBeInTheDocument();
  });

  it('Deshacer pide confirmación con el texto exacto, borra y recarga', async () => {
    const u = userEvent.setup();
    render(<HistorialImportaciones recarga={0} />);
    await screen.findByText('extracto.csv');
    get.mockResolvedValue({ data: [lista[1]] });
    await u.click(screen.getAllByRole('button', { name: h.deshacer })[0]);
    const dialogo = await screen.findByRole('alertdialog');
    expect(dialogo).toHaveTextContent(
      'Se eliminarán 10 movimientos importados de «extracto.csv». Esta acción no se puede deshacer.',
    );
    expect(del).not.toHaveBeenCalled();
    await u.click(within(dialogo).getByRole('button', { name: h.deshacer }));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('/importaciones/{id}', { params: { path: { id: '2' } } }),
    );
    await waitFor(() => expect(screen.queryByText('extracto.csv')).toBeNull());
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('cancelar no borra', async () => {
    const u = userEvent.setup();
    render(<HistorialImportaciones recarga={0} />);
    await screen.findByText('extracto.csv');
    await u.click(screen.getAllByRole('button', { name: h.deshacer })[0]);
    await u.click(await screen.findByRole('button', { name: mensajes.acciones.cancelar }));
    expect(del).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('un error al deshacer muestra un mensaje en español y deja el diálogo abierto', async () => {
    del.mockRejectedValue(new ErrorApi(404, 'x', 'NO_ENCONTRADO'));
    const u = userEvent.setup();
    render(<HistorialImportaciones recarga={0} />);
    await screen.findByText('extracto.csv');
    await u.click(screen.getAllByRole('button', { name: h.deshacer })[0]);
    const dialogo = await screen.findByRole('alertdialog');
    await u.click(within(dialogo).getByRole('button', { name: h.deshacer }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/\S/);
    expect(screen.getByText('extracto.csv')).toBeInTheDocument();
  });

  it('un error al cargar muestra un mensaje en español', async () => {
    get.mockRejectedValue(new ErrorApi(500, 'x'));
    render(<HistorialImportaciones recarga={0} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(mensajes.errores.generico);
  });

  it('se recarga cuando cambia recarga (tras onImportado)', async () => {
    function Contenedor() {
      const [n, setN] = useState(0);
      return (
        <>
          <button onClick={() => setN((x) => x + 1)}>importado</button>
          <HistorialImportaciones recarga={n} />
        </>
      );
    }
    const u = userEvent.setup();
    render(<Contenedor />);
    await screen.findByText('extracto.csv');
    get.mockResolvedValue({ data: [lote('3', 'nuevo.csv', 4, '2026-11-23T10:00:00Z'), ...lista] });
    await u.click(screen.getByRole('button', { name: 'importado' }));
    expect(await screen.findByText('nuevo.csv')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
