export type Celda = {
  valor: string | number | Date | null;
  texto: string;
  formula?: string;
};

export type Hoja = { nombre: string; filas: Celda[][] };

export type Mapeo = {
  descripcion?: number;
  monto?: number;
  fecha?: number;
  categoria?: number;
};
