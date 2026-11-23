'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AsistenteImportacion } from '@/componentes/importacion/asistente-importacion';
import { HistorialImportaciones } from '@/componentes/importacion/historial-importaciones';
import { mensajes } from '@/mensajes/es';

export default function Importar() {
  const [recarga, setRecarga] = useState(0);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{mensajes.importar.titulo}</CardTitle>
          <p className="text-sm text-muted-foreground">{mensajes.importar.descripcion}</p>
        </CardHeader>
        <CardContent>
          <AsistenteImportacion onImportado={() => setRecarga((n) => n + 1)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <HistorialImportaciones recarga={recarga} />
        </CardContent>
      </Card>
    </div>
  );
}
