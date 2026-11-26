import { afterEach, describe, expect, it, vi } from 'vitest';
import { abrirCamara, detenerCamara, esDispositivoTactil, motivoErrorCamara } from './camara-web';

const error = (name: string) => Object.assign(new Error(name), { name });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('esDispositivoTactil', () => {
  it('usa el puntero "coarse" para detectar celular o tablet', () => {
    const matchMedia = vi.fn((q: string) => ({ matches: q === '(pointer: coarse)' }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(esDispositivoTactil()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
  });

  it('en un PC con ratón es false', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(esDispositivoTactil()).toBe(false);
  });
});

describe('motivoErrorCamara', () => {
  it('clasifica los errores de getUserMedia', () => {
    expect(motivoErrorCamara(error('NotAllowedError'))).toBe('permiso');
    expect(motivoErrorCamara(error('SecurityError'))).toBe('permiso');
    expect(motivoErrorCamara(error('NotFoundError'))).toBe('sin_camara');
    expect(motivoErrorCamara(error('OverconstrainedError'))).toBe('sin_camara');
    expect(motivoErrorCamara(error('NotReadableError'))).toBe('ocupada');
    expect(motivoErrorCamara(new Error('CAMARA_NO_DISPONIBLE'))).toBe('no_disponible');
    expect(motivoErrorCamara(new Error('otra cosa'))).toBe('otro');
    expect(motivoErrorCamara('x')).toBe('otro');
  });
});

describe('abrirCamara', () => {
  it('sin mediaDevices (navegador sin soporte o http) lanza CAMARA_NO_DISPONIBLE', async () => {
    vi.stubGlobal('navigator', {});
    await expect(abrirCamara()).rejects.toThrow('CAMARA_NO_DISPONIBLE');
  });

  it('pide sólo vídeo, preferiendo la cámara trasera', async () => {
    const stream = { getTracks: () => [] };
    const getUserMedia = vi.fn(async () => stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(abrirCamara()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) }),
    );
  });
});

describe('detenerCamara', () => {
  it('detiene todas las pistas', () => {
    const stop = vi.fn();
    detenerCamara({ getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
