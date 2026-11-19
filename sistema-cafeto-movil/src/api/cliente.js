const URL_API = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
const TIEMPO_MAXIMO = 12000;

export const MODO_DEMO = URL_API === '';

export function nuevaClaveOperacion() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function esOperacionRepetida(error) {
  return error?.estado === 409 && typeof error?.datos?.detail === 'string' && /ya se hab[ií]a cargado/i.test(error.datos.detail);
}

export async function solicitud(ruta, { metodo = 'GET', cuerpo, token, firebase = false, claveOperacion } = {}) {
  if (!URL_API) {
    throw { sinConfigurar: true };
  }

  const controlador = new AbortController();
  let vencido = false;
  const espera = setTimeout(() => {
    vencido = true;
    controlador.abort();
  }, TIEMPO_MAXIMO);

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token && { Authorization: `${firebase ? 'Firebase' : 'Token'} ${token}` }),
        ...(claveOperacion && { 'Idempotency-Key': claveOperacion }),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: controlador.signal,
    });
  } catch (error) {
    throw vencido ? { sinConexion: true, tiempoAgotado: true } : { sinConexion: true };
  } finally {
    clearTimeout(espera);
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => undefined);
  if (!respuesta.ok) {
    throw { estado: respuesta.status, datos: datos && typeof datos === 'object' ? datos : null };
  }
  if (datos === undefined || datos === null) {
    throw { estado: respuesta.status, datos: null, respuestaInvalida: true };
  }
  return datos;
}

export function mensajeDeError(error, porDefecto = 'Algo salió mal. Probá de nuevo en un rato.') {
  if (error?.sinConfigurar) {
    return 'Falta configurar la dirección del sistema Cafeto en el archivo .env (EXPO_PUBLIC_API_URL).';
  }
  if (error?.tiempoAgotado) {
    return 'El sistema Cafeto tardó demasiado en responder. Probá de nuevo en un rato.';
  }
  if (error?.sinConexion) {
    return 'No pudimos conectar con el sistema Cafeto. Revisá tu conexión y probá de nuevo.';
  }
  if (error?.respuestaInvalida) {
    return 'El sistema Cafeto respondió algo que no esperábamos. Si se repite, avisale al administrador.';
  }
  const detalle = error?.datos?.detail;
  if (typeof detalle === 'string' && detalle.trim()) {
    return detalle.trim();
  }
  switch (error?.estado) {
    case 401:
      return 'Tu sesión venció. Volvé a entrar con tu usuario.';
    case 403:
      return 'Tu usuario no tiene permiso para hacer esto.';
    case 404:
      return 'No encontramos lo que buscabas. Puede que ya no exista.';
    case 409:
      return 'No se pudo completar porque los datos cambiaron. Actualizá y probá de nuevo.';
    case 429:
      return 'Hiciste muchos pedidos seguidos. Esperá un momento y probá de nuevo.';
    default:
      if (error?.estado >= 500) return 'El sistema Cafeto tuvo un problema. Probá de nuevo en un rato.';
      return porDefecto;
  }
}

export function erroresPorCampo(error) {
  const errores = error?.datos?.errores;
  if (!errores || typeof errores !== 'object') return {};
  const resultado = {};
  Object.entries(errores).forEach(([campo, mensajes]) => {
    const primero = Array.isArray(mensajes) ? mensajes[0] : mensajes;
    if (typeof primero === 'string' && primero.trim()) resultado[campo] = primero.trim();
  });
  return resultado;
}
