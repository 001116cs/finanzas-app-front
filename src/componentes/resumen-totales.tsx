import { Card, CardContent } from '@/components/ui/card';
import { formatearMonto } from '@/lib/monto';
import { mensajes } from '@/mensajes/es';

type Props = { gastos: string; ingresos: string; balance: string; moneda: string };

export function ResumenTotales({ gastos, ingresos, balance, moneda }: Props) {
  const negativo = Number(balance) < 0;
  const tarjetas = [
    { etiqueta: mensajes.dashboard.gastado, valor: gastos, clase: '' },
    { etiqueta: mensajes.dashboard.ganado, valor: ingresos, clase: '' },
    { etiqueta: mensajes.dashboard.balance, valor: balance, clase: negativo ? 'text-red-600' : '' },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tarjetas.map((t) => (
        <Card key={t.etiqueta}>
          <CardContent className="grid gap-1">
            <span className="text-sm text-muted-foreground">{t.etiqueta}</span>
            <span className={`text-xl font-semibold break-all ${t.clase}`}>
              {formatearMonto(t.valor, moneda)}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
