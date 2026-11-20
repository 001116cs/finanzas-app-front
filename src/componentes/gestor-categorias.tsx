'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { components } from '@/lib/api/esquema';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { mensajes } from '@/mensajes/es';
import { DialogoEliminarCategoria } from './dialogo-eliminar-categoria';

type Categoria = components['schemas']['CategoriaRespuesta'];
type Tipo = 'gasto' | 'ingreso';

export function GestorCategorias() {
  const api = useApi();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tipo, setTipo] = useState<Tipo>('gasto');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [aEliminar, setAEliminar] = useState<Categoria | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falloCarga, setFalloCarga] = useState(false);
  const refsPestanas = useRef<Record<Tipo, HTMLButtonElement | null>>({
    gasto: null,
    ingreso: null,
  });

  const cargar = useCallback(
    async (vigente: () => boolean = () => true) => {
      try {
        const { data } = await api.GET('/categorias', {
          params: { query: {} },
        });
        if (!vigente()) return;
        if (data) setCategorias(data);
        setError(null);
        setFalloCarga(false);
      } catch (e) {
        if (!vigente()) return;
        setError(mensajeDeError(e));
        setFalloCarga(true);
      } finally {
        if (vigente()) setCargando(false);
      }
    },
    [api],
  );

  useEffect(() => {
    let activo = true;
    // Tras un tick para no actualizar estado de forma síncrona dentro del efecto.
    const t = setTimeout(() => void cargar(() => activo), 0);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [cargar]);

  async function mutar(accion: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    setOcupado(true);
    try {
      await accion();
      await cargar();
      return true;
    } catch (e) {
      setError(mensajeDeError(e));
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nueva.trim();
    if (!nombre) return;
    if (await mutar(() => api.POST('/categorias', { body: { nombre, tipo } }))) setNueva('');
  }

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const nombre = editando.nombre.trim();
    if (!nombre) return;
    const id = editando.id;
    if (
      await mutar(() =>
        api.PATCH('/categorias/{id}', {
          params: { path: { id } },
          body: { nombre },
        }),
      )
    )
      setEditando(null);
  }

  function elegirTipo(t: Tipo) {
    setTipo(t);
    setEditando(null);
    setError(null);
  }

  const visibles = categorias.filter((c) => c.tipo === tipo);
  const pestanas: { valor: Tipo; texto: string }[] = [
    { valor: 'gasto', texto: mensajes.categorias.gastos },
    { valor: 'ingreso', texto: mensajes.categorias.ingresos },
  ];

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">{mensajes.categorias.titulo}</h2>
      <div role="tablist" aria-label={mensajes.categorias.tipos} className="flex gap-2">
        {pestanas.map((p) => (
          <Button
            key={p.valor}
            ref={(el) => {
              refsPestanas.current[p.valor] = el;
            }}
            id={`pestana-${p.valor}`}
            role="tab"
            aria-selected={tipo === p.valor}
            aria-controls="panel-categorias"
            tabIndex={tipo === p.valor ? 0 : -1}
            variant={tipo === p.valor ? 'default' : 'outline'}
            onClick={() => elegirTipo(p.valor)}
            onKeyDown={(e) => {
              const i = pestanas.findIndex((x) => x.valor === p.valor);
              let destino = -1;
              if (e.key === 'ArrowRight') destino = (i + 1) % pestanas.length;
              else if (e.key === 'ArrowLeft') destino = (i - 1 + pestanas.length) % pestanas.length;
              else if (e.key === 'Home') destino = 0;
              else if (e.key === 'End') destino = pestanas.length - 1;
              if (destino < 0) return;
              e.preventDefault();
              const t = pestanas[destino].valor;
              elegirTipo(t);
              refsPestanas.current[t]?.focus();
            }}
          >
            {p.texto}
          </Button>
        ))}
      </div>
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          <p>{error}</p>
          {falloCarga && (
            <Button variant="outline" onClick={() => void cargar()}>
              {mensajes.errores.reintentar}
            </Button>
          )}
        </div>
      )}
      <form onSubmit={agregar} className="flex gap-2">
        <Input
          aria-label={mensajes.categorias.nombreNueva}
          maxLength={50}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <Button type="submit" disabled={ocupado || nueva.trim() === ''}>
          {mensajes.acciones.agregar}
        </Button>
      </form>
      <div
        role="tabpanel"
        id="panel-categorias"
        aria-labelledby={`pestana-${tipo}`}
        className="grid gap-4"
      >
        {cargando ? (
          <p className="text-sm text-muted-foreground">{mensajes.dashboard.cargando}</p>
        ) : falloCarga ? null : visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{mensajes.categorias.vacia}</p>
        ) : (
          <ul className="grid gap-2">
            {visibles.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                {editando?.id === c.id ? (
                  <form onSubmit={guardarNombre} className="flex min-w-0 flex-1 flex-wrap gap-2">
                    <Input
                      aria-label={mensajes.categorias.nombre}
                      maxLength={50}
                      autoFocus
                      className="min-w-0 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditando(null);
                      }}
                      value={editando.nombre}
                      onChange={(e) => setEditando({ id: c.id, nombre: e.target.value })}
                    />
                    <Button type="submit" disabled={ocupado || editando.nombre.trim() === ''}>
                      {mensajes.acciones.guardar}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                      {mensajes.acciones.cancelar}
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 break-words">{c.nombre}</span>
                    <span className="text-sm text-muted-foreground">
                      {mensajes.categorias.movimientos(c.cantidadMovimientos)}
                    </span>
                    <Button
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => setEditando({ id: c.id, nombre: c.nombre })}
                    >
                      {mensajes.categorias.renombrar}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={ocupado}
                      onClick={() => setAEliminar(c)}
                    >
                      {mensajes.acciones.eliminar}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {aEliminar && (
        <DialogoEliminarCategoria
          categoria={aEliminar}
          categorias={categorias}
          onCerrar={() => setAEliminar(null)}
          onEliminada={() => {
            setAEliminar(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}
