'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { listarBoletas, type ResumenBoleta } from '@/lib/api/boletas';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { mensajes } from '@/mensajes/es';
import { TarjetaBoleta } from './tarjeta-boleta';

const g = mensajes.boletas.galeria;

export function GaleriaBoletas() {
  const api = useApi();
  const [items, setItems] = useState<ResumenBoleta[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let activo = true;
    listarBoletas(api, 1)
      .then((r) => {
        if (!activo) return;
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => {
        if (activo) setError(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [api]);

  async function cargarMas() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const r = await listarBoletas(api, pagina + 1);
      setItems((previos) => [...(previos ?? []), ...r.items]);
      setTotal(r.total);
      setPagina(pagina + 1);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!items && !error && <p className="text-sm text-muted-foreground">{g.cargando}</p>}
      {items && items.length === 0 && <p className="text-sm text-muted-foreground">{g.vacia}</p>}
      {items && items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((b) => (
            <li key={b.id}>
              <TarjetaBoleta boleta={b} />
            </li>
          ))}
        </ul>
      )}
      {items && items.length < total && (
        <Button variant="outline" disabled={cargando} onClick={() => void cargarMas()}>
          {cargando ? g.cargando : g.cargarMas}
        </Button>
      )}
    </div>
  );
}
