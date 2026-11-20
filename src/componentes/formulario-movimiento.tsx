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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { components } from '@/lib/api/esquema';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { normalizarMontoEntrada } from '@/lib/monto';
import { hoyISO } from '@/lib/periodos';
import { mensajes } from '@/mensajes/es';

type Categoria = components['schemas']['CategoriaRespuesta'];
type Transaccion = components['schemas']['TransaccionRespuesta'];
type Tipo = 'gasto' | 'ingreso';

type Props = {
  categorias: Categoria[];
  inicial?: Transaccion;
  onGuardado: () => void;
};

const selectClase = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm';

export function FormularioMovimiento({ categorias, inicial, onGuardado }: Props) {
  const api = useApi();
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? 'gasto');
  const [monto, setMonto] = useState(inicial?.monto ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const montoNormalizado = normalizarMontoEntrada(monto.trim());
  const montoInvalido = monto.trim() !== '' && montoNormalizado === null;
  const descripcionLimpia = descripcion.trim();
  const valido =
    montoNormalizado !== null &&
    fecha !== '' &&
    descripcionLimpia.length >= 1 &&
    descripcionLimpia.length <= 200;

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);
    setEnviando(true);
    try {
      await accion();
      onGuardado();
    } catch (e) {
      setError(mensajeDeError(e));
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || montoNormalizado === null) return;
    const body = {
      tipo,
      monto: montoNormalizado,
      fecha,
      descripcion: descripcionLimpia,
      categoriaId: categoriaId || null,
    };
    void ejecutar(() =>
      inicial
        ? api.PATCH('/transacciones/{id}', { params: { path: { id: inicial.id } }, body })
        : api.POST('/transacciones', { body }),
    );
  }

  function eliminar() {
    if (!inicial) return;
    void ejecutar(() =>
      api.DELETE('/transacciones/{id}', { params: { path: { id: inicial.id } } }),
    );
  }

  return (
    <form onSubmit={guardar} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="mov-tipo">{mensajes.movimiento.tipo}</Label>
        <select
          id="mov-tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as Tipo);
            setCategoriaId('');
          }}
          className={selectClase}
        >
          <option value="gasto">{mensajes.dashboard.gasto}</option>
          <option value="ingreso">{mensajes.dashboard.ingreso}</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mov-monto">{mensajes.movimiento.monto}</Label>
        <Input
          id="mov-monto"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          aria-invalid={montoInvalido}
        />
        {montoInvalido && (
          <p className="text-sm text-destructive">{mensajes.movimiento.montoInvalido}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mov-fecha">{mensajes.movimiento.fecha}</Label>
        <Input id="mov-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mov-descripcion">{mensajes.movimiento.descripcion}</Label>
        <Input
          id="mov-descripcion"
          maxLength={200}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mov-categoria">{mensajes.movimiento.categoria}</Label>
        <select
          id="mov-categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={selectClase}
        >
          <option value="">{mensajes.movimiento.sinCategoria}</option>
          {inicial?.categoriaId &&
            inicial.tipo === tipo &&
            !categorias.some((c) => c.id === inicial.categoriaId) && (
              <option value={inicial.categoriaId}>
                {inicial.categoriaNombre ?? mensajes.movimiento.sinCategoria}
              </option>
            )}
          {categorias
            .filter((c) => c.tipo === tipo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!valido || enviando} className="flex-1">
          {enviando ? mensajes.movimiento.guardando : mensajes.acciones.guardar}
        </Button>
        {inicial && (
          <Button
            type="button"
            variant="destructive"
            disabled={enviando}
            onClick={() => setConfirmando(true)}
          >
            {mensajes.acciones.eliminar}
          </Button>
        )}
      </div>
      {inicial && (
        <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{mensajes.movimiento.confirmarTitulo}</AlertDialogTitle>
              <AlertDialogDescription>
                {mensajes.movimiento.confirmarDescripcion}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{mensajes.acciones.cancelar}</AlertDialogCancel>
              <Button variant="destructive" disabled={enviando} onClick={eliminar}>
                {mensajes.acciones.eliminar}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  );
}
