import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mensajes } from '@/mensajes/es';
import { NavegacionApp } from './navegacion-app';

const ruta = vi.hoisted(() => ({ actual: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }));

describe('NavegacionApp', () => {
  it('muestra los cuatro enlaces con sus rutas', () => {
    ruta.actual = '/';
    render(<NavegacionApp />);
    expect(screen.getByRole('link', { name: mensajes.navegacion.inicio })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: mensajes.navegacion.categorias })).toHaveAttribute(
      'href',
      '/categorias',
    );
    expect(screen.getByRole('link', { name: mensajes.navegacion.importar })).toHaveAttribute(
      'href',
      '/importar',
    );
    expect(screen.getByRole('link', { name: mensajes.navegacion.boletas })).toHaveAttribute(
      'href',
      '/boletas',
    );
    expect(screen.getByRole('link', { name: mensajes.navegacion.ajustes })).toHaveAttribute(
      'href',
      '/ajustes',
    );
  });

  it('ordena Importar entre Categorías y Ajustes y la nav puede desplazarse sin desbordar la página', () => {
    ruta.actual = '/';
    render(<NavegacionApp />);
    const textos = screen.getAllByRole('link').map((a) => a.textContent);
    expect(textos).toEqual([
      mensajes.navegacion.inicio,
      mensajes.navegacion.categorias,
      mensajes.navegacion.importar,
      mensajes.navegacion.boletas,
      mensajes.navegacion.ajustes,
    ]);
    expect(screen.getByRole('navigation').className).toContain('overflow-x-auto');
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
