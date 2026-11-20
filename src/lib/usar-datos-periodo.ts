'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { components } from '@/lib/api/esquema';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { mensajes } from '@/mensajes/es';
import { hoyISO, periodoAParams, type Periodo } from '@/lib/periodos';

type Resumen = components['schemas']['ResumenRespuesta'];
type Transaccion = components['schemas']['TransaccionRespuesta'];
type Categoria = components['schemas']['CategoriaRespuesta'];

const TAMANO = 20;

/**
 * Carga /resumen con los parámetros del período y usa el desde/hasta que
 * devuelve para listar /transacciones, así totales y lista cubren el mismo rango.
 */
export function useDatosPeriodo(periodo: Periodo) {
  const api = useApi();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [items, setItems] = useState<Transaccion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify(periodo);
  const generacion = useRef(0);

  useEffect(() => {
    let activo = true;
    generacion.current++;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const p = JSON.parse(clave) as Periodo;
        const { data: r } = await api.GET('/resumen', {
          params: { query: periodoAParams(p, hoyISO()) },
        });
        if (!r) throw new Error('sin datos');
        const { data: l } = await api.GET('/transacciones', {
          params: { query: { desde: r.desde, hasta: r.hasta, pagina: 1, tamano: TAMANO } },
        });
        if (!l) throw new Error('sin datos');
        if (!activo) return;
        setResumen(r);
        setItems(l.items);
        setTotal(l.total);
        setPagina(1);
      } catch (e) {
        if (activo) setError(mensajeDeError(e));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [api, clave, version]);

  const cargarMas = useCallback(async () => {
    if (!resumen) return;
    const miGeneracion = generacion.current;
    setCargandoMas(true);
    try {
      const { data: l } = await api.GET('/transacciones', {
        params: {
          query: { desde: resumen.desde, hasta: resumen.hasta, pagina: pagina + 1, tamano: TAMANO },
        },
      });
      if (miGeneracion !== generacion.current) return;
      if (l) {
        setItems((prev) => [...prev, ...l.items]);
        setTotal(l.total);
        setPagina(pagina + 1);
      }
    } catch (e) {
      if (miGeneracion === generacion.current) setError(mensajeDeError(e));
    } finally {
      if (miGeneracion === generacion.current) setCargandoMas(false);
    }
  }, [api, resumen, pagina]);

  const refrescar = useCallback(() => setVersion((v) => v + 1), []);

  return { resumen, items, total, cargando, cargandoMas, error, cargarMas, refrescar };
}

export function useCategorias() {
  const api = useApi();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargadas, setCargadas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    api
      .GET('/categorias', { params: { query: {} } })
      .then(({ data }) => {
        if (activo && data) {
          setCategorias(data);
          setCargadas(true);
        }
      })
      .catch((e) => {
        if (activo) setError(mensajeDeError(e) === mensajes.errores.red ? mensajes.errores.red : mensajes.errores.categorias);
      });
    return () => {
      activo = false;
    };
  }, [api]);
  return { categorias, cargadas, error };
}
