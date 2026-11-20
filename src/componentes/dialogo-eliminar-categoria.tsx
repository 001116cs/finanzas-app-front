'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { components } from '@/lib/api/esquema';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { mensajes } from '@/mensajes/es';

type Categoria = components['schemas']['CategoriaRespuesta'];
type Modo = 'eliminar_movimientos' | 'conservar_sin_categoria' | 'mover';

type Props = {
  categoria: Categoria;
  categorias: Categoria[];
  onEliminada: () => void;
  onCerrar: () => void;
};

const selectClase = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm';

export function DialogoEliminarCategoria({ categoria, categorias, onEliminada, onCerrar }: Props) {
  const api = useApi();
  const n = categoria.cantidadMovimientos;
  const [modo, setModo] = useState<Modo>('conservar_sin_categoria');
  const [destinoId, setDestinoId] = useState('');
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinos = categorias.filter((c) => c.tipo === categoria.tipo && c.id !== categoria.id);
  const listo = n === 0 || modo !== 'mover' || destinoId !== '';

  async function ejecutar() {
    setError(null);
    setEnviando(true);
    try {
      const query =
        n === 0
          ? {}
          : modo === 'mover'
            ? { modo, destinoId }
            : { modo };
      await api.DELETE('/categorias/{id}', { params: { path: { id: categoria.id }, query } });
      onEliminada();
    } catch (e) {
      setError(mensajeDeError(e));
      setConfirmandoBorrado(false);
    } finally {
      setEnviando(false);
    }
  }

  function confirmar() {
    if (n > 0 && modo === 'eliminar_movimientos' && !confirmandoBorrado) {
      setConfirmandoBorrado(true);
      return;
    }
    void ejecutar();
  }

  const opciones: { valor: Modo; texto: string }[] = [
    { valor: 'eliminar_movimientos', texto: mensajes.categorias.modoEliminar },
    { valor: 'conservar_sin_categoria', texto: mensajes.categorias.modoConservar },
    { valor: 'mover', texto: mensajes.categorias.modoMover },
  ];

  return (
    <AlertDialog open onOpenChange={(abierto) => !abierto && !enviando && onCerrar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{mensajes.categorias.eliminarTitulo(categoria.nombre)}</AlertDialogTitle>
          <AlertDialogDescription>
            {n === 0
              ? mensajes.categorias.confirmarSimple
              : confirmandoBorrado
                ? mensajes.categorias.segundaConfirmacion(n)
                : mensajes.categorias.tieneMovimientos(n)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {n > 0 && !confirmandoBorrado && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm">{mensajes.categorias.queHacer}</legend>
            {opciones.map((o) => (
              <label key={o.valor} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="modo"
                  value={o.valor}
                  checked={modo === o.valor}
                  onChange={() => setModo(o.valor)}
                />
                {o.texto}
              </label>
            ))}
            {modo === 'mover' && (
              <div className="grid gap-2">
                <Label htmlFor="destino-categoria">{mensajes.categorias.destino}</Label>
                <select
                  id="destino-categoria"
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className={selectClase}
                >
                  <option value="">{mensajes.categorias.elegirDestino}</option>
                  {destinos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>{mensajes.acciones.cancelar}</AlertDialogCancel>
          <Button variant="destructive" disabled={!listo || enviando} onClick={confirmar}>
            {enviando ? mensajes.categorias.eliminando : mensajes.acciones.eliminar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
