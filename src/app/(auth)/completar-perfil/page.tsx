import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormularioPerfil } from '@/componentes/formulario-perfil';
import { mensajes } from '@/mensajes/es';

export default function CompletarPerfil() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mensajes.perfil.titulo}</CardTitle>
        <CardDescription>{mensajes.perfil.descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioPerfil />
      </CardContent>
    </Card>
  );
}
