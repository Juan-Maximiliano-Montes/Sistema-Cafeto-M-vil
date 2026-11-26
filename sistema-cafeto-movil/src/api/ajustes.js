import { solicitud } from './cliente';
import { aAjuste, aConteo, aLista } from './formas';

function aRespuestaConteo(respuesta) {
  if (!respuesta || typeof respuesta !== 'object' || !('conteo' in respuesta)) throw { respuestaInvalida: true };
  return aConteo(respuesta.conteo);
}

function exigirRegistro(respuesta) {
  if (!respuesta || typeof respuesta !== 'object' || respuesta.id === undefined || respuesta.id === null) {
    throw { respuestaInvalida: true };
  }
  return { id: String(respuesta.id), estado: String(respuesta.estado ?? '') };
}

export async function leerConteo(token) {
  const respuesta = await solicitud('/stock/conteo/', { token });
  return aRespuestaConteo(respuesta);
}

export async function iniciarConteo(token, motivo) {
  const respuesta = await solicitud('/stock/conteo/', { metodo: 'POST', cuerpo: { motivo }, token });
  return aRespuestaConteo(respuesta);
}

export async function cargarConteo(token, datos) {
  const respuesta = await solicitud('/stock/conteo/renglones/', { metodo: 'POST', cuerpo: datos, token });
  return aRespuestaConteo(respuesta);
}

export async function enviarConteo(token) {
  const respuesta = await solicitud('/stock/conteo/enviar/', { metodo: 'POST', cuerpo: {}, token });
  return aRespuestaConteo(respuesta);
}

export async function registrarMerma(token, datos, claveOperacion) {
  const respuesta = await solicitud('/stock/mermas/', { metodo: 'POST', cuerpo: datos, token, claveOperacion });
  return exigirRegistro(respuesta);
}

export async function registrarTraspaso(token, datos, claveOperacion) {
  const respuesta = await solicitud('/stock/traspasos/', { metodo: 'POST', cuerpo: datos, token, claveOperacion });
  return exigirRegistro(respuesta);
}

export async function listarAjustesPendientes(token) {
  const respuesta = await solicitud('/stock/ajustes/?estado=PENDIENTE', { token });
  return aLista(respuesta, aAjuste).resultados;
}

export async function aprobarAjuste(token, id, observacion = '') {
  const respuesta = await solicitud(`/stock/ajustes/${encodeURIComponent(id)}/aprobar/`, {
    metodo: 'POST',
    cuerpo: { observacion },
    token,
  });
  return exigirRegistro(respuesta);
}

export async function rechazarAjuste(token, id, observacion) {
  const respuesta = await solicitud(`/stock/ajustes/${encodeURIComponent(id)}/rechazar/`, {
    metodo: 'POST',
    cuerpo: { observacion },
    token,
  });
  return exigirRegistro(respuesta);
}
