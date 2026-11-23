'use client';

import Link from 'next/link';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorApi } from '@/lib/api/cliente';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { resolverDesconocidas } from '@/lib/importacion/interpretar';
import { useCategorias } from '@/lib/usar-datos-periodo';
import { mensajes } from '@/mensajes/es';
import { derivar } from './derivar';
import { DialogoDuplicados } from './dialogo-duplicados';
import { ESTADO_INICIAL, reductor, type Paso } from './estado-asistente';
import { PasoArchivo } from './paso-archivo';
import { PasoCategorias } from './paso-categorias';
import { PasoColumnas } from './paso-columnas';
import { PasoVistaPrevia, seleccionadas } from './paso-vista-previa';

const m = mensajes.importar;
const MAX_FILAS = 2000;

export function AsistenteImportacion({ onImportado }: { onImportado: () => void }) {
  const api = useApi();
  const { categorias, cargadas, error: errorCategorias } = useCategorias();
  const [moneda, setMoneda] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [estado, dispatch] = useReducer(reductor, ESTADO_INICIAL);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogoDuplicadas, setDialogoDuplicadas] = useState(false);

  useEffect(() => {
    let activo = true;
    api
      .GET('/perfil')
      .then(({ data }) => {
        if (activo && data) setMoneda(data.moneda);
      })
      .catch((e) => {
        if (activo) setErrorPerfil(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [api]);

  const d = useMemo(() => derivar(estado, categorias), [estado, categorias]);
  const interpretacion = d.interpretacion;
  const hayDesconocidas = (interpretacion?.desconocidas.length ?? 0) > 0;
  const eleccion = hayDesconocidas ? estado.eleccion : 'ninguna';
  const resueltasTodas = useMemo(
    () => (interpretacion ? resolverDesconocidas(interpretacion.filas, eleccion, d.categoriaLote).filas : []),
    [interpretacion, eleccion, d.categoriaLote],
  );

  const irA = (paso: Paso) => {
    setError(null);
    dispatch({ tipo: 'ir', paso });
  };

  /** Del paso 2/3 al 4/5: una sola consulta de duplicados (si el lote cabe en el límite). */
  async function irAVista() {
    if (!interpretacion) return;
    setError(null);
    const filas = interpretacion.filas;
    if (filas.length === 0 || filas.length > MAX_FILAS) {
      dispatch({ tipo: 'duplicadas', origenes: [] });
      return irA('vista');
    }
    setOcupado(true);
    try {
      const { data } = await api.POST('/importaciones/duplicados', {
        body: {
          filas: resueltasTodas.map(({ fecha, descripcion, monto, tipo }) => ({ fecha, descripcion, monto, tipo })),
        },
      });
      const origenes = (data?.indices ?? []).map((i) => filas[i].origen);
      dispatch({ tipo: 'duplicadas', origenes });
      if (origenes.length > 0) setDialogoDuplicadas(true);
      else irA('vista');
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  async function importar() {
    if (!interpretacion) return;
    setError(null);
    setOcupado(true);
    try {
      const elegidas = seleccionadas(interpretacion.filas, estado.desmarcadas, estado.duplicadas, estado.modoDuplicadas);
      const { filas, categoriasNuevas } = resolverDesconocidas(elegidas, eleccion, d.categoriaLote);
      const { data } = await api.POST('/importaciones', {
        body: { nombreArchivo: estado.nombreArchivo, categoriasNuevas, filas },
      });
      dispatch({ tipo: 'listo', importadas: data?.filasImportadas ?? filas.length });
      onImportado();
    } catch (e) {
      const base = mensajeDeError(e);
      setError(e instanceof ErrorApi && e.fila !== undefined ? m.errorImportando(e.fila + 1, base) : base);
    } finally {
      setOcupado(false);
    }
  }

  const pasos: Paso[] = hayDesconocidas ? ['archivo', 'columnas', 'categorias', 'vista'] : ['archivo', 'columnas', 'vista'];
  const numero = pasos.indexOf(estado.paso) + 1;
  const cargando = !cargadas || moneda === null;
  const falloCarga = errorCategorias ?? errorPerfil;

  if (falloCarga) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {falloCarga}
      </p>
    );
  }
  if (cargando) return <p className="text-sm text-muted-foreground">{m.cargando}</p>;

  if (estado.paso === 'listo') {
    return (
      <div className="grid gap-3" role="status">
        <p className="font-medium">{m.listo.titulo(estado.importadas)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="text-sm underline underline-offset-4">
            {m.listo.dashboard}
          </Link>
          <a href="#historial" className="text-sm underline underline-offset-4">
            {m.listo.historial}
          </a>
          <Button variant="outline" onClick={() => dispatch({ tipo: 'reiniciar' })}>
            {m.listo.otro}
          </Button>
        </div>
      </div>
    );
  }

  const demasiadas = (interpretacion?.filas.length ?? 0) > MAX_FILAS;
  const elegidas = interpretacion
    ? seleccionadas(interpretacion.filas, estado.desmarcadas, estado.duplicadas, estado.modoDuplicadas).length
    : 0;
  const columnasListas =
    !!interpretacion &&
    interpretacion.filas.length > 0 &&
    !d.montoPendiente &&
    !d.fechaPendiente &&
    !(interpretacion.hayMixtos && estado.signos === undefined);

  const atras: Paso | null =
    estado.paso === 'columnas' ? 'archivo' : estado.paso === 'categorias' ? 'columnas' : estado.paso === 'vista' ? (hayDesconocidas ? 'categorias' : 'columnas') : null;

  return (
    <div className="grid gap-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {m.paso(numero, pasos.length)} · {m.pasos[estado.paso]}
      </h2>

      {estado.paso === 'archivo' && (
        <PasoArchivo
          nombreArchivo={estado.nombreArchivo}
          hojas={estado.hojas}
          hoja={estado.hoja}
          onLeido={(nombre, hojas) => dispatch({ tipo: 'archivo', nombre, hojas })}
          onHoja={(indice) => dispatch({ tipo: 'hoja', indice })}
        />
      )}
      {estado.paso === 'columnas' && (
        <PasoColumnas estado={estado} derivados={d} categorias={categorias} dispatch={dispatch} />
      )}
      {estado.paso === 'categorias' && interpretacion && (
        <PasoCategorias
          desconocidas={interpretacion.desconocidas}
          eleccion={estado.eleccion}
          hayCategoriaLote={!!d.categoriaLote}
          onEleccion={(e) => dispatch({ tipo: 'cambiar', cambios: { eleccion: e } })}
        />
      )}
      {estado.paso === 'vista' && interpretacion && d.hoja && d.mapeo && (
        <PasoVistaPrevia
          hoja={d.hoja}
          columnaDescripcion={d.mapeo.descripcion}
          interpretacion={interpretacion}
          resueltas={resueltasTodas}
          categorias={categorias}
          moneda={moneda}
          duplicadas={estado.duplicadas}
          modoDuplicadas={estado.modoDuplicadas}
          desmarcadas={estado.desmarcadas}
          demasiadas={demasiadas}
          onAlternar={(origen) => dispatch({ tipo: 'alternar', origen })}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-2">
        {atras ? (
          <Button variant="outline" onClick={() => irA(atras)} disabled={ocupado}>
            {m.atras}
          </Button>
        ) : (
          <span />
        )}
        {estado.paso === 'archivo' && estado.hojas.length > 0 && (
          <Button onClick={() => irA('columnas')}>{m.siguiente}</Button>
        )}
        {estado.paso === 'columnas' && (
          <Button
            disabled={!columnasListas || ocupado}
            onClick={() => (hayDesconocidas ? irA('categorias') : void irAVista())}
          >
            {ocupado ? m.duplicados.buscando : m.siguiente}
          </Button>
        )}
        {estado.paso === 'categorias' && (
          <Button disabled={ocupado} onClick={() => void irAVista()}>
            {ocupado ? m.duplicados.buscando : m.siguiente}
          </Button>
        )}
        {estado.paso === 'vista' && (
          <Button disabled={demasiadas || elegidas === 0 || ocupado} onClick={() => void importar()}>
            {ocupado ? m.importando : m.accionImportar}
          </Button>
        )}
      </div>

      {dialogoDuplicadas && (
        <DialogoDuplicados
          cantidad={estado.duplicadas.length}
          onElegir={(modo) => {
            setDialogoDuplicadas(false);
            dispatch({ tipo: 'modo_duplicadas', modo });
          }}
        />
      )}
    </div>
  );
}
