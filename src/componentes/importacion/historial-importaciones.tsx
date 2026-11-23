'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/esquema';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { mensajes } from '@/mensajes/es';

type Importacion = components['schemas']['ImportacionRespuesta'];
const h = mensajes.importar.historial;

const FORMATO = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
function formatearMomento(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : FORMATO.format(d);
}

/** Lista de importaciones con "Deshacer". `recarga` cambia cuando hay que volver a consultar. */
export function HistorialImportaciones({ recarga }: { recarga: number }) {
  const api = useApi();
  const [items, setItems] = useState<Importacion[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aDeshacer, setADeshacer] = useState<Importacion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  const [version, setVersion] = useState(0);

  // `recarga` (del padre) y `version` (tras deshacer) vuelven a consultar la lista.
  useEffect(() => {
    let activo = true;
    api
      .GET('/importaciones')
      .then(({ data }) => {
        if (!activo) return;
        setItems(data ?? []);
        setErrorCarga(null);
      })
      .catch((e) => {
        if (activo) setErrorCarga(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [api, recarga, version]);

  async function deshacer() {
    if (!aDeshacer || enviando) return;
    setEnviando(true);
    setErrorBorrado(null);
    try {
      await api.DELETE('/importaciones/{id}', { params: { path: { id: aDeshacer.id } } });
      setADeshacer(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setErrorBorrado(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section id="historial" className="grid gap-3" aria-labelledby="titulo-historial">
      <h2 id="titulo-historial" className="text-lg font-medium">
        {h.titulo}
      </h2>
      {errorCarga && (
        <p role="alert" className="text-sm text-destructive">
          {errorCarga}
        </p>
      )}
      {!items && !errorCarga && <p className="text-sm text-muted-foreground">{h.cargando}</p>}
      {items && items.length === 0 && <p className="text-sm text-muted-foreground">{h.vacio}</p>}
      {items && items.length > 0 && (
        <ul className="grid gap-2">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{i.nombreArchivo}</p>
                <p className="text-sm text-muted-foreground">
                  {formatearMomento(i.createdAt)} · {h.movimientos(i.filasImportadas)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorBorrado(null);
                  setADeshacer(i);
                }}
              >
                {h.deshacer}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {aDeshacer && (
        <AlertDialog open onOpenChange={(abierto) => !abierto && !enviando && setADeshacer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{h.confirmarTitulo}</AlertDialogTitle>
              <AlertDialogDescription>
                {h.confirmar(aDeshacer.filasImportadas, aDeshacer.nombreArchivo)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {errorBorrado && (
              <p role="alert" className="text-sm text-destructive">
                {errorBorrado}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enviando}>{mensajes.acciones.cancelar}</AlertDialogCancel>
              <Button variant="destructive" disabled={enviando} onClick={() => void deshacer()}>
                {enviando ? h.deshaciendo : h.deshacer}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}
