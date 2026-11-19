import { MODO_DEMO, solicitud } from './cliente';
import { aAlerta, aConsulta, aLista, aLote, aOferta } from './formas';
import { consultarProductosDemo, listarAlertasDemo, listarLotesDemo, listarOfertasDemo } from './demo';

export async function consultarProductos(token, { busqueda = '', codigo = '', pagina = 1 } = {}) {
  const respuesta = MODO_DEMO
    ? await consultarProductosDemo(token, { busqueda, codigo, pagina })
    : await solicitud(
        `/stock/productos/?q=${encodeURIComponent(String(busqueda).trim())}` +
          `&codigo=${encodeURIComponent(String(codigo).trim())}&pagina=${pagina}`,
        { token }
      );
  return aLista(respuesta, aConsulta);
}

export async function listarAlertas(token, { tipo = 'TODAS' } = {}) {
  const respuesta = MODO_DEMO
    ? await listarAlertasDemo(token, { tipo })
    : await solicitud(`/stock/alertas/?tipo=${encodeURIComponent(tipo)}`, { token });
  return aLista(respuesta, aAlerta);
}

export async function listarLotes(token, idProducto) {
  const respuesta = MODO_DEMO
    ? await listarLotesDemo(token, idProducto)
    : await solicitud(`/stock/productos/${encodeURIComponent(idProducto)}/lotes/`, { token });
  return aLista(respuesta, aLote).resultados;
}

export async function listarOfertas(token) {
  const respuesta = MODO_DEMO ? await listarOfertasDemo(token) : await solicitud('/stock/ofertas/', { token });
  return aLista(respuesta, aOferta).resultados;
}
