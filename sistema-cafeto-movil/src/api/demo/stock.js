import { coincide } from '../../utilidades/texto';
import { diasHasta, formatearCantidad } from '../../utilidades/formato';
import { usadoDeMas } from '../../datos/ajustes';
import { PRODUCTOS } from './datos';
import { exigirAlguno, exigirPermiso } from './equipo';
import { aPublico, leerReferencias, precioConRebaja, rebajaDe, seccionDeTipo } from './catalogo';
import {
  aLotePublico,
  buscarProducto,
  cantidadEntera,
  lotesFefo,
  proximoLote,
  stockDe,
  tieneStock,
  unidadDe,
} from './inventario';
import { esperar, fallar, ordenarPorNombre, paginar } from './utilidades';

const DIAS_AVISO_VENCIMIENTO = 3;
const GRAVEDAD = { VENCIDO: 0, SIN_STOCK: 1, POR_VENCER: 2, STOCK_BAJO: 3 };

function porVencer(lote) {
  const dias = diasHasta(lote.vence);
  return dias >= 0 && dias <= DIAS_AVISO_VENCIMIENTO;
}

function alertasDe(producto, inventario) {
  const alertas = [];
  if (tieneStock(producto) && producto.stockMinimo > 0) {
    const stock = stockDe(inventario, producto);
    if (stock <= 0) alertas.push('SIN_STOCK');
    else if (stock < producto.stockMinimo) alertas.push('STOCK_BAJO');
  }
  const lotes = lotesFefo(inventario, producto);
  if (lotes.some((lote) => diasHasta(lote.vence) < 0)) alertas.push('VENCIDO');
  if (lotes.some(porVencer)) alertas.push('POR_VENCER');
  return alertas;
}

function resumenProducto(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    presentacion: producto.presentacion,
    unidad: unidadDe(producto),
    cantidad_entera: cantidadEntera(producto),
    controla_vencimiento: producto.controlaVencimiento,
  };
}

function aConsulta(producto, referencias) {
  const { inventario } = referencias;
  const lote = proximoLote(inventario, producto);
  const conStock = tieneStock(producto);
  return {
    ...aPublico(producto, referencias),
    codigo_barras: producto.codigoBarras,
    unidad: unidadDe(producto),
    cantidad_entera: cantidadEntera(producto),
    stock_actual: conStock ? stockDe(inventario, producto) : null,
    stock_minimo: conStock ? producto.stockMinimo : null,
    controla_vencimiento: producto.controlaVencimiento,
    proximo_vencimiento: lote
      ? { fecha: lote.vence, dias: diasHasta(lote.vence), cantidad: lote.cantidad, lote: lote.numero }
      : null,
    alertas: alertasDe(producto, inventario),
  };
}

export async function consultarProductosDemo(token, { busqueda = '', codigo = '', pagina = 1 } = {}) {
  await esperar();
  exigirPermiso(token, 'ver_productos');
  const referencias = await leerReferencias();
  const codigoBuscado = String(codigo ?? '').trim();
  const lista = codigoBuscado
    ? PRODUCTOS.filter((producto) => producto.codigoBarras === codigoBuscado)
    : PRODUCTOS.filter((producto) => {
        const rubro = referencias.rubros.find((item) => item.id === producto.idRubro);
        const marca = referencias.marcas.find((item) => item.id === producto.idMarca);
        return (
          coincide(producto.nombre, busqueda) ||
          coincide(marca?.nombre, busqueda) ||
          coincide(rubro?.nombre, busqueda) ||
          coincide(producto.codigoBarras, busqueda)
        );
      });
  const pagina_ = paginar(ordenarPorNombre(lista), pagina);
  return {
    resultados: pagina_.resultados.map((producto) => aConsulta(producto, referencias)),
    hay_mas: pagina_.hay_mas,
  };
}

function textoDias(dias) {
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'vence mañana';
  return `vence en ${dias} días`;
}

export async function listarAlertasDemo(token, { tipo = 'TODAS' } = {}) {
  await esperar();
  exigirPermiso(token, 'ver_stock');
  const { rubros, inventario } = await leerReferencias();
  const alertas = [];

  PRODUCTOS.forEach((producto) => {
    const rubro = rubros.find((item) => item.id === producto.idRubro) ?? null;
    const stock = stockDe(inventario, producto);
    const resumen = { ...resumenProducto(producto), stock_actual: tieneStock(producto) ? stock : null };
    const clases = alertasDe(producto, inventario);
    if (clases.includes('SIN_STOCK')) {
      const detalle =
        stock < 0
          ? `Stock a revisar: ${usadoDeMas(stock, unidadDe(producto))}. Falta cargar la compra o contarlo.`
          : 'No queda stock. Hay que reponer.';
      alertas.push({ id: `SIN_STOCK-${producto.id}`, tipo: 'SIN_STOCK', producto: resumen, detalle, dias: null, fecha: null, lote: null });
    }
    if (clases.includes('STOCK_BAJO')) {
      alertas.push({
        id: `STOCK_BAJO-${producto.id}`,
        tipo: 'STOCK_BAJO',
        producto: resumen,
        detalle: `Quedan ${formatearCantidad(stock)} y el mínimo es ${formatearCantidad(producto.stockMinimo)}.`,
        dias: null,
        fecha: null,
        lote: null,
      });
    }
    lotesFefo(inventario, producto).forEach((lote) => {
      const dias = diasHasta(lote.vence);
      const resumenLote = { id: lote.id, numero: lote.numero, cantidad: lote.cantidad };
      if (dias < 0) {
        alertas.push({
          id: `VENCIDO-${producto.id}-${lote.id}`,
          tipo: 'VENCIDO',
          producto: resumen,
          detalle: `El lote ${lote.numero} venció con ${formatearCantidad(lote.cantidad)} en góndola. Retiralo y cargalo como merma.`,
          dias,
          fecha: lote.vence,
          lote: resumenLote,
        });
      } else if (porVencer(lote)) {
        const rebaja = seccionDeTipo(producto.tipo) && rebajaDe(producto, rubro);
        alertas.push({
          id: `POR_VENCER-${producto.id}-${lote.id}`,
          tipo: 'POR_VENCER',
          producto: resumen,
          detalle:
            rebaja && dias <= rebaja.dias
              ? `El lote ${lote.numero} ${textoDias(dias)}. Ya tiene ${rebaja.porcentaje}% de rebaja.`
              : `El lote ${lote.numero} ${textoDias(dias)}.`,
          dias,
          fecha: lote.vence,
          lote: resumenLote,
        });
      }
    });
  });

  const filtradas = alertas.filter((alerta) => {
    if (tipo === 'STOCK') return alerta.tipo === 'SIN_STOCK' || alerta.tipo === 'STOCK_BAJO';
    if (tipo === 'VENCIMIENTO') return alerta.tipo === 'VENCIDO' || alerta.tipo === 'POR_VENCER';
    return true;
  });

  filtradas.sort(
    (a, b) => GRAVEDAD[a.tipo] - GRAVEDAD[b.tipo] || a.producto.nombre.localeCompare(b.producto.nombre, 'es')
  );
  return { resultados: filtradas, hay_mas: false };
}

export async function listarLotesDemo(token, idProducto) {
  await esperar();
  exigirAlguno(token, ['ver_productos', 'ver_stock', 'contar_stock', 'registrar_merma', 'registrar_traspaso']);
  const producto = buscarProducto(idProducto);
  if (!producto) throw fallar(404, 'Ese producto ya no existe.');
  const { inventario } = await leerReferencias();
  return { resultados: lotesFefo(inventario, producto).map(aLotePublico), hay_mas: false };
}

export async function listarOfertasDemo(token) {
  await esperar();
  exigirAlguno(token, ['imprimir_ofertas', 'ver_stock']);
  const { rubros, inventario } = await leerReferencias();
  const filas = [];
  PRODUCTOS.forEach((producto) => {
    if (!seccionDeTipo(producto.tipo) || producto.precio <= 0) return;
    const rebaja = rebajaDe(producto, rubros.find((item) => item.id === producto.idRubro));
    if (!rebaja) return;
    lotesFefo(inventario, producto).forEach((lote) => {
      const dias = diasHasta(lote.vence);
      if (dias < 0 || dias > rebaja.dias) return;
      filas.push({
        id: `${producto.id}-${lote.id}`,
        producto: { id: producto.id, nombre: producto.nombre, presentacion: producto.presentacion },
        lote: aLotePublico(lote),
        precio: producto.precio,
        precio_oferta: precioConRebaja(producto, rebaja.porcentaje),
        porcentaje: rebaja.porcentaje,
      });
    });
  });
  filas.sort((a, b) => a.lote.dias - b.lote.dias || a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
  return { resultados: filas, hay_mas: false };
}
