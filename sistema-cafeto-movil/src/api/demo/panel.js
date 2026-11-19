import { diasHasta, formatearPrecio } from '../../utilidades/formato';
import { PRODUCTOS, VENTAS_DEMO } from './datos';
import { leerAjustes } from './ajustes';
import { leerCompras } from './compras';
import { usuarioDelToken } from './equipo';
import { leerInventario, lotesFefo, stockDe, tieneStock } from './inventario';
import { esperar, fallar } from './utilidades';

const DIAS_AVISO_VENCIMIENTO = 3;

export async function leerPanelDemo(token) {
  await esperar();
  const usuario = usuarioDelToken(token);
  if (!usuario) throw fallar(401, 'Tu sesión venció. Volvé a entrar con tu usuario.');
  const puede = (codigo) => usuario.permisos.includes(codigo);
  const indicadores = [];
  const avisos = [];

  if (puede('ver_ventas')) {
    indicadores.push({
      clave: 'VENDIDO_HOY',
      titulo: 'Vendido hoy',
      valor: VENTAS_DEMO.total,
      formato: 'PESOS',
      detalle: `${VENTAS_DEMO.tickets} tickets · el mismo día de la semana pasada: ${formatearPrecio(VENTAS_DEMO.semanaPasada)}`,
    });
  }
  if (puede('ver_caja')) {
    indicadores.push({
      clave: 'CAJAS_ABIERTAS',
      titulo: 'Cajas abiertas',
      valor: VENTAS_DEMO.cajasAbiertas,
      formato: 'NUMERO',
      detalle: 'Sin diferencias hoy',
    });
  }

  if (puede('ver_stock')) {
    const inventario = await leerInventario();
    const faltantes = PRODUCTOS.filter(
      (producto) => tieneStock(producto) && producto.stockMinimo > 0 && stockDe(inventario, producto) < producto.stockMinimo
    ).length;
    const lotes = PRODUCTOS.flatMap((producto) => lotesFefo(inventario, producto));
    const vencidos = lotes.filter((lote) => diasHasta(lote.vence) < 0).length;
    const porVencer = lotes.filter((lote) => {
      const dias = diasHasta(lote.vence);
      return dias >= 0 && dias <= DIAS_AVISO_VENCIMIENTO;
    }).length;
    if (faltantes) avisos.push({ tipo: 'aviso', texto: `${faltantes} producto(s) por debajo del mínimo.`, destino: 'ALERTAS' });
    if (vencidos) {
      avisos.push({
        tipo: 'error',
        texto: `${vencidos} lote(s) vencido(s) en la góndola: cargalos como merma.`,
        destino: 'ALERTAS',
      });
    } else if (porVencer) {
      avisos.push({
        tipo: 'aviso',
        texto: `${porVencer} lote(s) vencen en los próximos ${DIAS_AVISO_VENCIMIENTO} días.`,
        destino: 'ALERTAS',
      });
    }
  }
  if (puede('autorizar_ajustes')) {
    const { ajustes } = await leerAjustes();
    const pendientes = ajustes.filter((ajuste) => ajuste.estado === 'PENDIENTE').length;
    if (pendientes) {
      avisos.push({ tipo: 'aviso', texto: `${pendientes} ajuste(s) de stock esperan tu autorización.`, destino: 'AJUSTES' });
    }
  }
  if (puede('gestionar_ordenes')) {
    const { ordenes } = await leerCompras();
    const conDiferencias = ordenes.filter((orden) => orden.estado === 'CON_DIFERENCIAS').length;
    if (conDiferencias) {
      avisos.push({
        tipo: 'aviso',
        texto: `${conDiferencias} orden(es) de compra llegaron con diferencias: revisalas con el proveedor.`,
        destino: 'ORDENES',
      });
    }
  }
  if (puede('ver_egresos')) {
    avisos.push({ tipo: 'aviso', texto: '2 pago(s) vencen en los próximos 7 días.', destino: 'WEB' });
  }

  return { indicadores, avisos };
}
