'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelMovimiento } from '@/componentes/boton-nuevo';
import {
  agregarGastoBoleta,
  editarBoleta,
  eliminarBoleta,
  obtenerBoleta,
  obtenerImagenBoleta,
  type CambiosBoleta,
  type DetalleBoleta as Detalle,
  type GastoBoleta,
} from '@/lib/api/boletas';
import { ErrorApi } from '@/lib/api/cliente';
import { mensajeDeError, useApi } from '@/lib/api/usar-api';
import { formatearFecha } from '@/lib/fechas';
import { normalizarMontoEntrada } from '@/lib/monto';
import { useCategorias } from '@/lib/usar-datos-periodo';
import { mensajes } from '@/mensajes/es';
import { FormularioCabeceraBoleta } from './formulario-cabecera-boleta';
import { VisorImagen } from './visor-imagen';

const d = mensajes.boletas.detalle;
const IMAGEN_NO_DISPONIBLE = 'No se pudo cargar la imagen de la boleta.';
const selectClase = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm';

export function DetalleBoleta({ id }: { id: string }) {
  const api = useApi();
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const { categorias } = useCategorias();
  const [version, setVersion] = useState(0);
  const [boleta, setBoleta] = useState<Detalle | null>(null);
  const [urlImagen, setUrlImagen] = useState<string | null>(null);
  const [imagenFallida, setImagenFallida] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [gastoAbierto, setGastoAbierto] = useState<GastoBoleta | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [errorGasto, setErrorGasto] = useState<string | null>(null);
  const [anadiendo, setAnadiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerBoleta(api, id)
      .then((datos) => {
        if (!activo) return;
        setBoleta(datos);
        setErrorCarga(null);
      })
      .catch((e) => {
        if (!activo) return;
        if (e instanceof ErrorApi && e.status === 404) {
          routerRef.current.push('/boletas');
          return;
        }
        setErrorCarga(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [api, id, version]);

  useEffect(() => {
    let activo = true;
    obtenerImagenBoleta(api, id)
      .then((imagen) => {
        if (!activo) return;
        const url = URL.createObjectURL(imagen);
        setUrlImagen((previa) => {
          if (previa) URL.revokeObjectURL(previa);
          return url;
        });
        setImagenFallida(false);
      })
      .catch(() => {
        if (activo) setImagenFallida(true);
      });
    return () => {
      activo = false;
    };
  }, [api, id]);

  // Revoca la última URL al desmontar.
  useEffect(() => {
    return () => {
      if (urlImagen) URL.revokeObjectURL(urlImagen);
    };
  }, [urlImagen]);

  const recargar = () => setVersion((v) => v + 1);

  async function guardarCabecera(cambios: CambiosBoleta) {
    setGuardado(false);
    await editarBoleta(api, id, cambios);
    setGuardado(true);
    recargar();
  }

  async function anadirGasto(e: FormEvent) {
    e.preventDefault();
    setErrorGasto(null);
    setGuardado(false);
    const normalizado = normalizarMontoEntrada(monto.trim());
    if (!descripcion.trim() || normalizado === null) {
      setErrorGasto(mensajes.movimiento.montoInvalido);
      return;
    }
    setAnadiendo(true);
    try {
      await agregarGastoBoleta(api, id, {
        descripcion: descripcion.trim(),
        monto: normalizado,
        categoriaId: categoriaId || null,
      });
      setDescripcion('');
      setMonto('');
      setCategoriaId('');
      recargar();
    } catch (err) {
      setErrorGasto(mensajeDeError(err));
    } finally {
      setAnadiendo(false);
    }
  }

  async function eliminar() {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarBoleta(api, id);
      router.push('/boletas');
    } catch (err) {
      setErrorEliminar(mensajeDeError(err));
      setConfirmando(false);
      setEliminando(false);
    }
  }

  const volver = (
    <Link href="/boletas" className="text-sm underline">
      {d.volver}
    </Link>
  );

  if (errorCarga && !boleta) {
    return (
      <div className="grid gap-3">
        {volver}
        <p role="alert" className="text-sm text-destructive">
          {errorCarga}
        </p>
      </div>
    );
  }
  if (!boleta) {
    return <div className="grid gap-3">{volver}</div>;
  }

  return (
    <div className="grid gap-6">
      {volver}
      {errorCarga && (
        <p role="alert" className="text-sm text-destructive">
          {errorCarga}
        </p>
      )}
      {imagenFallida && !urlImagen && (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {IMAGEN_NO_DISPONIBLE}
        </p>
      )}
      {urlImagen && (
        <VisorImagen url={urlImagen} alt={mensajes.boletas.fotoAlt} className="max-h-[60vh]" />
      )}
      <FormularioCabeceraBoleta
        key={`${boleta.comercio}|${boleta.fecha}|${boleta.totalImpreso ?? ''}`}
        inicial={{
          comercio: boleta.comercio,
          fecha: boleta.fecha,
          totalImpreso: boleta.totalImpreso,
        }}
        onGuardar={guardarCabecera}
        avisoExterno
      />
      {guardado && (
        <p role="status" className="text-sm text-green-700">
          {d.cambiosGuardados}
        </p>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{d.gastosTitulo}</h2>
        {boleta.gastos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.sinGastos}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {boleta.gastos.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => {
                    setGuardado(false);
                    setGastoAbierto(g);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="grid min-w-0">
                    <span className="truncate font-medium">{g.descripcion}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatearFecha(g.fecha)} · {g.categoriaNombre ?? mensajes.dashboard.sinCategoria}
                    </span>
                  </span>
                  <span className="shrink-0">{g.monto}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(e) => void anadirGasto(e)} className="grid gap-3">
        <h2 className="text-lg font-semibold">{d.anadirGasto}</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="gasto-descripcion">{d.descripcion}</Label>
          <Input
            id="gasto-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gasto-monto">{d.monto}</Label>
          <Input
            id="gasto-monto"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gasto-categoria">{d.categoria}</Label>
          <select
            id="gasto-categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className={selectClase}
          >
            <option value="">{mensajes.dashboard.sinCategoria}</option>
            {categorias
              .filter((c) => c.tipo === 'gasto')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
          </select>
        </div>
        {errorGasto && (
          <p role="alert" className="text-sm text-destructive">
            {errorGasto}
          </p>
        )}
        <Button type="submit" disabled={anadiendo}>
          {d.agregar}
        </Button>
      </form>

      {errorEliminar && (
        <p role="alert" className="text-sm text-destructive">
          {errorEliminar}
        </p>
      )}
      <Button variant="destructive" onClick={() => setConfirmando(true)} disabled={eliminando}>
        {mensajes.boletas.eliminar}
      </Button>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mensajes.boletas.eliminar}</AlertDialogTitle>
            <AlertDialogDescription>{mensajes.boletas.confirmarEliminar}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>{mensajes.acciones.cancelar}</AlertDialogCancel>
            <Button variant="destructive" disabled={eliminando} onClick={() => void eliminar()}>
              {mensajes.acciones.eliminar}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PanelMovimiento
        abierto={gastoAbierto !== null}
        onAbiertoChange={(a) => {
          if (!a) setGastoAbierto(null);
        }}
        categorias={categorias}
        inicial={gastoAbierto ?? undefined}
        onGuardado={recargar}
      />
    </div>
  );
}
