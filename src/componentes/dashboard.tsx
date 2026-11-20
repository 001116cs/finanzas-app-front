'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/esquema';
import { periodoAQuery, periodoDesdeQuery, type Periodo } from '@/lib/periodos';
import { useCategorias, useDatosPeriodo } from '@/lib/usar-datos-periodo';
import { mensajes } from '@/mensajes/es';
import { BotonNuevo, PanelMovimiento } from './boton-nuevo';
import { DesgloseCategorias } from './desglose-categorias';
import { ListaMovimientos } from './lista-movimientos';
import { ResumenTotales } from './resumen-totales';
import { SelectorPeriodo } from './selector-periodo';

type Transaccion = components['schemas']['TransaccionRespuesta'];

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const periodo = periodoDesdeQuery(new URLSearchParams(query.toString()));
  const { resumen, items, total, cargando, cargandoMas, error, cargarMas, refrescar } =
    useDatosPeriodo(periodo);
  const { categorias, error: errorCategorias } = useCategorias();
  const [editando, setEditando] = useState<Transaccion | null>(null);

  function cambiarPeriodo(p: Periodo) {
    const q = periodoAQuery(p);
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="grid gap-6 pb-24">
      <SelectorPeriodo valor={periodo} onCambio={cambiarPeriodo} />
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
            gastos={resumen.totalGastos}
            ingresos={resumen.totalIngresos}
            balance={resumen.balance}
            moneda={resumen.moneda}
          />
          <DesgloseCategorias filas={resumen.porCategoria} moneda={resumen.moneda} />
          <ListaMovimientos
            items={items}
            total={total}
            moneda={resumen.moneda}
            cargandoMas={cargandoMas}
            onEditar={setEditando}
            onCargarMas={cargarMas}
          />
        </>
      )}
      <BotonNuevo categorias={categorias} onGuardado={refrescar} />
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
