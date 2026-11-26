import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';

const ventajas = [
  { icono: 'star-outline', texto: 'Sumás puntos en cada compra mostrando tu QR.' },
  { icono: 'gift-outline', texto: 'Canjeás tus puntos por productos y descuentos.' },
  { icono: 'trending-up-outline', texto: 'Subís de categoría y ganás más rápido.' },
];

function Dato({ icono, texto, detalle, estilos, colores }) {
  return (
    <View style={estilos.fila} accessible accessibilityLabel={`${texto}: ${detalle}`}>
      <Ionicons name={icono} size={20} color={colores.textoSecundario} />
      <Text style={estilos.filaTexto}>{texto}</Text>
      <Text style={estilos.filaDetalle} numberOfLines={1}>
        {detalle}
      </Text>
    </View>
  );
}

function Fila({ icono, texto, detalle, alPresionar, peligro, estilos, colores }) {
  return (
    <Pressable style={({ pressed }) => [estilos.fila, pressed && estilos.presionado]} onPress={alPresionar}>
      <Ionicons name={icono} size={20} color={peligro ? colores.peligro : colores.textoSecundario} />
      <Text style={[estilos.filaTexto, peligro && { color: colores.peligro }]}>{texto}</Text>
      {detalle ? <Text style={estilos.filaDetalle}>{detalle}</Text> : null}
    </Pressable>
  );
}

export default function Cuenta() {
  const navigation = useNavigation();
  const { colores, tema, logo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const { rol, equipo, cerrarSesion } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const confirmarSalida = () => {
    avisar('advertencia', '¿Cerrar sesión?', 'Vas a tener que volver a entrar con tu usuario del sistema.', [
      { texto: 'Cancelar', estilo: 'cancelar' },
      { texto: 'Cerrar sesión', estilo: 'destructivo', alPresionar: cerrarSesion },
    ]);
  };

  const explicarClave = () => {
    avisar(
      'advertencia',
      'Tu contraseña',
      'Por seguridad, tu contraseña y tus datos se cambian en la web del local, donde queda registrado quién lo hizo. Si te la olvidaste, pedile al administrador que te la restablezca.'
    );
  };

  const esEquipo = rol === 'equipo';
  const nombreCompleto = [equipo?.nombre, equipo?.apellido].filter(Boolean).join(' ');
  const perfil = `${equipo?.perfil ?? 'Equipo'}${equipo?.esTitular ? ' · titular' : ''}`;

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecera}>
          <Image source={logo} style={estilos.logo} resizeMode="contain" />
          <Text style={estilos.lomitas}>LAS LOMITAS</Text>
          <Text style={estilos.titulo}>{esEquipo ? `Hola, ${equipo?.nombre ?? 'equipo'}` : 'Tu cuenta'}</Text>
          <Text style={estilos.subtitulo}>
            {esEquipo ? `${equipo?.perfil ?? 'Equipo'} · Cafeto Las Lomitas` : 'Entrá o creá tu cuenta en un minuto.'}
          </Text>
        </View>

        <View style={estilos.espacio} />

        {esEquipo ? (
          <View style={estilos.tarjeta}>
            <View style={estilos.ventaja}>
              <View style={estilos.iconoVentaja}>
                <Ionicons name="briefcase-outline" size={20} color={colores.marca} />
              </View>
              <Text style={estilos.tarjetaTitulo}>Estás en modo equipo</Text>
            </View>
            <Text style={estilos.tarjetaTexto}>
              Desde el celular podés resolver tareas rápidas. Las más grandes, como ventas, precios o reportes,
              siguen en la versión web.
            </Text>
            <Pressable
              style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('Gestion')}
            >
              <Text style={estilos.textoBotonPrincipal}>Ir a Gestión</Text>
            </Pressable>
          </View>
        ) : (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tarjetaTituloManuscrito}>Cada compra suma</Text>
            {ventajas.map((ventaja) => (
              <View key={ventaja.icono} style={estilos.ventaja}>
                <View style={estilos.iconoVentaja}>
                  <Ionicons name={ventaja.icono} size={20} color={colores.marca} />
                </View>
                <Text style={estilos.tarjetaTexto}>{ventaja.texto}</Text>
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={estilos.textoBotonPrincipal}>Iniciar sesión</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('Registro')}
            >
              <Text style={estilos.textoBotonSecundario}>Crear cuenta</Text>
            </Pressable>
          </View>
        )}

        <View style={estilos.espacio} />

        <View style={estilos.pie}>
          {esEquipo && (
            <>
              <Text style={estilos.seccion}>TU USUARIO</Text>
              <View style={estilos.bloque}>
                <Dato icono="person-outline" texto="Nombre" detalle={nombreCompleto || 'Equipo'} estilos={estilos} colores={colores} />
                <Dato icono="shield-checkmark-outline" texto="Perfil" detalle={perfil} estilos={estilos} colores={colores} />
                <Fila
                  icono="key-outline"
                  texto="Contraseña"
                  detalle="Se cambia en la web"
                  alPresionar={explicarClave}
                  estilos={estilos}
                  colores={colores}
                />
              </View>
            </>
          )}
          <Text style={estilos.seccion}>PREFERENCIAS</Text>
          <View style={estilos.bloque}>
            <Fila
              icono="contrast-outline"
              texto="Tema"
              detalle={tema === 'oscuro' ? 'Oscuro' : 'Claro'}
              alPresionar={cambiarTema}
              estilos={estilos}
              colores={colores}
            />
            <Fila
              icono="help-circle-outline"
              texto={esEquipo ? 'Ayuda para el equipo' : '¿Tenés problemas para ingresar?'}
              alPresionar={() => navigation.navigate('Ayuda')}
              estilos={estilos}
              colores={colores}
            />
            {esEquipo && (
              <Fila
                icono="log-out-outline"
                texto="Cerrar sesión"
                alPresionar={confirmarSalida}
                peligro
                estilos={estilos}
                colores={colores}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
    cabecera: { alignItems: 'center' },
    logo: { width: 110, height: 113 },
    lomitas: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 4, color: c.textoSecundario, marginTop: 6 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 42, color: c.titulo, textAlign: 'center', marginTop: 14 },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 15, color: c.textoSecundario, textAlign: 'center' },
    espacio: { flex: 1, minHeight: 24 },
    tarjeta: {
      gap: 16,
      padding: 22,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    tarjetaTituloManuscrito: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    tarjetaTitulo: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 17, color: c.texto },
    tarjetaTexto: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21, color: c.textoSecundario },
    ventaja: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconoVentaja: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.fondo,
      justifyContent: 'center',
      alignItems: 'center',
    },
    botonPrincipal: {
      height: 54,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
    },
    textoBotonPrincipal: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: c.textoSobreMarca },
    botonSecundario: {
      height: 54,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoBotonSecundario: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: c.texto },
    presionado: { opacity: 0.85 },
    pie: { gap: 10 },
    seccion: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 1.5, color: c.textoTenue },
    bloque: { borderRadius: 16, borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, overflow: 'hidden' },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 17,
      borderBottomWidth: 1,
      borderBottomColor: c.divisor,
    },
    filaTexto: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 16, color: c.texto },
    filaDetalle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: c.textoSecundario },
  });
}
