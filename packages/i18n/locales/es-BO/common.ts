export const esBO = {
  common: { loading: "Cargando…", retry: "Reintentar", cancel: "Cancelar", save: "Guardar", signOut: "Cerrar sesión", empty: "No hay resultados." },
  auth: { email: "Correo electrónico", password: "Contraseña", signIn: "Iniciar sesión", register: "Crear cuenta", forgotPassword: "¿Olvidaste tu contraseña?" },
  errors: { unauthorized: "Tu sesión expiró.", forbidden: "No tienes permisos para realizar esta acción.", conflict: "Este recurso cambió. Actualiza e inténtalo nuevamente.", validation: "Revisa los datos ingresados." }
} as const;
