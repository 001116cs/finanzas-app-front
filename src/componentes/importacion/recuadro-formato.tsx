'use client';

import { analizarMonto, leerFecha } from '@/lib/importacion/formatos';
import type { Celda } from '@/lib/importacion/tipos';
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
  /** Celdas de la columna de montos / fechas, para mostrar cómo se leerán. */
  muestrasMonto?: Celda[];
  muestrasFecha?: Celda[];
  onMonto: (f: FormatoMonto) => void;
  onFecha: (f: FormatoFecha) => void;
};

const MAX_EJEMPLOS = 3;

/** Primeras celdas de texto distintas (las numéricas y las fechas reales no dependen del formato). */
function primerasDeTexto(celdas: Celda[]): string[] {
  const vistas: string[] = [];
  for (const c of celdas) {
    if (typeof c.valor !== 'string') continue;
    const t = c.valor.trim();
    if (t && !vistas.includes(t)) vistas.push(t);
    if (vistas.length === MAX_EJEMPLOS) break;
  }
  return vistas;
}

/** Centavos con signo como "1.250,00" (separador de miles con punto, coma decimal). */
function mostrarCentavos(centavos: number): string {
  const a = Math.abs(centavos);
  const entero = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${centavos < 0 ? '-' : ''}${entero},${String(a % 100).padStart(2, '0')}`;
}

function mostrarFecha(iso: string): string {
  const [a, mes, d] = iso.split('-').map(Number);
  return `${d} ${m.meses[mes - 1]} ${a}`;
}

function Ejemplos({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground" data-testid="ejemplos-formato">
      {titulo} {items.join(' · ')}
    </p>
  );
}

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
export function RecuadroFormato({
  formatoMonto,
  formatoFecha,
  conFecha,
  pendiente,
  muestrasMonto = [],
  muestrasFecha = [],
  onMonto,
  onFecha,
}: Props) {
  const ejemplosMonto = primerasDeTexto(muestrasMonto).map((t) => {
    const r = analizarMonto({ valor: t, texto: t }, formatoMonto);
    return m.ejemplo(t, 'centavos' in r ? mostrarCentavos(r.centavos) : m.invalido);
  });
  const ejemplosFecha = primerasDeTexto(muestrasFecha).map((t) => {
    const iso = leerFecha({ valor: t, texto: t }, formatoFecha);
    return m.ejemplo(t, iso ? mostrarFecha(iso) : m.invalido);
  });
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
      <Ejemplos titulo={m.ejemplosMontos} items={ejemplosMonto} />
      {conFecha && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm font-medium">{m.fechas}</span>
          <Opcion nombre="formato-fecha" valor="dia_primero" actual={formatoFecha} texto={m.diaPrimero} onElegir={onFecha} />
          <Opcion nombre="formato-fecha" valor="mes_primero" actual={formatoFecha} texto={m.mesPrimero} onElegir={onFecha} />
        </div>
      )}
      {conFecha && <Ejemplos titulo={m.ejemplosFechas} items={ejemplosFecha} />}
    </div>
  );
}
