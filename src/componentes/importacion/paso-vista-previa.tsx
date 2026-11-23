'use client';

import type { components } from '@/lib/api/esquema';
import { formatearFecha } from '@/lib/fechas';
import type { FilaInterpretada, FilaParaEnviar, Interpretacion } from '@/lib/importacion/interpretar';
import type { Hoja } from '@/lib/importacion/tipos';
import { formatearMonto } from '@/lib/monto';
import { cn } from '@/lib/utils';
import { mensajes } from '@/mensajes/es';
import type { ModoDuplicadas } from './estado-asistente';

type Categoria = components['schemas']['CategoriaRespuesta'];
const m = mensajes.importar.vista;
const MAX_VISIBLES = 200;

const centavos = (monto: string) => Number(monto.replace('.', ''));
const aMonto = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

/** Filas de la vista previa que se enviarían: ni desmarcadas ni omitidas por duplicadas. */
export function seleccionadas(
  filas: FilaInterpretada[],
  desmarcadas: ReadonlySet<number>,
  duplicadas: ReadonlySet<number>,
  modo: ModoDuplicadas | null,
): FilaInterpretada[] {
  return filas.filter(
    (f) => !desmarcadas.has(f.origen) && !(modo === 'omitir' && duplicadas.has(f.origen)),
  );
}

type Props = {
  hoja: Hoja;
  columnaDescripcion: number;
  interpretacion: Interpretacion;
  /** Resolución de categorías para cada fila de `interpretacion.filas`, en el mismo orden. */
  resueltas: FilaParaEnviar[];
  categorias: Categoria[];
  moneda: string;
  duplicadas: ReadonlySet<number>;
  modoDuplicadas: ModoDuplicadas | null;
  desmarcadas: ReadonlySet<number>;
  demasiadas: boolean;
  /** Fila de la hoja (0-based) que el back rechazó. */
  filaConError: number | null;
  onAlternar: (origen: number) => void;
};

export function PasoVistaPrevia({
  hoja,
  columnaDescripcion,
  interpretacion,
  resueltas,
  categorias,
  moneda,
  duplicadas,
  modoDuplicadas,
  desmarcadas,
  demasiadas,
  filaConError,
  onAlternar,
}: Props) {
  const omitirDup = modoDuplicadas === 'omitir';
  const elegidas = seleccionadas(interpretacion.filas, desmarcadas, duplicadas, modoDuplicadas);
  const total = (tipo: 'gasto' | 'ingreso') =>
    aMonto(elegidas.filter((f) => f.tipo === tipo).reduce((s, f) => s + centavos(f.monto), 0));
  const omitidas = interpretacion.excluidas.length + (omitirDup ? duplicadas.size : 0);

  const etiquetaCategoria = (r: FilaParaEnviar) => {
    if (r.categoriaNueva) return m.categoriaNueva(r.categoriaNueva);
    return categorias.find((c) => c.id === r.categoriaId)?.nombre ?? m.sinCategoria;
  };

  type Item =
    | { origen: number; clase: 'fila'; fila: FilaInterpretada; resuelta: FilaParaEnviar }
    | { origen: number; clase: 'excluida'; motivo: string; descripcion: string };
  const items: Item[] = [
    ...interpretacion.filas.map((fila, i): Item => ({ origen: fila.origen, clase: 'fila', fila, resuelta: resueltas[i] })),
    ...interpretacion.excluidas.map(
      (x): Item => ({
        origen: x.fila,
        clase: 'excluida',
        motivo: mensajes.importar.motivos[x.motivo],
        descripcion: hoja.filas[x.fila]?.[columnaDescripcion]?.texto.trim() ?? '',
      }),
    ),
  ].sort((a, b) => a.origen - b.origen);
  // Con más de 2.000 filas no se pinta todo (un celular se congelaría); la fila con error siempre se ve.
  const visibles = demasiadas
    ? items.filter((it, i) => i < MAX_VISIBLES || it.origen === filaConError)
    : items;

  return (
    <div className="grid gap-3">
      <p data-testid="resumen-importacion" className="text-sm font-medium">
        {m.resumen(elegidas.length, omitidas, formatearMonto(total('gasto'), moneda), formatearMonto(total('ingreso'), moneda))}
      </p>
      {demasiadas && (
        <p role="alert" className="text-sm text-destructive">
          {m.demasiadas}
        </p>
      )}
      <div
        aria-hidden
        className="hidden grid-cols-[1.5rem_6rem_1fr_8rem_5rem_9rem] gap-2 px-2 text-xs font-medium text-muted-foreground sm:grid"
      >
        <span />
        <span>{m.fecha}</span>
        <span>{m.descripcion}</span>
        <span className="text-right">{m.monto}</span>
        <span>{m.tipo}</span>
        <span>{m.categoria}</span>
      </div>
      {visibles.length < items.length && (
        <p className="text-xs text-muted-foreground">{m.limitada(visibles.length, items.length)}</p>
      )}
      <ul aria-label={m.lista} className="grid gap-2">
        {visibles.map((it) => {
          if (it.clase === 'excluida') {
            return (
              <li key={`x${it.origen}`} className="rounded-lg border border-dashed p-2 text-sm text-muted-foreground">
                <span className="line-through">{it.descripcion || '—'}</span>
                <span className="ml-2 text-xs">{it.motivo}</span>
              </li>
            );
          }
          const { fila, resuelta } = it;
          if (omitirDup && duplicadas.has(fila.origen)) {
            return (
              <li key={fila.origen} className="rounded-lg border border-dashed p-2 text-sm text-muted-foreground">
                <span className="line-through">{fila.descripcion}</span>
                <span className="ml-2 text-xs">{mensajes.importar.duplicados.omitida}</span>
              </li>
            );
          }
          const esDup = modoDuplicadas === 'revisar' && duplicadas.has(fila.origen);
          const marcada = !desmarcadas.has(fila.origen);
          const conError = fila.origen === filaConError;
          return (
            <li
              key={fila.origen}
              data-duplicada={esDup ? 'true' : undefined}
              data-error={conError ? 'true' : undefined}
              className={cn(
                'grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-2 gap-y-0.5 rounded-lg border p-2 text-sm',
                'sm:grid-cols-[1.5rem_6rem_1fr_8rem_5rem_9rem]',
                esDup && 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
                conError && 'border-destructive bg-destructive/10',
                !marcada && 'text-muted-foreground',
              )}
            >
              <input
                type="checkbox"
                aria-label={m.incluir(fila.descripcion)}
                checked={marcada}
                onChange={() => onAlternar(fila.origen)}
                className="row-span-2 sm:row-span-1"
              />
              <span className="col-start-3 row-start-1 text-xs text-muted-foreground sm:col-start-2 sm:text-sm sm:text-foreground">
                {fila.fecha ? formatearFecha(fila.fecha) : m.hoy}
              </span>
              <span className="col-start-2 row-start-1 min-w-0 break-words font-medium sm:col-start-3 sm:font-normal">
                {fila.descripcion}
              </span>
              <span className="col-start-3 row-start-2 text-right tabular-nums sm:col-start-4 sm:row-start-1">
                {formatearMonto(fila.monto, moneda)}
              </span>
              <span className="col-start-2 row-start-2 text-xs sm:col-start-5 sm:row-start-1 sm:text-sm">
                {fila.tipo === 'gasto' ? m.gasto : m.ingreso}
                <span className="sm:hidden"> · {etiquetaCategoria(resuelta)}</span>
              </span>
              <span className="hidden sm:col-start-6 sm:block">{etiquetaCategoria(resuelta)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
