import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';

const coloresCategoria = {
  Bronze: '#C98A52',
  Silver: '#CFD3DE',
  Gold: '#FAB41F',
};

const categorias = [
  { nombre: 'Bronze', desde: 'Desde que creás tu cuenta', tasa: '1 pto c/ $100' },
  { nombre: 'Silver', desde: 'Desde 1.000 puntos', tasa: '1 pto c/ $83' },
  { nombre: 'Gold', desde: 'Desde 5.000 puntos', tasa: '1 pto c/ $67' },
];

function BotonAccion({ icono, texto, subtexto, secundario, alPresionar, colores, estilos }) {
  return (
    <Pressable style={[estilos.botonAccion, secundario && estilos.botonAccionSecundario]} onPress={alPresionar}>
      <Ionicons name={icono} size={28} color={secundario ? colores.marca : colores.textoSobreMarca} />
      <View>
        <Text style={[estilos.botonAccionTexto, secundario && estilos.textoNormal]}>{texto}</Text>
        <Text style={[estilos.botonAccionSub, secundario && estilos.textoSuave]}>{subtexto}</Text>
      </View>
    </Pressable>
  );
}

function ContenidoInvitado({ colores, estilos, navigation }) {
  const irARegistro = async () => {
    await AsyncStorage.setItem('cafeto:abrirRegistro', 'si');
    await signOut(auth);
  };

  return (
    <>
      <View style={estilos.tarjeta}>
        <Text style={estilos.tituloInvitado}>Cada compra suma</Text>
        <Text style={estilos.puntosTexto}>
          Creá tu cuenta, mostrá tu QR en caja y cambiá tus puntos por productos y descuentos.
        </Text>
        <View style={estilos.acciones}>
          <Pressable style={estilos.botonPrimario} onPress={irARegistro}>
            <Text style={estilos.botonPrimarioTexto}>Crear cuenta</Text>
          </Pressable>
          <Pressable style={estilos.botonSecundario} onPress={() => signOut(auth)}>
            <Text style={estilos.botonSecundarioTexto}>Ya tengo cuenta</Text>
          </Pressable>
        </View>
      </View>

      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>Mientras más venís, más ganás</Text>
        <View style={estilos.lista}>
          {categorias.map((cat, indice) => (
            <View key={cat.nombre} style={[estilos.filaCategoria, indice > 0 && estilos.divisorArriba]}>
              <View style={[estilos.punto, { backgroundColor: coloresCategoria[cat.nombre] }]} />
              <View style={estilos.textosBeneficio}>
                <Text style={estilos.tituloBeneficio}>{cat.nombre}</Text>
                <Text style={estilos.detalle}>{cat.desde}</Text>
              </View>
              <Text style={estilos.detalle}>{cat.tasa}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={estilos.acciones}>
        <BotonAccion icono="gift-outline" texto="Ver beneficios" subtexto="Qué podés canjear" secundario alPresionar={() => navigation.navigate('Beneficios')} colores={colores} estilos={estilos} />
        <BotonAccion icono="book-outline" texto="Ver la carta" subtexto="Productos y precios" secundario alPresionar={() => navigation.navigate('Carta')} colores={colores} estilos={estilos} />
      </View>
    </>
  );
}

function Esqueleto({ estilos }) {
  const opacidad = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    animacion.start();
    return () => animacion.stop();
  }, [opacidad]);

  return (
    <Animated.View style={[estilos.esqueleto, { opacity: opacidad }]}>
      <View style={[estilos.bloque, { height: 150 }]} />
      <View style={estilos.acciones}>
        <View style={[estilos.bloque, { flex: 1, height: 118 }]} />
        <View style={[estilos.bloque, { flex: 1, height: 118 }]} />
      </View>
      <View style={[estilos.bloque, { width: '50%', height: 18 }]} />
      <View style={[estilos.bloque, { height: 64 }]} />
      <View style={[estilos.bloque, { height: 64 }]} />
    </Animated.View>
  );
}

export default function Home({ navigation }) {
  const { colores, isotipo, cambiarTema } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [fuentesCargadas] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const espera = setTimeout(() => setCargando(false), 1200);
    return () => clearTimeout(espera);
  }, []);

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
  const beneficios = [
    { id: 1, icono: 'pricetag-outline', titulo: '5% off en cada compra', detalle: 'Se aplica solo al pagar', tipo: 'AUTOMATICO', puntos: 0 },
    { id: 2, icono: 'cafe-outline', titulo: 'Café con leche gratis', detalle: '400 pts', tipo: 'CANJEABLE', puntos: 400 },
  ];

  const movimientos = [
    { id: 1, concepto: 'Compra en caja', fecha: '12 oct', puntos: 38 },
    { id: 2, concepto: 'Canje: medialunas x3', fecha: '2 oct', puntos: -300 },
  ];

  if (!fuentesCargadas) {
    return (
      <View style={[estilos.pantalla, estilos.centrado]}>
        <ActivityIndicator size="large" color={colores.marca} />
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.encabezado}>
          <View style={estilos.saludo}>
            <Image source={isotipo} style={estilos.isotipo} />
            <View>
              <Text style={estilos.titulo}>{saludo}</Text>
              {esInvitado ? (
                <Text style={estilos.etiquetaInvitado}>INVITADO</Text>
              ) : (
                <Text style={estilos.subtitulo}>Cafeto · Las Lomitas</Text>
              )}
            </View>
          </View>
          
          <View style={estilos.botones}>
            <Pressable style={estilos.botonRedondo} onPress={cambiarTema}>
              <Ionicons name="contrast" size={20} color={colores.texto} />
            </Pressable>
          </View>
        </View>
        {cargando ? (
          <Esqueleto estilos={estilos} />
        ) : esInvitado ? (
          <ContenidoInvitado colores={colores} estilos={estilos} navigation={navigation} />
        ) : (
          <>
        <View style={estilos.tarjeta}>
          <View style={estilos.tarjetaFila}>
            <View style={[estilos.chip, { backgroundColor: coloresCategoria[cliente.categoria] }]}>
              <Ionicons name="star" size={12} color={colores.textoSobreMarca} />
              <Text style={estilos.chipTexto}>{cliente.categoria.toUpperCase()}</Text>
            </View>
            <Text style={estilos.enlace} onPress={() => navigation.navigate('Perfil')}>Ver historial</Text>
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
          <BotonAccion icono="qr-code-outline" texto="Mi QR" subtexto="Sumá en la caja" alPresionar={() => navigation.navigate('Perfil')} colores={colores} estilos={estilos} />
          <BotonAccion icono="gift-outline" texto="Canjear" subtexto="Usá tus puntos" alPresionar={() => navigation.navigate('Beneficios')} colores={colores} estilos={estilos} />
        </View>
        <View style={estilos.seccion}>
          <View style={estilos.tarjetaFila}>
            <Text style={estilos.tituloSeccion}>Tus beneficios {cliente.categoria}</Text>
            <Text style={estilos.enlace} onPress={() => navigation.navigate('Beneficios')}>Ver todos</Text>
          </View>
          {beneficios.map((beneficio) => {
            const alcanza = cliente.puntosDisponibles >= beneficio.puntos;
            return (
              <View key={beneficio.id} style={estilos.filaBeneficio}>
                <View style={estilos.iconoBeneficio}>
                  <Ionicons name={beneficio.icono} size={18} color={colores.marca} />
                </View>
                <View style={estilos.textosBeneficio}>
                  <Text style={estilos.tituloBeneficio}>{beneficio.titulo}</Text>
                  <Text style={estilos.detalle}>{beneficio.detalle}</Text>
                </View>
                {beneficio.tipo === 'AUTOMATICO' ? (
                  <Text style={estilos.activo}>ACTIVO</Text>
                ) : (
                  <Pressable style={[estilos.botonCanje, !alcanza && estilos.botonCanjeOff]} disabled={!alcanza}>
                    <Text style={[estilos.botonCanjeTexto, !alcanza && estilos.textoApagado]}>
                      {alcanza ? 'Canjear' : `Faltan ${beneficio.puntos - cliente.puntosDisponibles} pts`}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Tu actividad</Text>
          {movimientos.map((mov) => (
            <View key={mov.id} style={estilos.filaMovimiento}>
              <View>
                <Text style={estilos.textoMovimiento}>{mov.concepto}</Text>
                <Text style={estilos.detalle}>{mov.fecha}</Text>
              </View>
              <Text style={[estilos.puntosMovimiento, mov.puntos > 0 && estilos.puntosSuma]}>
                {mov.puntos > 0 ? `+${mov.puntos}` : mov.puntos} pts
              </Text>
            </View>
          ))}
        </View>
          </>
        )}
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
      flex: 1, minHeight: 126, justifyContent: 'space-between', gap: 14,
      backgroundColor: c.marca, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18,
    },
    botonAccionTexto: { fontFamily: 'Inter_700Bold', fontSize: 17, color: c.textoSobreMarca },
    botonAccionSub: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17, color: c.textoSobreMarca },

    seccion: { gap: 10 },
    tituloSeccion: { fontFamily: 'Inter_700Bold', fontSize: 16, color: c.texto },
    filaBeneficio: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16, padding: 12,
    },
    iconoBeneficio: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: c.superficieActiva,
      justifyContent: 'center', alignItems: 'center',
    },
    textosBeneficio: { flex: 1, gap: 2 },
    tituloBeneficio: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    activo: {
      fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, color: c.exito,
      backgroundColor: c.fondoExito, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden',
    },
    botonCanje: { borderWidth: 1, borderColor: c.marca, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    botonCanjeOff: { borderColor: c.borde },
    botonCanjeTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    textoApagado: { color: c.textoTenue },
    filaMovimiento: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.divisor,
    },
    textoMovimiento: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.texto },
    puntosMovimiento: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.textoSecundario },
    puntosSuma: { color: c.exito },
    tituloInvitado: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    botonPrimario: {
      flex: 1, backgroundColor: c.marca, borderRadius: 12, paddingVertical: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    botonPrimarioTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSobreMarca },
    botonSecundario: {
      flex: 1, borderWidth: 1, borderColor: c.bordeAdvertencia, borderRadius: 12, paddingVertical: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    botonSecundarioTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    etiquetaInvitado: {
      alignSelf: 'flex-start', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2,
      color: c.marca, backgroundColor: c.marcaSuave, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
    },
    lista: { backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16 },
    filaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    divisorArriba: { borderTopWidth: 1, borderTopColor: c.divisor },
    punto: { width: 12, height: 12, borderRadius: 6 },
    botonAccionSecundario: { minHeight: 116, backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde },
    textoNormal: { color: c.texto },
    textoSuave: { color: c.textoSecundario },
    esqueleto: { gap: 18 },
    bloque: { backgroundColor: c.borde, borderRadius: 16 },
  });
}