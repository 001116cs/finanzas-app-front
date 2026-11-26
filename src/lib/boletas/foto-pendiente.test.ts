import { afterEach, describe, expect, it } from 'vitest';
import { descartarFotoPendiente, guardarFotoPendiente, leerFotoPendiente } from './foto-pendiente';

afterEach(() => descartarFotoPendiente());

describe('foto pendiente', () => {
  it('guarda la foto hasta descartarla; leerla no la borra', () => {
    expect(leerFotoPendiente()).toBeNull();
    const foto = new File(['a'], 'b.jpg', { type: 'image/jpeg' });
    guardarFotoPendiente(foto);
    expect(leerFotoPendiente()).toBe(foto);
    expect(leerFotoPendiente()).toBe(foto);
    descartarFotoPendiente();
    expect(leerFotoPendiente()).toBeNull();
  });
});
