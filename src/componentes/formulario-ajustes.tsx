'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CamposMoneda } from '@/componentes/campos-moneda';
import { mensajeDeError } from '@/lib/api/usar-api';
import { actualizarPerfil, MONEDAS, OTRA, resolverMoneda } from '@/lib/perfil';
import { mensajes } from '@/mensajes/es';

type Props = { moneda: string; zonaHoraria: string };

function zonasDisponibles(actual: string): string[] {
  let base: string[] = [];
  try {
    base = Intl.supportedValuesOf('timeZone');
  } catch {
    base = [];
  }
  return [...new Set([...base, 'UTC', actual])].sort();
}

export function FormularioAjustes({ moneda: monedaActual, zonaHoraria }: Props) {
  const router = useRouter();
  const conocida = (MONEDAS as readonly string[]).includes(monedaActual);
  const [moneda, setMoneda] = useState(conocida ? monedaActual : OTRA);
  const [otra, setOtra] = useState(conocida ? '' : monedaActual);
  const [zona, setZona] = useState(zonaHoraria);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const zonas = useMemo(() => zonasDisponibles(zonaHoraria), [zonaHoraria]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(false);
    const codigo = resolverMoneda(moneda, otra);
    if (!codigo) return setError(mensajes.perfil.codigoIsoInvalido);
    setEnviando(true);
    try {
      await actualizarPerfil({ moneda: codigo, zonaHoraria: zona });
      setExito(true);
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="zona-horaria">{mensajes.ajustes.zonaHoraria}</Label>
        <select
          id="zona-horaria"
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {zonas.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
      <CamposMoneda moneda={moneda} otra={otra} onMoneda={setMoneda} onOtra={setOtra} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {exito && (
        <p role="status" className="text-sm text-green-700">
          {mensajes.ajustes.guardado}
        </p>
      )}
      <Button type="submit" disabled={enviando}>
        {enviando ? mensajes.perfil.guardando : mensajes.acciones.guardar}
      </Button>
    </form>
  );
}
