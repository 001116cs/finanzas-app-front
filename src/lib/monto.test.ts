import { describe, expect, it } from 'vitest';
import { formatearMonto, normalizarMontoEntrada } from './monto';

describe('normalizarMontoEntrada', () => {
  it('acepta coma y punto decimal', () => {
    expect(normalizarMontoEntrada('12,5')).toBe('12.50');
    expect(normalizarMontoEntrada('12.5')).toBe('12.50');
    expect(normalizarMontoEntrada('12')).toBe('12.00');
    expect(normalizarMontoEntrada('0,01')).toBe('0.01');
    expect(normalizarMontoEntrada('9999999999.99')).toBe('9999999999.99');
    expect(normalizarMontoEntrada('00000000012')).toBe('12.00');
  });

  it.each(['0', '0.00', '-1', '1.234', 'abc', '', '1,2,3', '1e3', ' 5 ', '12345678901', '12345678901,5'])(
    'rechaza %j',
    (entrada) => {
      expect(normalizarMontoEntrada(entrada)).toBeNull();
    },
  );
});

describe('formatearMonto', () => {
  it('formatea con la moneda indicada', () => {
    const texto = formatearMonto('1234.50', 'PEN');
    expect(texto).toMatch(/1\.?234,50|1,234\.50|1\s?234,50/);
    expect(texto).toMatch(/PEN|S\/|S\/\./);
  });
});
