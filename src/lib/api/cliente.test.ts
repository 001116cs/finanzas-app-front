import { describe, expect, it, vi } from 'vitest';
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

describe('crearClienteApi', () => {
  it('agrega Authorization cuando hay token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { status: 'ok' }));
    const api = crearClienteApi(async () => 'abc123', fetchMock);
    await api.GET('/health');
    expect(pedido(fetchMock).headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('no agrega Authorization cuando no hay token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { status: 'ok' }));
    const api = crearClienteApi(async () => null, fetchMock);
    await api.GET('/health');
    expect(pedido(fetchMock).headers.has('Authorization')).toBe(false);
  });

  it('convierte un 409 PERFIL_REQUERIDO en ErrorApi con su codigo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json(409, { codigo: 'PERFIL_REQUERIDO', mensaje: 'Falta perfil' }),
      );
    const api = crearClienteApi(async () => 't', fetchMock);
    const error = await api.GET('/perfil').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).status).toBe(409);
    expect((error as ErrorApi).codigo).toBe('PERFIL_REQUERIDO');
  });

  it('expone la fila de un error 400 de importación', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json(400, { codigo: 'MONTO_INVALIDO', mensaje: 'x', fila: 3 }));
    const api = crearClienteApi(async () => 't', fetchMock);
    const error = await api.GET('/perfil').catch((e: unknown) => e);
    expect((error as ErrorApi).fila).toBe(3);
    expect((error as ErrorApi).codigo).toBe('MONTO_INVALIDO');
  });

  it('un error sin cuerpo JSON produce ErrorApi sin codigo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(500));
    const api = crearClienteApi(async () => 't', fetchMock);
    const error = await api.GET('/perfil').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).status).toBe(500);
    expect((error as ErrorApi).codigo).toBeUndefined();
  });

  it('un 502 con cuerpo HTML produce ErrorApi sin codigo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html><body>Bad Gateway</body></html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }),
    );
    const api = crearClienteApi(async () => 't', fetchMock);
    const error = await api.GET('/perfil').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).status).toBe(502);
    expect((error as ErrorApi).codigo).toBeUndefined();
  });

  it('devuelve data en respuestas 2xx', async () => {
    const perfil = { id: '1', moneda: 'PEN', zonaHoraria: 'America/Lima' };
    const fetchMock = vi.fn().mockResolvedValue(json(200, perfil));
    const api = crearClienteApi(async () => 't', fetchMock);
    const { data } = await api.GET('/perfil');
    expect(data).toEqual(perfil);
  });
});
