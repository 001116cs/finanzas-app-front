'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AsistenteImportacion } from '@/componentes/importacion/asistente-importacion';
import { mensajes } from '@/mensajes/es';

export default function Importar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mensajes.importar.titulo}</CardTitle>
        <p className="text-sm text-muted-foreground">{mensajes.importar.descripcion}</p>
      </CardHeader>
      <CardContent>
        <AsistenteImportacion onImportado={() => {}} />
      </CardContent>
    </Card>
  );
}
