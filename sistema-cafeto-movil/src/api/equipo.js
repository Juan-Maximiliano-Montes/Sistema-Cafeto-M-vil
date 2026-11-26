import { solicitud } from './cliente';

export function entrarEquipo(usuario, clave) {
  return solicitud('/sesion/', { metodo: 'POST', cuerpo: { usuario, clave } });
}

export function salirEquipo(token) {
  return solicitud('/sesion/', { metodo: 'DELETE', token });
}
