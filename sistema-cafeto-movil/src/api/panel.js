import { solicitud } from './cliente';
import { aPanel } from './formas';

export async function leerPanel(token) {
  const respuesta = await solicitud('/panel/', { token });
  return aPanel(respuesta);
}
