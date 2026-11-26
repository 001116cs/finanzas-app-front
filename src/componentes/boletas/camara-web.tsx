'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  abrirCamara,
  capturarFotograma,
  detenerCamara,
  motivoErrorCamara,
  type MotivoErrorCamara,
} from '@/lib/boletas/camara-web';
import { mensajes } from '@/mensajes/es';

type Props = {
  /** Foto aceptada por el usuario ("Usar foto"). La cámara ya está apagada. */
  onCaptura: (foto: File) => void;
  /** El usuario cerró la ventana sin usar foto. */
  onCerrar: () => void;
  /** Alternativa cuando la cámara no está disponible. */
  onSubirEnSuLugar: () => void;
};

type Fase = 'iniciando' | 'en_vivo' | 'capturada' | 'error';

/**
 * Webcam dentro de la página (para PC). Se monta al abrirse y se desmonta al cerrarse:
 * así cada apertura empieza de cero y la cámara se apaga siempre al desmontar.
 */
export function CamaraWeb({ onCaptura, onCerrar, onSubirEnSuLugar }: Props) {
  const c = mensajes.boletas.camara;
  const [fase, setFase] = useState<Fase>('iniciando');
  const [motivo, setMotivo] = useState<MotivoErrorCamara>('otro');
  const [captura, setCaptura] = useState<{ foto: File; url: string } | null>(null);
  const [capturando, setCapturando] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const urlCaptura = useRef<string | null>(null);

  // Abre la cámara al montar y la apaga al desmontar (también si responde después de cerrar).
  useEffect(() => {
    let activo = true;
    abrirCamara()
      .then((s) => {
        if (!activo) {
          detenerCamara(s);
          return;
        }
        stream.current = s;
        setFase('en_vivo');
      })
      .catch((e) => {
        if (!activo) return;
        setMotivo(motivoErrorCamara(e));
        setFase('error');
      });
    return () => {
      activo = false;
      if (stream.current) detenerCamara(stream.current);
      stream.current = null;
      if (urlCaptura.current) URL.revokeObjectURL(urlCaptura.current);
    };
  }, []);

  // Conecta la cámara al <video> cuando ya está en pantalla.
  const enVivo = fase === 'en_vivo';
  useEffect(() => {
    if (!enVivo || !video.current || !stream.current) return;
    if (video.current.srcObject !== stream.current) video.current.srcObject = stream.current;
    void video.current.play().catch(() => {});
  }, [enVivo]);

  async function capturar() {
    if (!video.current) return;
    setCapturando(true);
    try {
      const foto = await capturarFotograma(video.current);
      const url = URL.createObjectURL(foto);
      urlCaptura.current = url;
      setCaptura({ foto, url });
      setFase('capturada');
    } catch (e) {
      setMotivo(motivoErrorCamara(e));
      setFase('error');
    } finally {
      setCapturando(false);
    }
  }

  function repetir() {
    if (urlCaptura.current) URL.revokeObjectURL(urlCaptura.current);
    urlCaptura.current = null;
    setCaptura(null);
    setFase('en_vivo');
  }

  function usar() {
    if (!captura) return;
    if (stream.current) detenerCamara(stream.current);
    stream.current = null;
    onCaptura(captura.foto);
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{c.titulo}</DialogTitle>
        </DialogHeader>

        {fase === 'iniciando' && (
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">
            {c.iniciando}
          </p>
        )}

        {fase === 'error' && (
          <div className="grid gap-3">
            <p role="alert" className="text-sm text-destructive">
              {c.errores[motivo]}
            </p>
            <Button type="button" variant="outline" onClick={onSubirEnSuLugar}>
              {c.subirEnSuLugar}
            </Button>
          </div>
        )}

        {/* El <video> sigue montado mientras hay cámara para no perder la imagen al repetir. */}
        {(fase === 'en_vivo' || fase === 'capturada') && (
          <video
            ref={video}
            aria-label={c.video}
            autoPlay
            playsInline
            muted
            className={fase === 'en_vivo' ? 'max-h-[70vh] w-full rounded-lg bg-black' : 'hidden'}
          />
        )}

        {fase === 'en_vivo' && (
          <Button type="button" disabled={capturando} onClick={() => void capturar()}>
            {c.capturar}
          </Button>
        )}

        {fase === 'capturada' && captura && (
          <div className="grid gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL blob: local, next/image no aplica */}
            <img src={captura.url} alt={c.capturada} className="max-h-[70vh] w-full rounded-lg object-contain" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={repetir}>
                {c.repetir}
              </Button>
              <Button type="button" className="flex-1" onClick={usar}>
                {c.usar}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
