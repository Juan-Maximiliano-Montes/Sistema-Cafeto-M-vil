import { categorias, cliente, movimientos } from '../../datos/ejemplo';
import { codigoDeCliente } from '../../utilidades/texto';
import { esperar, fallar } from './utilidades';

function exigirUsuario(uid) {
  if (typeof uid !== 'string' || !uid) throw fallar(401, 'Volvé a iniciar sesión para ver tus puntos.');
}

export async function leerCuentaDemo(uid) {
  await esperar();
  exigirUsuario(uid);
  return {
    qr: codigoDeCliente(uid),
    categoria: cliente.categoria,
    puntos_disponibles: cliente.puntosDisponibles,
    puntos_acumulados: cliente.puntosAcumulados,
    proxima_categoria: cliente.proximaCategoria,
    puntos_proxima_categoria: cliente.puntosProximaCategoria,
    categorias: categorias.map((categoria) => ({
      nombre: categoria.nombre,
      puntos_minimos: categoria.puntosMinimos,
      desde: categoria.desde,
      tasa: categoria.tasa,
    })),
    movimientos: movimientos.map((movimiento) => ({ ...movimiento })),
    ejemplo: true,
  };
}

export async function vincularClienteDemo(uid) {
  return leerCuentaDemo(uid);
}
