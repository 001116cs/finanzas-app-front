import * as XLSX from 'xlsx';
import { fechaLocalISO } from './formatos';
import type { Celda, Hoja } from './tipos';

const SEPARADORES = [',', ';', '\t'] as const;

/** Elige el separador más frecuente en las primeras líneas (fuera de comillas). */
function detectarSeparador(texto: string): string {
  const cuentas = new Map<string, number>(SEPARADORES.map((s) => [s, 0]));
  let enComillas = false;
  let lineas = 0;
  for (let i = 0; i < texto.length && lineas < 10; i++) {
    const ch = texto[i];
    if (ch === '"') enComillas = !enComillas;
    else if (!enComillas) {
      if (ch === '\n') lineas++;
      else if (cuentas.has(ch)) cuentas.set(ch, cuentas.get(ch)! + 1);
    }
  }
  let mejor: string = ',';
  let max = 0;
  for (const s of SEPARADORES) {
    if (cuentas.get(s)! > max) {
      max = cuentas.get(s)!;
      mejor = s;
    }
  }
  return mejor;
}

function esCsv(nombre: string): boolean {
  return /\.(csv|txt|tsv)$/i.test(nombre);
}

/**
 * SheetJS entrega las fechas de Excel con los componentes de calendario en UTC
 * (sin zona horaria); los pasamos a una fecha local con los mismos componentes
 * para que getFullYear/getMonth/getDate devuelvan lo que se ve en Excel.
 */
function aFechaLocal(d: Date): Date {
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
}

function aCelda(c: XLSX.CellObject | undefined): Celda {
  if (!c) return { valor: null, texto: '' };
  if (c.v === undefined || c.v === null || c.t === 'z') {
    // Fórmula sin valor en caché (p. ej. archivo generado sin recalcular): se conserva la fórmula.
    return c.f ? { valor: null, texto: '', formula: c.f } : { valor: null, texto: '' };
  }
  let valor: Celda['valor'];
  if (c.v instanceof Date) valor = aFechaLocal(c.v);
  else if (typeof c.v === 'number' || typeof c.v === 'string') valor = c.v;
  else valor = String(c.v); // booleanos y errores como texto
  const texto = c.w ?? (valor instanceof Date ? fechaLocalISO(valor) : String(valor));
  const celda: Celda = { valor, texto };
  if (c.f) celda.formula = c.f;
  return celda;
}

function hojaAFilas(ws: XLSX.WorkSheet): Celda[][] {
  if (!ws['!ref']) return [];
  const rango = XLSX.utils.decode_range(ws['!ref']);
  const filas: Celda[][] = [];
  for (let r = 0; r <= rango.e.r; r++) {
    const fila: Celda[] = [];
    for (let c = 0; c <= rango.e.c; c++) {
      fila.push(aCelda(ws[XLSX.utils.encode_cell({ r, c })]));
    }
    filas.push(fila);
  }
  return filas;
}

/** UTF-16 por BOM; UTF-8 estricto; si no es UTF-8 válido, Windows-1252 (CSV de Excel en español). */
function decodificar(datos: ArrayBuffer): string {
  const b = new Uint8Array(datos);
  let texto: string;
  if (b[0] === 0xff && b[1] === 0xfe) texto = new TextDecoder('utf-16le').decode(b.subarray(2));
  else if (b[0] === 0xfe && b[1] === 0xff) texto = new TextDecoder('utf-16be').decode(b.subarray(2));
  else {
    try {
      texto = new TextDecoder('utf-8', { fatal: true }).decode(b);
    } catch {
      texto = new TextDecoder('windows-1252').decode(b);
    }
  }
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

export function leerArchivo(datos: ArrayBuffer, nombre: string): Hoja[] {
  let libro: XLSX.WorkBook;
  if (esCsv(nombre)) {
    const texto = decodificar(datos);
    // raw: true deja todo como texto tal cual viene en el archivo.
    libro = XLSX.read(texto, { type: 'string', raw: true, FS: detectarSeparador(texto) });
  } else {
    libro = XLSX.read(new Uint8Array(datos), {
      type: 'array',
      // raw: un .xls que en realidad es HTML o texto tabulado (típico de bancos) queda como texto
      // para que el formato elegido por el usuario mande; los xlsx reales conservan sus celdas tipadas.
      raw: true,
      cellDates: true,
      cellFormula: true,
      sheetStubs: true,
    });
  }
  return libro.SheetNames.map((n) => ({ nombre: n, filas: hojaAFilas(libro.Sheets[n]) }));
}
