'use client';

import { esPorFecha, type OrdenVista } from '@/lib/orden-vista';
import { cn } from '@/lib/utils';
import { mensajes } from '@/mensajes/es';

const m = mensajes.dashboard.orden;

function Grupo<T extends string>({
  etiqueta,
  opciones,
  activo,
  onElegir,
}: {
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  activo: T;
  onElegir: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex rounded-full bg-muted p-0.5 text-xs">
      {opciones.map((o) => {
        const marcado = o.valor === activo;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={marcado}
            onClick={() => onElegir(o.valor)}
            className={cn(
              'rounded-full px-3 py-1 font-medium whitespace-nowrap transition-colors',
              marcado ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Recientes | Por fecha. Con "Por fecha" aparece la dirección: Más recientes | Más antiguos.
 * Volver a pulsar "Por fecha" conserva la dirección elegida.
 */
export function SelectorOrden({ valor, onCambio }: { valor: OrdenVista; onCambio: (o: OrdenVista) => void }) {
  const porFecha = esPorFecha(valor);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Grupo
        etiqueta={m.etiqueta}
        opciones={[
          { valor: 'reciente', texto: m.reciente },
          { valor: 'fecha', texto: m.fecha },
        ]}
        activo={porFecha ? 'fecha' : 'reciente'}
        onElegir={(v) => {
          if (v === 'reciente') onCambio('reciente');
          else if (!porFecha) onCambio('fecha');
        }}
      />
      {porFecha && (
        <Grupo
          etiqueta={m.direccion}
          opciones={[
            { valor: 'fecha', texto: m.masRecientes },
            { valor: 'fecha_asc', texto: m.masAntiguos },
          ]}
          activo={valor as 'fecha' | 'fecha_asc'}
          onElegir={onCambio}
        />
      )}
    </div>
  );
}
