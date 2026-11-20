'use client';

import { Button } from '@/components/ui/button';
import { mensajes } from '@/mensajes/es';

/** Errores del layout de (app) y de cualquier ruta sin error.tsx propio (p. ej. back caído). */
export default function ErrorRaiz({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-sm flex-col items-center gap-4 py-12 text-center">
      <p>{mensajes.errores.paginaFallo}</p>
      <Button onClick={reset}>{mensajes.errores.reintentar}</Button>
    </div>
  );
}
