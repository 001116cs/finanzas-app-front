'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { components } from '@/lib/api/esquema';
import { esDispositivoTactil } from '@/lib/boletas/camara-web';
import { guardarFotoPendiente } from '@/lib/boletas/foto-pendiente';
import type { TipoVista } from '@/lib/tipo-vista';
import { mensajes } from '@/mensajes/es';
import { CamaraWeb } from './boletas/camara-web';
import { ACEPTA_SUBIR } from './boletas/escaner-boleta';
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
  etiqueta,
  onClick,
}: {
  titulo: string;
  descripcion: string;
  /** Distintivo opcional junto al título (p. ej. "Recomendado en celular"). */
  etiqueta?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-base font-medium">{titulo}</span>
        {etiqueta && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {etiqueta}
          </span>
        )}
      </span>
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
        etiqueta={mensajes.boletas.menu.fotoRecomendado}
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
  const inputSubir = useRef<HTMLInputElement>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  /** Guarda la imagen elegida (cámara o archivo) y va a /boletas/nueva, que la lee al entrar. */
  function alElegirImagen(e: ChangeEvent<HTMLInputElement>) {
    const imagen = e.target.files?.[0];
    e.target.value = '';
    if (!imagen) return;
    guardarFotoPendiente(imagen);
    router.push('/boletas/nueva?foto=1');
  }
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
          // Celular/tablet: cámara nativa en el mismo toque (el navegador sólo lo permite así).
          // PC: `capture` se ignora y abriría una carpeta, así que se usa la webcam dentro de la app.
          if (esDispositivoTactil()) inputFoto.current?.click();
          else setCamaraAbierta(true);
          setMenuAbierto(false);
        }}
        onBoleta={() => {
          // Mismo selector que "Subir imagen" de /boletas/nueva, abierto en el mismo toque.
          inputSubir.current?.click();
          setMenuAbierto(false);
        }}
      />
      {/* Fuera del menú para que no se desmonte al cerrarlo. */}
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={alElegirImagen}
      />
      <input ref={inputSubir} type="file" accept={ACEPTA_SUBIR} hidden onChange={alElegirImagen} />
      {camaraAbierta && (
        <CamaraWeb
          onCaptura={(foto) => {
            setCamaraAbierta(false);
            guardarFotoPendiente(foto);
            router.push('/boletas/nueva?foto=1');
          }}
          onCerrar={() => setCamaraAbierta(false)}
          onSubirEnSuLugar={() => {
            inputSubir.current?.click();
            setCamaraAbierta(false);
          }}
        />
      )}
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
