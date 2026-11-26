/**
 * Foto hecha desde "Tomar foto" del menú +, a la espera de que /boletas/nueva la lea.
 * Vive sólo en memoria del navegador (no sobrevive a recargar la página).
 */
let pendiente: File | null = null;

export function guardarFotoPendiente(foto: File): void {
  pendiente = foto;
}

/** No la borra: React puede montar la página dos veces en desarrollo. Usa `descartarFotoPendiente`. */
export function leerFotoPendiente(): File | null {
  return pendiente;
}

export function descartarFotoPendiente(): void {
  pendiente = null;
}
