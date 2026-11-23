'use client';

import { useRef, type KeyboardEvent } from 'react';
import type { TipoVista } from '@/lib/tipo-vista';
import { cn } from '@/lib/utils';
import { mensajes } from '@/mensajes/es';

const OPCIONES: { valor: TipoVista; texto: string }[] = [
  { valor: 'gasto', texto: mensajes.tipoVista.gasto },
  { valor: 'ingreso', texto: mensajes.tipoVista.ingreso },
];

/** Control segmentado Gastos | Ingresos con una pastilla que se desliza. */
export function SelectorTipo({
  valor,
  onCambio,
}: {
  valor: TipoVista;
  onCambio: (t: TipoVista) => void;
}) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    // Con dos opciones, cualquier flecha pasa a la otra.
    const siguiente = valor === 'gasto' ? 1 : 0;
    onCambio(OPCIONES[siguiente].valor);
    botones.current[siguiente]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={mensajes.tipoVista.etiqueta}
      onKeyDown={alTeclear}
      className="relative grid grid-cols-2 rounded-full bg-muted p-1"
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm',
          'transition-transform duration-200 ease-out motion-reduce:transition-none',
          valor === 'ingreso' && 'translate-x-full',
        )}
      />
      {OPCIONES.map((o, i) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            ref={(el) => {
              botones.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={activo}
            tabIndex={activo ? 0 : -1}
            onClick={() => onCambio(o.valor)}
            className={cn(
              'relative z-10 rounded-full py-2 text-sm font-medium transition-colors',
              activo ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
