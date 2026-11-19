import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';

export default function EstadoVacio({ icono = 'search-outline', titulo, texto, accion, cargando = false, estilo }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  if (cargando) {
    return (
      <View style={[estilos.contenedor, estilo]}>
        <ActivityIndicator size="large" color={colores.marca} />
        {texto ? <Text style={estilos.texto}>{texto}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[estilos.contenedor, estilo]}>
      <View style={estilos.icono}>
        <Ionicons name={icono} size={30} color={colores.textoTenue} />
      </View>
      {titulo ? <Text style={estilos.titulo}>{titulo}</Text> : null}
      {texto ? <Text style={estilos.texto}>{texto}</Text> : null}
      {accion && (
        <Pressable style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]} onPress={accion.alPresionar}>
          <Text style={estilos.textoBoton}>{accion.texto}</Text>
        </Pressable>
      )}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    contenedor: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 20 },
    icono: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titulo: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: c.texto, textAlign: 'center' },
    texto: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: c.textoSecundario, textAlign: 'center' },
    boton: {
      height: 46,
      paddingHorizontal: 22,
      borderRadius: 12,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 6,
    },
    textoBoton: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSobreMarca },
    presionado: { opacity: 0.85 },
  });
}
