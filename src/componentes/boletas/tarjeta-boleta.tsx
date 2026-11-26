'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { obtenerImagenBoleta, type ResumenBoleta } from '@/lib/api/boletas';
import { useApi } from '@/lib/api/usar-api';
import { formatearFecha } from '@/lib/fechas';
import { mensajes } from '@/mensajes/es';

/** Tarjeta de la galería; la miniatura se pide la primera vez que la tarjeta es visible. */
export function TarjetaBoleta({ boleta }: { boleta: ResumenBoleta }) {
  const api = useApi();
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        setVisible(true);
        observador.disconnect();
      }
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    let creada: string | null = null;
    obtenerImagenBoleta(api, boleta.id)
      .then((blob) => {
        if (!activo) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [api, boleta.id, visible]);

  const total = Number(boleta.totalImpreso ?? boleta.sumaGastos).toFixed(2);
  return (
    <Link
      ref={ref}
      href={`/boletas/${boleta.id}`}
      className="grid overflow-hidden rounded-lg border bg-card hover:bg-accent/40"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={mensajes.boletas.galeria.miniaturaAlt(boleta.comercio)}
          className="aspect-[3/4] w-full object-cover"
        />
      ) : (
        <div className="aspect-[3/4] w-full bg-muted" aria-hidden="true" />
      )}
      <div className="grid gap-0.5 p-2 text-sm">
        <p className="truncate font-medium">{boleta.comercio}</p>
        <p className="text-muted-foreground">{formatearFecha(boleta.fecha)}</p>
        <p>{total}</p>
        <p className="text-muted-foreground">{mensajes.boletas.galeria.gastos(boleta.gastos)}</p>
      </div>
    </Link>
  );
}
