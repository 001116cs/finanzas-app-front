import type { crearClienteApi } from './cliente';
import type { components } from './esquema';

type ClienteApi = ReturnType<typeof crearClienteApi>;

export type LecturaBoleta = components['schemas']['LecturaBoletaRespuesta'];
export type UsoIa = components['schemas']['UsoIaRespuesta'];
export type DetalleBoleta = components['schemas']['DetalleBoletaRespuesta'];
export type Boleta = DetalleBoleta;
export type ResumenBoleta = components['schemas']['ResumenBoletaRespuesta'];
export type ListaBoletas = components['schemas']['ListaBoletasRespuesta'];
export type CambiosBoleta = components['schemas']['EditarBoletaDto'];
export type GastoNuevoBoleta = components['schemas']['GastoBoletaDto'];
export type GastoBoleta = components['schemas']['TransaccionRespuesta'];

export interface DatosGuardarBoleta {
  comercio: string;
  fecha: string;
  totalImpreso: string | null;
  productos: { descripcion: string; monto: string; categoriaId: string | null }[];
}

function nombreArchivo(archivo: Blob): string {
  return archivo instanceof File ? archivo.name : 'boleta.jpg';
}

/**
 * Serializa a FormData. No se fija Content-Type: el navegador añade el boundary.
 * Los tipos generados modelan el binario como `string`, por eso el cuerpo
 * se castea (de forma acotada) en cada llamada.
 */
function formulario(archivo: Blob, datos?: DatosGuardarBoleta): FormData {
  const form = new FormData();
  form.append('imagen', archivo, nombreArchivo(archivo));
  if (datos) form.append('datos', JSON.stringify(datos));
  return form;
}

export async function escanearBoleta(api: ClienteApi, archivo: Blob): Promise<LecturaBoleta> {
  const { data } = await api.POST('/boletas/escanear', {
    // Cast acotado: el esquema tipa `imagen` como string (format: binary).
    body: { imagen: archivo as unknown as string },
    bodySerializer: () => formulario(archivo),
  });
  return data as LecturaBoleta;
}

export async function guardarBoleta(
  api: ClienteApi,
  archivo: Blob,
  datos: DatosGuardarBoleta,
): Promise<{ id: string; gastosCreados: number }> {
  const { data } = await api.POST('/boletas', {
    // Cast acotado: el esquema tipa `imagen` como string (format: binary).
    body: { imagen: archivo as unknown as string, datos: JSON.stringify(datos) },
    bodySerializer: () => formulario(archivo, datos),
  });
  return data as { id: string; gastosCreados: number };
}

export async function obtenerUsoIa(api: ClienteApi): Promise<UsoIa> {
  const { data } = await api.GET('/uso-ia');
  return data as UsoIa;
}

export async function obtenerBoleta(api: ClienteApi, id: string): Promise<Boleta> {
  const { data } = await api.GET('/boletas/{id}', { params: { path: { id } } });
  return data as Boleta;
}

export async function obtenerImagenBoleta(api: ClienteApi, id: string): Promise<Blob> {
  const { data } = await api.GET('/boletas/{id}/imagen', {
    params: { path: { id } },
    parseAs: 'blob',
  });
  return data as unknown as Blob;
}

export async function eliminarBoleta(api: ClienteApi, id: string): Promise<void> {
  await api.DELETE('/boletas/{id}', { params: { path: { id } } });
}

export async function listarBoletas(
  api: ClienteApi,
  pagina: number,
  tamano = 12,
): Promise<ListaBoletas> {
  const { data } = await api.GET('/boletas', { params: { query: { pagina, tamano } } });
  return data as ListaBoletas;
}

export async function editarBoleta(
  api: ClienteApi,
  id: string,
  cambios: CambiosBoleta,
): Promise<DetalleBoleta> {
  const { data } = await api.PATCH('/boletas/{id}', {
    params: { path: { id } },
    body: cambios,
  });
  return data as DetalleBoleta;
}

export async function agregarGastoBoleta(
  api: ClienteApi,
  id: string,
  gasto: GastoNuevoBoleta,
): Promise<GastoBoleta> {
  const { data } = await api.POST('/boletas/{id}/gastos', {
    params: { path: { id } },
    body: gasto,
  });
  return data as GastoBoleta;
}
