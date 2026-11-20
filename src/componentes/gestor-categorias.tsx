'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [editando, setEditando] = useState<{ id: string; nombre: string } | null>(null);
  const [aEliminar, setAEliminar] = useState<Categoria | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.GET('/categorias', { params: { query: {} } });
      if (data) setCategorias(data);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    let activo = true;
    api
      .GET('/categorias', { params: { query: {} } })
      .then(({ data }) => {
        if (activo && data) setCategorias(data);
      })
      .catch((e) => {
        if (activo) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [api]);

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
    if (await mutar(() => api.PATCH('/categorias/{id}', { params: { path: { id } }, body: { nombre } })))
      setEditando(null);
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
            role="tab"
            aria-selected={tipo === p.valor}
            variant={tipo === p.valor ? 'default' : 'outline'}
            onClick={() => {
              setTipo(p.valor);
              setEditando(null);
              setError(null);
            }}
          >
            {p.texto}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
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
      {cargando ? (
        <p className="text-sm text-muted-foreground">{mensajes.dashboard.cargando}</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{mensajes.categorias.vacia}</p>
      ) : (
        <ul className="grid gap-2">
          {visibles.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border p-2">
              {editando?.id === c.id ? (
                <form onSubmit={guardarNombre} className="flex flex-1 gap-2">
                  <Input
                    aria-label={mensajes.categorias.nombre}
                    maxLength={50}
                    autoFocus
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
                  <span className="flex-1">{c.nombre}</span>
                  <span className="text-sm text-muted-foreground">
                    {mensajes.categorias.movimientos(c.cantidadMovimientos)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setEditando({ id: c.id, nombre: c.nombre })}
                  >
                    {mensajes.categorias.renombrar}
                  </Button>
                  <Button variant="destructive" onClick={() => setAEliminar(c)}>
                    {mensajes.acciones.eliminar}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
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
