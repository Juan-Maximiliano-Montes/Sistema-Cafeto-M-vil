export const ORDEN_CATEGORIAS = ['Bronze', 'Silver', 'Gold', 'Platinum'];

function entero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, Math.round(numero)) : 0;
}

function nombre(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function ordenDeCategorias(categorias) {
  const nombres = (Array.isArray(categorias) ? categorias : [])
    .map((categoria) => nombre(typeof categoria === 'string' ? categoria : categoria?.nombre))
    .filter(Boolean);
  return nombres.length > 0 ? [...new Set(nombres)] : ORDEN_CATEGORIAS;
}

export function resumirPuntos(datos, orden = ordenDeCategorias(datos?.categorias)) {
  const categoria = nombre(datos?.categoria) || orden[0] || 'Bronze';
  const disponibles = entero(datos?.puntosDisponibles);
  const acumulados = entero(datos?.puntosAcumulados);
  const meta = entero(datos?.puntosProximaCategoria);
  const pedida = nombre(datos?.proximaCategoria);
  const proxima =
    pedida && pedida !== categoria && orden.indexOf(pedida) > orden.indexOf(categoria) ? pedida : null;
  const faltan = proxima && meta > acumulados ? meta - acumulados : 0;
  const avance = proxima && meta > 0 ? Math.min(100, (acumulados / meta) * 100) : 100;
  return { categoria, disponibles, acumulados, proxima, faltan, avance };
}

export function alcanzaCategoria(categoriaCliente, categoriaPedida, orden = ORDEN_CATEGORIAS) {
  if (categoriaCliente === categoriaPedida) return true;
  const nivelCliente = orden.indexOf(categoriaCliente);
  const nivelPedido = orden.indexOf(categoriaPedida);
  if (nivelPedido < 0 || nivelCliente < 0) return false;
  return nivelCliente >= nivelPedido;
}

export function ordenarBeneficios(lista, orden = ORDEN_CATEGORIAS) {
  const nivel = (categoria) => {
    const posicion = orden.indexOf(categoria);
    return posicion < 0 ? orden.length : posicion;
  };
  return [...lista].sort(
    (a, b) => nivel(a.categoria) - nivel(b.categoria) || a.puntos - b.puntos || a.titulo.localeCompare(b.titulo, 'es')
  );
}
