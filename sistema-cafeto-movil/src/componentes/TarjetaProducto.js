import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/TemaContext';
import { formatearPrecio } from '../utilidades/formato';
import ImagenProducto from './ImagenProducto';

export function EtiquetasProducto({ producto, estilos }) {
  return (
    <View style={estilos.etiquetas}>
      {producto.motivo === 'COMBO' || producto.tipo === 'COMBO' ? (
        <Text style={[estilos.etiqueta, estilos.etiquetaCombo]}>COMBO</Text>
      ) : null}
      {producto.porcentajeOferta ? (
        <Text style={[estilos.etiqueta, estilos.etiquetaOferta]}>-{producto.porcentajeOferta}%</Text>
      ) : null}
    </View>
  );
}

export function PrecioProducto({ producto, estilos }) {
  if (producto.precioOferta !== null && producto.precioOferta !== undefined) {
    return (
      <View style={estilos.filaPrecio}>
        <Text style={estilos.precio}>{formatearPrecio(producto.precioOferta)}</Text>
        <Text style={estilos.precioAnterior}>{formatearPrecio(producto.precio)}</Text>
      </View>
    );
  }
  return <Text style={estilos.precio}>{formatearPrecio(producto.precio)}</Text>;
}

export default function TarjetaProducto({ producto, alPresionar, estilo }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilosTarjeta(colores), [colores]);

  return (
    <Pressable
      style={({ pressed }) => [estilos.tarjeta, estilo, pressed && estilos.presionado]}
      onPress={() => alPresionar?.(producto)}
      accessibilityRole="button"
      accessibilityLabel={`${producto.nombre}. ${formatearPrecio(producto.precioOferta ?? producto.precio)}`}
    >
      <View>
        <ImagenProducto imagen={producto.imagen} icono={producto.icono} estilo={estilos.foto} />
        <EtiquetasProducto producto={producto} estilos={estilos} />
        {!producto.disponible && (
          <View style={estilos.sinStock}>
            <Text style={estilos.textoSinStock}>Sin stock por ahora</Text>
          </View>
        )}
      </View>
      <Text style={estilos.nombre} numberOfLines={2}>
        {producto.nombre}
      </Text>
      <Text style={estilos.detalle} numberOfLines={1}>
        {[producto.presentacion, producto.marca?.nombre].filter(Boolean).join(' · ') || producto.descripcion || ' '}
      </Text>
      <PrecioProducto producto={producto} estilos={estilos} />
    </Pressable>
  );
}

export function crearEstilosTarjeta(c) {
  return StyleSheet.create({
    tarjeta: {
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 16,
      padding: 10,
      gap: 4,
    },
    presionado: { opacity: 0.85 },
    foto: { width: '100%', height: 112, borderRadius: 12, marginBottom: 6, backgroundColor: c.marcaSuave },
    etiquetas: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 },
    etiqueta: {
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      letterSpacing: 1,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    etiquetaCombo: { backgroundColor: c.marca, color: c.textoSobreMarca },
    etiquetaOferta: { backgroundColor: c.exito, color: '#FFFFFF' },
    sinStock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 6,
      paddingVertical: 4,
      backgroundColor: c.velo,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    textoSinStock: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFFFFF', textAlign: 'center' },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19, minHeight: 38, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoSecundario },
    filaPrecio: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
    precio: { fontFamily: 'Inter_700Bold', fontSize: 15, color: c.texto, marginTop: 2 },
    precioAnterior: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: c.textoTenue,
      textDecorationLine: 'line-through',
    },
  });
}
