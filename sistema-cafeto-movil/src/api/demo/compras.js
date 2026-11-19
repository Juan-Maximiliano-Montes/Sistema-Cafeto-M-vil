import { aFecha, aIso, diasHasta } from '../../utilidades/formato';
import { ORDENES, PROVEEDORES } from './datos';
import { anotarOperacion, enCola, exigirOperacionNueva, guardarColeccion, leerObjeto } from './almacen';
import { exigirPermiso } from './equipo';
import {
  aProductoOperativo,
  buscarProducto,
  cantidadEntera,
  fechaEnDias,
  leerInventario,
  modificarInventario,
  mover,
  nuevoLote,
  redondear,
} from './inventario';
import { esperar, fallar } from './utilidades';

const CLAVE = 'cafeto:demo:v3:compras';
const POR_RECIBIR = ['EMITIDA', 'CON_DIFERENCIAS'];
const COMPROBANTES = {
  FACTURA_A: 'Factura A',
  FACTURA_B: 'Factura B',
  FACTURA_C: 'Factura C',
  REMITO: 'Remito',
  TICKET: 'Ticket',
  OTRO: 'Comprobante',
};
const SE_COMPRAN = ['REVENTA', 'INSUMO'];
const DIAS_DE_ATRASO = 30;
const DIAS_MAXIMOS_DE_VENCIMIENTO = 3660;
const SALTO_DE_COSTO = 3;

function semilla() {
  return {
    siguienteCompra: 1,
    compras: [],
    ordenes: ORDENES.map((orden) => ({
      id: orden.id,
      idProveedor: orden.idProveedor,
      fecha: fechaEnDias(orden.diasDesdeHoy),
      estado: orden.estado,
      renglones: orden.renglones.map((renglon) => ({ ...renglon })),
      recibido: { ...orden.recibido },
    })),
  };
}

function esValido(dato) {
  return (
    Number.isInteger(dato.siguienteCompra) &&
    Array.isArray(dato.compras) &&
    Array.isArray(dato.ordenes) &&
    dato.ordenes.every(
      (orden) =>
        Number.isInteger(orden.id) &&
        typeof orden.estado === 'string' &&
        Array.isArray(orden.renglones) &&
        Boolean(orden.recibido) &&
        typeof orden.recibido === 'object'
    )
  );
}

export function leerCompras() {
  return leerObjeto(CLAVE, semilla, esValido);
}

function proveedorDe(id) {
  return PROVEEDORES.find((proveedor) => proveedor.id === id) ?? { id, nombre: 'Proveedor' };
}

function resumen(orden) {
  const total = orden.renglones.reduce((suma, renglon) => suma + renglon.pedido * renglon.precio, 0);
  return {
    id: orden.id,
    proveedor: proveedorDe(orden.idProveedor),
    fecha: orden.fecha,
    estado: orden.estado,
    renglones: orden.renglones.length,
    total: Math.round(total * 100) / 100,
  };
}

function diferencias(orden) {
  const filas = orden.renglones.map((renglon) => ({
    idProducto: renglon.idProducto,
    pedido: renglon.pedido,
    recibido: redondear(orden.recibido[renglon.idProducto] ?? 0),
  }));
  Object.keys(orden.recibido).forEach((id) => {
    if (!orden.renglones.some((renglon) => String(renglon.idProducto) === id)) {
      filas.push({ idProducto: Number(id), pedido: 0, recibido: redondear(orden.recibido[id]) });
    }
  });
  return filas.map((fila) => ({ ...fila, diferencia: redondear(fila.recibido - fila.pedido) }));
}

export async function listarOrdenesPorRecibirDemo(token) {
  await esperar();
  exigirPermiso(token, 'registrar_compra');
  const { ordenes } = await leerCompras();
  const lista = ordenes
    .filter((orden) => POR_RECIBIR.includes(orden.estado))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id))
    .map(resumen);
  return { resultados: lista, hay_mas: false };
}

export async function leerOrdenDemo(token, id) {
  await esperar();
  exigirPermiso(token, 'registrar_compra');
  const [{ ordenes }, inventario] = await Promise.all([leerCompras(), leerInventario()]);
  const orden = ordenes.find((item) => String(item.id) === String(id));
  if (!orden) throw fallar(404, 'Esa orden de compra ya no existe.');
  return {
    ...resumen(orden),
    renglones: orden.renglones.map((renglon) => ({
      producto: aProductoOperativo(buscarProducto(renglon.idProducto), inventario),
      pedido: renglon.pedido,
      recibido: redondear(orden.recibido[renglon.idProducto] ?? 0),
      precio_unitario: renglon.precio,
    })),
  };
}

function exigirCantidad(producto, valor, etiqueta) {
  const cantidad = Number(valor);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw fallar(400, `${etiqueta} de «${producto.nombre}» tiene que ser mayor que cero.`);
  }
  if (cantidad > 999999) throw fallar(400, `${etiqueta} de «${producto.nombre}» es demasiado grande: revisá el número.`);
  if (Math.round(cantidad * 1000) !== cantidad * 1000) {
    throw fallar(400, `${etiqueta} de «${producto.nombre}» admite hasta 3 decimales (un gramo).`);
  }
  if (cantidadEntera(producto) && !Number.isInteger(cantidad)) {
    throw fallar(400, `«${producto.nombre}» se vende por unidad: ${etiqueta.toLowerCase()} tiene que ser entera.`);
  }
  return cantidad;
}

function costosRaros(orden, renglones) {
  return renglones
    .map(({ producto, costo }) => {
      const anterior = orden.renglones.find((renglon) => String(renglon.idProducto) === String(producto.id))?.precio;
      if (!anterior || anterior <= 0 || costo <= 0) return null;
      if (costo <= anterior * SALTO_DE_COSTO && costo * SALTO_DE_COSTO >= anterior) return null;
      return { producto: { id: producto.id, nombre: producto.nombre }, anterior, nuevo: costo };
    })
    .filter(Boolean);
}

function validarRenglon(crudo, fecha, vistos) {
  const producto = buscarProducto(crudo?.producto);
  if (!producto) throw fallar(400, 'Un producto de la compra ya no existe.');
  if (vistos.has(producto.id)) {
    throw fallar(400, `«${producto.nombre}» está dos veces: sumá las cantidades en un renglón (con sus lotes).`);
  }
  vistos.add(producto.id);
  if (!SE_COMPRAN.includes(producto.tipo)) throw fallar(400, `«${producto.nombre}» se elabora en el local: no se compra.`);
  const cantidad = exigirCantidad(producto, crudo.cantidad, 'La cantidad recibida');
  const costo = Number(crudo.costo_unitario);
  if (!Number.isFinite(costo) || costo < 0) throw fallar(400, `El costo de «${producto.nombre}» no puede ser negativo.`);
  const lotes = Array.isArray(crudo.lotes) ? crudo.lotes : [];
  if (!producto.controlaVencimiento) {
    if (lotes.length > 0) throw fallar(400, `«${producto.nombre}» no controla vencimiento: no lleva lotes.`);
    return { producto, cantidad, costo, lotes: [] };
  }
  if (lotes.length === 0) {
    throw fallar(400, `«${producto.nombre}» controla vencimiento: cargá el o los lotes con su fecha.`);
  }
  const limpios = lotes.map((lote) => {
    const vence = aFecha(lote?.fecha_vencimiento);
    if (!vence) throw fallar(400, `Revisá la fecha de vencimiento de un lote de «${producto.nombre}».`);
    return {
      vence: aIso(vence),
      numero: String(lote.numero_lote ?? '').trim(),
      cantidad: exigirCantidad(producto, lote.cantidad, 'La cantidad del lote'),
    };
  });
  const suma = redondear(limpios.reduce((total, lote) => total + lote.cantidad, 0));
  if (suma !== redondear(cantidad)) {
    throw fallar(400, `Los lotes de «${producto.nombre}» suman ${suma} y se recibieron ${redondear(cantidad)}.`);
  }
  if (limpios.some((lote) => lote.vence < fecha)) {
    throw fallar(400, `Un lote de «${producto.nombre}» vence antes de la fecha de la compra: la mercadería no se recibe vencida.`);
  }
  if (limpios.some((lote) => diasHasta(lote.vence, aFecha(fecha)) > DIAS_MAXIMOS_DE_VENCIMIENTO)) {
    throw fallar(400, `Un lote de «${producto.nombre}» vence dentro de más de 10 años. Revisá el año.`);
  }
  const numeros = limpios.filter((lote) => lote.numero).map((lote) => lote.numero.toLowerCase());
  if (new Set(numeros).size !== numeros.length) throw fallar(400, `«${producto.nombre}» tiene un número de lote repetido.`);
  return { producto, cantidad, costo, lotes: limpios };
}

export async function recepcionarDemo(token, datos, claveOperacion) {
  await esperar();
  exigirPermiso(token, 'registrar_compra');
  const entrada = datos && typeof datos === 'object' ? datos : {};
  return enCola(CLAVE, async () => {
    await exigirOperacionNueva(claveOperacion);
    const almacen = await leerCompras();
    const orden = almacen.ordenes.find((item) => String(item.id) === String(entrada.orden));
    if (!orden) throw fallar(404, 'Esa orden de compra ya no existe.');
    if (!POR_RECIBIR.includes(orden.estado)) throw fallar(409, `La orden ${orden.id} ya no espera mercadería.`);
    if (!COMPROBANTES[entrada.tipo_comprobante]) throw fallar(400, 'Elegí el tipo de comprobante.');

    const hoy = fechaEnDias(0);
    const fecha = entrada.fecha_compra ? aIso(entrada.fecha_compra) : hoy;
    if (!fecha) throw fallar(400, 'Revisá la fecha del comprobante.');
    if (fecha > hoy) throw fallar(400, 'La fecha de la compra no puede ser posterior a hoy.');
    if (fecha < fechaEnDias(-DIAS_DE_ATRASO)) {
      throw fallar(400, `El comprobante tiene más de ${DIAS_DE_ATRASO} días. Revisá la fecha o cargalo desde la web.`);
    }
    const punto = Number(entrada.punto_venta);
    const numero = Number(entrada.numero_comprobante);
    if (!Number.isInteger(punto) || !Number.isInteger(numero)) {
      throw fallar(400, 'El punto de venta y el número del comprobante van en números.');
    }
    if (punto < 1 || punto > 99999) throw fallar(400, 'El punto de venta va de 1 a 99999.');
    if (numero < 1 || numero > 99999999) throw fallar(400, 'El número del comprobante va de 1 a 99999999.');
    const proveedor = proveedorDe(orden.idProveedor);
    if (
      almacen.compras.some(
        (compra) =>
          compra.idProveedor === orden.idProveedor &&
          compra.tipo === entrada.tipo_comprobante &&
          compra.punto === punto &&
          compra.numero === numero
      )
    ) {
      const formateado = `${String(punto).padStart(4, '0')}-${String(numero).padStart(8, '0')}`;
      throw fallar(400, `El ${COMPROBANTES[entrada.tipo_comprobante].toLowerCase()} ${formateado} de ${proveedor.nombre} ya está cargado.`);
    }
    const crudos = Array.isArray(entrada.renglones) ? entrada.renglones : [];
    if (crudos.length === 0) throw fallar(400, 'La compra no tiene ningún renglón.');
    const vistos = new Set();
    const renglones = crudos.map((crudo) => validarRenglon(crudo, fecha, vistos));
    if (entrada.confirmo_costos !== true) {
      const raros = costosRaros(orden, renglones);
      if (raros.length > 0) {
        throw {
          estado: 409,
          datos: {
            detail: 'Hay costos muy distintos de los que venías pagando. Revisalos: si están bien, confirmalos y volvé a enviar.',
            codigo: 'COSTOS_RAROS',
            costos: raros,
          },
        };
      }
    }
    const otros = Number(entrada.importe_otros_conceptos ?? 0);
    if (!Number.isFinite(otros) || otros < 0) throw fallar(400, 'Los otros conceptos no pueden ser negativos.');
    const total = renglones.reduce((suma, renglon) => suma + renglon.cantidad * renglon.costo, 0) + otros;
    if (total <= 0) throw fallar(400, 'El total de la compra tiene que ser mayor que cero.');

    await modificarInventario((inventario) => {
      renglones.forEach(({ producto, cantidad, lotes }) => {
        if (producto.controlaVencimiento) {
          lotes.forEach((lote) => nuevoLote(inventario, producto, lote));
        } else {
          mover(inventario, producto, cantidad);
        }
      });
    });

    renglones.forEach(({ producto, cantidad }) => {
      orden.recibido[producto.id] = redondear((orden.recibido[producto.id] ?? 0) + cantidad);
    });
    const filas = diferencias(orden);
    orden.estado = filas.some((fila) => fila.diferencia !== 0) ? 'CON_DIFERENCIAS' : 'RECEPCIONADA';
    const compra = {
      id: almacen.siguienteCompra,
      idProveedor: orden.idProveedor,
      tipo: entrada.tipo_comprobante,
      punto,
      numero,
      fecha,
      total: Math.round(total * 100) / 100,
    };
    almacen.siguienteCompra += 1;
    almacen.compras.push(compra);
    await guardarColeccion(CLAVE, almacen);
    await anotarOperacion(claveOperacion);

    return {
      id: compra.id,
      orden: { id: orden.id, estado: orden.estado },
      diferencias: filas
        .filter((fila) => fila.diferencia !== 0)
        .map((fila) => ({
          producto: { id: fila.idProducto, nombre: buscarProducto(fila.idProducto)?.nombre ?? 'Producto' },
          pedido: fila.pedido,
          recibido: fila.recibido,
          diferencia: fila.diferencia,
        })),
    };
  });
}
