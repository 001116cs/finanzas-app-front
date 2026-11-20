'use client';

import { useSearchParams } from 'next/navigation';
import { mensajes } from '@/mensajes/es';

export function AvisoSesionExpirada() {
  const query = useSearchParams();
  if (query.get('expirada') !== '1') return null;
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {mensajes.errores.sesionExpirada}
    </p>
  );
}
