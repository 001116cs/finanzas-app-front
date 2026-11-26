'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EscanerBoleta } from '@/componentes/boletas/escaner-boleta';
import { RevisionBoleta } from '@/componentes/boletas/revision-boleta';
import type { LecturaBoleta } from '@/lib/api/boletas';
import { descartarFotoPendiente, leerFotoPendiente } from '@/lib/boletas/foto-pendiente';
import { mensajes } from '@/mensajes/es';

export default function NuevaBoleta({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const consulta = use(searchParams);
  // `?foto=1`: viene del + con la foto ya elegida; se lee al entrar, una sola vez
  // (se descarta al recibir la lectura para que "Cancelar" no la vuelva a enviar a la IA).
  const [fotoInicial, setFotoInicial] = useState(() =>
    consulta.foto === '1' ? leerFotoPendiente() : null,
  );
  const conCamara = consulta.camara === '1' || consulta.foto === '1';
  useEffect(() => {
    descartarFotoPendiente();
  }, []);
  const router = useRouter();
  const [escaneo, setEscaneo] = useState<{ lectura: LecturaBoleta; imagen: Blob } | null>(null);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{mensajes.boletas.nueva.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          {escaneo === null ? (
            <div className="grid gap-3">
              <EscanerBoleta
                permitirCamara={conCamara}
                archivoInicial={fotoInicial}
                onLeida={(lectura, imagen) => {
                  setFotoInicial(null);
                  setEscaneo({ lectura, imagen });
                }}
              />
              <button type="button" onClick={() => router.back()} className="text-sm underline">
                {mensajes.boletas.nueva.cancelar}
              </button>
            </div>
          ) : (
            <RevisionBoleta
              lectura={escaneo.lectura}
              imagen={escaneo.imagen}
              onGuardada={() => router.push('/')}
              onCancelar={() => setEscaneo(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
