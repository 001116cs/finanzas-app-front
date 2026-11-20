'use client';

import { mensajes } from '@/mensajes/es';

/** Último recurso: reemplaza el layout raíz, por eso renderiza su propio <html>. */
export default function ErrorGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '3rem 1rem' }}>
        <p>{mensajes.errores.paginaFallo}</p>
        <button type="button" onClick={reset}>
          {mensajes.errores.reintentar}
        </button>
      </body>
    </html>
  );
}
