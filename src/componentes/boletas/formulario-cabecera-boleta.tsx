'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CambiosBoleta } from '@/lib/api/boletas';
import { mensajeDeError } from '@/lib/api/usar-api';
import { normalizarMontoEntrada } from '@/lib/monto';
import { mensajes } from '@/mensajes/es';

type Props = {
  inicial: { comercio: string; fecha: string; totalImpreso: string | null };
  onGuardar: (cambios: CambiosBoleta) => Promise<void>;
  /** El padre muestra el aviso de éxito (sobrevive al remontado del formulario). */
  avisoExterno?: boolean;
};

export function FormularioCabeceraBoleta({ inicial, onGuardar, avisoExterno = false }: Props) {
  const [comercio, setComercio] = useState(inicial.comercio);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [total, setTotal] = useState(inicial.totalImpreso ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const totalCambiado = total.trim() !== (inicial.totalImpreso ?? '');
  const fechaCambiada = fecha !== inicial.fecha;
  const hayCambios = comercio !== inicial.comercio || fechaCambiada || totalCambiado;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!hayCambios || enviando || fecha === '') return;
    const cambios: CambiosBoleta = {};
    if (comercio !== inicial.comercio) cambios.comercio = comercio;
    if (fechaCambiada) cambios.fecha = fecha;
    if (totalCambiado) {
      if (total.trim() === '') cambios.totalImpreso = null;
      else {
        const normalizado = normalizarMontoEntrada(total.trim());
        if (normalizado === null) {
          setGuardado(false);
          setError(mensajes.movimiento.montoInvalido);
          return;
        }
        cambios.totalImpreso = normalizado;
      }
    }
    setError(null);
    setGuardado(false);
    setEnviando(true);
    try {
      await onGuardar(cambios);
      setGuardado(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="grid gap-3">
      <h2 className="text-lg font-semibold">{mensajes.boletas.detalle.datos}</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="cab-comercio">{mensajes.boletas.comercio}</Label>
        <Input
          id="cab-comercio"
          maxLength={100}
          value={comercio}
          onChange={(e) => setComercio(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cab-fecha">{mensajes.boletas.fecha}</Label>
        <Input id="cab-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        {fechaCambiada && (
          <p className="text-xs text-muted-foreground">{mensajes.boletas.detalle.avisoFecha}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cab-total">{mensajes.boletas.totalImpreso}</Label>
        <Input
          id="cab-total"
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {guardado && !avisoExterno && (
        <p role="status" className="text-sm text-green-700">
          {mensajes.boletas.detalle.cambiosGuardados}
        </p>
      )}
      <Button type="submit" disabled={!hayCambios || enviando || fecha === ''}>
        {mensajes.boletas.detalle.guardarCambios}
      </Button>
    </form>
  );
}
