import React, { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { signOut } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';

const coloresCategoria = {
  Bronze: '#C98A52',
  Silver: '#CFD3DE',
  Gold: '#FAB41F',
};

function BotonAccion({ icono, texto, subtexto, colores, estilos }) {
    return (
    <Pressable style={estilos.botonAccion}>
      <Ionicons name={icono} size={28} color={colores.textoSobreMarca} />
      <View>
        <Text style={estilos.botonAccionTexto}>{texto}</Text>
        <Text style={estilos.botonAccionSub}>{subtexto}</Text>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const { colores, isotipo, cambiarTema } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [fuentesCargadas] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const usuario = auth.currentUser;
  const esInvitado = usuario?.isAnonymous ?? true;
  const nombre = usuario?.displayName?.split(' ')[0] ?? 'cliente';
  const saludo = esInvitado ? "¡Bienvenido!" : `Hola, ${nombre}`;
    const cliente = {
    categoria: 'Silver',
    puntosDisponibles: 320,
    puntosAcumulados: 1840,
    proximaCategoria: 'Gold',
    puntosProximaCategoria: 5000,
  };
  const faltan = cliente.puntosProximaCategoria - cliente.puntosAcumulados;
  const avance = (cliente.puntosAcumulados / cliente.puntosProximaCategoria) * 100;

  if (!fuentesCargadas) {
    return (
      <View style={[estilos.pantalla, estilos.centrado]}>
        <ActivityIndicator size="large" color={colores.marca} />
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.encabezado}>
          <View style={estilos.saludo}>
            <Image source={isotipo} style={estilos.isotipo} />
            <View>
              <Text style={estilos.titulo}>{saludo}</Text>
              <Text style={estilos.subtitulo}>Cafeto · Las Lomitas</Text>
            </View>
          </View>
          
          <View style={estilos.botones}>
            <Pressable style={estilos.botonRedondo} onPress={cambiarTema}>
              <Ionicons name="contrast" size={20} color={colores.texto} />
            </Pressable>
            <Pressable style={estilos.botonRedondo} onPress={() => signOut(auth)}>
              <Feather name="log-out" size={18} color={colores.texto} />
            </Pressable>
          </View>
        </View>
        <View style={estilos.tarjeta}>
          <View style={estilos.tarjetaFila}>
            <View style={[estilos.chip, { backgroundColor: coloresCategoria[cliente.categoria] }]}>
              <Ionicons name="star" size={12} color={colores.textoSobreMarca} />
              <Text style={estilos.chipTexto}>{cliente.categoria.toUpperCase()}</Text>
            </View>
            <Text style={estilos.enlace}>Ver historial</Text>
          </View>
          <View style={estilos.filaPuntos}>
            <Text style={estilos.puntos}>{cliente.puntosDisponibles}</Text>
            <Text style={estilos.puntosTexto}>puntos para canjear</Text>
          </View>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${avance}%` }]} />
          </View>
          <View style={estilos.tarjetaFila}>
            <Text style={estilos.detalle}>{cliente.puntosAcumulados.toLocaleString('es-AR')} acumulados</Text>
            <Text style={estilos.detalle}>
              Te faltan <Text style={estilos.resaltado}>{faltan.toLocaleString('es-AR')}</Text> para {cliente.proximaCategoria}
            </Text>
          </View>
        </View>
        <View style={estilos.acciones}>
          <BotonAccion icono="qr-code-outline" texto="Mi QR" subtexto="Sumá en la caja" colores={colores} estilos={estilos} />
          <BotonAccion icono="gift-outline" texto="Canjear" subtexto="Usá tus puntos" colores={colores} estilos={estilos} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    centrado: { justifyContent: 'center', alignItems: 'center' },
    contenido: { padding: 20, gap: 18 },
    encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    saludo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    isotipo: { width: 44, height: 44, resizeMode: 'contain' },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 32, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textoSecundario },
    botones: { flexDirection: 'row', gap: 8 },
    botonRedondo: {
      width: 44, height: 44, borderRadius: 22, borderWidth: 1,
      borderColor: c.borde, backgroundColor: c.superficie,
      justifyContent: 'center', alignItems: 'center',
    },
    tarjeta: {
      backgroundColor: c.marcaSuave, borderRadius: 20, padding: 18,
      borderWidth: 1, borderColor: c.bordeAdvertencia, gap: 12,
    },
    tarjetaFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    },
    chipTexto: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: c.textoSobreMarca },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    filaPuntos: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    puntos: { fontFamily: 'Inter_700Bold', fontSize: 40, color: c.texto },
    puntosTexto: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    barra: { height: 6, borderRadius: 3, backgroundColor: c.bordeAdvertencia, overflow: 'hidden' },
    barraRelleno: { height: 6, borderRadius: 3, backgroundColor: c.marca },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoSecundario },
    resaltado: { fontFamily: 'Inter_700Bold', color: c.texto },
    acciones: { flexDirection: 'row', gap: 12 },
    botonAccion: {
      flex: 1, height: 118, justifyContent: 'space-between',
      backgroundColor: c.marca, borderRadius: 18, padding: 16,
    },
    botonAccionTexto: { fontFamily: 'Inter_700Bold', fontSize: 17, color: c.textoSobreMarca },
    botonAccionSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: c.textoSobreMarca },
  });
}