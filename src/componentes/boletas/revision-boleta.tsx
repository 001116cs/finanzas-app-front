'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { guardarBoleta, type LecturaBoleta } from '@/lib/api/boletas';
import { ErrorApi } from '@/lib/api/cliente';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { useCategorias } from '@/lib/usar-datos-periodo';
import { mensajes } from '@/mensajes/es';
import {
  aDatosGuardar,
  diferenciaConTotal,
  estadoInicial,
  filaInvalida,
  puedeGuardar,
  reducirRevision,
  sumaCentavos,
} from './estado-revision';

const selectClase = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm';

function hoyLocal(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// El cliente no conoce la moneda del perfil: las sumas se muestran como número con 2 decimales.
const verCentavos = (c: number) => (c / 100).toFixed(2);

function Foto({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- URL blob: local, next/image no aplica
  return <img src={url} alt={mensajes.boletas.fotoAlt} className="max-h-[70vh] w-full rounded-lg object-contain" />;
}

export function RevisionBoleta({
  lectura,
  imagen,
  onGuardada,
  onCancelar,
}: {
  lectura: LecturaBoleta;
  imagen: Blob;
  onGuardada: () => void;
  onCancelar: () => void;
}) {
  const api = useApi();
  const { categorias } = useCategorias();
  const [estado, despachar] = useReducer(reducirRevision, undefined, () =>
    estadoInicial(lectura, hoyLocal()),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filaError, setFilaError] = useState<string | null>(null);

  const [urlFoto, setUrlFoto] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    const url = URL.createObjectURL(imagen);
    // Mismo patrón del proyecto: el estado se fija en un `.then` con bandera `activo`.
    void Promise.resolve().then(() => {
      if (activo) setUrlFoto(url);
    });
    return () => {
      activo = false;
      URL.revokeObjectURL(url);
    };
  }, [imagen]);

  const gastos = useMemo(() => categorias.filter((c) => c.tipo === 'gasto'), [categorias]);
  const suma = sumaCentavos(estado);
  const diferencia = diferenciaConTotal(estado);
  const hayNegativos = estado.filas.some((f) => f.incluir && filaInvalida(f) === 'monto');
  const guardable = puedeGuardar(estado);

  async function guardar() {
    if (!guardable || enviando) return;
    setError(null);
    setFilaError(null);
    setEnviando(true);
    try {
      await guardarBoleta(api, imagen, aDatosGuardar(estado));
      onGuardada();
    } catch (e) {
      setError(mensajeDeError(e));
      if (e instanceof ErrorApi && e.fila !== undefined) {
        // `fila` indexa los productos enviados, es decir, las filas incluidas.
        setFilaError(estado.filas.filter((f) => f.incluir)[e.fila]?.id ?? null);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
    >
      {urlFoto && (
        <>
          <details className="md:hidden">
            <summary className="cursor-pointer text-sm font-medium">{mensajes.boletas.verFoto}</summary>
            <div className="mt-2">
              <Foto url={urlFoto} />
            </div>
          </details>
          <div className="hidden md:block">
            <Foto url={urlFoto} />
          </div>
        </>
      )}
      <div className="grid content-start gap-4 md:col-start-2 md:row-start-1 md:row-span-2">
        <h2 className="text-base font-medium">{mensajes.boletas.revisaTitulo}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="rev-comercio">{mensajes.boletas.comercio}</Label>
            <Input
              id="rev-comercio"
              value={estado.comercio}
              onChange={(e) =>
                despachar({ tipo: 'editarCabecera', campos: { comercio: e.target.value } })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rev-fecha">{mensajes.boletas.fecha}</Label>
            <Input
              id="rev-fecha"
              type="date"
              value={estado.fecha}
              onChange={(e) =>
                despachar({ tipo: 'editarCabecera', campos: { fecha: e.target.value } })
              }
            />
          </div>
        </div>

        <ul className="grid gap-3">
          {estado.filas.map((f) => {
            const invalida = f.incluir ? filaInvalida(f) : null;
            const resaltada = f.incluir && (invalida === 'monto' || f.id === filaError);
            return (
              <li
                key={f.id}
                data-testid="fila-boleta"
                className={`grid gap-2 rounded-lg border p-2 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-center ${
                  resaltada ? 'border-destructive bg-destructive/10' : 'border-border'
                } ${f.incluir ? '' : 'opacity-60'}`}
              >
                <input
                  type="checkbox"
                  aria-label={mensajes.boletas.incluir}
                  checked={f.incluir}
                  onChange={() => despachar({ tipo: 'alternarFila', id: f.id })}
                />
                <Input
                  aria-label={mensajes.boletas.producto}
                  value={f.descripcion}
                  aria-invalid={f.incluir && invalida === 'descripcion' ? true : undefined}
                  onChange={(e) =>
                    despachar({ tipo: 'editarFila', id: f.id, campos: { descripcion: e.target.value } })
                  }
                />
                <Input
                  aria-label={mensajes.boletas.monto}
                  inputMode="decimal"
                  value={f.monto}
                  aria-invalid={f.incluir && invalida === 'monto' ? true : undefined}
                  onChange={(e) =>
                    despachar({ tipo: 'editarFila', id: f.id, campos: { monto: e.target.value } })
                  }
                />
                <select
                  aria-label={mensajes.boletas.categoria}
                  className={selectClase}
                  value={f.categoriaId ?? ''}
                  onChange={(e) =>
                    despachar({
                      tipo: 'editarFila',
                      id: f.id,
                      campos: { categoriaId: e.target.value || null },
                    })
                  }
                >
                  <option value="">{mensajes.boletas.sinCategoria}</option>
                  {gastos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => despachar({ tipo: 'quitarFila', id: f.id })}
                >
                  {mensajes.boletas.quitar}
                </Button>
              </li>
            );
          })}
        </ul>
        <div>
          <Button type="button" variant="outline" onClick={() => despachar({ tipo: 'agregarFila' })}>
            {mensajes.boletas.agregarProducto}
          </Button>
        </div>

        <div className="grid gap-1 text-sm">
          <p>
            {mensajes.boletas.sumaProductos}: <span className="font-medium">{verCentavos(suma)}</span>
          </p>
          {estado.totalImpreso !== null && (
            <p>
              {mensajes.boletas.totalImpreso}:{' '}
              <span className="font-medium">{estado.totalImpreso}</span>
            </p>
          )}
          {diferencia !== null && diferencia !== 0 && estado.totalImpreso !== null && (
            <p className="text-muted-foreground">
              {mensajes.boletas.avisoDiferencia(verCentavos(suma), estado.totalImpreso)}
            </p>
          )}
          {hayNegativos && (
            <p className="text-destructive">{mensajes.boletas.montosNegativos}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={!guardable || enviando} className="flex-1">
            {mensajes.boletas.guardar}
          </Button>
          <Button type="button" variant="outline" onClick={onCancelar}>
            {mensajes.acciones.cancelar}
          </Button>
        </div>
      </div>
    </form>
  );
}
