'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CamposMoneda } from '@/componentes/campos-moneda';
import { crearPerfil, resolverMoneda } from '@/lib/perfil';
import { mensajes } from '@/mensajes/es';

export function FormularioPerfil() {
  const router = useRouter();
  const [moneda, setMoneda] = useState('PEN');
  const [otra, setOtra] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const codigo = resolverMoneda(moneda, otra);
    if (!codigo) return setError(mensajes.perfil.codigoIsoInvalido);
    setEnviando(true);
    try {
      await crearPerfil(codigo);
      router.push('/');
      router.refresh();
    } catch {
      setError(mensajes.errores.generico);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <CamposMoneda moneda={moneda} otra={otra} onMoneda={setMoneda} onOtra={setOtra} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={enviando}>
        {enviando ? mensajes.perfil.guardando : mensajes.acciones.guardar}
      </Button>
    </form>
  );
}
