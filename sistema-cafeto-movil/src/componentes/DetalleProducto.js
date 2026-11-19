import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';
import { useSesion } from '../sesion/SesionContext';
import ImagenProducto from './ImagenProducto';
import CuadroAyuda from './CuadroAyuda';
import { EtiquetasProducto, PrecioProducto, crearEstilosTarjeta } from './TarjetaProducto';

export default function DetalleProducto({ producto, alCerrar }) {
  const { colores } = useTema();
  const { rol } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const estilosTarjeta = useMemo(() => crearEstilosTarjeta(colores), [colores]);

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

            <CuadroAyuda
              icono="storefront-outline"
              titulo="¿Cómo lo pido?"
              texto={
                rol === 'cliente'
                  ? 'Pedilo en el mostrador y mostrá tu QR al pagar para sumar puntos.'
                  : 'Pedilo en el mostrador. Si creás tu cuenta, cada compra te suma puntos.'
              }
            />

            <Pressable style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]} onPress={alCerrar}>
              <Text style={estilos.textoBoton}>Listo</Text>
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
      maxHeight: '85%',
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
