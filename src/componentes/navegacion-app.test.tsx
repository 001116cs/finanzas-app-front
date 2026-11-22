import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { NavegacionApp } from './navegacion-app';

const ruta = vi.hoisted(() => ({ actual: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }));

describe('NavegacionApp', () => {
  it('muestra los tres enlaces con sus rutas', () => {
    ruta.actual = '/';
    render(<NavegacionApp />);
    expect(screen.getByRole('link', { name: mensajes.navegacion.inicio })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: mensajes.navegacion.categorias })).toHaveAttribute(
      'href',
      '/categorias',
    );
    expect(screen.getByRole('link', { name: mensajes.navegacion.ajustes })).toHaveAttribute(
      'href',
      '/ajustes',
    );
  });

  it('marca sólo la página actual con aria-current', () => {
    ruta.actual = '/categorias';
    render(<NavegacionApp />);
    expect(screen.getByRole('link', { name: mensajes.navegacion.categorias })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: mensajes.navegacion.inicio })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
