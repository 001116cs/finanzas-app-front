export type Celda = {
  /** Un `Date` es un día calendario a medianoche LOCAL: leer con getFullYear/getMonth/getDate, nunca UTC/toISOString. */
  valor: string | number | Date | null;
  texto: string;
  formula?: string;
};

export type Hoja = { nombre: string; filas: Celda[][] };

/** Propuesta heurística de columnas (§5.9); el mapeo confirmado es `Mapeo` de `interpretar.ts`. */
export type PropuestaMapeo = {
  descripcion?: number;
  monto?: number;
  fecha?: number;
  categoria?: number;
};
