import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './esquema';

export class ErrorApi extends Error {
  readonly status: number;
  readonly codigo?: string;
  /** Índice 0-based de la fila con el problema (errores de importación). */
  readonly fila?: number;

  constructor(status: number, mensaje: string, codigo?: string, fila?: number) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.codigo = codigo;
    this.fila = fila;
  }
}

export function crearClienteApi(
  obtenerToken: () => Promise<string | null>,
  fetchImpl?: typeof fetch,
) {
  const middleware: Middleware = {
    async onRequest({ request }) {
      const token = await obtenerToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
    async onResponse({ response }) {
      if (response.ok) return undefined;
      let cuerpo: { codigo?: string; mensaje?: string; fila?: number } | undefined;
      try {
        cuerpo = await response.clone().json();
      } catch {
        cuerpo = undefined;
      }
      throw new ErrorApi(
        response.status,
        cuerpo?.mensaje ?? response.statusText,
        cuerpo?.codigo,
        typeof cuerpo?.fila === 'number' ? cuerpo.fila : undefined,
      );
    },
  };

  const cliente = createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  cliente.use(middleware);
  return cliente;
}
