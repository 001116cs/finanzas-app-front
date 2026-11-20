'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MONEDAS, OTRA } from '@/lib/perfil';
import { mensajes } from '@/mensajes/es';

type Props = {
  moneda: string;
  otra: string;
  onMoneda: (v: string) => void;
  onOtra: (v: string) => void;
};

export function CamposMoneda({ moneda, otra, onMoneda, onOtra }: Props) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="moneda">{mensajes.perfil.moneda}</Label>
        <select
          id="moneda"
          value={moneda}
          onChange={(e) => onMoneda(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {MONEDAS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value={OTRA}>{mensajes.perfil.otra}</option>
        </select>
      </div>
      {moneda === OTRA && (
        <div className="grid gap-2">
          <Label htmlFor="codigo-iso">{mensajes.perfil.codigoIso}</Label>
          <Input
            id="codigo-iso"
            value={otra}
            maxLength={3}
            onChange={(e) => onOtra(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
