/** Estado del visor: escala y desplazamiento (en px) respecto al centro del contenedor. */
export interface EstadoZoom {
  escala: number;
  x: number;
  y: number;
}

export const ESCALA_MIN = 1;
export const ESCALA_MAX = 5;
export const PASO = 1.5;
export const INICIAL: EstadoZoom = { escala: ESCALA_MIN, x: 0, y: 0 };

const limitar = (n: number) => Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, n));

/**
 * Cambia la escala manteniendo fijo en pantalla el punto (px, py),
 * medido respecto al centro del contenedor. En la escala mínima recentra.
 */
export function zoomEnPunto(estado: EstadoZoom, escala: number, px: number, py: number): EstadoZoom {
  const nueva = limitar(escala);
  if (nueva === ESCALA_MIN) return INICIAL;
  const factor = nueva / estado.escala;
  return {
    escala: nueva,
    x: px - (px - estado.x) * factor,
    y: py - (py - estado.y) * factor,
  };
}

/** Arrastra la imagen; sin zoom no se mueve. */
export function desplazar(estado: EstadoZoom, dx: number, dy: number): EstadoZoom {
  if (estado.escala === ESCALA_MIN) return estado;
  return { ...estado, x: estado.x + dx, y: estado.y + dy };
}
