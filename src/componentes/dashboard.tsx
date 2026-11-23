'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/esquema';
import { periodoAQuery, periodoDesdeQuery, type Periodo } from '@/lib/periodos';
import { construirQuery, tipoDesdeQuery, type TipoVista } from '@/lib/tipo-vista';
import { useCategorias, useDatosPeriodo } from '@/lib/usar-datos-periodo';
import { mensajes } from '@/mensajes/es';
import { BotonNuevo, PanelMovimiento } from './boton-nuevo';
import { DesgloseCategorias } from './desglose-categorias';
import { ListaMovimientos } from './lista-movimientos';
import { ResumenTotales } from './resumen-totales';
import { SelectorPeriodo } from './selector-periodo';
import { SelectorTipo } from './selector-tipo';

type Transaccion = components['schemas']['TransaccionRespuesta'];

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const params = new URLSearchParams(query.toString());
  const periodo = periodoDesdeQuery(params);
  const tipo = tipoDesdeQuery(params);
  const { resumen, items, total, cargando, cargandoMas, error, cargarMas, refrescar } =
    useDatosPeriodo(periodo, tipo);
  const { categorias, error: errorCategorias } = useCategorias();
  const [editando, setEditando] = useState<Transaccion | null>(null);

  // Período y tipo comparten la URL: cambiar uno conserva el otro.
  function navegar(p: Periodo, t: TipoVista) {
    const q = construirQuery(periodoAQuery(p), t);
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="grid gap-6 pb-24">
      <SelectorPeriodo valor={periodo} onCambio={(p) => navegar(p, tipo)} />
      <SelectorTipo valor={tipo} onCambio={(t) => navegar(periodo, t)} />
      {error && (
        <div role="alert" className="grid gap-2 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" onClick={refrescar}>
            {mensajes.errores.reintentar}
          </Button>
        </div>
      )}
      {errorCategorias && (
        <p role="alert" className="text-sm text-destructive">
          {errorCategorias}
        </p>
      )}
      {cargando && !resumen && <p className="text-sm text-muted-foreground">{mensajes.dashboard.cargando}</p>}
      {resumen && (
        <>
          <ResumenTotales
            tipo={tipo}
            gastos={resumen.totalGastos}
            ingresos={resumen.totalIngresos}
            balance={resumen.balance}
            moneda={resumen.moneda}
          />
          <DesgloseCategorias filas={resumen.porCategoria} moneda={resumen.moneda} tipo={tipo} />
          <ListaMovimientos
            items={items}
            total={total}
            moneda={resumen.moneda}
            cargandoMas={cargandoMas || cargando}
            onEditar={setEditando}
            onCargarMas={cargarMas}
          />
        </>
      )}
      <BotonNuevo categorias={categorias} tipoInicial={tipo} onGuardado={refrescar} />
      <PanelMovimiento
        abierto={editando !== null}
        onAbiertoChange={(a) => !a && setEditando(null)}
        categorias={categorias}
        inicial={editando ?? undefined}
        onGuardado={refrescar}
      />
    </div>
  );
}
