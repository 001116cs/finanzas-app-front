'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { mensajes } from '@/mensajes/es';

const ENLACES = [
  { href: '/', texto: mensajes.navegacion.inicio },
  { href: '/categorias', texto: mensajes.navegacion.categorias },
  { href: '/importar', texto: mensajes.navegacion.importar },
  { href: '/ajustes', texto: mensajes.navegacion.ajustes },
];

export function NavegacionApp({ className }: { className?: string }) {
  const ruta = usePathname();
  return (
    <nav className={cn('flex gap-1 overflow-x-auto text-sm', className)}>
      {ENLACES.map(({ href, texto }) => {
        const activo = ruta === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              activo && 'bg-muted font-medium text-foreground',
            )}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
