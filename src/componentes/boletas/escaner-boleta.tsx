'use client';

import { useEffect, useEffectEvent, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { escanearBoleta, obtenerUsoIa, type LecturaBoleta, type UsoIa } from '@/lib/api/boletas';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { esDispositivoTactil } from '@/lib/boletas/camara-web';
import { IMAGEN_NO_SOPORTADA, reducirImagen } from '@/lib/boletas/reducir-imagen';
import { mensajes } from '@/mensajes/es';
import { CamaraWeb } from './camara-web';

/** Tipos del selector "Subir imagen" (sin capture: el teléfono ofrece galería, archivos o cámara). */
export const ACEPTA_SUBIR = 'image/jpeg,image/png,image/webp,image/*';

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
  archivoInicial = null,
}: {
  permitirCamara?: boolean;
  onLeida: (lectura: LecturaBoleta, imagen: Blob) => void;
  /** Foto ya elegida (p. ej. desde "Tomar foto" del menú +): se lee al montar, una sola vez. */
  archivoInicial?: File | null;
}) {
  const api = useApi();
  const [uso, setUso] = useState<UsoIa | null>(null);
  const [leyendo, setLeyendo] = useState(archivoInicial !== null);
  const inicialLeido = useRef(false);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
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

  /** Reduce y lee la imagen. No cambia estado antes del primer await (se llama también desde un efecto). */
  async function leer(archivo: File) {
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

  // La foto inicial se lee una sola vez (el ref evita repetir la llamada a la IA si React remonta).
  const leerInicial = useEffectEvent((archivo: File) => {
    void leer(archivo);
  });
  useEffect(() => {
    if (!archivoInicial || inicialLeido.current) return;
    inicialLeido.current = true;
    leerInicial(archivoInicial);
  }, [archivoInicial]);

  async function empezarLectura(archivo: File) {
    setError(null);
    setLeyendo(true);
    await leer(archivo);
  }

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    await empezarLectura(archivo);
  }

  /** Celular: cámara nativa. PC: `capture` se ignora (abriría una carpeta), así que se usa la webcam. */
  function tomarFoto() {
    if (esDispositivoTactil()) inputFoto.current?.click();
    else setCamaraAbierta(true);
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
          <Button type="button" disabled={deshabilitado} onClick={tomarFoto}>
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
          accept={ACEPTA_SUBIR}
          hidden
          onChange={alElegir}
        />
      </div>
      {camaraAbierta && (
        <CamaraWeb
          onCaptura={(foto) => {
            setCamaraAbierta(false);
            void empezarLectura(foto);
          }}
          onCerrar={() => setCamaraAbierta(false)}
          onSubirEnSuLugar={() => {
            inputSubir.current?.click();
            setCamaraAbierta(false);
          }}
        />
      )}
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
