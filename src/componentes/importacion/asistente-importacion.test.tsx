import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatearMonto } from '@/lib/monto';
import { mensajes } from '@/mensajes/es';

vi.mock('@/lib/supabase/cliente', () => ({
  crearClienteSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));
const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/api/cliente', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/cliente')>()),
  crearClienteApi: () => ({ GET: get, POST: post }),
}));

import { ErrorApi } from '@/lib/api/cliente';
import { AsistenteImportacion } from './asistente-importacion';

const m = mensajes.importar;
const categorias = [
  { id: 'g1', nombre: 'Comida', tipo: 'gasto', cantidadMovimientos: 0 },
  { id: 'g2', nombre: 'Transporte', tipo: 'gasto', cantidadMovimientos: 0 },
  { id: 'i1', nombre: 'Sueldo', tipo: 'ingreso', cantidadMovimientos: 0 },
];

function fixture(nombre: string): File {
  return new File([readFileSync(path.join(__dirname, '../../lib/importacion/__fixtures__', nombre))], nombre);
}
const csv = (nombre: string, texto: string) => new File([texto], nombre, { type: 'text/csv' });
const money = (s: string) => formatearMonto(s, 'PEN').replace(/\s/g, ' ');

function montarAsistente(onImportado = vi.fn()) {
  const u = userEvent.setup({ applyAccept: false });
  render(<AsistenteImportacion onImportado={onImportado} />);
  return { u, onImportado };
}
async function subir(u: ReturnType<typeof userEvent.setup>, f: File) {
  await u.upload(await screen.findByLabelText(m.archivo.etiqueta), f);
}
const siguiente = (u: ReturnType<typeof userEvent.setup>) =>
  u.click(screen.getByRole('button', { name: m.siguiente }));

/** Archivo del extracto hasta la vista previa con "Ambos". */
async function extractoHastaVista(u: ReturnType<typeof userEvent.setup>) {
  await subir(u, fixture('1-extracto-banco.csv'));
  await siguiente(u);
  await u.click(await screen.findByRole('radio', { name: m.signos.ambos }));
  await siguiente(u);
}

beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation(async (ruta: string) =>
    ruta === '/perfil'
      ? { data: { moneda: 'PEN', zonaHoraria: 'America/Lima' } }
      : { data: categorias },
  );
  post.mockImplementation(async (ruta: string) =>
    ruta === '/importaciones/duplicados'
      ? { data: { indices: [] } }
      : { data: { id: 'x', nombreArchivo: 'f', filasImportadas: 10, createdAt: '2026-11-22T00:00:00Z' } },
  );
});

describe('AsistenteImportacion', () => {
  it('rechaza un archivo de más de 5 MB y uno .pdf sin avanzar', async () => {
    const { u } = montarAsistente();
    await subir(u, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.csv'));
    expect(await screen.findByText(m.archivo.tamano)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: m.siguiente })).toBeNull();
    await subir(u, new File(['hola'], 'cosa.pdf'));
    expect(await screen.findByText(m.archivo.extension)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: m.siguiente })).toBeNull();
  });

  it('extracto del banco: pregunta los signos y con "Ambos" resume 7 gastos y 3 ingresos', async () => {
    const { u } = montarAsistente();
    await subir(u, fixture('1-extracto-banco.csv'));
    await siguiente(u);
    expect(await screen.findByText(m.signos.pregunta)).toBeInTheDocument();
    await u.click(screen.getByRole('radio', { name: m.signos.ambos }));
    await siguiente(u);
    const resumen = await screen.findByTestId('resumen-importacion');
    expect(resumen).toHaveTextContent('10 filas a importar');
    expect(resumen).toHaveTextContent(money('604.10'));
    expect(resumen).toHaveTextContent(money('3729.90'));
    expect(post).toHaveBeenCalledWith('/importaciones/duplicados', expect.anything());
  });

  it('montos ambiguos: recuadro resaltado, no avanza hasta confirmar y cambiar el formato recalcula', async () => {
    const { u } = montarAsistente();
    await subir(u, csv('a.csv', 'Descripción,Monto\nProyecto A,1.250\nProyecto B,2.300\n'));
    await siguiente(u);
    const recuadro = await screen.findByTestId('recuadro-formato');
    expect(recuadro).toHaveAttribute('data-resaltado', 'true');
    expect(within(recuadro).getByText(m.formato.ambiguo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: m.siguiente })).toBeDisabled();

    await u.click(within(recuadro).getByRole('radio', { name: m.formato.montoPunto }));
    expect(screen.getByRole('button', { name: m.siguiente })).toBeEnabled();
    await siguiente(u);
    const lista = await screen.findByRole('list', { name: m.vista.lista });
    expect(within(lista).getByText(money('1.25'))).toBeInTheDocument();
    expect(within(lista).getByText(money('2.30'))).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: m.atras }));
    await u.click(within(await screen.findByTestId('recuadro-formato')).getByRole('radio', { name: m.formato.montoComa }));
    await siguiente(u);
    const lista2 = await screen.findByRole('list', { name: m.vista.lista });
    expect(within(lista2).getByText(money('1250.00'))).toBeInTheDocument();
    expect(within(lista2).getByText(money('2300.00'))).toBeInTheDocument();
  });

  it('el recuadro muestra ejemplos interpretados que cambian al cambiar la opción', async () => {
    const { u } = montarAsistente();
    await subir(u, csv('a.csv', 'Fecha,Descripción,Monto\n02/11/2026,Proyecto A,1.250\n15/11/2026,Proyecto B,2.300\n'));
    await siguiente(u);
    const recuadro = await screen.findByTestId('recuadro-formato');
    const ejemplos = () => within(recuadro).getAllByTestId('ejemplos-formato').map((e) => e.textContent).join('|');
    await u.click(within(recuadro).getByRole('radio', { name: m.formato.montoComa }));
    expect(ejemplos()).toContain('"1.250" → 1.250,00');
    await u.click(within(recuadro).getByRole('radio', { name: m.formato.montoPunto }));
    expect(ejemplos()).toContain('"1.250" → 1,25');
    expect(ejemplos()).toContain('"02/11/2026" → 2 nov 2026');
    await u.click(within(recuadro).getByRole('radio', { name: m.formato.mesPrimero }));
    expect(ejemplos()).toContain('"02/11/2026" → 11 feb 2026');
    expect(ejemplos()).toContain(`"15/11/2026" → ${m.formato.invalido}`);
  });

  it('confirmar el formato ambiguo con el valor preseleccionado también habilita Siguiente', async () => {
    const { u } = montarAsistente();
    await subir(u, csv('a.csv', 'Descripción,Monto\nA,1.250\nB,2.300\n'));
    await siguiente(u);
    const recuadro = await screen.findByTestId('recuadro-formato');
    await u.click(within(recuadro).getByRole('radio', { name: m.formato.montoComa }));
    expect(screen.getByRole('button', { name: m.siguiente })).toBeEnabled();
  });

  it('categorías desconocidas: paso con "Mascotas (2 filas)" y las tres opciones', async () => {
    const { u } = montarAsistente();
    await subir(
      u,
      csv('a.csv', 'Descripción;Monto;Categoría\nCroquetas;10,00;Mascotas\nArena;5,00;mascotas\nPan;3,00;Comida\n'),
    );
    await siguiente(u);
    await siguiente(u);
    expect(await screen.findByText('Mascotas (2 filas)')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: m.categorias.crear })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: m.categorias.lote })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: m.categorias.ninguna })).toBeInTheDocument();
  });

  it('avisa de los nombres de categoría demasiado largos para crear', async () => {
    const { u } = montarAsistente();
    const larga = 'X'.repeat(51);
    await subir(u, csv('a.csv', `Descripción;Monto;Categoría\nA;10,00;${larga}\n`));
    await siguiente(u);
    await siguiente(u);
    expect(await screen.findByText(m.categorias.nombreLargo)).toBeInTheDocument();
  });

  describe('duplicados', () => {
    beforeEach(() => {
      post.mockImplementation(async (ruta: string) =>
        ruta === '/importaciones/duplicados'
          ? { data: { indices: [0, 3] } }
          : { data: { id: 'x', nombreArchivo: 'f', filasImportadas: 8, createdAt: '2026-11-22T00:00:00Z' } },
      );
    });
    const enviadas = () =>
      (post.mock.calls.find((c) => c[0] === '/importaciones')![1].body.filas as { descripcion: string }[]).map(
        (f) => f.descripcion,
      );

    it('muestra el diálogo y "Omitirlas" no envía esas filas', async () => {
      const { u } = montarAsistente();
      await extractoHastaVista(u);
      expect(await screen.findByText(/Se encontraron 2 filas/)).toBeInTheDocument();
      await u.click(screen.getByRole('button', { name: m.duplicados.omitir }));
      await u.click(await screen.findByRole('button', { name: m.accionImportar }));
      await waitFor(() => expect(post).toHaveBeenCalledWith('/importaciones', expect.anything()));
      const d = enviadas();
      expect(d).toHaveLength(8);
      expect(d).not.toContain('PLIN-JUAN PEREZ');
      expect(d).not.toContain('NETFLIX.COM');
    });

    it('"Revisarlas" las deja desmarcadas y resaltadas, y no se envían', async () => {
      const { u } = montarAsistente();
      await extractoHastaVista(u);
      await u.click(await screen.findByRole('button', { name: m.duplicados.revisar }));
      const lista = await screen.findByRole('list', { name: m.vista.lista });
      const marcadas = within(lista).getAllByRole('checkbox');
      expect(marcadas).toHaveLength(10);
      expect(marcadas.filter((c) => !(c as HTMLInputElement).checked)).toHaveLength(2);
      expect(lista.querySelectorAll('[data-duplicada="true"]')).toHaveLength(2);
      await u.click(screen.getByRole('button', { name: m.accionImportar }));
      await waitFor(() => expect(post).toHaveBeenCalledWith('/importaciones', expect.anything()));
      expect(enviadas()).toHaveLength(8);
    });

    it('"Incluirlas" las envía', async () => {
      const { u } = montarAsistente();
      await extractoHastaVista(u);
      await u.click(await screen.findByRole('button', { name: m.duplicados.incluir }));
      await u.click(await screen.findByRole('button', { name: m.accionImportar }));
      await waitFor(() => expect(post).toHaveBeenCalledWith('/importaciones', expect.anything()));
      expect(enviadas()).toHaveLength(10);
    });
  });

  it('confirmar envía nombreArchivo, categoriasNuevas y sólo las filas marcadas, y avisa al terminar', async () => {
    post.mockImplementation(async (ruta: string) =>
      ruta === '/importaciones/duplicados'
        ? { data: { indices: [] } }
        : { data: { id: 'x', nombreArchivo: 'lista.csv', filasImportadas: 2, createdAt: '2026-11-22T00:00:00Z' } },
    );
    const { u, onImportado } = montarAsistente();
    await subir(
      u,
      csv('lista.csv', 'Descripción;Monto;Categoría\nCroquetas;10,00;Mascotas\nArena;5,00;Mascotas\nPan;3,00;Comida\n'),
    );
    await siguiente(u);
    await siguiente(u);
    await u.click(await screen.findByRole('radio', { name: m.categorias.crear }));
    await siguiente(u);
    const lista = await screen.findByRole('list', { name: m.vista.lista });
    await u.click(within(lista).getAllByRole('checkbox')[1]); // desmarca "Arena"
    await u.click(screen.getByRole('button', { name: m.accionImportar }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/importaciones', expect.anything()));
    const { body } = post.mock.calls.find((c) => c[0] === '/importaciones')![1];
    expect(body.nombreArchivo).toBe('lista.csv');
    expect(body.categoriasNuevas).toEqual([{ nombre: 'Mascotas', tipo: 'gasto' }]);
    expect(body.filas.map((f: { descripcion: string }) => f.descripcion)).toEqual(['Croquetas', 'Pan']);
    expect(body.filas[0]).toMatchObject({ monto: '10.00', tipo: 'gasto', categoriaNueva: 'Mascotas', categoriaId: null });
    expect(body.filas[1]).toMatchObject({ categoriaId: 'g1', categoriaNueva: null });
    expect(await screen.findByText(m.listo.titulo(2))).toBeInTheDocument();
    expect(onImportado).toHaveBeenCalledTimes(1);
  });

  it('tras importar creando categorías, "Importar otro" ya las conoce (no vuelven a ser desconocidas)', async () => {
    let creada = false;
    get.mockImplementation(async (ruta: string) =>
      ruta === '/perfil'
        ? { data: { moneda: 'PEN', zonaHoraria: 'America/Lima' } }
        : { data: creada ? [...categorias, { id: 'g9', nombre: 'Mascotas', tipo: 'gasto', cantidadMovimientos: 2 }] : categorias },
    );
    post.mockImplementation(async (ruta: string) => {
      if (ruta === '/importaciones/duplicados') return { data: { indices: [] } };
      creada = true;
      return { data: { id: 'x', nombreArchivo: 'l.csv', filasImportadas: 2, createdAt: '2026-11-22T00:00:00Z' } };
    });
    const { u } = montarAsistente();
    const texto = 'Descripción;Monto;Categoría\nCroquetas;10,00;Mascotas\nArena;5,00;Mascotas\n';
    await subir(u, csv('l.csv', texto));
    await siguiente(u);
    await siguiente(u);
    await u.click(await screen.findByRole('radio', { name: m.categorias.crear }));
    await siguiente(u);
    await u.click(await screen.findByRole('button', { name: m.accionImportar }));
    await screen.findByText(m.listo.titulo(2));
    await u.click(screen.getByRole('button', { name: m.listo.otro }));
    await subir(u, csv('l.csv', texto));
    await siguiente(u);
    await siguiente(u);
    // Sin desconocidas: salta directo a la vista previa (no aparece el paso de categorías).
    expect(await screen.findByRole('list', { name: m.vista.lista })).toBeInTheDocument();
    expect(screen.queryByText('Mascotas (2 filas)')).toBeNull();
  });

  it('un error con fila 3 señala la fila del archivo (origen + 1) y la resalta en la vista previa', async () => {
    post.mockImplementation(async (ruta: string) => {
      if (ruta === '/importaciones/duplicados') return { data: { indices: [] } };
      throw new ErrorApi(400, 'x', 'MONTO_INVALIDO', 3);
    });
    const { u, onImportado } = montarAsistente();
    await extractoHastaVista(u);
    await u.click(await screen.findByRole('button', { name: m.accionImportar }));
    const alerta = await screen.findByRole('alert');
    // índice 3 enviado = NETFLIX.COM = fila 5 del archivo (encabezado = fila 1)
    expect(alerta).toHaveTextContent('fila 5 del archivo');
    expect(alerta).toHaveTextContent(mensajes.errores.MONTO_INVALIDO);
    const lista = screen.getByRole('list', { name: m.vista.lista });
    const conError = lista.querySelectorAll('[data-error="true"]');
    expect(conError).toHaveLength(1);
    expect(conError[0]).toHaveTextContent('NETFLIX.COM');
    expect(onImportado).not.toHaveBeenCalled();
  });

  it('un error con fila fuera de rango usa el texto genérico con el índice', async () => {
    post.mockImplementation(async (ruta: string) => {
      if (ruta === '/importaciones/duplicados') return { data: { indices: [] } };
      throw new ErrorApi(400, 'x', 'MONTO_INVALIDO', 99);
    });
    const { u } = montarAsistente();
    await extractoHastaVista(u);
    await u.click(await screen.findByRole('button', { name: m.accionImportar }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensajes.errores.MONTO_INVALIDO);
    expect(document.querySelectorAll('[data-error="true"]')).toHaveLength(0);
  });

  describe('tras un rechazo del back', () => {
    async function conRechazo() {
      post.mockImplementation(async (ruta: string) => {
        if (ruta === '/importaciones/duplicados') return { data: { indices: [] } };
        throw new ErrorApi(400, 'x', 'MONTO_INVALIDO', 3);
      });
      const r = montarAsistente();
      await extractoHastaVista(r.u);
      await r.u.click(await screen.findByRole('button', { name: m.accionImportar }));
      await screen.findByRole('alert');
      expect(document.querySelectorAll('[data-error="true"]')).toHaveLength(1);
      return r;
    }

    it('marcar o desmarcar una fila limpia la fila resaltada y la alerta', async () => {
      const { u } = await conRechazo();
      const lista = screen.getByRole('list', { name: m.vista.lista });
      await u.click(within(lista).getAllByRole('checkbox')[0]);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(document.querySelectorAll('[data-error="true"]')).toHaveLength(0);
    });

    it('Atrás limpia la alerta y la fila resaltada al volver', async () => {
      const { u } = await conRechazo();
      await u.click(screen.getByRole('button', { name: m.atras }));
      expect(screen.queryByRole('alert')).toBeNull();
      await siguiente(u);
      await screen.findByRole('list', { name: m.vista.lista });
      expect(document.querySelectorAll('[data-error="true"]')).toHaveLength(0);
    });

    it('cambiar el mapeo limpia la alerta y la fila resaltada', async () => {
      const { u } = await conRechazo();
      await u.click(screen.getByRole('button', { name: m.atras }));
      await u.click(await screen.findByRole('radio', { name: m.signos.positivos }));
      expect(screen.queryByRole('alert')).toBeNull();
      await siguiente(u);
      await screen.findByRole('list', { name: m.vista.lista });
      expect(document.querySelectorAll('[data-error="true"]')).toHaveLength(0);
    });
  });

  it('Atrás, cambiar el mapeo y Siguiente vuelve a consultar duplicados', async () => {
    const { u } = montarAsistente();
    await extractoHastaVista(u);
    await screen.findByRole('list', { name: m.vista.lista });
    const llamadas = () => post.mock.calls.filter((c) => c[0] === '/importaciones/duplicados');
    expect(llamadas()).toHaveLength(1);
    await u.click(screen.getByRole('button', { name: m.atras }));
    await u.click(await screen.findByRole('radio', { name: m.signos.positivos }));
    await siguiente(u);
    await screen.findByRole('list', { name: m.vista.lista });
    expect(llamadas()).toHaveLength(2);
    expect(llamadas()[1][1].body.filas).toHaveLength(3);
  });

  it('mientras busca duplicados, el paso Columnas queda deshabilitado', async () => {
    let soltar: (v: unknown) => void = () => {};
    post.mockImplementation((ruta: string) =>
      ruta === '/importaciones/duplicados'
        ? new Promise((r) => (soltar = r))
        : Promise.resolve({ data: {} }),
    );
    const { u } = montarAsistente();
    await subir(u, fixture('1-extracto-banco.csv'));
    await siguiente(u);
    await u.click(await screen.findByRole('radio', { name: m.signos.ambos }));
    await siguiente(u);
    expect(screen.getByLabelText(m.columnas.monto)).toBeDisabled();
    expect(screen.getByRole('radio', { name: m.signos.positivos })).toBeDisabled();
    expect(within(screen.getByTestId('recuadro-formato')).getAllByRole('radio')[0]).toBeDisabled();
    soltar({ data: { indices: [] } });
    await screen.findByRole('list', { name: m.vista.lista });
  });

  it('un doble clic en Importar envía una sola vez', async () => {
    let soltar: (v: unknown) => void = () => {};
    post.mockImplementation((ruta: string) =>
      ruta === '/importaciones/duplicados'
        ? Promise.resolve({ data: { indices: [] } })
        : new Promise((r) => (soltar = r)),
    );
    const { u } = montarAsistente();
    await extractoHastaVista(u);
    const boton = await screen.findByRole('button', { name: m.accionImportar });
    await u.dblClick(boton);
    expect(post.mock.calls.filter((c) => c[0] === '/importaciones')).toHaveLength(1);
    soltar({ data: { id: 'x', nombreArchivo: 'f', filasImportadas: 10, createdAt: '2026-11-22T00:00:00Z' } });
    await screen.findByText(m.listo.titulo(10));
  });

  it('más de 2.000 filas válidas: avisa y deshabilita Importar (sin consultar duplicados)', async () => {
    const filas = Array.from({ length: 2001 }, (_, i) => `Fila ${i};1,00`).join('\n');
    const { u } = montarAsistente();
    await subir(u, csv('grande.csv', `Descripción;Monto\n${filas}\n`));
    await siguiente(u);
    await siguiente(u);
    expect(await screen.findByText(m.vista.demasiadas)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: m.accionImportar })).toBeDisabled();
    // no se pintan las 2.001 filas: lista acotada con aviso
    const lista = screen.getByRole('list', { name: m.vista.lista });
    expect(within(lista).getAllByRole('listitem').length).toBeLessThanOrEqual(200);
    expect(screen.getByText(m.vista.limitada(200, 2001))).toBeInTheDocument();
    expect(post).not.toHaveBeenCalledWith('/importaciones/duplicados', expect.anything());
  });

  it('las filas excluidas se ven con su motivo y sin casilla', async () => {
    const { u } = montarAsistente();
    await subir(u, csv('a.csv', 'Descripción;Monto\nCafé;3,00\nTOTAL;3,00\nAjuste;0\n'));
    await siguiente(u);
    await siguiente(u);
    const lista = await screen.findByRole('list', { name: m.vista.lista });
    expect(within(lista).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(lista).getByText(m.motivos.total)).toBeInTheDocument();
    expect(within(lista).getByText(m.motivos.monto_cero)).toBeInTheDocument();
  });
});
