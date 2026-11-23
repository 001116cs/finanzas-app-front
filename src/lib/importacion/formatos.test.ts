import { describe, expect, it } from 'vitest';
import {
  analizarMonto,
  detectarFormatoFecha,
  detectarFormatoMonto,
  fechaLocalISO,
  leerFecha,
  leerMonto,
} from './formatos';
import type { Celda } from './tipos';

const t = (s: string): Celda => ({ valor: s, texto: s });
const n = (v: number): Celda => ({ valor: v, texto: String(v) });
const d = (y: number, m: number, dia: number): Celda => ({ valor: new Date(y, m - 1, dia), texto: '' });
const vacia: Celda = { valor: null, texto: '' };

describe('leerMonto', () => {
  it.each([
    ['-45,00', 'coma_decimal', -4500],
    ['3.500,00', 'coma_decimal', 350000],
    ['1,250.00', 'punto_decimal', 125000],
    ['(45,00)', 'coma_decimal', -4500],
    ['S/ 12,50', 'coma_decimal', 1250],
    ['S/. 12,50', 'coma_decimal', 1250],
    ['45-', 'coma_decimal', -4500],
    ['+45', 'coma_decimal', 4500],
    ['1 234,50', 'coma_decimal', 123450], // §5.3: se quitan los espacios
    ['PEN 1.234,5', 'coma_decimal', 123450],
    ['$ 1,234.56 USD', 'punto_decimal', 123456],
    ['€12', 'coma_decimal', 1200],
    ['1.250.000', 'coma_decimal', 125000000],
    ['1.250', 'coma_decimal', 125000],
    ['1.250', 'punto_decimal', 125],
    ['12,340', 'coma_decimal', 1234], // ceros finales no son decimales significativos
    ['0', 'coma_decimal', 0],
    ['1234567890', 'coma_decimal', 123456789000],
  ] as const)('%s (%s) ⇒ %d', (s, f, esperado) => {
    expect(leerMonto(t(s), f)).toBe(esperado);
  });

  it.each([
    ['--', 'coma_decimal'],
    ['', 'coma_decimal'],
    ['abc', 'coma_decimal'],
    ['12,345', 'coma_decimal'], // 3 decimales
    ['12345678901', 'coma_decimal'], // 11 dígitos enteros
    ['1,25,0', 'coma_decimal'],
    ['1.25', 'coma_decimal'], // miles mal agrupados: no adivinar
    ['480.00', 'coma_decimal'],
    ['--45', 'coma_decimal'],
    ['-45-', 'coma_decimal'],
    ['(-45)', 'coma_decimal'],
  ] as const)('%s (%s) ⇒ null', (s, f) => {
    expect(leerMonto(t(s), f)).toBeNull();
  });

  it('motivos: demasiados_decimales vs monto_invalido', () => {
    expect(analizarMonto(t('12,345'), 'coma_decimal')).toEqual({ motivo: 'demasiados_decimales' });
    expect(analizarMonto(t('12.345'), 'punto_decimal')).toEqual({ motivo: 'demasiados_decimales' });
    expect(analizarMonto(t('--'), 'coma_decimal')).toEqual({ motivo: 'monto_invalido' });
    expect(analizarMonto(vacia, 'coma_decimal')).toEqual({ motivo: 'monto_invalido' });
    expect(analizarMonto(t('12345678901'), 'coma_decimal')).toEqual({ motivo: 'monto_invalido' });
  });

  it('celdas numéricas: tal cual, el formato no influye', () => {
    expect(leerMonto(n(12.5), 'coma_decimal')).toBe(1250);
    expect(leerMonto(n(12.5), 'punto_decimal')).toBe(1250);
    expect(leerMonto(n(-143.8), 'coma_decimal')).toBe(-14380);
    expect(leerMonto(n(0.1 + 0.2), 'coma_decimal')).toBe(30);
    expect(leerMonto(n(0), 'coma_decimal')).toBe(0);
    expect(analizarMonto(n(1.005), 'coma_decimal')).toEqual({ motivo: 'demasiados_decimales' });
    expect(leerMonto(n(12345678901), 'coma_decimal')).toBeNull();
    expect(leerMonto(n(Number.NaN), 'coma_decimal')).toBeNull();
  });

  it('celda fecha o vacía ⇒ null', () => {
    expect(leerMonto(d(2026, 1, 1), 'coma_decimal')).toBeNull();
    expect(leerMonto(vacia, 'coma_decimal')).toBeNull();
  });
});

describe('detectarFormatoMonto', () => {
  it('1.250 y 2.300 solos ⇒ ambiguo (preselecciona coma)', () => {
    expect(detectarFormatoMonto([t('1.250'), t('2.300')])).toEqual({ formato: 'coma_decimal', ambiguo: true });
    expect(detectarFormatoMonto([t('1,250'), t('2,300')])).toEqual({ formato: 'coma_decimal', ambiguo: true });
  });
  it('1.250 con 45,50 ⇒ coma decimal claro', () => {
    expect(detectarFormatoMonto([t('1.250'), t('45,50')])).toEqual({ formato: 'coma_decimal', ambiguo: false });
  });
  it('480.00 ⇒ punto decimal claro', () => {
    expect(detectarFormatoMonto([t('480.00')])).toEqual({ formato: 'punto_decimal', ambiguo: false });
  });
  it('ambos separadores: el último es el decimal', () => {
    expect(detectarFormatoMonto([t('1.234,50')])).toEqual({ formato: 'coma_decimal', ambiguo: false });
    expect(detectarFormatoMonto([t('1,234.50')])).toEqual({ formato: 'punto_decimal', ambiguo: false });
  });
  it('separador repetido ⇒ es de miles', () => {
    expect(detectarFormatoMonto([t('1.250.000')])).toEqual({ formato: 'coma_decimal', ambiguo: false });
    expect(detectarFormatoMonto([t('1,250,000')])).toEqual({ formato: 'punto_decimal', ambiguo: false });
  });
  it('-- y 45 ⇒ no ambiguo; sin separadores ⇒ no ambiguo', () => {
    expect(detectarFormatoMonto([t('--'), t('45')])).toEqual({ formato: 'coma_decimal', ambiguo: false });
    expect(detectarFormatoMonto([t('45'), t('120')])).toEqual({ formato: 'coma_decimal', ambiguo: false });
    expect(detectarFormatoMonto([])).toEqual({ formato: 'coma_decimal', ambiguo: false });
  });
  it('celdas numéricas no influyen', () => {
    expect(detectarFormatoMonto([n(12.5), n(3.5), t('1.250')])).toEqual({ formato: 'coma_decimal', ambiguo: true });
    expect(detectarFormatoMonto([n(12.5), vacia])).toEqual({ formato: 'coma_decimal', ambiguo: false });
  });
  it('con signos y moneda', () => {
    expect(detectarFormatoMonto([t('-45,00'), t('S/ 3.500,00')])).toEqual({ formato: 'coma_decimal', ambiguo: false });
    expect(detectarFormatoMonto([t('(1,250.5)')])).toEqual({ formato: 'punto_decimal', ambiguo: false });
  });
  it('evidencias contradictorias ⇒ ambiguo', () => {
    expect(detectarFormatoMonto([t('45,50'), t('480.00')]).ambiguo).toBe(true);
  });
});

describe('detectarFormatoFecha', () => {
  it('primer número > 12 ⇒ día primero claro', () => {
    expect(detectarFormatoFecha([t('02/11/2026'), t('15/11/2026')])).toEqual({ formato: 'dia_primero', ambiguo: false });
  });
  it('segundo número > 12 ⇒ mes primero claro', () => {
    expect(detectarFormatoFecha([t('11/15/2026')])).toEqual({ formato: 'mes_primero', ambiguo: false });
  });
  it('todas ≤ 12 ⇒ ambiguo, preselecciona día primero', () => {
    expect(detectarFormatoFecha([t('03/11/2026'), t('05/10/2026')])).toEqual({ formato: 'dia_primero', ambiguo: true });
    expect(detectarFormatoFecha([t('03-11-26')])).toEqual({ formato: 'dia_primero', ambiguo: true });
  });
  it('celdas Date e ISO ⇒ claro', () => {
    expect(detectarFormatoFecha([d(2026, 11, 1), d(2026, 11, 3)])).toEqual({ formato: 'dia_primero', ambiguo: false });
    expect(detectarFormatoFecha([t('2026-10-05'), t('2026-11-02')])).toEqual({ formato: 'dia_primero', ambiguo: false });
    expect(detectarFormatoFecha([t('2026-10-05'), t('03/04/2026')]).ambiguo).toBe(true);
  });
  it('textos que no son fecha no cuentan', () => {
    expect(detectarFormatoFecha([t('ayer'), vacia])).toEqual({ formato: 'dia_primero', ambiguo: false });
  });
  it('evidencias contradictorias ⇒ ambiguo', () => {
    expect(detectarFormatoFecha([t('15/11/2026'), t('11/15/2026')]).ambiguo).toBe(true);
  });
});

describe('leerFecha', () => {
  it.each([
    ['02/11/2026', 'dia_primero', '2026-11-02'],
    ['02/11/2026', 'mes_primero', '2026-02-11'],
    ['2-11-2026', 'dia_primero', '2026-11-02'],
    ['02/11/26', 'dia_primero', '2026-11-02'],
    ['11/15/2026', 'mes_primero', '2026-11-15'],
    ['2026-10-05', 'mes_primero', '2026-10-05'],
    [' 2026-1-5 ', 'dia_primero', '2026-01-05'],
    ['29/02/2028', 'dia_primero', '2028-02-29'],
  ] as const)('%s (%s) ⇒ %s', (s, f, esperado) => {
    expect(leerFecha(t(s), f)).toBe(esperado);
  });

  it.each([
    ['11/15/2026', 'dia_primero'],
    ['31/02/2026', 'dia_primero'],
    ['29/02/2026', 'dia_primero'],
    ['2026-13-01', 'dia_primero'],
    ['02/11-2026', 'dia_primero'],
    ['ayer', 'dia_primero'],
    ['', 'dia_primero'],
    ['02/11/202', 'dia_primero'],
  ] as const)('%s (%s) ⇒ null', (s, f) => {
    expect(leerFecha(t(s), f)).toBeNull();
  });

  it('celda Date ⇒ día local, sin importar el formato', () => {
    expect(leerFecha(d(2026, 11, 1), 'mes_primero')).toBe('2026-11-01');
    expect(leerFecha(d(2026, 1, 31), 'dia_primero')).toBe('2026-01-31');
  });

  it('número, vacía o Date inválida ⇒ null', () => {
    expect(leerFecha(n(46000), 'dia_primero')).toBeNull();
    expect(leerFecha(vacia, 'dia_primero')).toBeNull();
    expect(leerFecha({ valor: new Date(Number.NaN), texto: '' }, 'dia_primero')).toBeNull();
  });
});

describe('fechaLocalISO', () => {
  it('usa los componentes locales (medianoche local no cambia de día)', () => {
    expect(fechaLocalISO(new Date(2026, 10, 1))).toBe('2026-11-01');
    expect(fechaLocalISO(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });
});
