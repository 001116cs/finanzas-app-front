'use client';

import { Plus } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { components } from '@/lib/api/esquema';
import type { TipoVista } from '@/lib/tipo-vista';
import { mensajes } from '@/mensajes/es';
import { FormularioMovimiento } from './formulario-movimiento';

type Categoria = components['schemas']['CategoriaRespuesta'];
type Transaccion = components['schemas']['TransaccionRespuesta'];

const CONSULTA = '(min-width: 768px)';

function useEsEscritorio() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(CONSULTA);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}

type PanelProps = {
  abierto: boolean;
  onAbiertoChange: (a: boolean) => void;
  categorias: Categoria[];
  inicial?: Transaccion;
  tipoInicial?: TipoVista;
  onGuardado: () => void;
};

/** Formulario en Sheet (celular, sube desde abajo) o Dialog (escritorio). */
export function PanelMovimiento({
  abierto,
  onAbiertoChange,
  categorias,
  inicial,
  tipoInicial,
  onGuardado,
}: PanelProps) {
  const escritorio = useEsEscritorio();
  const titulo = inicial ? mensajes.dashboard.editarMovimiento : mensajes.dashboard.nuevo;
  const formulario = (
    <FormularioMovimiento
      key={inicial?.id ?? `nuevo-${tipoInicial ?? 'gasto'}`}
      categorias={categorias}
      inicial={inicial}
      tipoInicial={tipoInicial}
      onGuardado={() => {
        onAbiertoChange(false);
        onGuardado();
      }}
    />
  );
  if (escritorio) {
    return (
      <Dialog open={abierto} onOpenChange={onAbiertoChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          {formulario}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={abierto} onOpenChange={onAbiertoChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>{titulo}</SheetTitle>
        </SheetHeader>
        {formulario}
      </SheetContent>
    </Sheet>
  );
}

export function BotonNuevo({
  categorias,
  tipoInicial,
  onGuardado,
}: {
  categorias: Categoria[];
  tipoInicial: TipoVista;
  onGuardado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button
        size="icon-lg"
        aria-label={mensajes.dashboard.nuevo}
        onClick={() => setAbierto(true)}
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>
      <PanelMovimiento
        abierto={abierto}
        onAbiertoChange={setAbierto}
        categorias={categorias}
        tipoInicial={tipoInicial}
        onGuardado={onGuardado}
      />
    </>
  );
}
