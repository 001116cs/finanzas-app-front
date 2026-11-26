export const IMAGEN_NO_SOPORTADA = 'IMAGEN_NO_SOPORTADA';

const LADO_MAXIMO = 2000;
const CALIDAD_JPEG = 0.85;

export function calcularDimensiones(
  ancho: number,
  alto: number,
  max = LADO_MAXIMO,
): { ancho: number; alto: number } {
  const lado = Math.max(ancho, alto);
  if (lado <= max) return { ancho, alto };
  const factor = max / lado;
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  };
}

/**
 * Reduce la imagen a JPEG con el lado largo ≤ 2000 px. Si ya es un JPEG
 * suficientemente pequeño se devuelve tal cual. Lanza `Error(IMAGEN_NO_SOPORTADA)`
 * si el navegador no puede decodificarla.
 */
export async function reducirImagen(archivo: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    throw new Error(IMAGEN_NO_SOPORTADA);
  }
  try {
    const { width, height } = bitmap;
    if (archivo.type === 'image/jpeg' && Math.max(width, height) <= LADO_MAXIMO) return archivo;
    const { ancho, alto } = calcularDimensiones(width, height);
    let blob: Blob | null;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(ancho, alto);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, ancho, alto);
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: CALIDAD_JPEG });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, ancho, alto);
      blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', CALIDAD_JPEG));
    }
    if (!blob) throw new Error(IMAGEN_NO_SOPORTADA);
    return blob;
  } finally {
    bitmap.close();
  }
}
