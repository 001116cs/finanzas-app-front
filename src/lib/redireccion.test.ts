import { describe, expect, it } from 'vitest';
import { decidirRedireccion } from './redireccion';

describe('decidirRedireccion', () => {
  it('sin sesión en ruta privada va a /login', () => {
    expect(decidirRedireccion('/', false)).toBe('/login');
    expect(decidirRedireccion('/categorias', false)).toBe('/login');
  });
  it('con sesión en rutas públicas va a /', () => {
    expect(decidirRedireccion('/login', true)).toBe('/');
    expect(decidirRedireccion('/registro', true)).toBe('/');
  });
  it('sin sesión en rutas públicas no redirige', () => {
    expect(decidirRedireccion('/login', false)).toBeNull();
    expect(decidirRedireccion('/registro', false)).toBeNull();
  });
  it('con sesión en rutas privadas no redirige', () => {
    expect(decidirRedireccion('/', true)).toBeNull();
    expect(decidirRedireccion('/ajustes', true)).toBeNull();
  });
  it('/salir pasa siempre, con o sin sesión', () => {
    expect(decidirRedireccion('/salir', true)).toBeNull();
    expect(decidirRedireccion('/salir', false)).toBeNull();
  });
});
