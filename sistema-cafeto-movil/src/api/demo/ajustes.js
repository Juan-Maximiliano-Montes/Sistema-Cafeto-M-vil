import { aFecha, aIso } from '../../utilidades/formato';
import { limpiar } from '../../utilidades/texto';
import { validarTextoCatalogo } from '../../utilidades/validaciones';
import { USUARIOS } from './datos';
import { anotarOperacion, enCola, exigirOperacionNueva, guardarColeccion, leerObjeto } from './almacen';
import { exigirPermiso, nombreCompleto } from './equipo';
import {
  aLotePublico,
  aProductoOperativo,
  buscarProducto,
  cantidadEntera,
  existenciaDe,
  leerInventario,
  lotesDe,
  lotesFefo,
  modificarInventario,
  mover,
  nuevoLote,
  redondear,
  tieneStock,
} from './inventario';
import { esperar, fallar } from './utilidades';

const CLAVE = 'cafeto:demo:v3:ajustes';
const MOTIVOS = {
  CONTEO: ['DIFERENCIA_CONTEO', 'INVENTARIO_INICIAL'],
  MERMA: ['VENCIMIENTO', 'ROTURA', 'DETERIORO', 'CONSUMO_INTERNO', 'OTRO'],
  TRASPASO: ['USO_EN_CAFETERIA', 'REEMPAQUE', 'OTRO'],
};
const NOMBRES = { CONTEO: 'conteo', MERMA: 'merma', TRASPASO: 'traspaso' };

function semilla() {
  return { siguiente: 1, ajustes: [] };
}

function esValido(dato) {
  return (
    Number.isInteger(dato.siguiente) &&
    Array.isArray(dato.ajustes) &&
    dato.ajustes.every(
      (ajuste) =>
        Number.isInteger(ajuste.id) && typeof ajuste.estado === 'string' && Array.isArray(ajuste.renglones)
    )
  );
}

export function leerAjustes() {
  return leerObjeto(CLAVE, semilla, esValido);
}

function modificarAjustes(tarea) {
  return enCola(CLAVE, async () => {
    const almacen = await leerAjustes();
    const resultado = await tarea(almacen);
    await guardarColeccion(CLAVE, almacen);
    return resultado;
  });
}

function conteoAbierto(almacen) {
  return almacen.ajustes.find((ajuste) => ajuste.tipo === 'CONTEO' && ['EN_CURSO', 'PENDIENTE'].includes(ajuste.estado)) ?? null;
}

function exigirCantidad(producto, valor, { etiqueta = 'La cantidad', permitirCero = false } = {}) {
  const cantidad = Number(valor);
  if (!Number.isFinite(cantidad) || (permitirCero ? cantidad < 0 : cantidad <= 0)) {
    throw fallar(400, permitirCero ? 'Lo contado no puede ser negativo.' : `${etiqueta} de «${producto.nombre}» tiene que ser mayor que cero.`);
  }
  if (cantidad > 999999) throw fallar(400, `${etiqueta} de «${producto.nombre}» es demasiado grande: revisá el número.`);
  if (Math.round(cantidad * 1000) !== cantidad * 1000) {
    throw fallar(400, `${etiqueta} de «${producto.nombre}» admite hasta 3 decimales (un gramo).`);
  }
  if (cantidadEntera(producto) && !Number.isInteger(cantidad)) {
    throw fallar(400, `«${producto.nombre}» va por unidad: la cantidad tiene que ser entera.`);
  }
  return cantidad;
}

function exigirProductoConStock(id) {
  const producto = buscarProducto(id);
  if (!producto) throw fallar(400, 'Ese producto ya no existe.');
  if (!tieneStock(producto)) throw fallar(400, `«${producto.nombre}» no tiene stock propio: sale de sus componentes.`);
  return producto;
}

function loteElegido(inventario, producto, idLote) {
  if (!producto.controlaVencimiento) {
    if (idLote !== null && idLote !== undefined && idLote !== '') {
      throw fallar(400, `«${producto.nombre}» no se maneja por lote.`);
    }
    return null;
  }
  if (idLote === null || idLote === undefined || idLote === '') {
    const primero = lotesFefo(inventario, producto)[0];
    if (!primero) throw fallar(400, `«${producto.nombre}» se maneja por lote y no tiene lotes con stock.`);
    return primero;
  }
  const lote = lotesDe(inventario, producto).find((item) => String(item.id) === String(idLote));
  if (!lote) throw fallar(400, `Ese lote no es de «${producto.nombre}».`);
  return lote;
}

function exigirDetalle(motivo, detalle) {
  const error = validarTextoCatalogo(detalle, {
    etiqueta: 'El detalle',
    minimo: 3,
    maximo: 120,
    obligatorio: motivo === 'OTRO',
  });
  if (error) throw fallar(400, error);
  return limpiar(detalle) || null;
}

function aRenglonPublico(renglon, inventario, conTeorica) {
  const producto = buscarProducto(renglon.idProducto);
  const lote = producto ? lotesDe(inventario, producto).find((item) => item.id === renglon.idLote) : null;
  const destino = renglon.idDestino ? buscarProducto(renglon.idDestino) : null;
  return {
    producto: producto ? aProductoOperativo(producto, inventario) : { id: renglon.idProducto, nombre: 'Producto dado de baja' },
    lote: lote ? aLotePublico(lote) : null,
    cantidad: renglon.cantidad ?? null,
    contada: renglon.contada ?? null,
    teorica: conTeorica ? renglon.teorica ?? null : null,
    diferencia: conTeorica && renglon.contada !== undefined ? redondear(renglon.contada - renglon.teorica) : null,
    destino: destino ? aProductoOperativo(destino, inventario) : null,
    cantidad_destino: renglon.cantidadDestino ?? null,
  };
}

function usuarioPorNombre(nombreUsuario) {
  return USUARIOS.find((usuario) => usuario.usuario === nombreUsuario) ?? null;
}

function aAjustePublico(ajuste, inventario, usuarioActual) {
  const autor = usuarioPorNombre(ajuste.usuario);
  const propio = ajuste.usuario === usuarioActual.usuario;
  return {
    id: ajuste.id,
    tipo: ajuste.tipo,
    estado: ajuste.estado,
    motivo: ajuste.motivo,
    detalle: ajuste.detalle,
    cargado_por: autor ? nombreCompleto(autor) : ajuste.usuario,
    fecha: ajuste.fecha,
    propio,
    puede_aprobar: !propio || usuarioActual.esAdministrador,
    renglones: ajuste.renglones.map((renglon) => aRenglonPublico(renglon, inventario, true)),
  };
}

function aConteoPublico(ajuste, inventario) {
  if (!ajuste) return null;
  const autor = usuarioPorNombre(ajuste.usuario);
  return {
    id: ajuste.id,
    estado: ajuste.estado,
    motivo: ajuste.motivo,
    iniciado_por: autor ? nombreCompleto(autor) : ajuste.usuario,
    fecha: ajuste.fecha,
    renglones: [...ajuste.renglones].reverse().map((renglon) => aRenglonPublico(renglon, inventario, false)),
  };
}

export async function leerConteoDemo(token) {
  await esperar();
  exigirPermiso(token, 'contar_stock');
  const [almacen, inventario] = await Promise.all([leerAjustes(), leerInventario()]);
  return { conteo: aConteoPublico(conteoAbierto(almacen), inventario) };
}

export async function iniciarConteoDemo(token, motivo = 'DIFERENCIA_CONTEO') {
  await esperar();
  const usuario = exigirPermiso(token, 'contar_stock');
  if (!MOTIVOS.CONTEO.includes(motivo)) throw fallar(400, 'Elegí el motivo del conteo.');
  const ajuste = await modificarAjustes((almacen) => {
    if (conteoAbierto(almacen)) {
      throw fallar(400, 'Ya hay un conteo abierto: terminalo o pedí que lo resuelvan antes de empezar otro.');
    }
    const nuevo = {
      id: almacen.siguiente,
      tipo: 'CONTEO',
      estado: 'EN_CURSO',
      motivo,
      detalle: null,
      usuario: usuario.usuario,
      fecha: new Date().toISOString(),
      renglones: [],
    };
    almacen.siguiente += 1;
    almacen.ajustes.push(nuevo);
    return nuevo;
  });
  return { conteo: aConteoPublico(ajuste, await leerInventario()) };
}

export async function cargarConteoDemo(token, datos) {
  await esperar();
  exigirPermiso(token, 'contar_stock');
  const entrada = datos && typeof datos === 'object' ? datos : {};
  const ajuste = await modificarAjustes(async (almacen) => {
    const abierto = conteoAbierto(almacen);
    if (!abierto) throw fallar(400, 'No hay ningún conteo en curso.');
    if (abierto.estado !== 'EN_CURSO') throw fallar(400, 'El conteo ya se envió a revisión: no admite más renglones.');
    const producto = exigirProductoConStock(entrada.producto);
    const contada = exigirCantidad(producto, entrada.contada, { permitirCero: true });
    const nuevo = entrada.nuevo_lote && typeof entrada.nuevo_lote === 'object' ? entrada.nuevo_lote : null;
    let idLote = null;
    let teorica = 0;
    await modificarInventario((inventario) => {
      if (nuevo) {
        if (!producto.controlaVencimiento) throw fallar(400, `«${producto.nombre}» no se maneja por lote.`);
        if (contada <= 0) throw fallar(400, 'Un lote nuevo se carga con lo que tiene.');
        const vence = aFecha(nuevo.fecha_vencimiento);
        if (!vence) throw fallar(400, 'Indicá la fecha de vencimiento del lote nuevo.');
        const lote = nuevoLote(inventario, producto, {
          numero: String(nuevo.numero_lote ?? '').trim(),
          vence: aIso(vence),
          cantidad: 0,
        });
        idLote = lote.id;
        teorica = 0;
        return;
      }
      const lote = loteElegido(inventario, producto, entrada.lote);
      idLote = lote ? lote.id : null;
      teorica = existenciaDe(inventario, producto, idLote);
    });
    const existente = abierto.renglones.find(
      (renglon) => renglon.idProducto === producto.id && (renglon.idLote ?? null) === idLote
    );
    if (existente) {
      existente.contada = contada;
    } else {
      abierto.renglones.push({ idProducto: producto.id, idLote, teorica, contada });
    }
    return abierto;
  });
  return { conteo: aConteoPublico(ajuste, await leerInventario()) };
}

export async function enviarConteoDemo(token) {
  await esperar();
  exigirPermiso(token, 'contar_stock');
  const ajuste = await modificarAjustes((almacen) => {
    const abierto = conteoAbierto(almacen);
    if (!abierto || abierto.estado !== 'EN_CURSO') throw fallar(400, 'No hay ningún conteo en curso.');
    if (abierto.renglones.length === 0) throw fallar(400, 'El conteo no tiene ningún renglón cargado.');
    abierto.estado = 'PENDIENTE';
    return abierto;
  });
  return { conteo: aConteoPublico(ajuste, await leerInventario()) };
}

async function registrar(tipo, usuario, datos, claveOperacion, armarRenglones) {
  const entrada = datos && typeof datos === 'object' ? datos : {};
  if (!MOTIVOS[tipo].includes(entrada.motivo)) throw fallar(400, 'Elegí el motivo.');
  const detalle = exigirDetalle(entrada.motivo, entrada.detalle);
  const crudos = Array.isArray(entrada.renglones) ? entrada.renglones : [];
  if (crudos.length === 0) throw fallar(400, 'Cargá al menos un producto.');
  return modificarAjustes(async (almacen) => {
    await exigirOperacionNueva(claveOperacion);
    const inventario = await leerInventario();
    const renglones = armarRenglones(crudos, inventario);
    const nuevo = {
      id: almacen.siguiente,
      tipo,
      estado: 'PENDIENTE',
      motivo: entrada.motivo,
      detalle,
      usuario: usuario.usuario,
      fecha: new Date().toISOString(),
      renglones,
    };
    almacen.siguiente += 1;
    almacen.ajustes.push(nuevo);
    await anotarOperacion(claveOperacion);
    return { id: nuevo.id, tipo, estado: nuevo.estado };
  });
}

export async function registrarMermaDemo(token, datos, claveOperacion) {
  await esperar();
  const usuario = exigirPermiso(token, 'registrar_merma');
  return registrar('MERMA', usuario, datos, claveOperacion, (crudos, inventario) => {
    const vistos = new Set();
    return crudos.map((crudo) => {
      const producto = exigirProductoConStock(crudo?.producto);
      const lote = loteElegido(inventario, producto, crudo.lote);
      const clave = `${producto.id}-${lote?.id ?? 'p'}`;
      if (vistos.has(clave)) throw fallar(400, `«${producto.nombre}» está cargado dos veces.`);
      vistos.add(clave);
      const cantidad = exigirCantidad(producto, crudo.cantidad);
      const hay = existenciaDe(inventario, producto, lote?.id ?? null);
      if ((lote || producto.tipo !== 'INSUMO') && cantidad > hay + 1e-9) {
        throw fallar(400, `De «${producto.nombre}» hay ${hay}${lote ? ` en el lote ${lote.numero}` : ''}: no pueden salir ${cantidad}.`);
      }
      return { idProducto: producto.id, idLote: lote?.id ?? null, cantidad };
    });
  });
}

export async function registrarTraspasoDemo(token, datos, claveOperacion) {
  await esperar();
  const usuario = exigirPermiso(token, 'registrar_traspaso');
  return registrar('TRASPASO', usuario, datos, claveOperacion, (crudos, inventario) => {
    const vistos = new Set();
    return crudos.map((crudo) => {
      const origen = exigirProductoConStock(crudo?.producto);
      const destino = exigirProductoConStock(crudo?.destino);
      if (origen.id === destino.id) throw fallar(400, 'El producto de origen y el de destino tienen que ser distintos.');
      if (destino.controlaVencimiento) {
        throw fallar(400, `«${destino.nombre}» se maneja por lote: un traspaso no puede inventarle un vencimiento. Cargalo como compra o conteo.`);
      }
      const lote = loteElegido(inventario, origen, crudo.lote);
      const clave = `${origen.id}-${lote?.id ?? 'p'}`;
      if (vistos.has(clave)) throw fallar(400, `«${origen.nombre}» está cargado dos veces.`);
      vistos.add(clave);
      const cantidad = exigirCantidad(origen, crudo.cantidad);
      const hay = existenciaDe(inventario, origen, lote?.id ?? null);
      if ((lote || origen.tipo !== 'INSUMO') && cantidad > hay + 1e-9) {
        throw fallar(400, `De «${origen.nombre}» hay ${hay}: no pueden salir ${cantidad}.`);
      }
      const cantidadDestino = exigirCantidad(destino, crudo.cantidad_destino, { etiqueta: 'La cantidad que entra' });
      return { idProducto: origen.id, idLote: lote?.id ?? null, cantidad, idDestino: destino.id, cantidadDestino };
    });
  });
}

export async function listarAjustesPendientesDemo(token) {
  await esperar();
  const usuario = exigirPermiso(token, 'autorizar_ajustes');
  const [almacen, inventario] = await Promise.all([leerAjustes(), leerInventario()]);
  const pendientes = almacen.ajustes
    .filter((ajuste) => ajuste.estado === 'PENDIENTE')
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .map((ajuste) => aAjustePublico(ajuste, inventario, usuario));
  return { resultados: pendientes, hay_mas: false };
}

function exigirPendiente(almacen, id) {
  const ajuste = almacen.ajustes.find((item) => String(item.id) === String(id));
  if (!ajuste) throw fallar(404, 'Ese ajuste ya no existe.');
  if (ajuste.estado !== 'PENDIENTE') throw fallar(409, 'Ese ajuste ya se resolvió.');
  return ajuste;
}

export async function aprobarAjusteDemo(token, id, observacion) {
  await esperar();
  const usuario = exigirPermiso(token, 'autorizar_ajustes');
  return modificarAjustes(async (almacen) => {
    const ajuste = exigirPendiente(almacen, id);
    if (ajuste.usuario === usuario.usuario && !usuario.esAdministrador) {
      throw fallar(
        400,
        `Este ajuste (${NOMBRES[ajuste.tipo]} N° ${ajuste.id}) lo cargaste vos: lo tiene que aprobar otra persona con permiso para autorizar ajustes.`
      );
    }
    await modificarInventario((inventario) => {
      ajuste.renglones.forEach((renglon) => {
        const producto = buscarProducto(renglon.idProducto);
        if (!producto) return;
        if (ajuste.tipo === 'CONTEO') {
          const diferencia = redondear(renglon.contada - renglon.teorica);
          if (diferencia !== 0) mover(inventario, producto, diferencia, renglon.idLote);
        } else if (ajuste.tipo === 'MERMA') {
          mover(inventario, producto, -renglon.cantidad, renglon.idLote);
        } else {
          mover(inventario, producto, -renglon.cantidad, renglon.idLote);
          const destino = buscarProducto(renglon.idDestino);
          if (destino) mover(inventario, destino, renglon.cantidadDestino);
        }
      });
    });
    ajuste.estado = 'APROBADO';
    ajuste.autorizante = usuario.usuario;
    ajuste.fechaResolucion = new Date().toISOString();
    ajuste.observacion = limpiar(observacion).slice(0, 120) || null;
    return { id: ajuste.id, tipo: ajuste.tipo, estado: ajuste.estado };
  });
}

export async function rechazarAjusteDemo(token, id, observacion) {
  await esperar();
  const usuario = exigirPermiso(token, 'autorizar_ajustes');
  const motivo = limpiar(observacion);
  if (!motivo) throw fallar(400, 'Contá por qué se rechaza.');
  return modificarAjustes((almacen) => {
    const ajuste = exigirPendiente(almacen, id);
    ajuste.estado = 'RECHAZADO';
    ajuste.autorizante = usuario.usuario;
    ajuste.fechaResolucion = new Date().toISOString();
    ajuste.observacion = motivo.slice(0, 120);
    return { id: ajuste.id, tipo: ajuste.tipo, estado: ajuste.estado };
  });
}
