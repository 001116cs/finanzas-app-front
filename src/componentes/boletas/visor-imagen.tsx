'use client';

import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  ESCALA_MIN,
  INICIAL,
  PASO,
  desplazar,
  zoomEnPunto,
  type EstadoZoom,
} from '@/lib/boletas/zoom';
import { cn } from '@/lib/utils';
import { mensajes } from '@/mensajes/es';

const ESCALA_CLIC = 2.5;
/** Movimiento máximo (px) para que soltar cuente como clic y no como arrastre. */
const UMBRAL_CLIC = 6;

type Props = {
  url: string;
  alt: string;
  /** Clases de la miniatura (la imagen que se pulsa para ampliar). */
  className?: string;
};

/** Miniatura que, al pulsarla, abre la imagen a pantalla completa con zoom (botones, rueda, clic, pellizco y arrastre). */
export function VisorImagen({ url, alt, className }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [zoom, setZoom] = useState<EstadoZoom>(INICIAL);
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const inicioGesto = useRef({ x: 0, y: 0 });
  const huboMovimiento = useRef(false);

  function cambiarAbierto(a: boolean) {
    setAbierto(a);
    setZoom(INICIAL);
    punteros.current.clear();
  }

  /** Coordenadas de un punto de la pantalla respecto al centro del área del visor. */
  function relativo(clientX: number, clientY: number) {
    const r = area?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  }

  // La rueda se escucha a mano para poder llamar a preventDefault (React la registra como pasiva).
  useEffect(() => {
    if (!area) return;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      const r = area.getBoundingClientRect();
      const px = e.clientX - (r.left + r.width / 2);
      const py = e.clientY - (r.top + r.height / 2);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom((z) => zoomEnPunto(z, z.escala * factor, px, py));
    };
    area.addEventListener('wheel', alGirar, { passive: false });
    return () => area.removeEventListener('wheel', alGirar);
  }, [area]);

  function alPresionar(e: EventoPuntero<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (punteros.current.size === 0) {
      inicioGesto.current = { x: e.clientX, y: e.clientY };
      huboMovimiento.current = false;
    } else {
      huboMovimiento.current = true; // un segundo dedo: es un pellizco, no un clic
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function alMover(e: EventoPuntero<HTMLDivElement>) {
    const mapa = punteros.current;
    const anterior = mapa.get(e.pointerId);
    if (!anterior) return;
    if (Math.hypot(e.clientX - inicioGesto.current.x, e.clientY - inicioGesto.current.y) > UMBRAL_CLIC) {
      huboMovimiento.current = true;
    }
    if (mapa.size === 1) {
      setZoom((z) => desplazar(z, e.clientX - anterior.x, e.clientY - anterior.y));
    } else if (mapa.size === 2) {
      // Pellizco: la escala cambia según la distancia entre los dos dedos, alrededor de su punto medio.
      const [a, b] = [...mapa.entries()].map(([id, p]) => (id === e.pointerId ? { x: e.clientX, y: e.clientY } : p));
      const [a0, b0] = [...mapa.values()];
      const antes = Math.hypot(a0.x - b0.x, a0.y - b0.y);
      const ahora = Math.hypot(a.x - b.x, a.y - b.y);
      if (antes > 0) {
        const medio = relativo((a.x + b.x) / 2, (a.y + b.y) / 2);
        setZoom((z) => zoomEnPunto(z, z.escala * (ahora / antes), medio.x, medio.y));
      }
    }
    mapa.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function alSoltar(e: EventoPuntero<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
  }

  /** Un clic (o toque) alterna el zoom sobre ese punto; se ignora si fue el final de un arrastre o pellizco. */
  function alClic(clientX: number, clientY: number) {
    if (huboMovimiento.current) {
      huboMovimiento.current = false;
      return;
    }
    const p = relativo(clientX, clientY);
    setZoom((z) => zoomEnPunto(z, z.escala === ESCALA_MIN ? ESCALA_CLIC : ESCALA_MIN, p.x, p.y));
  }

  const z = mensajes.boletas.zoom;

  return (
    <>
      <button
        type="button"
        aria-label={z.abrir}
        onClick={() => cambiarAbierto(true)}
        className="block w-full cursor-zoom-in rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL blob: local, next/image no aplica */}
        <img src={url} alt={alt} className={cn('w-full rounded-lg object-contain', className)} />
      </button>
      <Dialog open={abierto} onOpenChange={cambiarAbierto}>
        <DialogContent className="flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none bg-neutral-900/80 p-0 text-white ring-0 backdrop-blur-md sm:max-w-none">
          <DialogTitle className="sr-only">{z.titulo}</DialogTitle>
          <div
            ref={setArea}
            className="relative flex flex-1 touch-none items-center justify-center overflow-hidden select-none"
            onPointerDown={alPresionar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            onClick={(e) => alClic(e.clientX, e.clientY)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL blob: local, next/image no aplica */}
            <img
              data-testid="visor-imagen-ampliada"
              src={url}
              alt={alt}
              draggable={false}
              className={cn(
                'max-h-full max-w-full object-contain',
                zoom.escala > ESCALA_MIN ? 'cursor-zoom-out' : 'cursor-zoom-in',
              )}
              style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.escala})` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 p-3">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={z.alejar}
              disabled={zoom.escala <= ESCALA_MIN}
              onClick={() => setZoom((s) => zoomEnPunto(s, s.escala / PASO, 0, 0))}
            >
              <ZoomOut />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={z.restablecer}
              onClick={() => setZoom(INICIAL)}
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={z.acercar}
              onClick={() => setZoom((s) => zoomEnPunto(s, s.escala * PASO, 0, 0))}
            >
              <ZoomIn />
            </Button>
            <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom.escala * 100)}%</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
