import { aIso, diasHasta } from '../../utilidades/formato';
import { PRODUCTOS } from './datos';
import { enCola, guardarColeccion, leerObjeto } from './almacen';
import { fallar } from './utilidades';

const CLAVE = 'cafeto:demo:v4:inventario';

export const TIPOS_CON_STOCK = ['REVENTA', 'INSUMO', 'PRODUCIDO'];

export function fechaEnDias(dias, hoy = new Date()) {
  return aIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));
}

export function redondear(numero) {
  return Math.round(numero * 1000) / 1000;
}

function semilla() {
  let siguienteLote = 1;
  const productos = {};
  PRODUCTOS.forEach((producto) => {
    productos[producto.id] = {
      stock: producto.controlaVencimiento ? 0 : producto.stock,
      lotes: (producto.lotes ?? []).map((lote) => ({
        id: siguienteLote++,
        numero: lote.numero,
        vence: fechaEnDias(lote.venceEnDias),
        cantidad: lote.cantidad,
      })),
    };
  });
  return { siguienteLote, productos };
}

function esLoteValido(lote) {
  return (
    Boolean(lote) &&
    Number.isInteger(lote.id) &&
    typeof lote.vence === 'string' &&
    diasHasta(lote.vence) !== null &&
    Number.isFinite(lote.cantidad)
  );
}

function esValido(dato) {
  return (
    Number.isInteger(dato.siguienteLote) &&
    Boolean(dato.productos) &&
    PRODUCTOS.every((producto) => {
      const item = dato.productos[producto.id];
      return Boolean(item) && Number.isFinite(item.stock) && Array.isArray(item.lotes) && item.lotes.every(esLoteValido);
    })
  );
}

export function leerInventario() {
  return leerObjeto(CLAVE, semilla, esValido);
}

export function modificarInventario(tarea) {
  return enCola(CLAVE, async () => {
    const inventario = await leerInventario();
    const resultado = await tarea(inventario);
    await guardarColeccion(CLAVE, inventario);
    return resultado;
  });
}

export function buscarProducto(id) {
  return PRODUCTOS.find((producto) => String(producto.id) === String(id)) ?? null;
}

export function unidadDe(producto) {
  return producto.unidad ?? 'UNIDAD';
}

export function cantidadEntera(producto) {
  return !producto.fraccionable && producto.tipo !== 'INSUMO';
}

export function tieneStock(producto) {
  return TIPOS_CON_STOCK.includes(producto.tipo);
}

export function lotesDe(inventario, producto) {
  return inventario.productos[producto.id]?.lotes ?? [];
}

export function lotesFefo(inventario, producto) {
  return lotesDe(inventario, producto)
    .filter((lote) => lote.cantidad > 0)
    .sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : a.id - b.id));
}

export function proximoLote(inventario, producto) {
  return lotesFefo(inventario, producto).find((lote) => diasHasta(lote.vence) >= 0) ?? null;
}

export function stockDe(inventario, producto) {
  if (!tieneStock(producto)) return null;
  if (producto.controlaVencimiento) {
    return redondear(lotesDe(inventario, producto).reduce((total, lote) => total + Math.max(lote.cantidad, 0), 0));
  }
  return redondear(inventario.productos[producto.id]?.stock ?? 0);
}

export function vencidoDe(inventario, producto) {
  return redondear(
    lotesFefo(inventario, producto)
      .filter((lote) => diasHasta(lote.vence) < 0)
      .reduce((total, lote) => total + lote.cantidad, 0)
  );
}

export function existenciaDe(inventario, producto, idLote) {
  if (idLote === null || idLote === undefined) return stockDe(inventario, producto) ?? 0;
  const lote = lotesDe(inventario, producto).find((item) => item.id === Number(idLote));
  return lote ? redondear(lote.cantidad) : 0;
}

export function nuevoLote(inventario, producto, { numero, vence, cantidad }) {
  const lote = { id: inventario.siguienteLote, numero: numero || `L${inventario.siguienteLote}`, vence, cantidad };
  inventario.siguienteLote += 1;
  inventario.productos[producto.id].lotes.push(lote);
  return lote;
}

export function mover(inventario, producto, cantidad, idLote = null) {
  if (!tieneStock(producto)) return;
  const item = inventario.productos[producto.id];
  if (producto.controlaVencimiento) {
    if (idLote !== null && idLote !== undefined) {
      const lote = item.lotes.find((actual) => actual.id === Number(idLote));
      if (!lote) throw fallar(400, `Ese lote no es de «${producto.nombre}».`);
      if (lote.cantidad + cantidad < -1e-9) {
        throw fallar(400, `En el lote ${lote.numero} de «${producto.nombre}» no alcanza para sacar ${redondear(-cantidad)}.`);
      }
      lote.cantidad = redondear(lote.cantidad + cantidad);
      return;
    }
    if (cantidad > 0) throw fallar(400, `«${producto.nombre}» se maneja por lote: indicá el lote.`);
    let falta = -cantidad;
    lotesFefo(inventario, producto).forEach((lote) => {
      const sale = Math.min(lote.cantidad, falta);
      lote.cantidad = redondear(lote.cantidad - sale);
      falta = redondear(falta - sale);
    });
    if (falta > 1e-9) throw fallar(400, `De «${producto.nombre}» no alcanza el stock para sacar ${redondear(-cantidad)}.`);
    return;
  }
  const resultado = redondear(item.stock + cantidad);
  if (resultado < 0 && producto.tipo !== 'INSUMO') {
    throw fallar(400, `De «${producto.nombre}» hay ${redondear(item.stock)}: no pueden salir ${redondear(-cantidad)}.`);
  }
  item.stock = resultado;
}

export function aProductoOperativo(producto, inventario) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    presentacion: producto.presentacion,
    tipo: producto.tipo,
    unidad: unidadDe(producto),
    cantidad_entera: cantidadEntera(producto),
    controla_vencimiento: producto.controlaVencimiento,
    codigo_barras: producto.codigoBarras,
    stock_actual: inventario ? stockDe(inventario, producto) : null,
  };
}

export function aLotePublico(lote) {
  return { id: lote.id, numero: lote.numero, vence: lote.vence, dias: diasHasta(lote.vence), cantidad: lote.cantidad };
}
