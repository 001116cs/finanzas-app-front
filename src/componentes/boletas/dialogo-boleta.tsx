'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  eliminarBoleta,
  obtenerBoleta,
  obtenerImagenBoleta,
  type Boleta,
  type ModoEliminarBoleta,
} from '@/lib/api/boletas';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { formatearFecha } from '@/lib/fechas';
import { mensajes } from '@/mensajes/es';
import { ConfirmarEliminarBoleta } from './confirmar-eliminar-boleta';

type Props = {
  boletaId: string;
  abierto: boolean;
  onCerrar: () => void;
  onEliminada: () => void;
};

export function DialogoBoleta({ boletaId, abierto, onCerrar, onEliminada }: Props) {
  const api = useApi();
  const [boleta, setBoleta] = useState<Boleta | null>(null);
  const [urlImagen, setUrlImagen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    let url: string | null = null;
    Promise.all([obtenerBoleta(api, boletaId), obtenerImagenBoleta(api, boletaId)])
      .then(([datos, imagen]) => {
        if (cancelado) return;
        url = URL.createObjectURL(imagen);
        setBoleta(datos);
        setUrlImagen(url);
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDeError(e));
      });
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
      setBoleta(null);
      setUrlImagen(null);
    };
  }, [abierto, api, boletaId]);

  async function eliminar(modo: ModoEliminarBoleta) {
    setError(null);
    setEliminando(true);
    try {
      await eliminarBoleta(api, boletaId, modo);
      setConfirmando(false);
      onEliminada();
      onCerrar();
    } catch (e) {
      setError(mensajeDeError(e));
      setConfirmando(false);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <Dialog open={abierto} onOpenChange={(o) => !o && !eliminando && onCerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{boleta?.comercio ?? mensajes.boletas.ver}</DialogTitle>
            <DialogDescription>
              {boleta
                ? [
                    formatearFecha(boleta.fecha),
                    boleta.totalImpreso
                      ? `${mensajes.boletas.totalImpreso}: ${boleta.totalImpreso}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : mensajes.boletas.ver}
            </DialogDescription>
          </DialogHeader>
          {urlImagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlImagen}
              alt={mensajes.boletas.ver}
              className="max-h-[60vh] w-full rounded-lg object-contain"
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onCerrar}>
              {mensajes.acciones.cerrar}
            </Button>
            <Button
              variant="destructive"
              disabled={!boleta || eliminando}
              onClick={() => setConfirmando(true)}
            >
              {mensajes.boletas.eliminar}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmarEliminarBoleta
        abierto={confirmando}
        onAbiertoChange={setConfirmando}
        numGastos={boleta?.gastos?.length ?? 0}
        eliminando={eliminando}
        onElegir={(modo) => void eliminar(modo)}
      />
    </>
  );
}
