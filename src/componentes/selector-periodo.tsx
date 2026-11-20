'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Periodo } from '@/lib/periodos';
import { mensajes } from '@/mensajes/es';

type Props = { valor: Periodo; onCambio: (p: Periodo) => void };

export function SelectorPeriodo({ valor, onCambio }: Props) {
  const [modoRango, setModoRango] = useState(valor.clave === 'rango');
  const [desde, setDesde] = useState(valor.clave === 'rango' ? valor.desde : '');
  const [hasta, setHasta] = useState(valor.clave === 'rango' ? valor.hasta : '');
  const invalido = modoRango && desde !== '' && hasta !== '' && desde > hasta;

  function elegir(clave: string) {
    if (clave === 'rango') {
      setModoRango(true);
      if (desde && hasta && desde <= hasta) onCambio({ clave: 'rango', desde, hasta });
      return;
    }
    setModoRango(false);
    onCambio({ clave: clave as 'este_mes' | 'mes_anterior' });
  }

  function cambiarFechas(d: string, h: string) {
    setDesde(d);
    setHasta(h);
    if (d && h && d <= h) onCambio({ clave: 'rango', desde: d, hasta: h });
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="periodo">{mensajes.periodo.etiqueta}</Label>
      <select
        id="periodo"
        value={modoRango ? 'rango' : valor.clave}
        onChange={(e) => elegir(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
      >
        <option value="este_mes">{mensajes.periodo.este_mes}</option>
        <option value="mes_anterior">{mensajes.periodo.mes_anterior}</option>
        <option value="rango">{mensajes.periodo.rango}</option>
      </select>
      {modoRango && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="periodo-desde">{mensajes.periodo.desde}</Label>
            <Input
              id="periodo-desde"
              type="date"
              value={desde}
              onChange={(e) => cambiarFechas(e.target.value, hasta)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="periodo-hasta">{mensajes.periodo.hasta}</Label>
            <Input
              id="periodo-hasta"
              type="date"
              value={hasta}
              onChange={(e) => cambiarFechas(desde, e.target.value)}
            />
          </div>
        </div>
      )}
      {invalido && (
        <p role="alert" className="text-sm text-destructive">
          {mensajes.periodo.rangoInvalido}
        </p>
      )}
    </div>
  );
}
