'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mensajeDeErrorAuth } from '@/lib/errores-auth';
import { crearClienteSupabase } from '@/lib/supabase/cliente';
import { mensajes } from '@/mensajes/es';

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { error: errorAuth } = await crearClienteSupabase().auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });
      if (errorAuth) {
        setError(mensajeDeErrorAuth(errorAuth));
        setEnviando(false);
        return;
      }
    } catch (err) {
      setError(mensajeDeErrorAuth(err));
      setEnviando(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mensajes.auth.tituloLogin}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="correo">{mensajes.auth.correo}</Label>
            <Input id="correo" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contrasena">{mensajes.auth.contrasena}</Label>
            <Input id="contrasena" type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={enviando}>
            {enviando ? mensajes.auth.ingresando : mensajes.auth.iniciarSesion}
          </Button>
          <p className="text-sm text-muted-foreground">
            {mensajes.auth.sinCuenta}{' '}
            <Link href="/registro" className="underline">
              {mensajes.auth.crearCuenta}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
