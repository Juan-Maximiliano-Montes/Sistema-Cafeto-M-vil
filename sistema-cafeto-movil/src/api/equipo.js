import { MODO_DEMO, solicitud } from './cliente';
import { entrarDemo, salirDemo } from './demo';

export function entrarEquipo(usuario, clave) {
  if (MODO_DEMO) return entrarDemo(usuario, clave);
  return solicitud('/sesion/', { metodo: 'POST', cuerpo: { usuario, clave } });
}

export function salirEquipo(token) {
  if (MODO_DEMO) return salirDemo();
  return solicitud('/sesion/', { metodo: 'DELETE', token });
}
