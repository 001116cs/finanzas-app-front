'use client';

import { use } from 'react';
import { DetalleBoleta } from '@/componentes/boletas/detalle-boleta';

export default function PaginaDetalleBoleta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DetalleBoleta id={id} />;
}
