import type { components } from '@/lib/api/esquema';
import { formatearMonto } from '@/lib/monto';
import type { TipoVista } from '@/lib/tipo-vista';
import { mensajes } from '@/mensajes/es';

type Fila = components['schemas']['TotalCategoriaRespuesta'];

type Props = { filas: Fila[]; moneda: string; tipo: TipoVista };

export function DesgloseCategorias({ filas, moneda, tipo }: Props) {
  const visibles = filas.filter((f) => f.tipo === tipo);
  const maximo = Math.max(...visibles.map((f) => Number(f.total)), 0);
  const titulo =
    tipo === 'gasto' ? mensajes.dashboard.porCategoriaGastos : mensajes.dashboard.porCategoriaIngresos;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {visibles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{mensajes.dashboard.sinDatos}</p>
      ) : (
        <ul className="grid gap-3">
          {visibles.map((f) => (
            <li key={f.categoriaId ?? 'sin'} className="grid gap-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{f.categoriaId ? f.nombre : mensajes.dashboard.sinCategoria}</span>
                <span>{formatearMonto(f.total, moneda)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${maximo > 0 ? (Number(f.total) / maximo) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
