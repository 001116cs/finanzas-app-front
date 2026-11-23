'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { mensajes } from '@/mensajes/es';
import type { ModoDuplicadas } from './estado-asistente';

const m = mensajes.importar.duplicados;

type Props = { cantidad: number; onElegir: (modo: ModoDuplicadas) => void };

/** §5.1 paso 4: hay que elegir una de las tres opciones (no se cierra sin decidir). */
export function DialogoDuplicados({ cantidad, onElegir }: Props) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{m.texto(cantidad)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onElegir('omitir')}>
            {m.omitir}
          </Button>
          <Button variant="outline" onClick={() => onElegir('incluir')}>
            {m.incluir}
          </Button>
          <Button onClick={() => onElegir('revisar')}>{m.revisar}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
