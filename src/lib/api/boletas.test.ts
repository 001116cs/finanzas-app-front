// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  eliminarBoleta,
  escanearBoleta,
  guardarBoleta,
  obtenerBoleta,
  obtenerImagenBoleta,
  obtenerUsoIa,
} from './boletas';
import { crearClienteApi, ErrorApi } from './cliente';

function json(status: number, cuerpo?: unknown) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: cuerpo === undefined ? {} : { 'content-type': 'application/json' },
  });
}

function pedido(fetchMock: ReturnType<typeof vi.fn>): Request {
  return fetchMock.mock.calls[0][0] as Request;
}

const imagen = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });

describe('boletas', () => {
  it('escanear envía multipart con imagen y Authorization', async () => {
    const lectura = { comercio: 'Tienda', fecha: null, totalImpreso: null, productos: [] };
    const fetchMock = vi.fn().mockResolvedValue(json(200, lectura));
    const api = crearClienteApi(async () => 'tok', fetchMock);
    const r = await escanearBoleta(api, imagen);
    expect(r).toEqual(lectura);
    const req = pedido(fetchMock);
    expect(req.method).toBe('POST');
    expect(new URL(req.url).pathname).toBe('/boletas/escanear');
    expect(req.headers.get('Authorization')).toBe('Bearer tok');
    expect(req.headers.get('Content-Type')).not.toContain('application/json');
    const form = await req.formData();
    const f = form.get('imagen') as File;
    expect(f).toBeInstanceOf(Blob);
    expect(f.name).toBe('boleta.jpg');
  });

  it('guardar envía imagen y datos como JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, { id: 'b1', gastosCreados: 2 }));
    const api = crearClienteApi(async () => 'tok', fetchMock);
    const datos = {
      comercio: 'Tienda',
      fecha: '2026-11-19',
      totalImpreso: '23.40',
      productos: [{ descripcion: 'Pan', monto: '3.50', categoriaId: null }],
    };
    const r = await guardarBoleta(api, imagen, datos);
    expect(r).toEqual({ id: 'b1', gastosCreados: 2 });
    const req = pedido(fetchMock);
    expect(new URL(req.url).pathname).toBe('/boletas');
    const form = await req.formData();
    expect(form.get('imagen')).toBeInstanceOf(Blob);
    expect(JSON.parse(form.get('datos') as string)).toEqual(datos);
  });

  it('un 409 LIMITE_BOLETAS lanza ErrorApi con codigo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json(409, { codigo: 'LIMITE_BOLETAS', mensaje: 'x' }));
    const api = crearClienteApi(async () => 'tok', fetchMock);
    const error = await escanearBoleta(api, imagen).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).codigo).toBe('LIMITE_BOLETAS');
  });

  it('obtenerImagenBoleta devuelve un Blob con el content-type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([9, 8, 7]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );
    const api = crearClienteApi(async () => 'tok', fetchMock);
    const blob = await obtenerImagenBoleta(api, 'b1');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(new URL(pedido(fetchMock).url).pathname).toBe('/boletas/b1/imagen');
  });

  it('obtenerUsoIa y obtenerBoleta devuelven los datos', async () => {
    const uso = { boletas: { usadas: 1, limite: 10 } };
    const api1 = crearClienteApi(async () => 't', vi.fn().mockResolvedValue(json(200, uso)));
    expect(await obtenerUsoIa(api1)).toEqual(uso);
    const b = { id: 'b1', comercio: 'T' };
    const api2 = crearClienteApi(async () => 't', vi.fn().mockResolvedValue(json(200, b)));
    expect(await obtenerBoleta(api2, 'b1')).toEqual(b);
  });

  it('eliminarBoleta hace DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(204));
    const api = crearClienteApi(async () => 't', fetchMock);
    await eliminarBoleta(api, 'b1');
    expect(pedido(fetchMock).method).toBe('DELETE');
    expect(new URL(pedido(fetchMock).url).pathname).toBe('/boletas/b1');
  });
});
