import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTema } from '../tema/TemaContext';
import { formatearPrecio } from '../utilidades/formato';
import ImagenProducto from './ImagenProducto';

const INTERVALO = 4500;
const ALTO = 196;

export default function CarruselOfertas({ productos, alElegir }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const lista = useRef(null);
  const enfocado = useIsFocused();
  const [ancho, setAncho] = useState(0);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = productos.length;

  useEffect(() => {
    if (indice >= total && total > 0) {
      setIndice(0);
      lista.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [indice, total]);

  useEffect(() => {
    if (!enfocado || pausado || total < 2 || ancho === 0) return undefined;
    const temporizador = setTimeout(() => {
      const siguiente = (indice + 1) % total;
      lista.current?.scrollToOffset({ offset: siguiente * ancho, animated: true });
      setIndice(siguiente);
    }, INTERVALO);
    return () => clearTimeout(temporizador);
  }, [indice, total, ancho, pausado, enfocado]);

  const alTerminarDeslizar = (evento) => {
    if (ancho > 0) {
      const posicion = Math.round(evento.nativeEvent.contentOffset.x / ancho);
      setIndice(Math.min(Math.max(posicion, 0), Math.max(total - 1, 0)));
    }
    setPausado(false);
  };

  const irA = (posicion) => {
    lista.current?.scrollToOffset({ offset: posicion * ancho, animated: true });
    setIndice(posicion);
  };

  if (total === 0) return null;

  const renderOferta = ({ item }) => (
    <Pressable
      style={[estilos.diapositiva, { width: ancho }]}
      onPress={() => alElegir?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.nombre}. ${formatearPrecio(item.precioOferta ?? item.precio)}`}
    >
      <ImagenProducto imagen={item.imagen} icono={item.icono} estilo={estilos.fondo} tamanoIcono={64} />
      <View style={estilos.oscurecido} />
      <View style={estilos.contenido}>
        <Text style={[estilos.etiqueta, item.motivo === 'OFERTA' ? estilos.etiquetaOferta : estilos.etiquetaCombo]}>
          {item.motivo === 'OFERTA' && item.porcentajeOferta ? `-${item.porcentajeOferta}% HOY` : 'COMBO'}
        </Text>
        <Text style={estilos.nombre} numberOfLines={1}>
          {item.nombre}
        </Text>
        {item.descripcion ? (
          <Text style={estilos.descripcion} numberOfLines={2}>
            {item.descripcion}
          </Text>
        ) : null}
        <View style={estilos.filaPrecio}>
          <Text style={estilos.precio}>{formatearPrecio(item.precioOferta ?? item.precio)}</Text>
          {item.precioOferta !== null && item.precioOferta !== undefined ? (
            <Text style={estilos.precioAnterior}>{formatearPrecio(item.precio)}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View>
      <View style={estilos.marco} onLayout={(evento) => setAncho(Math.round(evento.nativeEvent.layout.width))}>
        {ancho > 0 && (
          <FlatList
            ref={lista}
            data={productos}
            keyExtractor={(item) => item.id}
            renderItem={renderOferta}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => setPausado(true)}
            onScrollEndDrag={alTerminarDeslizar}
            onMomentumScrollEnd={alTerminarDeslizar}
            getItemLayout={(_, posicion) => ({ length: ancho, offset: ancho * posicion, index: posicion })}
            extraData={ancho}
          />
        )}
      </View>
      {total > 1 && (
        <View style={estilos.puntos}>
          {productos.map((item, posicion) => (
            <Pressable
              key={item.id}
              onPress={() => irA(posicion)}
              hitSlop={8}
              accessibilityLabel={`Ver oferta ${posicion + 1} de ${total}`}
            >
              <View style={[estilos.punto, posicion === indice && estilos.puntoActivo]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    marco: { height: ALTO, borderRadius: 20, overflow: 'hidden', backgroundColor: c.marcaSuave },
    diapositiva: { height: ALTO, justifyContent: 'flex-end' },
    fondo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    oscurecido: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 9, 30, 0.52)' },
    contenido: { padding: 18, gap: 4 },
    etiqueta: {
      alignSelf: 'flex-start',
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      letterSpacing: 1.5,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    etiquetaCombo: { backgroundColor: c.marca, color: c.textoSobreMarca },
    etiquetaOferta: { backgroundColor: c.exito, color: '#FFFFFF' },
    nombre: { fontFamily: 'Caveat_700Bold', fontSize: 32, color: '#FFFFFF' },
    descripcion: { fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 18, color: '#E8E8EE' },
    filaPrecio: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
    precio: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#FFFFFF' },
    precioAnterior: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: '#D0D0DA',
      textDecorationLine: 'line-through',
    },
    puntos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
    punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.borde },
    puntoActivo: { width: 20, backgroundColor: c.marca },
  });
}
