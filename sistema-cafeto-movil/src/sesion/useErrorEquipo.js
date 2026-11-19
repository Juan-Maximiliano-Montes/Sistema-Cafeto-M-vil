import { useCallback } from 'react';
import { useAviso } from '../aviso/AvisoContext';
import { mensajeDeError } from '../api/cliente';
import { useSesion } from './SesionContext';

export function useErrorEquipo() {
  const { sesionVencida } = useSesion();
  const { avisar } = useAviso();

  return useCallback(
    (error, titulo = 'No pudimos completar la operación') => {
      if (error?.estado === 401) {
        sesionVencida();
        avisar('error', 'Tu sesión venció', 'Volvé a entrar con tu usuario del sistema.');
        return;
      }
      if (error?.estado === 403) {
        avisar(
          'error',
          'Sin permiso',
          'Tu usuario ya no tiene permiso para esto. Si te cambiaron los permisos, cerrá sesión y volvé a entrar.'
        );
        return;
      }
      avisar('error', titulo, mensajeDeError(error));
    },
    [sesionVencida, avisar]
  );
}
