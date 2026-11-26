'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { components } from '@/lib/api/esquema';
import { esDispositivoTactil } from '@/lib/boletas/camara-web';
import { guardarFotoPendiente } from '@/lib/boletas/foto-pendiente';
import type { TipoVista } from '@/lib/tipo-vista';
import { cn } from '@/lib/utils';
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

const CLASE_OPCION = 'h-auto w-full flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left';

function ContenidoOpcion({ titulo, descripcion, etiqueta }: { titulo: string; descripcion: string; etiqueta?: string }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-base font-medium">{titulo}</span>
        {etiqueta && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {etiqueta}
          </span>
        )}
      </span>
      <span className="text-sm font-normal text-muted-foreground">{descripcion}</span>
    </>
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
    <Button type="button" variant="outline" onClick={onClick} className={CLASE_OPCION}>
      <ContenidoOpcion titulo={titulo} descripcion={descripcion} etiqueta={etiqueta} />
    </Button>
  );
}

/**
 * Opción que abre un selector de archivos. El <input> va DENTRO de la opción (visualmente oculto, no
 * `hidden`): iOS ancla su menú (Fototeca / Tomar foto / Seleccionar archivo) al elemento que lo abre,
 * y si ese elemento desaparece el menú queda flotando en cualquier sitio.
 */
function OpcionArchivo({
  titulo,
  descripcion,
  accept,
  onElegido,
}: {
  titulo: string;
  descripcion: string;
  accept: string;
  onElegido: (archivo: File) => void;
}) {
  return (
    <label
      className={cn(
        buttonVariants({ variant: 'outline' }),
        CLASE_OPCION,
        'cursor-pointer focus-within:ring-2 focus-within:ring-ring',
      )}
    >
      <ContenidoOpcion titulo={titulo} descripcion={descripcion} />
      <input
        type="file"
        accept={accept}
        aria-label={titulo}
        className="sr-only"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = '';
          if (archivo) onElegido(archivo);
        }}
      />
    </label>
  );
}

function MenuNuevo({
  abierto,
  onAbiertoChange,
  onMovimiento,
  onFoto,
  onImagenElegida,
}: {
  abierto: boolean;
  onAbiertoChange: (a: boolean) => void;
  onMovimiento: () => void;
  onFoto: () => void;
  /** Imagen elegida con "Subir boleta" (el menú sigue abierto mientras se elige). */
  onImagenElegida: (imagen: File) => void;
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
      <OpcionArchivo
        titulo={mensajes.boletas.menu.boleta}
        descripcion={mensajes.boletas.menu.boletaDescripcion}
        accept={ACEPTA_SUBIR}
        onElegido={onImagenElegida}
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

  /** Guarda la imagen elegida (cámara, archivo o webcam) y va a /boletas/nueva, que la lee al entrar. */
  function irALeer(imagen: File) {
    setMenuAbierto(false);
    guardarFotoPendiente(imagen);
    router.push('/boletas/nueva?foto=1');
  }

  function alElegirImagen(e: ChangeEvent<HTMLInputElement>) {
    const imagen = e.target.files?.[0];
    e.target.value = '';
    if (imagen) irALeer(imagen);
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
        onImagenElegida={irALeer}
      />
      {/* Cámara nativa: fuera del menú, que se cierra al abrirla (la cámara ocupa toda la pantalla). */}
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={alElegirImagen}
      />
      {/* Alternativa de la webcam cuando la cámara del PC no está disponible. */}
      <input ref={inputSubir} type="file" accept={ACEPTA_SUBIR} hidden onChange={alElegirImagen} />
      {camaraAbierta && (
        <CamaraWeb
          onCaptura={(foto) => {
            setCamaraAbierta(false);
            irALeer(foto);
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
