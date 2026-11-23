import type { Celda } from './tipos';

export type FormatoMonto = 'coma_decimal' | 'punto_decimal';
export type FormatoFecha = 'dia_primero' | 'mes_primero';

export type Deteccion<F> = { formato: F; ambiguo: boolean };

const MAX_ENTEROS = 10;
const MAX_CENTAVOS = 10 ** (MAX_ENTEROS + 2); // exclusivo

/** YYYY-MM-DD con los componentes LOCALES (contrato de `Celda`: las fechas son medianoche local). */
export function fechaLocalISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------- Montos

type Limpio = { negativo: boolean; cuerpo: string };

/**
 * Quita moneda (`S/`, `S/.`, `US$`, `$`, `€`, códigos ISO de 3 letras), espacios y `+`;
 * resuelve el signo (paréntesis, `-` al inicio o al final). Devuelve sólo dígitos y separadores,
 * o null si el texto no tiene forma de número.
 */
function limpiarMonto(texto: string): Limpio | null {
  let s = texto
    .replace(/S\/\.?/gi, '')
    .replace(/US\$/gi, '')
    .replace(/[$€]/g, '')
    .replace(/(?<![A-Za-z])[A-Z]{3}(?![A-Za-z])/g, '')
    .replace(/\s+/g, '')
    .replace(/\+/g, '');
  let negativo = false;
  const paren = /^\((.*)\)$/.exec(s);
  if (paren) {
    negativo = true;
    s = paren[1];
  }
  if (s.startsWith('-')) {
    if (negativo) return null;
    negativo = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    if (negativo) return null;
    negativo = true;
    s = s.slice(0, -1);
  }
  if (!/^\d(?:[\d.,]*\d)?$/.test(s)) return null;
  return { negativo, cuerpo: s };
}

export type ResultadoMonto =
  | { centavos: number }
  | { motivo: 'monto_invalido' | 'demasiados_decimales' };

const INVALIDO = { motivo: 'monto_invalido' } as const;

function montoDeNumero(n: number): ResultadoMonto {
  if (!Number.isFinite(n)) return INVALIDO;
  const exacto = n * 100;
  const centavos = Math.round(exacto);
  if (Math.abs(exacto - centavos) > Math.max(1e-6, Math.abs(exacto) * 1e-12)) {
    return { motivo: 'demasiados_decimales' };
  }
  if (Math.abs(centavos) >= MAX_CENTAVOS) return INVALIDO;
  return { centavos: centavos === 0 ? 0 : centavos };
}

function montoDeTexto(texto: string, f: FormatoMonto): ResultadoMonto {
  const limpio = limpiarMonto(texto);
  if (!limpio) return INVALIDO;
  const dec = f === 'coma_decimal' ? ',' : '.';
  const mil = f === 'coma_decimal' ? '.' : ',';
  const partes = limpio.cuerpo.split(dec);
  if (partes.length > 2) return INVALIDO;
  const [enteroConMiles, fraccion = ''] = partes;
  if (fraccion.includes(mil)) return INVALIDO;
  let entero = enteroConMiles;
  if (entero.includes(mil)) {
    // Separador de miles: grupos exactos de 3; si no, no adivinamos.
    const grupos = new RegExp(`^\\d{1,3}(?:\\${mil}\\d{3})+$`);
    if (!grupos.test(entero)) return INVALIDO;
    entero = entero.split(mil).join('');
  }
  if (!/^\d+$/.test(entero) || !/^\d*$/.test(fraccion)) return INVALIDO;
  const significativa = fraccion.replace(/0+$/, '');
  if (significativa.length > 2) return { motivo: 'demasiados_decimales' };
  const sinCeros = entero.replace(/^0+(?=\d)/, '');
  if (sinCeros.length > MAX_ENTEROS) return INVALIDO;
  const centavos = Number(sinCeros) * 100 + Number(significativa.padEnd(2, '0'));
  return { centavos: limpio.negativo && centavos !== 0 ? -centavos : centavos };
}

/** Interpreta la celda del monto; el formato elegido manda (las celdas numéricas se usan tal cual). */
export function analizarMonto(c: Celda, f: FormatoMonto): ResultadoMonto {
  if (typeof c.valor === 'number') return montoDeNumero(c.valor);
  if (typeof c.valor === 'string') return montoDeTexto(c.valor, f);
  return INVALIDO;
}

/** Centavos con signo, o null si la celda no es un monto válido (nunca redondea). */
export function leerMonto(c: Celda, f: FormatoMonto): number | null {
  const r = analizarMonto(c, f);
  return 'centavos' in r ? r.centavos : null;
}

/** Detección del separador decimal sobre las celdas de texto de la columna (§5.3). */
export function detectarFormatoMonto(celdas: Celda[]): Deteccion<FormatoMonto> {
  let coma = 0;
  let punto = 0;
  let tresDigitos = 0;
  for (const c of celdas) {
    if (typeof c.valor !== 'string') continue;
    const limpio = limpiarMonto(c.valor);
    if (!limpio) continue;
    const s = limpio.cuerpo;
    const iComa = s.lastIndexOf(',');
    const iPunto = s.lastIndexOf('.');
    if (iComa >= 0 && iPunto >= 0) {
      if (iComa > iPunto) coma++;
      else punto++;
      continue;
    }
    const sep = iComa >= 0 ? ',' : iPunto >= 0 ? '.' : null;
    if (!sep) continue;
    const veces = s.split(sep).length - 1;
    if (veces > 1) {
      if (sep === ',') punto++;
      else coma++;
      continue;
    }
    const despues = s.length - s.indexOf(sep) - 1;
    if (despues === 1 || despues === 2) {
      if (sep === ',') coma++;
      else punto++;
    } else if (despues === 3) tresDigitos++;
  }
  if (coma > 0 && punto > 0) {
    return { formato: punto > coma ? 'punto_decimal' : 'coma_decimal', ambiguo: true };
  }
  if (coma > 0) return { formato: 'coma_decimal', ambiguo: false };
  if (punto > 0) return { formato: 'punto_decimal', ambiguo: false };
  return { formato: 'coma_decimal', ambiguo: tresDigitos > 0 };
}

// ---------------------------------------------------------------- Fechas

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const DMA = /^(\d{1,2})([/-])(\d{1,2})\2(\d{2}|\d{4})$/;

function fechaValida(a: number, m: number, d: number): string | null {
  const f = new Date(Date.UTC(a, m - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${a}-${p(m)}-${p(d)}`;
}

/** YYYY-MM-DD, o null si la celda no es una fecha real. */
export function leerFecha(c: Celda, f: FormatoFecha): string | null {
  if (c.valor instanceof Date) return Number.isNaN(c.valor.getTime()) ? null : fechaLocalISO(c.valor);
  if (typeof c.valor !== 'string') return null;
  const s = c.valor.trim();
  const iso = ISO.exec(s);
  if (iso) return fechaValida(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dma = DMA.exec(s);
  if (!dma) return null;
  const x = Number(dma[1]);
  const y = Number(dma[3]);
  const anio = dma[4].length === 2 ? 2000 + Number(dma[4]) : Number(dma[4]);
  return f === 'dia_primero' ? fechaValida(anio, y, x) : fechaValida(anio, x, y);
}

/** Orden día/mes según las fechas de texto de la columna (§5.3). Celdas fecha e ISO no son ambiguas. */
export function detectarFormatoFecha(celdas: Celda[]): Deteccion<FormatoFecha> {
  let dia = false;
  let mes = false;
  let dudosas = 0;
  for (const c of celdas) {
    if (typeof c.valor !== 'string') continue;
    const dma = DMA.exec(c.valor.trim());
    if (!dma) continue;
    const x = Number(dma[1]);
    const y = Number(dma[3]);
    if (x > 12) dia = true;
    if (y > 12) mes = true;
    if (x <= 12 && y <= 12) dudosas++;
  }
  if (dia && mes) return { formato: 'dia_primero', ambiguo: true };
  if (dia) return { formato: 'dia_primero', ambiguo: false };
  if (mes) return { formato: 'mes_primero', ambiguo: false };
  return { formato: 'dia_primero', ambiguo: dudosas > 0 };
}
