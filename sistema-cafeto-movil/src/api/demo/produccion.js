import { aFecha, aIso, diasHasta } from '../../utilidades/formato';
import { limpiar } from '../../utilidades/texto';
import { PRODUCTOS, RECETAS } from './datos';
import { anotarOperacion, enCola, exigirOperacionNueva } from './almacen';
import { exigirPermiso } from './equipo';
import {
  aLotePublico,
  aProductoOperativo,
  buscarProducto,
  cantidadEntera,
  existenciaDe,
  leerInventario,
  modificarInventario,
  mover,
  nuevoLote,
  redondear,
  unidadDe,
} from './inventario';
import { esperar, fallar, ordenarPorNombre } from './utilidades';

const CLAVE = 'cafeto:demo:v3:producciones';
const DIAS_MAXIMOS = 730;

function recetaDe(producto) {
  return (RECETAS[producto.id] ?? [])
    .map((item) => ({ insumo: buscarProducto(item.idInsumo), cantidad: item.cantidad }))
    .filter((item) => item.insumo);
}

export async function listarProduciblesDemo(token) {
  await esperar();
  exigirPermiso(token, 'registrar_produccion');
  const inventario = await leerInventario();
  const producibles = ordenarPorNombre(PRODUCTOS.filter((producto) => producto.tipo === 'PRODUCIDO'));
  return {
    resultados: producibles.map((producto) => ({
      producto: aProductoOperativo(producto, inventario),
      receta: recetaDe(producto).map(({ insumo, cantidad }) => ({
        insumo: {
          id: insumo.id,
          nombre: insumo.nombre,
          unidad: unidadDe(insumo),
          stock_actual: existenciaDe(inventario, insumo, null),
        },
        cantidad,
      })),
    })),
    hay_mas: false,
  };
}

export async function registrarProduccionDemo(token, datos, claveOperacion) {
  await esperar();
  exigirPermiso(token, 'registrar_produccion');
  const entrada = datos && typeof datos === 'object' ? datos : {};
  return enCola(CLAVE, async () => {
    await exigirOperacionNueva(claveOperacion);
    const producto = buscarProducto(entrada.producto);
    if (!producto) throw fallar(400, 'Ese producto ya no existe.');
    if (producto.tipo !== 'PRODUCIDO') throw fallar(400, `«${producto.nombre}» no es un producto que se fabrique por tanda.`);
    const receta = recetaDe(producto);
    if (receta.length === 0) {
      throw fallar(400, `«${producto.nombre}» no tiene receta cargada: sin ella no se sabe qué insumos descontar.`);
    }
    const cantidad = Number(entrada.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw fallar(400, `La cantidad producida de «${producto.nombre}» tiene que ser mayor que cero.`);
    }
    if (cantidad > 999999) throw fallar(400, 'La cantidad producida es demasiado grande: revisá el número.');
    if (cantidadEntera(producto) && !Number.isInteger(cantidad)) {
      throw fallar(400, `«${producto.nombre}» va por unidad: la cantidad producida tiene que ser entera.`);
    }
    let vence = null;
    if (producto.controlaVencimiento) {
      const fecha = aFecha(entrada.fecha_vencimiento);
      if (!fecha) throw fallar(400, `«${producto.nombre}» controla vencimiento: indicá hasta cuándo vale la tanda.`);
      const dias = diasHasta(fecha);
      if (dias < 0) throw fallar(400, 'La fecha de vencimiento ya pasó.');
      if (dias > DIAS_MAXIMOS) throw fallar(400, 'La tanda vence dentro de más de dos años: revisá el año.');
      vence = aIso(fecha);
    }
    const resultado = await modificarInventario((inventario) => {
      receta.forEach(({ insumo, cantidad: porUnidad }) => {
        mover(inventario, insumo, -redondear(porUnidad * cantidad));
      });
      if (producto.controlaVencimiento) {
        const lote = nuevoLote(inventario, producto, { numero: `P${inventario.siguienteLote}`, vence, cantidad });
        return aLotePublico(lote);
      }
      mover(inventario, producto, cantidad);
      return null;
    });
    await anotarOperacion(claveOperacion);
    return {
      producto: { id: producto.id, nombre: producto.nombre },
      cantidad,
      lote: resultado,
      observacion: limpiar(entrada.observacion).slice(0, 120) || null,
    };
  });
}
