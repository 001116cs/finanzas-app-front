import { BotonCerrarSesion } from '@/componentes/boton-cerrar-sesion';
import { mensajes } from '@/mensajes/es';

// Marcador de posición: el dashboard real llega en la Task 11.
export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">{mensajes.inicio.titulo}</h1>
      <BotonCerrarSesion />
    </main>
  );
}
