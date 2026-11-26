import { formatearNumero } from '../utilidades/formato';

const ALERTAS = ['SIN_STOCK', 'STOCK_BAJO', 'POR_VENCER', 'VENCIDO'];
const UNIDADES = ['UNIDAD', 'KG', 'G', 'L', 'ML'];
const TIPOS_AJUSTE = ['CONTEO', 'MERMA', 'TRASPASO'];
const DESTINOS_AVISO = ['ALERTAS', 'AJUSTES', 'ORDENES', 'WEB'];

function texto(valor) {
  if (typeof valor === 'string') return valor.replace(/\s+/g, ' ').trim();
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean') return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

function identificador(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  return null;
}

export function aLista(respuesta, convertir) {
  const crudos = Array.isArray(respuesta?.resultados) ? respuesta.resultados : Array.isArray(respuesta) ? respuesta : [];
  const vistos = new Set();
  const resultados = [];
  crudos.forEach((crudo) => {
    const item = convertir(crudo);
    if (item && !vistos.has(item.id)) {
      vistos.add(item.id);
      resultados.push(item);
    }
  });
  return { resultados, hayMas: respuesta?.hay_mas === true && resultados.length > 0 };
}

export function unirSinRepetidos(anteriores, nuevos) {
  const ids = new Set(anteriores.map((item) => item.id));
  return [...anteriores, ...nuevos.filter((item) => !ids.has(item.id))];
}

export function aReferencia(crudo) {
  const id = identificador(crudo?.id);
  const nombre = texto(crudo?.nombre);
  return id && nombre ? { id, nombre } : null;
}

export function aEntidad(crudo) {
  const referencia = aReferencia(crudo);
  if (!referencia) return null;
  return { ...referencia, descripcion: texto(crudo.descripcion), activo: crudo.activo !== false };
}

function normalizarImagen(crudo) {
  const ruta = texto(crudo?.imagen);
  if (!ruta) return null;
  const version = texto(crudo?.imagen_actualizada ?? crudo?.updated_at);
  if (!version || /[?&]v=/i.test(ruta)) return ruta;
  const separador = ruta.includes('?') ? '&' : '?';
  return `${ruta}${separador}v=${encodeURIComponent(version)}`;
}

export function aProducto(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const id = identificador(crudo.id);
  const nombre = texto(crudo.nombre);
  if (!id || !nombre) return null;

  const precio = numero(crudo.precio);
  const precioValido = precio !== null && precio > 0 ? precio : null;
  const oferta = numero(crudo.precio_oferta);
  const hayOferta = precioValido !== null && oferta !== null && oferta > 0 && oferta < precioValido;
  const porcentaje = numero(crudo.porcentaje_oferta);

  return {
    id,
    nombre,
    descripcion: texto(crudo.descripcion),
    presentacion: texto(crudo.presentacion),
    precio: precioValido,
    precioOferta: hayOferta ? oferta : null,
    porcentajeOferta: hayOferta
      ? porcentaje !== null && porcentaje > 0 && porcentaje < 100
        ? Math.round(porcentaje)
        : Math.round((1 - oferta / precioValido) * 100)
      : null,
    seccion: crudo.seccion === 'MINISUPER' ? 'MINISUPER' : 'CAFETERIA',
    tipo: texto(crudo.tipo),
    rubro: aReferencia(crudo.rubro),
    marca: aReferencia(crudo.marca),
    imagen: normalizarImagen(crudo),
    icono: texto(crudo.icono) || null,
    disponible: crudo.disponible !== false,
    motivo: crudo.motivo === 'COMBO' || crudo.motivo === 'OFERTA' ? crudo.motivo : null,
  };
}

export function aProductoBase(crudo) {
  const referencia = aReferencia(crudo);
  if (!referencia) return null;
  const stock = numero(crudo.stock_actual);
  return {
    ...referencia,
    presentacion: texto(crudo.presentacion),
    tipo: texto(crudo.tipo),
    unidad: UNIDADES.includes(crudo.unidad) ? crudo.unidad : 'UNIDAD',
    cantidadEntera: crudo.cantidad_entera !== false,
    controlaVencimiento: crudo.controla_vencimiento === true,
    codigoBarras: texto(crudo.codigo_barras) || null,
    stockActual: stock,
  };
}

export function aLote(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const id = identificador(crudo.id);
  if (!id) return null;
  const cantidad = numero(crudo.cantidad);
  const dias = numero(crudo.dias);
  return {
    id,
    numero: texto(crudo.numero) || `Lote ${id}`,
    vence: texto(crudo.vence) || null,
    dias: dias === null ? null : Math.round(dias),
    cantidad: cantidad !== null && cantidad > 0 ? cantidad : 0,
  };
}

function exigir(valor) {
  if (valor === null || valor === undefined) throw { respuestaInvalida: true };
  return valor;
}

export function aOrdenResumen(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const id = identificador(crudo.id);
  if (!id) return null;
  return {
    id,
    proveedor: aReferencia(crudo.proveedor) ?? { id: '0', nombre: 'Proveedor' },
    fecha: texto(crudo.fecha) || null,
    estado: texto(crudo.estado),
    renglones: Math.max(0, Math.round(numero(crudo.renglones) ?? 0)),
    total: numero(crudo.total),
  };
}

export function aOrden(crudo) {
  const resumen = aOrdenResumen(crudo);
  if (!resumen || !Array.isArray(crudo.renglones)) return null;
  const renglones = crudo.renglones
    .map((renglon) => {
      const producto = aProductoBase(renglon?.producto);
      const pedido = numero(renglon?.pedido);
      if (!producto || pedido === null || pedido < 0) return null;
      const recibido = numero(renglon.recibido);
      const precio = numero(renglon.precio_unitario);
      return {
        producto,
        pedido,
        recibido: recibido !== null && recibido > 0 ? recibido : 0,
        precioUnitario: precio !== null && precio >= 0 ? precio : 0,
      };
    })
    .filter(Boolean);
  return { ...resumen, renglones: renglones.length, detalle: renglones };
}

export function exigirOrden(crudo) {
  return exigir(aOrden(crudo));
}

export function aRecepcion(crudo) {
  const id = identificador(crudo?.id);
  if (!id) return null;
  const orden = crudo.orden && typeof crudo.orden === 'object' ? crudo.orden : {};
  return {
    id,
    orden: { id: identificador(orden.id), estado: texto(orden.estado) },
    diferencias: (Array.isArray(crudo.diferencias) ? crudo.diferencias : [])
      .map((fila) => {
        const producto = aReferencia(fila?.producto);
        const diferencia = numero(fila?.diferencia);
        if (!producto || diferencia === null) return null;
        return { producto, pedido: numero(fila.pedido) ?? 0, recibido: numero(fila.recibido) ?? 0, diferencia };
      })
      .filter(Boolean),
  };
}

export function aCostosRaros(lista) {
  return (Array.isArray(lista) ? lista : [])
    .map((fila) => {
      const producto = aReferencia(fila?.producto);
      const anterior = numero(fila?.anterior);
      const nuevo = numero(fila?.nuevo);
      if (!producto || anterior === null || nuevo === null) return null;
      return { producto, anterior, nuevo };
    })
    .filter(Boolean);
}

function aRenglonAjuste(crudo) {
  const producto = aProductoBase(crudo?.producto);
  if (!producto) return null;
  return {
    clave: `${producto.id}-${identificador(crudo.lote?.id) ?? 'p'}`,
    producto,
    lote: aLote(crudo.lote),
    cantidad: numero(crudo.cantidad),
    contada: numero(crudo.contada),
    teorica: numero(crudo.teorica),
    diferencia: numero(crudo.diferencia),
    destino: aProductoBase(crudo.destino),
    cantidadDestino: numero(crudo.cantidad_destino),
  };
}

export function aConteo(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const id = identificador(crudo.id);
  if (!id || !['EN_CURSO', 'PENDIENTE'].includes(crudo.estado)) return null;
  return {
    id,
    estado: crudo.estado,
    motivo: texto(crudo.motivo),
    iniciadoPor: texto(crudo.iniciado_por),
    fecha: texto(crudo.fecha) || null,
    renglones: (Array.isArray(crudo.renglones) ? crudo.renglones : []).map(aRenglonAjuste).filter(Boolean),
  };
}

export function aAjuste(crudo) {
  if (!crudo || typeof crudo !== 'object' || !TIPOS_AJUSTE.includes(crudo.tipo)) return null;
  const id = identificador(crudo.id);
  if (!id) return null;
  return {
    id,
    tipo: crudo.tipo,
    estado: texto(crudo.estado),
    motivo: texto(crudo.motivo),
    detalle: texto(crudo.detalle),
    cargadoPor: texto(crudo.cargado_por) || 'Alguien del equipo',
    fecha: texto(crudo.fecha) || null,
    propio: crudo.propio === true,
    puedeAprobar: crudo.puede_aprobar !== false,
    renglones: (Array.isArray(crudo.renglones) ? crudo.renglones : []).map(aRenglonAjuste).filter(Boolean),
  };
}

export function aProducible(crudo) {
  const producto = aProductoBase(crudo?.producto);
  if (!producto) return null;
  return {
    id: producto.id,
    producto,
    receta: (Array.isArray(crudo.receta) ? crudo.receta : [])
      .map((item) => {
        const insumo = aProductoBase(item?.insumo);
        const cantidad = numero(item?.cantidad);
        if (!insumo || cantidad === null || cantidad <= 0) return null;
        return { insumo, cantidad };
      })
      .filter(Boolean),
  };
}

export function aOferta(crudo) {
  const producto = aReferencia(crudo?.producto);
  const lote = aLote(crudo?.lote);
  const precio = numero(crudo?.precio);
  const precioOferta = numero(crudo?.precio_oferta);
  if (!producto || !lote || precio === null || precioOferta === null || precioOferta <= 0 || precioOferta >= precio) {
    return null;
  }
  return {
    id: identificador(crudo.id) ?? `${producto.id}-${lote.id}`,
    producto: { ...producto, presentacion: texto(crudo.producto.presentacion) },
    lote,
    precio,
    precioOferta,
    porcentaje: Math.round(numero(crudo.porcentaje) ?? (1 - precioOferta / precio) * 100),
  };
}

export function aPanel(crudo) {
  const datos = crudo && typeof crudo === 'object' ? crudo : {};
  return {
    indicadores: (Array.isArray(datos.indicadores) ? datos.indicadores : [])
      .map((item) => {
        const titulo = texto(item?.titulo);
        const valor = numero(item?.valor);
        if (!titulo || valor === null) return null;
        return {
          clave: texto(item.clave) || titulo,
          titulo,
          valor,
          formato: item.formato === 'PESOS' ? 'PESOS' : 'NUMERO',
          detalle: texto(item.detalle),
        };
      })
      .filter(Boolean),
    avisos: (Array.isArray(datos.avisos) ? datos.avisos : [])
      .map((item, posicion) => {
        const textoAviso = texto(item?.texto);
        if (!textoAviso) return null;
        return {
          clave: `${posicion}-${textoAviso}`,
          tipo: item.tipo === 'error' ? 'error' : 'aviso',
          texto: textoAviso,
          destino: DESTINOS_AVISO.includes(item.destino) ? item.destino : 'WEB',
        };
      })
      .filter(Boolean),
  };
}

export function aCuentaCliente(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const qr = texto(crudo.qr);
  if (!qr) return null;
  const entero = (valor) => {
    const convertido = numero(valor);
    return convertido !== null && convertido > 0 ? Math.round(convertido) : 0;
  };
  const tieneTelefono = 'telefono' in crudo || 'telefono_cliente' in crudo;
  const tieneFechaNacimiento = 'fecha_nacimiento' in crudo || 'fechaNacimiento' in crudo;
  const promocionesCrudo = crudo.acepta_promociones ?? crudo.aceptaPromociones;
  return {
    qr,
    categoria: texto(crudo.categoria) || 'Bronze',
    puntosDisponibles: entero(crudo.puntos_disponibles),
    puntosAcumulados: entero(crudo.puntos_acumulados),
    proximaCategoria: texto(crudo.proxima_categoria) || null,
    puntosProximaCategoria: entero(crudo.puntos_proxima_categoria),
    categorias: aCategorias(crudo.categorias),
    movimientos: (Array.isArray(crudo.movimientos) ? crudo.movimientos : [])
      .map((item) => {
        const id = identificador(item?.id);
        const concepto = texto(item?.concepto);
        const puntos = numero(item?.puntos);
        if (!id || !concepto || puntos === null) return null;
        return { id, concepto, fecha: texto(item.fecha), puntos: Math.round(puntos) };
      })
      .filter(Boolean),
    nombre: texto(crudo.nombre ?? crudo.nombre_cliente) || undefined,
    apellido: texto(crudo.apellido ?? crudo.apellido_cliente) || undefined,
    telefono: tieneTelefono ? texto(crudo.telefono ?? crudo.telefono_cliente) || null : undefined,
    fechaNacimiento: tieneFechaNacimiento ? texto(crudo.fecha_nacimiento ?? crudo.fechaNacimiento) || null : undefined,
    aceptaPromociones: typeof promocionesCrudo === 'boolean' ? promocionesCrudo : undefined,
  };
}

export function aConsulta(crudo) {
  const producto = aProducto(crudo);
  if (!producto) return null;
  const base = aProductoBase(crudo);
  const vencimiento = crudo.proximo_vencimiento;
  const dias = numero(vencimiento?.dias);
  return {
    ...producto,
    unidad: base.unidad,
    cantidadEntera: base.cantidadEntera,
    codigoBarras: texto(crudo.codigo_barras) || null,
    stockActual: numero(crudo.stock_actual),
    stockMinimo: numero(crudo.stock_minimo),
    controlaVencimiento: crudo.controla_vencimiento === true,
    proximoVencimiento:
      vencimiento && typeof vencimiento === 'object' && dias !== null
        ? {
            fecha: texto(vencimiento.fecha),
            dias: Math.round(dias),
            cantidad: numero(vencimiento.cantidad),
            lote: texto(vencimiento.lote),
          }
        : null,
    alertas: Array.isArray(crudo.alertas) ? crudo.alertas.filter((alerta) => ALERTAS.includes(alerta)) : [],
  };
}

export function aBeneficio(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const id = identificador(crudo.id);
  const titulo = texto(crudo.titulo);
  if (!id || !titulo) return null;
  const puntos = numero(crudo.puntos);
  return {
    id,
    titulo,
    detalle: texto(crudo.detalle),
    tipo: crudo.tipo === 'CANJEABLE' ? 'CANJEABLE' : 'AUTOMATICO',
    puntos: puntos !== null && puntos > 0 ? Math.round(puntos) : 0,
    categoria: texto(crudo.categoria) || 'Bronze',
    icono: texto(crudo.icono) || null,
  };
}

export function aCategorias(lista) {
  const vistas = new Set();
  return (Array.isArray(lista) ? lista : [])
    .map((item) => {
      const nombre = texto(item?.nombre);
      if (!nombre || vistas.has(nombre)) return null;
      vistas.add(nombre);
      const minimo = numero(item.puntos_minimos);
      const puntosMinimos = minimo !== null && minimo >= 0 ? Math.round(minimo) : null;
      const desdeCalculado =
        puntosMinimos === 0
          ? 'Desde que creás tu cuenta'
          : puntosMinimos
          ? `Desde ${formatearNumero(puntosMinimos)} puntos`
          : '';
      return {
        nombre,
        puntosMinimos,
        desde: texto(item.desde) || desdeCalculado,
        tasa: texto(item.tasa),
      };
    })
    .filter(Boolean);
}

export function aAlerta(crudo) {
  if (!crudo || typeof crudo !== 'object' || !ALERTAS.includes(crudo.tipo)) return null;
  const producto = aProductoBase(crudo.producto);
  if (!producto) return null;
  const lote = aLote(crudo.lote);
  const id = identificador(crudo.id) ?? `${crudo.tipo}-${producto.id}${lote ? `-${lote.id}` : ''}`;
  const dias = numero(crudo.dias);
  return {
    id,
    tipo: crudo.tipo,
    producto,
    lote,
    detalle: texto(crudo.detalle),
    dias: dias === null ? null : Math.round(dias),
    fecha: texto(crudo.fecha) || null,
  };
}
