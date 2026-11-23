'use client';

import { cn } from '@/lib/utils';
import type { FormatoFecha, FormatoMonto } from '@/lib/importacion/formatos';
import { mensajes } from '@/mensajes/es';

const m = mensajes.importar.formato;

type Props = {
  formatoMonto: FormatoMonto;
  formatoFecha: FormatoFecha;
  /** Si hay columna de fecha mapeada. */
  conFecha: boolean;
  /** La detección fue ambigua y falta confirmar. */
  pendiente: boolean;
  onMonto: (f: FormatoMonto) => void;
  onFecha: (f: FormatoFecha) => void;
};

function Opcion<F extends string>({
  nombre,
  valor,
  actual,
  texto,
  onElegir,
}: {
  nombre: string;
  valor: F;
  actual: F;
  texto: string;
  onElegir: (f: F) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <input
        type="radio"
        name={nombre}
        checked={actual === valor}
        // onClick además de onChange: elegir la opción ya marcada también confirma.
        onClick={() => onElegir(valor)}
        onChange={() => onElegir(valor)}
      />
      {texto}
    </label>
  );
}

/** Recuadro de formato de §5.1: resaltado y sin avanzar hasta confirmar cuando la detección es ambigua. */
export function RecuadroFormato({ formatoMonto, formatoFecha, conFecha, pendiente, onMonto, onFecha }: Props) {
  return (
    <div
      role="group"
      aria-label={m.titulo}
      data-testid="recuadro-formato"
      data-resaltado={pendiente ? 'true' : 'false'}
      className={cn('grid gap-3 rounded-lg border p-3', pendiente && 'border-amber-500 bg-amber-50 dark:bg-amber-950/30')}
    >
      {pendiente && <p className="text-sm font-medium">{m.ambiguo}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm font-medium">{m.montos}</span>
        <Opcion nombre="formato-monto" valor="coma_decimal" actual={formatoMonto} texto={m.montoComa} onElegir={onMonto} />
        <Opcion nombre="formato-monto" valor="punto_decimal" actual={formatoMonto} texto={m.montoPunto} onElegir={onMonto} />
      </div>
      {conFecha && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm font-medium">{m.fechas}</span>
          <Opcion nombre="formato-fecha" valor="dia_primero" actual={formatoFecha} texto={m.diaPrimero} onElegir={onFecha} />
          <Opcion nombre="formato-fecha" valor="mes_primero" actual={formatoFecha} texto={m.mesPrimero} onElegir={onFecha} />
        </div>
      )}
    </div>
  );
}
