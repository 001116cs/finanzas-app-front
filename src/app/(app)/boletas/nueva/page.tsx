'use client';

import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EscanerBoleta } from '@/componentes/boletas/escaner-boleta';
import { RevisionBoleta } from '@/componentes/boletas/revision-boleta';
import type { LecturaBoleta } from '@/lib/api/boletas';
import { mensajes } from '@/mensajes/es';

export default function NuevaBoleta({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  // `?camara=1` (desde "Tomar foto" del +) muestra también el botón de la cámara.
  const conCamara = use(searchParams).camara === '1';
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
                onLeida={(lectura, imagen) => setEscaneo({ lectura, imagen })}
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
