import { Suspense } from 'react';
import { Dashboard } from '@/componentes/dashboard';

export default function Inicio() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
