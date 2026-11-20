export const mensajes = {
  app: {
    nombre: 'Finanzas',
    descripcion: 'Tus gastos e ingresos en un solo lugar',
  },
  errores: {
    generico: 'Algo salió mal. Inténtalo de nuevo.',
    red: 'No pudimos conectar con el servidor. Revisa tu conexión.',
    sesionExpirada: 'Tu sesión expiró. Inicia sesión de nuevo.',
    PERFIL_REQUERIDO: 'Completa tu perfil para continuar.',
    CATEGORIA_DUPLICADA: 'Ya tienes una categoría con ese nombre.',
    MODO_REQUERIDO: 'Elige qué hacer con los movimientos de esta categoría.',
  },
  acciones: {
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    eliminar: 'Eliminar',
    editar: 'Editar',
    cerrarSesion: 'Cerrar sesión',
  },
} as const;
