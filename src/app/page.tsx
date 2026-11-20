import { mensajes } from "@/mensajes/es";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-semibold">{mensajes.app.nombre}</h1>
    </main>
  );
}
