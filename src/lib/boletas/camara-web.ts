/**
 * Cámara dentro de la página (webcam del PC) con getUserMedia.
 * En celular/tablet se usa la cámara nativa con `<input capture>`, que no necesita esto.
 */

export type MotivoErrorCamara = 'permiso' | 'sin_camara' | 'ocupada' | 'no_disponible' | 'otro';

const NO_DISPONIBLE = 'CAMARA_NO_DISPONIBLE';

/** Celular o tablet (pantalla táctil como puntero principal): ahí `capture` abre la cámara nativa. */
export function esDispositivoTactil(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
}

/** Pide la cámara (el navegador muestra el aviso de permiso la primera vez). */
export async function abrirCamara(): Promise<MediaStream> {
  const dispositivos = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  // Sin mediaDevices: navegador sin soporte o página servida sin https.
  if (!dispositivos?.getUserMedia) throw new Error(NO_DISPONIBLE);
  return dispositivos.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
}

export function detenerCamara(stream: MediaStream): void {
  for (const pista of stream.getTracks()) pista.stop();
}

export function motivoErrorCamara(e: unknown): MotivoErrorCamara {
  if (!(e instanceof Error)) return 'otro';
  if (e.message === NO_DISPONIBLE) return 'no_disponible';
  switch (e.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permiso';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'sin_camara';
    case 'NotReadableError':
      return 'ocupada';
    default:
      return 'otro';
  }
}

/** Copia el fotograma actual del vídeo a un JPEG. */
export function capturarFotograma(video: HTMLVideoElement): Promise<File> {
  const lienzo = document.createElement('canvas');
  lienzo.width = video.videoWidth;
  lienzo.height = video.videoHeight;
  const contexto = lienzo.getContext('2d');
  if (!contexto) return Promise.reject(new Error('No se pudo capturar la imagen'));
  contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) =>
        blob
          ? resolver(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
          : rechazar(new Error('No se pudo capturar la imagen')),
      'image/jpeg',
      0.9,
    );
  });
}
