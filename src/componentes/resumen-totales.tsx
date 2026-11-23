import { Card, CardContent } from '@/components/ui/card';
import { formatearMonto } from '@/lib/monto';
import type { TipoVista } from '@/lib/tipo-vista';
import { mensajes } from '@/mensajes/es';

type Props = { tipo: TipoVista; gastos: string; ingresos: string; balance: string; moneda: string };

/** Tarjeta con el total del tipo elegido y, debajo, el balance del período en pequeño. */
export function ResumenTotales({ tipo, gastos, ingresos, balance, moneda }: Props) {
  const etiqueta = tipo === 'gasto' ? mensajes.dashboard.gastado : mensajes.dashboard.ganado;
  const valor = tipo === 'gasto' ? gastos : ingresos;
  const negativo = Number(balance) < 0;
  return (
    <Card>
      <CardContent className="grid gap-1">
        <span className="text-sm text-muted-foreground">{etiqueta}</span>
        <span className="text-2xl font-semibold break-all">{formatearMonto(valor, moneda)}</span>
        <span className="text-sm text-muted-foreground">
          {mensajes.dashboard.balance}:{' '}
          <span data-testid="balance-monto" className={`font-medium ${negativo ? 'text-red-600' : 'text-foreground'}`}>
            {formatearMonto(balance, moneda)}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}
