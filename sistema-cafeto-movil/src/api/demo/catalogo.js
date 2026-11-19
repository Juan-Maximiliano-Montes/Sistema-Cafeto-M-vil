import { coincide } from '../../utilidades/texto';
import { diasHasta } from '../../utilidades/formato';
import { categorias } from '../../datos/ejemplo';
import { BENEFICIOS, PRODUCTOS } from './datos';
import { marcasDemo } from './marcas';
import { rubrosDemo } from './rubros';
import { leerInventario, proximoLote, stockDe, tieneStock, vencidoDe } from './inventario';
import { esperar, fallar, ordenarPorNombre, paginar } from './utilidades';

export const TIPOS_POR_SECCION = {
  CAFETERIA: ['ELABORADO', 'PRODUCIDO', 'COMBO'],
  MINISUPER: ['REVENTA'],
};

const MAXIMO_DESTACADOS = 8;

export function seccionDeTipo(tipo) {
  if (TIPOS_POR_SECCION.MINISUPER.includes(tipo)) return 'MINISUPER';
  if (TIPOS_POR_SECCION.CAFETERIA.includes(tipo)) return 'CAFETERIA';
  return null;
}

export function rebajaDe(producto, rubro) {
  if (!producto.controlaVencimiento || !rubro?.diasRebaja || !rubro?.porcentajeRebaja) return null;
  return { dias: rubro.diasRebaja, porcentaje: rubro.porcentajeRebaja };
}

export function precioConRebaja(producto, porcentaje) {
  return Math.round((producto.precio * (100 - porcentaje)) / 100);
}

export function calcularOferta(producto, rubro, inventario) {
  if (seccionDeTipo(producto.tipo) === null || producto.precio <= 0) return null;
  const rebaja = rebajaDe(producto, rubro);
  if (!rebaja) return null;
  const lote = proximoLote(inventario, producto);
  if (!lote || diasHasta(lote.vence) > rebaja.dias) return null;
  return { porcentaje: rebaja.porcentaje, precio: precioConRebaja(producto, rebaja.porcentaje) };
}

export function estaDisponible(producto, inventario) {
  if (!tieneStock(producto)) return true;
  return stockDe(inventario, producto) - vencidoDe(inventario, producto) > 0;
}

export async function leerReferencias() {
  const [rubros, marcas, inventario] = await Promise.all([rubrosDemo.leer(), marcasDemo.leer(), leerInventario()]);
  return { rubros, marcas, inventario };
}

export function aPublico(producto, { rubros, marcas, inventario }, motivo) {
  const rubro = rubros.find((item) => item.id === producto.idRubro) ?? null;
  const marca = marcas.find((item) => item.id === producto.idMarca) ?? null;
  const oferta = calcularOferta(producto, rubro, inventario);
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    presentacion: producto.presentacion,
    precio: producto.precio,
    precio_oferta: oferta ? oferta.precio : null,
    porcentaje_oferta: oferta ? oferta.porcentaje : null,
    seccion: seccionDeTipo(producto.tipo),
    tipo: producto.tipo,
    rubro: rubro ? { id: rubro.id, nombre: rubro.nombre } : null,
    marca: marca && marca.nombre !== 'Sin marca' ? { id: marca.id, nombre: marca.nombre } : null,
    imagen: producto.imagen ?? null,
    icono: producto.icono ?? null,
    disponible: estaDisponible(producto, inventario),
    ...(motivo ? { motivo } : {}),
  };
}

function coincideProducto(producto, referencias, busqueda) {
  const rubro = referencias.rubros.find((item) => item.id === producto.idRubro);
  const marca = referencias.marcas.find((item) => item.id === producto.idMarca);
  return (
    coincide(producto.nombre, busqueda) ||
    coincide(producto.descripcion, busqueda) ||
    coincide(marca?.nombre, busqueda) ||
    coincide(rubro?.nombre, busqueda)
  );
}

export async function listarProductosDemo({ seccion, rubro = null, busqueda = '', pagina = 1 } = {}) {
  await esperar();
  const tipos = TIPOS_POR_SECCION[seccion];
  if (!tipos) throw fallar(400, 'Elegí Cafetería o Minisuper.');
  const referencias = await leerReferencias();
  const idRubro = rubro === null || rubro === undefined || rubro === '' ? null : Number(rubro);
  const lista = PRODUCTOS.filter(
    (producto) =>
      tipos.includes(producto.tipo) &&
      producto.precio > 0 &&
      (idRubro === null || producto.idRubro === idRubro) &&
      coincideProducto(producto, referencias, busqueda)
  );
  const pagina_ = paginar(ordenarPorNombre(lista), pagina);
  return {
    resultados: pagina_.resultados.map((producto) => aPublico(producto, referencias)),
    hay_mas: pagina_.hay_mas,
  };
}

export async function listarDestacadosDemo() {
  await esperar();
  const referencias = await leerReferencias();
  const combos = PRODUCTOS.filter((producto) => producto.tipo === 'COMBO' && producto.precio > 0).map((producto) =>
    aPublico(producto, referencias, 'COMBO')
  );
  const ofertas = PRODUCTOS.filter((producto) => producto.tipo !== 'COMBO' && estaDisponible(producto, referencias.inventario))
    .map((producto) => aPublico(producto, referencias, 'OFERTA'))
    .filter((producto) => producto.precio_oferta !== null)
    .sort((a, b) => b.porcentaje_oferta - a.porcentaje_oferta);
  return { resultados: [...combos, ...ofertas].slice(0, MAXIMO_DESTACADOS), hay_mas: false };
}

export async function listarRubrosDeSeccionDemo(seccion) {
  await esperar();
  const tipos = TIPOS_POR_SECCION[seccion];
  if (!tipos) throw fallar(400, 'Elegí Cafetería o Minisuper.');
  const { rubros } = await leerReferencias();
  const usados = new Set(
    PRODUCTOS.filter((producto) => tipos.includes(producto.tipo) && producto.precio > 0).map((producto) => producto.idRubro)
  );
  const visibles = rubros.filter((rubro) => !rubro.baja && usados.has(rubro.id));
  return {
    resultados: ordenarPorNombre(visibles).map((rubro) => ({ id: rubro.id, nombre: rubro.nombre })),
    hay_mas: false,
  };
}

export async function listarBeneficiosDemo() {
  await esperar();
  return {
    resultados: BENEFICIOS.map((beneficio) => ({ ...beneficio })),
    hay_mas: false,
    categorias: categorias.map((categoria) => ({ nombre: categoria.nombre, puntos_minimos: categoria.puntosMinimos })),
  };
}
