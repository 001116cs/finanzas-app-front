const FORMATO = new Intl.DateTimeFormat('es', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Formatea una fecha calendario YYYY-MM-DD (interpretada como UTC, sin desfase de día). */
export function formatearFecha(iso: string): string {
  return FORMATO.format(new Date(`${iso}T00:00:00Z`));
}
