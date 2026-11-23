'use client';

import type { Desconocida } from '@/lib/importacion/interpretar';
import { mensajes } from '@/mensajes/es';
import type { Eleccion } from './estado-asistente';

const m = mensajes.importar.categorias;

type Props = {
  desconocidas: Desconocida[];
  eleccion: Eleccion;
  hayCategoriaLote: boolean;
  onEleccion: (e: Eleccion) => void;
  ocupado: boolean;
};

export function PasoCategorias({ desconocidas, eleccion, hayCategoriaLote, onEleccion, ocupado }: Props) {
  const opciones: { valor: Eleccion; texto: string; deshabilitada?: boolean }[] = [
    { valor: 'crear', texto: m.crear },
    { valor: 'lote', texto: m.lote, deshabilitada: !hayCategoriaLote },
    { valor: 'ninguna', texto: m.ninguna },
  ];
  return (
    <div className="grid gap-4">
      <p className="text-sm">{m.descripcion}</p>
      <ul className="grid gap-1 text-sm">
        {desconocidas.map((d) => (
          <li key={`${d.tipo}|${d.nombre}`}>{m.filas(d.nombre, d.cantidad)}</li>
        ))}
      </ul>
      {desconocidas.some((d) => d.nombreLargo) && (
        <p role="note" className="text-sm text-amber-700 dark:text-amber-400">
          {m.nombreLargo}
        </p>
      )}
      <fieldset disabled={ocupado} className="grid gap-2">
        <legend className="sr-only">{m.titulo}</legend>
        {opciones.map((o) => (
          <label key={o.valor} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="eleccion-categorias"
              checked={eleccion === o.valor}
              disabled={o.deshabilitada}
              onChange={() => onEleccion(o.valor)}
            />
            {o.texto}
          </label>
        ))}
        {!hayCategoriaLote && <p className="text-xs text-muted-foreground">{m.loteSinElegir}</p>}
      </fieldset>
    </div>
  );
}
