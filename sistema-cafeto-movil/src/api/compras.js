import { MODO_DEMO, solicitud } from './cliente';
import { aCostosRaros, aLista, aOrdenResumen, aRecepcion, exigirOrden } from './formas';
import { leerOrdenDemo, listarOrdenesPorRecibirDemo, recepcionarDemo } from './demo';

export function sonCostosRaros(error) {
  return error?.estado === 409 && error?.datos?.codigo === 'COSTOS_RAROS';
}

export async function listarOrdenesPorRecibir(token) {
  const respuesta = MODO_DEMO
    ? await listarOrdenesPorRecibirDemo(token)
    : await solicitud('/compras/ordenes/?estado=POR_RECIBIR', { token });
  return aLista(respuesta, aOrdenResumen).resultados;
}

export async function leerOrden(token, id) {
  const respuesta = MODO_DEMO
    ? await leerOrdenDemo(token, id)
    : await solicitud(`/compras/ordenes/${encodeURIComponent(id)}/`, { token });
  return exigirOrden(respuesta);
}

export async function recepcionar(token, datos, claveOperacion) {
  let respuesta;
  try {
    respuesta = MODO_DEMO
      ? await recepcionarDemo(token, datos, claveOperacion)
      : await solicitud('/compras/recepciones/', { metodo: 'POST', cuerpo: datos, token, claveOperacion });
  } catch (problema) {
    if (sonCostosRaros(problema)) throw { ...problema, costosRaros: aCostosRaros(problema.datos.costos) };
    throw problema;
  }
  const resultado = aRecepcion(respuesta);
  if (!resultado) throw { respuestaInvalida: true };
  return resultado;
}
