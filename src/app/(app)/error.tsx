'use client';

import { Button } from '@/components/ui/button';
import { mensajes } from '@/mensajes/es';

export default function ErrorApp({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-12 text-center">
      <p>{mensajes.errores.generico}</p>
      <Button onClick={reset}>{mensajes.errores.reintentar}</Button>
    </div>
  );
}
