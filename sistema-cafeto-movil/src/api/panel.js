import { MODO_DEMO, solicitud } from './cliente';
import { aPanel } from './formas';
import { leerPanelDemo } from './demo';

export async function leerPanel(token) {
  const respuesta = MODO_DEMO ? await leerPanelDemo(token) : await solicitud('/panel/', { token });
  return aPanel(respuesta);
}
