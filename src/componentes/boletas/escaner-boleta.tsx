'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { escanearBoleta, obtenerUsoIa, type LecturaBoleta, type UsoIa } from '@/lib/api/boletas';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { IMAGEN_NO_SOPORTADA, reducirImagen } from '@/lib/boletas/reducir-imagen';
import { mensajes } from '@/mensajes/es';

function avisoDeLimite(uso: UsoIa | null): string | null {
  if (!uso) return null;
  if (uso.globalAgotado) return mensajes.errores.LIMITE_GLOBAL_IA;
  if (uso.boletas.usadas >= uso.boletas.limite) return mensajes.errores.LIMITE_BOLETAS;
  if (uso.intentosFallidos.usados >= uso.intentosFallidos.limite)
    return mensajes.errores.LIMITE_INTENTOS_FALLIDOS;
  return null;
}

export function EscanerBoleta({
  onLeida,
  permitirCamara = true,
}: {
  permitirCamara?: boolean;
  onLeida: (lectura: LecturaBoleta, imagen: Blob) => void;
}) {
  const api = useApi();
  const [uso, setUso] = useState<UsoIa | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputSubir = useRef<HTMLInputElement>(null);

  // `version` cambia tras cada escaneo (éxito o fallo) para volver a consultar el uso.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerUsoIa(api)
      .then((u) => {
        if (activo) setUso(u);
      })
      .catch((e) => {
        if (activo) setError(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [api, version]);

  const aviso = avisoDeLimite(uso);
  const deshabilitado = leyendo || aviso !== null;

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setError(null);
    setLeyendo(true);
    try {
      const imagen = await reducirImagen(archivo);
      const lectura = await escanearBoleta(api, imagen);
      onLeida(lectura, imagen);
    } catch (e) {
      setError(
        e instanceof Error && e.message === IMAGEN_NO_SOPORTADA
          ? mensajes.errores.IMAGEN_INVALIDA
          : mensajeDeError(e),
      );
    } finally {
      setLeyendo(false);
      setVersion((v) => v + 1);
    }
  }

  return (
    <div className="grid gap-3">
      {uso && (
        <p className="text-sm text-muted-foreground">
          {mensajes.boletas.contador(uso.boletas.usadas, uso.boletas.limite)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {permitirCamara && (
          <Button type="button" disabled={deshabilitado} onClick={() => inputFoto.current?.click()}>
            {mensajes.boletas.tomarFoto}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={deshabilitado}
          onClick={() => inputSubir.current?.click()}
        >
          {mensajes.boletas.subirImagen}
        </Button>
        {permitirCamara && (
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={alElegir}
          />
        )}
        <input
          ref={inputSubir}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          hidden
          onChange={alElegir}
        />
      </div>
      {leyendo && (
        <p role="status" className="text-sm text-muted-foreground">
          {mensajes.boletas.leyendo}
        </p>
      )}
      {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
