'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { components } from '@/lib/api/esquema';
import { guardarFotoPendiente } from '@/lib/boletas/foto-pendiente';
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

function OpcionMenu({
  titulo,
  descripcion,
  onClick,
}: {
  titulo: string;
  descripcion: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left"
    >
      <span className="text-base font-medium">{titulo}</span>
      <span className="text-sm font-normal text-muted-foreground">{descripcion}</span>
    </Button>
  );
}

function MenuNuevo({
  abierto,
  onAbiertoChange,
  onMovimiento,
  onFoto,
  onBoleta,
}: {
  abierto: boolean;
  onAbiertoChange: (a: boolean) => void;
  onMovimiento: () => void;
  onFoto: () => void;
  onBoleta: () => void;
}) {
  const escritorio = useEsEscritorio();
  const opciones = (
    <div className="grid gap-3">
      <OpcionMenu
        titulo={mensajes.boletas.menu.movimiento}
        descripcion={mensajes.boletas.menu.movimientoDescripcion}
        onClick={onMovimiento}
      />
      <OpcionMenu
        titulo={mensajes.boletas.menu.foto}
        descripcion={mensajes.boletas.menu.fotoDescripcion}
        onClick={onFoto}
      />
      <OpcionMenu
        titulo={mensajes.boletas.menu.boleta}
        descripcion={mensajes.boletas.menu.boletaDescripcion}
        onClick={onBoleta}
      />
    </div>
  );
  if (escritorio) {
    return (
      <Dialog open={abierto} onOpenChange={onAbiertoChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mensajes.boletas.menu.titulo}</DialogTitle>
          </DialogHeader>
          {opciones}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={abierto} onOpenChange={onAbiertoChange}>
      <SheetContent side="bottom" className="p-4">
        <SheetHeader className="p-0">
          <SheetTitle>{mensajes.boletas.menu.titulo}</SheetTitle>
        </SheetHeader>
        {opciones}
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
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button
        size="icon-lg"
        aria-label={mensajes.dashboard.nuevo}
        onClick={() => setMenuAbierto(true)}
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>
      <MenuNuevo
        abierto={menuAbierto}
        onAbiertoChange={setMenuAbierto}
        onMovimiento={() => {
          setMenuAbierto(false);
          setAbierto(true);
        }}
        onFoto={() => {
          // Se abre el selector de cámara en el mismo toque (el navegador sólo lo permite así).
          inputFoto.current?.click();
          setMenuAbierto(false);
        }}
        onBoleta={() => {
          setMenuAbierto(false);
          router.push('/boletas/nueva');
        }}
      />
      {/* Fuera del menú para que no se desmonte al cerrarlo. */}
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const foto = e.target.files?.[0];
          e.target.value = '';
          if (!foto) return;
          guardarFotoPendiente(foto);
          router.push('/boletas/nueva?foto=1');
        }}
      />
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
