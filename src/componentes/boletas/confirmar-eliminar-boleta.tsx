'use client';

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
import type { ModoEliminarBoleta } from '@/lib/api/boletas';
import { mensajes } from '@/mensajes/es';

type Props = {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  numGastos: number;
  eliminando: boolean;
  onElegir: (modo: ModoEliminarBoleta) => void;
};

const o = mensajes.boletas.eliminarOpciones;

export function ConfirmarEliminarBoleta({
  abierto,
  onAbiertoChange,
  numGastos,
  eliminando,
  onElegir,
}: Props) {
  const conGastos = numGastos > 0;
  return (
    <AlertDialog open={abierto} onOpenChange={onAbiertoChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{mensajes.boletas.eliminar}</AlertDialogTitle>
          <AlertDialogDescription>
            {conGastos ? o.pregunta(numGastos) : mensajes.boletas.confirmarEliminar}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {conGastos ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-auto flex-col gap-0 py-2"
              disabled={eliminando}
              onClick={() => onElegir('conservar')}
            >
              <span>{o.soloBoleta}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {o.soloBoletaDetalle}
              </span>
            </Button>
            <Button
              variant="destructive"
              disabled={eliminando}
              onClick={() => onElegir('eliminar')}
            >
              {o.conGastos(numGastos)}
            </Button>
            <AlertDialogCancel disabled={eliminando}>{mensajes.acciones.cancelar}</AlertDialogCancel>
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>{mensajes.acciones.cancelar}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={eliminando}
              onClick={() => onElegir('conservar')}
            >
              {mensajes.acciones.eliminar}
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
