import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/esquema';
import { formatearFecha } from '@/lib/fechas';
import { formatearMonto } from '@/lib/monto';
import { mensajes } from '@/mensajes/es';

type Transaccion = components['schemas']['TransaccionRespuesta'];

type Props = {
  items: Transaccion[];
  total: number;
  moneda: string;
  cargandoMas: boolean;
  onEditar: (t: Transaccion) => void;
  onCargarMas: () => void;
  acciones?: React.ReactNode;
};

export function ListaMovimientos({ items, total, moneda, cargandoMas, onEditar, onCargarMas, acciones }: Props) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{mensajes.dashboard.movimientos}</h2>
        {acciones}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{mensajes.dashboard.sinMovimientos}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onEditar(t)}
                aria-label={`${mensajes.acciones.editar}: ${t.descripcion}`}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                <span className="grid min-w-0">
                  <span className="truncate font-medium">{t.descripcion}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatearFecha(t.fecha)} · {t.categoriaNombre ?? mensajes.dashboard.sinCategoria}
                  </span>
                </span>
                <span className={t.tipo === 'gasto' ? 'shrink-0 text-red-600' : 'shrink-0 text-green-700'}>
                  {t.tipo === 'gasto' ? '-' : '+'}
                  {formatearMonto(t.monto, moneda)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < total && (
        <Button variant="outline" onClick={onCargarMas} disabled={cargandoMas}>
          {cargandoMas ? mensajes.dashboard.cargando : mensajes.dashboard.cargarMas}
        </Button>
      )}
    </section>
  );
}
