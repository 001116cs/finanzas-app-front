const ENTRADA = /^(\d+)(?:[.,](\d{1,2}))?$/;
const MAX_ENTEROS = 10;

export function formatearMonto(monto: string, moneda: string): string {
  return new Intl.NumberFormat('es', { style: 'currency', currency: moneda }).format(
    Number(monto),
  );
}

/** Acepta "12,5" o "12.5" y devuelve "12.50"; null si no es un monto válido (> 0, máx. 2 decimales). */
export function normalizarMontoEntrada(s: string): string | null {
  const m = ENTRADA.exec(s);
  if (!m) return null;
  const decimales = (m[2] ?? '').padEnd(2, '0');
  const entero = m[1].replace(/^0+(?=\d)/, '');
  if (entero.length > MAX_ENTEROS) return null;
  if (Number(entero) === 0 && Number(decimales) === 0) return null;
  return `${entero}.${decimales}`;
}
