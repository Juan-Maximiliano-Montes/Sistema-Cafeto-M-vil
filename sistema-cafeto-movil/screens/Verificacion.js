import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { deleteUser, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';

const ESPERA_REENVIO = 60;
const INTERVALO_CONSULTA = 4000;

function formatearReloj(segundos) {
  const minutos = String(Math.floor(segundos / 60)).padStart(2, '0');
  const resto = String(segundos % 60).padStart(2, '0');
  return `${minutos}:${resto}`;
}

export default function Verificacion() {
  const [fuentesCargadas] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [verificado, setVerificado] = useState(false);
  const [segundos, setSegundos] = useState(ESPERA_REENVIO);
  const [entrando, setEntrando] = useState(false);

  const { colores, isotipo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const correo = auth.currentUser?.email ?? '';

  useEffect(() => {
    if (segundos === 0) return;
    const temporizador = setTimeout(() => setSegundos(segundos - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [segundos]);

  useEffect(() => {
    if (verificado) return;
    const consulta = setInterval(() => {
      auth.currentUser
        .reload()
        .then(() => {
          if (auth.currentUser.emailVerified) setVerificado(true);
        })
        .catch(() => null);
    }, INTERVALO_CONSULTA);
    return () => clearInterval(consulta);
  }, [verificado]);

  const reenviarEnlace = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      setSegundos(ESPERA_REENVIO);
      avisar('exito', 'Enlace enviado', `Te mandamos un nuevo enlace a ${correo}.`);
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        avisar('advertencia', 'Esperá un momento', 'Pediste varios enlaces seguidos. Probá de nuevo en unos minutos.');
      } else {
        avisar('error', 'Error', `No pudimos reenviar el enlace.\n\nCódigo: ${error.code ?? 'desconocido'}`);
      }
    }
  };

  const borrarRegistro = async () => {
    try {
      await deleteUser(auth.currentUser);
    } catch (error) {
      await signOut(auth);
      avisar(
        'error',
        'No pudimos borrar el registro',
        'Iniciá sesión de nuevo con ese correo y volvé a intentarlo, o registrate con el correo correcto.'
      );
    }
  };

  const corregirCorreo = () => {
    avisar(
      'advertencia',
      '¿Corregir el correo?',
      'Vamos a borrar este registro para que lo hagas de nuevo con el correo correcto.',
      [
        { texto: 'Cancelar', estilo: 'cancelar' },
        { texto: 'Corregir', estilo: 'destructivo', alPresionar: borrarRegistro },
      ]
    );
  };

  const empezar = async () => {
    setEntrando(true);
    await auth.currentUser.getIdToken(true);
  };

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
          {verificado ? (
            <View style={estilos.huecoEncabezado} />
          ) : (
            <Pressable style={estilos.chip} onPress={() => signOut(auth)}>
              <Text style={estilos.textoChip}>Salir</Text>
              <Feather name="log-out" size={14} color={colores.textoSecundario} />
            </Pressable>
          )}
          <Image source={isotipo} style={estilos.isotipo} resizeMode="contain" />
          <View style={estilos.huecoEncabezado}>
            <Pressable style={estilos.botonTema} onPress={cambiarTema}>
              <Ionicons name="contrast" size={20} color={colores.texto} />
            </Pressable>
          </View>
        </View>

        {verificado ? (
          <>
            <View style={estilos.espaciador} />
            <View style={[estilos.icono, estilos.iconoExito]}>
              <Feather name="check" size={44} color={colores.exito} />
            </View>
            <Text style={estilos.titulo}>¡Cuenta verificada!</Text>
            <Text style={estilos.texto}>Ya podés sumar puntos en cada compra.</Text>
            <View style={estilos.espaciador} />
            <Pressable
              style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
              onPress={empezar}
              disabled={entrando}
            >
              {entrando ? (
                <ActivityIndicator color={colores.textoSobreMarca} />
              ) : (
                <Text style={estilos.textoBotonPrincipal}>Empezar</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={[estilos.icono, estilos.iconoCorreo]}>
              <Feather name="mail" size={40} color={colores.marca} />
            </View>
            <Text style={estilos.titulo}>Revisá tu correo</Text>
            <Text style={estilos.texto}>Te mandamos un enlace de verificación para activar la cuenta.</Text>
            <Text style={estilos.correo}>{correo}</Text>
            <View style={estilos.filaCorregir}>
              <Text style={estilos.textoChico}>¿Está mal escrito? </Text>
              <Pressable onPress={corregirCorreo}>
                <Text style={[estilos.textoChico, estilos.enlace]}>Corregilo</Text>
              </Pressable>
            </View>

            <View style={estilos.tarjetaExito}>
              <Feather name="check" size={18} color={colores.exito} />
              <View style={estilos.textosTarjeta}>
                <Text style={estilos.tituloTarjeta}>Cuenta creada</Text>
                <Text style={estilos.detalleTarjeta}>
                  Solo falta verificar el correo para empezar a sumar puntos.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
              onPress={reenviarEnlace}
              disabled={segundos > 0}
            >
              <Text style={[estilos.textoBotonSecundario, segundos > 0 && estilos.textoEsperando]}>
                {segundos > 0 ? `Reenviar enlace en ${formatearReloj(segundos)}` : 'Reenviar enlace'}
              </Text>
            </Pressable>

            <View style={estilos.espaciador} />
            <Text style={estilos.pie}>¿No te llegó? Revisá la carpeta de spam.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: c.fondo,
    },
    centrado: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    contenido: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 12,
      paddingBottom: 24,
    },
    encabezado: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    huecoEncabezado: {
      width: 90,
      alignItems: 'flex-end',
    },
    chip: {
      width: 90,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoChip: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: c.textoSecundario,
    },
    isotipo: {
      width: 34,
      height: 34,
    },
    botonTema: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icono: {
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconoCorreo: {
      width: 88,
      height: 88,
      borderRadius: 24,
      marginTop: 40,
      backgroundColor: c.marcaSuave,
    },
    iconoExito: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: c.fondoExito,
    },
    titulo: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 38,
      color: c.titulo,
      textAlign: 'center',
      marginTop: 24,
    },
    texto: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 22,
      color: c.textoSecundario,
      textAlign: 'center',
      marginTop: 6,
    },
    correo: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.marca,
      textAlign: 'center',
      marginTop: 12,
    },
    filaCorregir: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 6,
    },
    textoChico: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: c.textoSecundario,
    },
    enlace: {
      fontFamily: 'Inter_600SemiBold',
      color: c.marca,
      textDecorationLine: 'underline',
    },
    tarjetaExito: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      marginTop: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.exito,
      backgroundColor: c.fondoExito,
    },
    textosTarjeta: {
      flex: 1,
      gap: 4,
    },
    tituloTarjeta: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: c.texto,
    },
    detalleTarjeta: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textoSecundario,
    },
    botonPrincipal: {
      height: 54,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoBotonPrincipal: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.textoSobreMarca,
    },
    botonSecundario: {
      height: 54,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    textoBotonSecundario: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.texto,
    },
    textoEsperando: {
      color: c.textoSecundario,
    },
    presionado: {
      opacity: 0.85,
    },
    espaciador: {
      flex: 1,
      minHeight: 24,
    },
    pie: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: c.textoSecundario,
      textAlign: 'center',
    },
  });
}
