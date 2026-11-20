'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CamposMoneda } from '@/componentes/campos-moneda';
import { mensajeDeErrorAuth } from '@/lib/errores-auth';
import { crearPerfil, resolverMoneda } from '@/lib/perfil';
import { crearClienteSupabase } from '@/lib/supabase/cliente';
import { mensajes } from '@/mensajes/es';

export default function Registro() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [otra, setOtra] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (contrasena.length < 8) return setError(mensajes.auth.contrasenaCorta);
    const codigo = resolverMoneda(moneda, otra);
    if (!codigo) return setError(mensajes.perfil.codigoIsoInvalido);

    setEnviando(true);
    try {
      const { error: errorAuth } = await crearClienteSupabase().auth.signUp({
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

    try {
      await crearPerfil(codigo);
      router.push('/');
    } catch {
      router.push('/completar-perfil');
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mensajes.auth.tituloRegistro}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="correo">{mensajes.auth.correo}</Label>
            <Input id="correo" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contrasena">{mensajes.auth.contrasena}</Label>
            <Input id="contrasena" type="password" autoComplete="new-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          </div>
          <CamposMoneda moneda={moneda} otra={otra} onMoneda={setMoneda} onOtra={setOtra} />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={enviando}>
            {enviando ? mensajes.auth.creando : mensajes.auth.crearCuenta}
          </Button>
          <p className="text-sm text-muted-foreground">
            {mensajes.auth.conCuenta}{' '}
            <Link href="/login" className="underline">
              {mensajes.auth.iniciarSesion}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
