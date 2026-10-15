import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';

export default function SinConexion({ alReintentar, alVolver }) {
  const { colores, isotipo, cambiarTema } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const reintentar = useRef(alReintentar);

  useEffect(() => {
    reintentar.current = alReintentar;
  }, [alReintentar]);

  useEffect(() => {
    const revision = setInterval(async () => {
      try {
        await fetch('https://clients3.google.com/generate_204');
        reintentar.current();
      } catch (error) {
        return;
      }
    }, 5000);

    return () => clearInterval(revision);
  }, []);

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <View style={estilos.encabezado}>
        {alVolver ? (
          <Pressable onPress={alVolver} style={estilos.botonRedondo}>
            <Ionicons name="arrow-back" size={22} color={colores.texto} />
          </Pressable>
        ) : (
          <View style={estilos.botonRedondo} />
        )}
        <Image source={isotipo} style={estilos.isotipo} />
        <Pressable onPress={cambiarTema} style={estilos.botonRedondo}>
          <Ionicons name="contrast" size={20} color={colores.texto} />
        </Pressable>
      </View>

      <View style={estilos.centro}>
        <View style={estilos.circulo}>
          <Ionicons name="wifi-outline" size={58} color={colores.textoTenue} />
          <View style={estilos.tachado} />
        </View>
        <Text style={estilos.titulo}>Sin conexión</Text>
        <Text style={estilos.subtitulo}>Revisá el wifi o los datos del teléfono.</Text>
        <Pressable style={estilos.boton} onPress={() => reintentar.current()}>
          <Text style={estilos.botonTexto}>Reintentar</Text>
        </Pressable>
      </View>

      <Text style={estilos.pie}>Volvemos a intentar solos cuando haya señal.</Text>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo, paddingHorizontal: 24 },
    encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
    isotipo: { width: 46, height: 46, resizeMode: 'contain' },
    botonRedondo: {
      width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie,
    },
    centro: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    circulo: {
      width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center',
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, marginBottom: 14,
    },
    tachado: {
      position: 'absolute', width: 86, height: 2, borderRadius: 1,
      backgroundColor: c.textoTenue, transform: [{ rotate: '-45deg' }],
    },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 42, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 15, color: c.textoSecundario, textAlign: 'center' },
    boton: {
      alignSelf: 'stretch', marginTop: 18, height: 54, borderRadius: 14,
      backgroundColor: c.marca, justifyContent: 'center', alignItems: 'center',
    },
    botonTexto: { fontFamily: 'Inter_700Bold', fontSize: 16, color: c.textoSobreMarca },
    pie: {
      fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textoTenue,
      textAlign: 'center', paddingBottom: 26,
    },
  });
}
