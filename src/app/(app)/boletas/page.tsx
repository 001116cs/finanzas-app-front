import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GaleriaBoletas } from '@/componentes/boletas/galeria-boletas';
import { mensajes } from '@/mensajes/es';

export default function Boletas() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{mensajes.boletas.galeria.titulo}</CardTitle>
          <p className="text-sm text-muted-foreground">{mensajes.boletas.galeria.descripcion}</p>
          <div>
            <Link href="/boletas/nueva" className={buttonVariants()}>
              {mensajes.boletas.galeria.subir}
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <GaleriaBoletas />
        </CardContent>
      </Card>
    </div>
  );
}
