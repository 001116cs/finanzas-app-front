'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { leerArchivo } from '@/lib/importacion/leer-archivo';
import type { Hoja } from '@/lib/importacion/tipos';
import { mensajes } from '@/mensajes/es';

const m = mensajes.importar.archivo;
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONES = /\.(xlsx|xls|csv)$/i;

type Props = {
  nombreArchivo: string;
  hojas: Hoja[];
  hoja: number;
  onLeido: (nombre: string, hojas: Hoja[]) => void;
  onHoja: (indice: number) => void;
};

export function PasoArchivo({ nombreArchivo, hojas, hoja, onLeido, onHoja }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    if (!EXTENSIONES.test(archivo.name)) return fallar(m.extension);
    if (archivo.size > MAX_BYTES) return fallar(m.tamano);
    try {
      const leidas = leerArchivo(await archivo.arrayBuffer(), archivo.name);
      if (!leidas.some((h) => h.filas.length > 0)) return fallar(m.vacio);
      onLeido(archivo.name, leidas);
    } catch {
      fallar(m.ilegible);
    }
  }
  function fallar(mensaje: string) {
    setError(mensaje);
    onLeido('', []);
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="archivo-importacion">{m.etiqueta}</Label>
        <input
          id="archivo-importacion"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            void elegir(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="w-full text-sm file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:py-1.5 file:text-sm"
        />
        <p className="text-xs text-muted-foreground">{m.ayuda}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {nombreArchivo && <p className="text-sm">{m.seleccionado(nombreArchivo)}</p>}
      {hojas.length > 1 && (
        <div className="grid gap-2">
          <Label htmlFor="hoja-importacion">{m.hoja}</Label>
          <select
            id="hoja-importacion"
            value={hoja}
            onChange={(e) => onHoja(Number(e.target.value))}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {hojas.map((h, i) => (
              <option key={i} value={i}>
                {h.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
