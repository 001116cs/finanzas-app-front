'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EscanerBoleta } from '@/componentes/boletas/escaner-boleta';
import { RevisionBoleta } from '@/componentes/boletas/revision-boleta';
import type { LecturaBoleta } from '@/lib/api/boletas';
import { mensajes } from '@/mensajes/es';

export default function Boletas() {
  const [escaneo, setEscaneo] = useState<{ lectura: LecturaBoleta; imagen: Blob } | null>(null);
  const [guardada, setGuardada] = useState(false);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{mensajes.boletas.titulo}</CardTitle>
          <p className="text-sm text-muted-foreground">{mensajes.boletas.descripcion}</p>
        </CardHeader>
        <CardContent>
          {escaneo === null ? (
            <div className="grid gap-3">
              {guardada && (
                <p role="status" className="text-sm">
                  {mensajes.boletas.guardada}.{' '}
                  <Link href="/" className="underline">
                    {mensajes.boletas.verMovimientos}
                  </Link>
                </p>
              )}
              <EscanerBoleta
                onLeida={(lectura, imagen) => {
                  setGuardada(false);
                  setEscaneo({ lectura, imagen });
                }}
              />
            </div>
          ) : (
            <RevisionBoleta
              lectura={escaneo.lectura}
              imagen={escaneo.imagen}
              onGuardada={() => {
                setEscaneo(null);
                setGuardada(true);
              }}
              onCancelar={() => setEscaneo(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
