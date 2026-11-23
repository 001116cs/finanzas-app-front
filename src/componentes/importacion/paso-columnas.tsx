'use client';

import { Label } from '@/components/ui/label';
import type { components } from '@/lib/api/esquema';
import { mensajes } from '@/mensajes/es';
import type { Derivados } from './derivar';
import type { Accion, Estado, Signos } from './estado-asistente';
import { RecuadroFormato } from './recuadro-formato';

type Categoria = components['schemas']['CategoriaRespuesta'];
const m = mensajes.importar.columnas;
const CLASE_SELECT = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm';
const FILAS_MUESTRA = 6;
const MAX_FILA_ENCABEZADO = 20;

type Props = {
  estado: Estado;
  derivados: Derivados;
  categorias: Categoria[];
  dispatch: (a: Accion) => void;
  /** Hay una consulta en curso: nada del paso se puede cambiar. */
  ocupado: boolean;
};

function Selector({
  id,
  etiqueta,
  valor,
  opciones,
  vacio,
  onCambio,
}: {
  id: string;
  etiqueta: string;
  valor: number | undefined;
  opciones: { valor: number; texto: string }[];
  vacio: string;
  onCambio: (v: number | undefined) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <select
        id={id}
        value={valor ?? ''}
        onChange={(e) => onCambio(e.target.value === '' ? undefined : Number(e.target.value))}
        className={CLASE_SELECT}
      >
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PasoColumnas({ estado, derivados, categorias, dispatch, ocupado }: Props) {
  const { hoja, interpretacion, esAmbos } = derivados;
  if (!hoja) return null;
  const cambiar = (cambios: Partial<Estado>) => dispatch({ tipo: 'cambiar', cambios });
  const encabezados = hoja.filas[estado.encabezado] ?? [];
  const anchura = Math.max(...hoja.filas.slice(0, FILAS_MUESTRA + estado.encabezado).map((f) => f.length), encabezados.length);
  const opciones = Array.from({ length: anchura }, (_, i) => ({
    valor: i,
    texto: encabezados[i]?.texto.trim() || m.columna(i + 1),
  }));
  const muestra = hoja.filas.slice(0, Math.max(FILAS_MUESTRA, estado.encabezado + 3));
  const filasEncabezado = Math.min(MAX_FILA_ENCABEZADO, hoja.filas.length);
  const delTipo = categorias.filter((c) => c.tipo === estado.tipoLote);
  const claveBase = `${estado.hoja}|${estado.encabezado}`;

  return (
    <fieldset disabled={ocupado} className="grid min-w-0 gap-4">
      <section aria-label={m.muestra} className="grid min-w-0 gap-2">
        <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <tbody>
              {muestra.map((fila, i) => (
                <tr key={i} className={i === estado.encabezado ? 'bg-muted font-semibold' : undefined}>
                  <th scope="row" className="px-2 py-1 text-left font-normal text-muted-foreground">
                    {i + 1}
                  </th>
                  {Array.from({ length: anchura }, (_, c) => (
                    <td key={c} className="max-w-40 truncate whitespace-nowrap px-2 py-1">
                      {fila[c]?.texto ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="fila-encabezado" className="whitespace-nowrap">
            {m.filaEncabezado}
          </Label>
          <select
            id="fila-encabezado"
            aria-label={m.cambiar}
            value={estado.encabezado}
            onChange={(e) => dispatch({ tipo: 'encabezado', fila: Number(e.target.value) })}
            className="h-8 w-20 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {Array.from({ length: filasEncabezado }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Selector id="col-descripcion" etiqueta={m.descripcion} valor={estado.descripcion} opciones={opciones} vacio={m.elegir} onCambio={(v) => cambiar({ descripcion: v })} />
        <Selector id="col-monto" etiqueta={m.monto} valor={estado.monto} opciones={opciones} vacio={m.elegir} onCambio={(v) => cambiar({ monto: v })} />
        <Selector id="col-fecha" etiqueta={m.fecha} valor={estado.fecha} opciones={opciones} vacio={m.ninguna} onCambio={(v) => cambiar({ fecha: v })} />
        <Selector id="col-categoria" etiqueta={m.categoria} valor={estado.categoria} opciones={opciones} vacio={m.ninguna} onCambio={(v) => cambiar({ categoria: v })} />
      </div>

      {estado.monto !== undefined && (
        <RecuadroFormato
          formatoMonto={derivados.formatoMonto}
          formatoFecha={derivados.formatoFecha}
          conFecha={estado.fecha !== undefined}
          pendiente={derivados.montoPendiente || derivados.fechaPendiente}
          onMonto={(valor) => cambiar({ formatoMonto: { clave: `${claveBase}|${estado.monto}`, valor } })}
          onFecha={(valor) => cambiar({ formatoFecha: { clave: `${claveBase}|${estado.fecha}`, valor } })}
        />
      )}

      {interpretacion?.hayMixtos && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{mensajes.importar.signos.pregunta}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(['positivos', 'negativos', 'ambos'] as Signos[]).map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="signos"
                  checked={estado.signos === s}
                  onChange={() => cambiar({ signos: s })}
                />
                {mensajes.importar.signos[s]}
              </label>
            ))}
          </div>
          {estado.signos === 'ambos' && (
            <p className="text-xs text-muted-foreground">{mensajes.importar.signos.ayudaAmbos}</p>
          )}
        </fieldset>
      )}

      {!esAmbos && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tipo-lote">{m.tipoLote}</Label>
            <select
              id="tipo-lote"
              value={estado.tipoLote}
              onChange={(e) => cambiar({ tipoLote: e.target.value as Estado['tipoLote'], categoriaLoteId: undefined })}
              className={CLASE_SELECT}
            >
              <option value="gasto">{m.gastos}</option>
              <option value="ingreso">{m.ingresos}</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="categoria-lote">{m.categoriaLote}</Label>
            <select
              id="categoria-lote"
              value={estado.categoriaLoteId ?? ''}
              onChange={(e) => cambiar({ categoriaLoteId: e.target.value || undefined })}
              className={CLASE_SELECT}
            >
              <option value="">{m.sinCategoriaLote}</option>
              {delTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {interpretacion && interpretacion.filas.length === 0 && estado.monto !== undefined && (
        <p className="text-sm text-destructive">{m.sinFilas}</p>
      )}
    </fieldset>
  );
}
