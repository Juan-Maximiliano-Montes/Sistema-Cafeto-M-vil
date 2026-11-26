import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTema } from '../tema/TemaContext';
import { useSesion } from '../sesion/SesionContext';
import { useErrorEquipo } from '../sesion/useErrorEquipo';
import { consultarProductos } from '../api/stock';
import { A_REVISAR, TIPOS_ALERTA } from '../datos/alertas';
import { stockARevisar, usadoDeMas } from '../datos/ajustes';
import { describirVencimiento, formatearCantidad, formatearFechaLarga } from '../utilidades/formato';
import ImagenProducto from './ImagenProducto';
import CuadroAyuda from './CuadroAyuda';
import { EtiquetasProducto, PrecioProducto, crearEstilosTarjeta } from './TarjetaProducto';

const ETIQUETA_TIPO = {
  ELABORADO: 'Elaborado en el momento',
  PRODUCIDO: 'Producido por tanda',
  COMBO: 'Combo promocional',
  REVENTA: 'Producto de reventa',
  INSUMO: 'Insumo interno',
};

function tieneDatosOperativos(producto) {
  return Boolean(producto && ('stockActual' in producto || Array.isArray(producto.alertas)));
}

export default function DetalleProducto({ producto, alCerrar }) {
  const navigation = useNavigation();
  const { colores } = useTema();
  const { rol, equipo, tienePermiso } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const estilosTarjeta = useMemo(() => crearEstilosTarjeta(colores), [colores]);

  const esEquipo = rol === 'equipo';
  const token = equipo?.token;
  const puedeConsultar = esEquipo && tienePermiso('ver_productos');
  const puedeMerma = esEquipo && tienePermiso('registrar_merma');
  const puedeContar = esEquipo && tienePermiso('contar_stock');

  const [fichaRemota, setFichaRemota] = useState(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  useEffect(() => {
    setFichaRemota(null);
    if (!producto || !esEquipo || !puedeConsultar || !token || tieneDatosOperativos(producto)) {
      setCargandoFicha(false);
      return undefined;
    }

    let vigente = true;
    setCargandoFicha(true);
    consultarProductos(token, { busqueda: producto.nombre, pagina: 1 })
      .then((respuesta) => {
        if (!vigente) return;
        const coincidencia = respuesta.resultados.find((item) => item.id === producto.id) ?? null;
        setFichaRemota(coincidencia);
      })
      .catch((problema) => {
        if (!vigente) return;
        if (problema?.estado === 401) {
          alCerrar?.();
          manejarError(problema);
        }
      })
      .finally(() => {
        if (vigente) setCargandoFicha(false);
      });

    return () => {
      vigente = false;
    };
  }, [producto, esEquipo, puedeConsultar, token, alCerrar, manejarError]);

  const ficha = tieneDatosOperativos(producto) ? producto : fichaRemota;
  const llevaStockPropio =
    ficha !== null
      ? ficha.stockActual !== null
      : producto?.tipo !== 'ELABORADO' && producto?.tipo !== 'COMBO';

  const irAConsulta = () => {
    const criterio = ficha?.codigoBarras || producto?.nombre || '';
    alCerrar?.();
    navigation.navigate('ConsultaProducto', { busqueda: criterio });
  };

  const irAMerma = () => {
    const objetivo = ficha && ficha.stockActual !== null ? ficha : null;
    alCerrar?.();
    if (objetivo) {
      navigation.navigate('Merma', { producto: objetivo });
    } else {
      navigation.navigate('Merma');
    }
  };

  const irAConteo = () => {
    alCerrar?.();
    navigation.navigate('Conteo');
  };

  const renderBloqueOperativo = () => {
    const sinControlDeStock = ficha ? ficha.stockActual === null : !llevaStockPropio;
    const aRevisar = ficha ? stockARevisar(ficha.stockActual) : false;
    const alertas = ficha?.alertas ?? [];
    const graves = alertas.filter((alerta) => TIPOS_ALERTA[alerta]?.grave);
    const colorStock = sinControlDeStock
      ? colores.textoTenue
      : aRevisar
      ? colores.marca
      : graves.includes('SIN_STOCK')
      ? colores.peligro
      : alertas.includes('STOCK_BAJO')
      ? colores.marca
      : colores.exito;

    const habilitarMerma =
      puedeMerma && llevaStockPropio && (!ficha || (ficha.stockActual !== null && ficha.stockActual > 0));
    const habilitarConteo = puedeContar && llevaStockPropio;

    return (
      <View style={estilos.bloqueOperativo}>
        <View style={estilos.cabeceraOperativa}>
          <Ionicons name="briefcase-outline" size={16} color={colores.marca} />
          <Text style={estilos.tituloOperativo}>Información operativa</Text>
          {producto.tipo && ETIQUETA_TIPO[producto.tipo] ? (
            <Text style={estilos.tipoProducto}>{ETIQUETA_TIPO[producto.tipo]}</Text>
          ) : null}
        </View>

        {cargandoFicha ? (
          <View style={estilos.filaCargandoFicha}>
            <ActivityIndicator size="small" color={colores.marca} />
            <Text style={estilos.textoDatoSecundario}>Consultando stock y vencimientos...</Text>
          </View>
        ) : ficha ? (
          <View style={estilos.datosOperativos}>
            <View style={estilos.datoOperativo}>
              <Ionicons name="cube-outline" size={16} color={colorStock} />
              <Text style={estilos.textoDatoOperativo}>
                {sinControlDeStock
                  ? 'Se prepara en el local (sin stock propio)'
                  : aRevisar
                  ? `Stock a revisar: ${usadoDeMas(ficha.stockActual, ficha.unidad)}. Falta cargar compra o conteo.`
                  : `Stock actual: ${formatearCantidad(ficha.stockActual)}${
                      ficha.stockMinimo ? ` · mínimo ${formatearCantidad(ficha.stockMinimo)}` : ''
                    }`}
              </Text>
            </View>

            {ficha.proximoVencimiento ? (
              <View style={estilos.datoOperativo}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={ficha.proximoVencimiento.dias <= 3 ? colores.marca : colores.textoSecundario}
                />
                <Text style={estilos.textoDatoOperativo}>
                  {describirVencimiento(ficha.proximoVencimiento.dias)}
                  {ficha.proximoVencimiento.fecha ? ` (${formatearFechaLarga(ficha.proximoVencimiento.fecha)})` : ''}
                  {ficha.proximoVencimiento.lote ? ` · lote ${ficha.proximoVencimiento.lote}` : ''}
                </Text>
              </View>
            ) : ficha.controlaVencimiento ? (
              <View style={estilos.datoOperativo}>
                <Ionicons name="calendar-outline" size={16} color={colores.textoTenue} />
                <Text style={estilos.textoDatoSecundario}>Sin lotes vigentes cargados</Text>
              </View>
            ) : null}

            {ficha.codigoBarras ? (
              <View style={estilos.datoOperativo}>
                <Ionicons name="barcode-outline" size={16} color={colores.textoSecundario} />
                <Text style={estilos.textoDatoOperativo} selectable>
                  {ficha.codigoBarras}
                </Text>
              </View>
            ) : null}

            {alertas.length > 0 ? (
              <View style={estilos.chipsAlerta}>
                {alertas.map((alerta) => {
                  const datos = aRevisar && alerta === 'SIN_STOCK' ? A_REVISAR : TIPOS_ALERTA[alerta];
                  if (!datos) return null;
                  return (
                    <View
                      key={alerta}
                      style={[estilos.chipAlerta, datos.grave ? estilos.chipAlertaGrave : estilos.chipAlertaLeve]}
                    >
                      <Ionicons name={datos.icono} size={13} color={datos.grave ? colores.peligro : colores.marca} />
                      <Text style={estilos.textoChipAlerta}>{datos.etiqueta}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={estilos.textoDatoSecundario}>
            {sinControlDeStock
              ? 'Este producto se prepara en el momento y no descuenta stock propio.'
              : producto.disponible
              ? 'Publicado y con disponibilidad vigente en el mostrador.'
              : 'Sin unidades vigentes disponibles para la venta en este momento.'}
          </Text>
        )}

        {(puedeConsultar || habilitarMerma || habilitarConteo) && (
          <View style={estilos.accionesOperativas}>
            {puedeConsultar ? (
              <Pressable
                style={({ pressed }) => [estilos.accionOperativa, pressed && estilos.presionado]}
                onPress={irAConsulta}
                accessibilityRole="button"
              >
                <Ionicons name="barcode-outline" size={17} color={colores.marca} />
                <Text style={estilos.textoAccionOperativa}>Ver en consulta</Text>
              </Pressable>
            ) : null}
            {habilitarMerma ? (
              <Pressable
                style={({ pressed }) => [estilos.accionOperativa, pressed && estilos.presionado]}
                onPress={irAMerma}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={17} color={colores.marca} />
                <Text style={estilos.textoAccionOperativa}>Cargar merma</Text>
              </Pressable>
            ) : null}
            {habilitarConteo ? (
              <Pressable
                style={({ pressed }) => [estilos.accionOperativa, pressed && estilos.presionado]}
                onPress={irAConteo}
                accessibilityRole="button"
              >
                <Ionicons name="clipboard-outline" size={17} color={colores.marca} />
                <Text style={estilos.textoAccionOperativa}>Ir a conteo</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={Boolean(producto)} transparent animationType="slide" onRequestClose={alCerrar}>
      <Pressable style={estilos.velo} onPress={alCerrar} accessibilityLabel="Cerrar detalle" />
      {producto && (
        <View style={estilos.hoja}>
          <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
            <View>
              <ImagenProducto imagen={producto.imagen} icono={producto.icono} estilo={estilos.foto} tamanoIcono={56} />
              <EtiquetasProducto producto={producto} estilos={estilosTarjeta} />
            </View>

            <Text style={estilos.nombre}>{producto.nombre}</Text>
            <Text style={estilos.detalle}>
              {[producto.presentacion, producto.marca?.nombre, producto.rubro?.nombre].filter(Boolean).join(' · ')}
            </Text>
            {producto.descripcion ? <Text style={estilos.descripcion}>{producto.descripcion}</Text> : null}

            <View style={estilos.precio}>
              <PrecioProducto producto={producto} estilos={{ ...estilosTarjeta, precio: estilos.precioGrande }} />
              <View style={[estilos.estado, !producto.disponible && estilos.estadoAgotado]}>
                <Ionicons
                  name={producto.disponible ? 'checkmark-circle' : 'time-outline'}
                  size={16}
                  color={producto.disponible ? colores.exito : colores.peligro}
                />
                <Text style={estilos.textoEstado}>{producto.disponible ? 'Disponible' : 'Sin stock por ahora'}</Text>
              </View>
            </View>

            {producto.porcentajeOferta ? (
              <CuadroAyuda
                tipo="consejo"
                icono="pricetag-outline"
                titulo="Oferta del día"
                texto="El descuento es por cercanía al vencimiento y vale hasta agotar stock en el local."
              />
            ) : null}

            {esEquipo ? (
              renderBloqueOperativo()
            ) : (
              <CuadroAyuda
                icono="storefront-outline"
                titulo="¿Cómo lo pido?"
                texto={
                  rol === 'cliente'
                    ? 'Pedilo en el mostrador y mostrá tu QR al pagar para sumar puntos.'
                    : 'Pedilo en el mostrador. Si creás tu cuenta, cada compra te suma puntos.'
                }
              />
            )}

            <Pressable style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]} onPress={alCerrar}>
              <Text style={estilos.textoBoton}>Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    velo: { flex: 1, backgroundColor: c.velo },
    hoja: {
      maxHeight: '88%',
      backgroundColor: c.fondo,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: c.borde,
    },
    contenido: { padding: 20, paddingBottom: 32, gap: 12 },
    foto: { width: '100%', height: 200, borderRadius: 16 },
    nombre: { fontFamily: 'Caveat_700Bold', fontSize: 34, color: c.titulo },
    detalle: { fontFamily: 'Inter_500Medium', fontSize: 14, color: c.textoSecundario },
    descripcion: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, color: c.texto },
    precio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    precioGrande: { fontFamily: 'Inter_700Bold', fontSize: 24, color: c.texto },
    estado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.fondoExito,
    },
    estadoAgotado: { backgroundColor: c.fondoPeligro },
    textoEstado: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.texto },
    bloqueOperativo: {
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    cabeceraOperativa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tituloOperativo: {
      flex: 1,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: c.texto,
    },
    tipoProducto: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11.5,
      color: c.textoSecundario,
    },
    filaCargandoFicha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    datosOperativos: {
      gap: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.divisor,
    },
    datoOperativo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    textoDatoOperativo: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
      color: c.texto,
    },
    textoDatoSecundario: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      color: c.textoSecundario,
    },
    chipsAlerta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    chipAlerta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipAlertaGrave: {
      backgroundColor: c.fondoPeligro,
      borderColor: c.bordePeligro,
    },
    chipAlertaLeve: {
      backgroundColor: c.fondoAdvertencia,
      borderColor: c.bordeAdvertencia,
    },
    textoChipAlerta: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: c.texto,
    },
    accionesOperativas: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.divisor,
    },
    accionOperativa: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    textoAccionOperativa: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      color: c.texto,
    },
    boton: {
      height: 52,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
    },
    textoBoton: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: c.textoSobreMarca },
    presionado: { opacity: 0.85 },
  });
}
