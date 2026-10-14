import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPasswordResetEmail, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';

const CLAVE_CORREO_RECORDADO = 'cafeto:correoRecordado';
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ navigation, route }) {
  const [fuentesCargadas] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [campoActivo, setCampoActivo] = useState(null);
  const [errorCorreo, setErrorCorreo] = useState('');
  const [errorContrasena, setErrorContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const { colores, logo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const formularioCompleto = correo.trim() !== '' && contrasena !== '';

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_CORREO_RECORDADO).then((correoGuardado) => {
      if (correoGuardado) {
        setCorreo((actual) => actual || correoGuardado);
        setRecordarme(true);
      }
    });
  }, []);

  useEffect(() => {
    if (route.params?.correo) {
      setCorreo(route.params.correo);
      setErrorCorreo('');
    }
  }, [route.params?.correo]);

  const cambiarCorreo = (texto) => {
    setCorreo(texto);
    setErrorCorreo('');
  };

  const cambiarContrasena = (texto) => {
    setContrasena(texto);
    setErrorContrasena('');
  };

  const validarFormulario = () => {
    let esValido = true;

    if (!correo.trim()) {
      setErrorCorreo('Ingresá tu correo electrónico.');
      esValido = false;
    } else if (!FORMATO_CORREO.test(correo.trim())) {
      setErrorCorreo('Revisá el formato del correo.');
      esValido = false;
    }

    if (!contrasena) {
      setErrorContrasena('Ingresá tu contraseña.');
      esValido = false;
    }

    return esValido;
  };

  const guardarPreferenciaRecordarme = async () => {
    if (recordarme) {
      await AsyncStorage.setItem(CLAVE_CORREO_RECORDADO, correo.trim());
    } else {
      await AsyncStorage.removeItem(CLAVE_CORREO_RECORDADO);
    }
  };

  const mostrarErrorDeFirebase = (error) => {
    switch (error.code) {
      case 'auth/invalid-email':
        setErrorCorreo('El formato del correo no es válido.');
        break;
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        setErrorContrasena('La contraseña no coincide con ese correo.');
        break;
      case 'auth/too-many-requests':
        setErrorContrasena('Demasiados intentos. Esperá unos minutos y probá de nuevo.');
        break;
      case 'auth/network-request-failed':
        avisar('error', 'Sin conexión', 'Revisá el wifi o los datos del teléfono.');
        break;
      case 'auth/configuration-not-found':
      case 'auth/admin-restricted-operation':
      case 'auth/operation-not-allowed':
        avisar('advertencia', 'No disponible', 'Este método de acceso no está habilitado en Firebase.');
        break;
      default:
        avisar('error', 'Error', `No pudimos iniciar sesión.\n\nCódigo: ${error.code ?? 'desconocido'}`);
    }
  };

  const iniciarSesion = async () => {
    if (!validarFormulario()) return;

    setCargando(true);
    try {
      await guardarPreferenciaRecordarme();
      await signInWithEmailAndPassword(auth, correo.trim(), contrasena);
    } catch (error) {
      mostrarErrorDeFirebase(error);
      setCargando(false);
    }
  };

  const recuperarContrasena = async () => {
    if (!FORMATO_CORREO.test(correo.trim())) {
      setErrorCorreo('Escribí tu correo y te mandamos un enlace para elegir una nueva.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, correo.trim());
      avisar('exito', 'Revisá tu correo', `Te mandamos un enlace a ${correo.trim()} para que elijas una contraseña nueva.`);
    } catch (error) {
      mostrarErrorDeFirebase(error);
    }
  };

  const seguirSinCuenta = async () => {
    setCargando(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      mostrarErrorDeFirebase(error);
      setCargando(false);
    }
  };

  const avisarProximamente = (proveedor) => {
    avisar('advertencia', 'Próximamente', `El ingreso con ${proveedor} todavía no está disponible.`);
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
      <KeyboardAvoidingView
        style={estilos.pantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.barraSuperior}>
            <Pressable style={estilos.chipInvitado} onPress={seguirSinCuenta} disabled={cargando}>
              <Text style={estilos.textoChip}>Seguir sin cuenta</Text>
              <Feather name="chevron-right" size={16} color={colores.textoSecundario} />
            </Pressable>
            <Pressable style={estilos.botonTema} onPress={cambiarTema}>
              <Ionicons name="contrast" size={20} color={colores.texto} />
            </Pressable>
          </View>

          <View style={estilos.marca}>
            <Image source={logo} style={estilos.logo} resizeMode="contain" />
            <Text style={estilos.lomitas}>LAS LOMITAS</Text>
          </View>

          <Text style={estilos.titulo}>Hola de nuevo</Text>
          <Text style={estilos.subtitulo}>Qué bueno verte.</Text>

          <Text style={estilos.etiqueta}>Correo electrónico</Text>
          <View
            style={[
              estilos.campo,
              campoActivo === 'correo' && estilos.campoActivo,
              errorCorreo !== '' && estilos.campoConError,
            ]}
          >
            <Feather name="mail" size={20} color={colores.textoSecundario} />
            <TextInput
              style={estilos.entrada}
              placeholder="tunombre@correo.com"
              placeholderTextColor={colores.textoTenue}
              value={correo}
              onChangeText={cambiarCorreo}
              onFocus={() => setCampoActivo('correo')}
              onBlur={() => setCampoActivo(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              editable={!cargando}
            />
          </View>
          {errorCorreo !== '' && (
            <View style={estilos.filaError}>
              <Feather name="alert-circle" size={14} color={colores.peligro} />
              <Text style={estilos.textoError}>{errorCorreo}</Text>
            </View>
          )}
          {campoActivo === 'correo' && errorCorreo === '' && (
            <Text style={estilos.ayuda}>Usá el correo con el que te registraste.</Text>
          )}

          <Text style={estilos.etiqueta}>Contraseña</Text>
          <View
            style={[
              estilos.campo,
              campoActivo === 'contrasena' && estilos.campoActivo,
              errorContrasena !== '' && estilos.campoConError,
            ]}
          >
            <Feather name="lock" size={20} color={colores.textoSecundario} />
            <TextInput
              style={estilos.entrada}
              placeholder="Tu contraseña"
              placeholderTextColor={colores.textoTenue}
              value={contrasena}
              onChangeText={cambiarContrasena}
              onFocus={() => setCampoActivo('contrasena')}
              onBlur={() => setCampoActivo(null)}
              secureTextEntry={!mostrarContrasena}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={iniciarSesion}
              editable={!cargando}
            />
            <Pressable onPress={() => setMostrarContrasena(!mostrarContrasena)} hitSlop={10}>
              <Feather
                name={mostrarContrasena ? 'eye-off' : 'eye'}
                size={20}
                color={colores.textoSecundario}
              />
            </Pressable>
          </View>
          {errorContrasena !== '' && (
            <View style={estilos.filaError}>
              <Feather name="alert-circle" size={14} color={colores.peligro} />
              <Text style={estilos.textoError}>{errorContrasena}</Text>
            </View>
          )}

          <View style={estilos.filaOpciones}>
            <Pressable style={estilos.recordarme} onPress={() => setRecordarme(!recordarme)}>
              <View style={[estilos.casilla, recordarme && estilos.casillaMarcada]}>
                {recordarme && <Feather name="check" size={16} color={colores.textoSobreMarca} />}
              </View>
              <Text style={estilos.textoRecordarme}>Recordarme</Text>
            </Pressable>
            <Pressable onPress={recuperarContrasena}>
              <Text style={estilos.enlace}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              estilos.botonPrincipal,
              !formularioCompleto && estilos.botonDeshabilitado,
              pressed && estilos.presionado,
            ]}
            onPress={iniciarSesion}
            disabled={cargando || !formularioCompleto}
          >
            {cargando ? (
              <View style={estilos.filaCargando}>
                <ActivityIndicator color={colores.textoSobreMarca} />
                <Text style={estilos.textoBotonPrincipal}>Ingresando...</Text>
              </View>
            ) : (
              <Text
                style={[estilos.textoBotonPrincipal, !formularioCompleto && estilos.textoBotonDeshabilitado]}
              >
                Iniciar sesión
              </Text>
            )}
          </Pressable>

          {cargando ? (
            <Text style={estilos.textoVerificando}>Un momento, estamos verificando tus datos.</Text>
          ) : (
            <>
              <View style={estilos.separador}>
                <View style={estilos.linea} />
                <Text style={estilos.textoSeparador}>o</Text>
                <View style={estilos.linea} />
              </View>

              <Pressable
                style={({ pressed }) => [estilos.botonSocial, estilos.botonGoogle, pressed && estilos.presionado]}
                onPress={() => avisarProximamente('Google')}
              >
                <FontAwesome name="google" size={20} color="#4285F4" />
                <Text style={[estilos.textoBotonSocial, estilos.textoGoogle]}>Continuar con Google</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [estilos.botonSocial, estilos.botonApple, pressed && estilos.presionado]}
                onPress={() => avisarProximamente('Apple')}
              >
                <FontAwesome name="apple" size={22} color="#FFFFFF" />
                <Text style={[estilos.textoBotonSocial, estilos.textoApple]}>Continuar con Apple</Text>
              </Pressable>
            </>
          )}

          <View style={estilos.espaciador} />

          <View style={estilos.filaRegistro}>
            <Text style={estilos.textoPie}>¿No tenés cuenta? </Text>
            <Pressable onPress={() => navigation.navigate('Registro')}>
              <Text style={estilos.enlaceRegistro}>Registrate</Text>
            </Pressable>
          </View>

          {!cargando && (
            <Text style={estilos.legal}>
              Al continuar aceptás los <Text style={estilos.subrayado}>Términos y Condiciones</Text> y la{' '}
              <Text style={estilos.subrayado}>Política de privacidad</Text>.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    barraSuperior: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chipInvitado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 38,
      paddingHorizontal: 16,
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
    marca: {
      alignItems: 'center',
      marginTop: 8,
    },
    logo: {
      width: 92,
      height: 95,
    },
    lomitas: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      letterSpacing: 4,
      color: c.textoSecundario,
      marginTop: 6,
    },
    titulo: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 40,
      color: c.titulo,
      textAlign: 'center',
      marginTop: 24,
    },
    subtitulo: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      color: c.textoSecundario,
      textAlign: 'center',
      marginBottom: 8,
    },
    etiqueta: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
      color: c.texto,
      marginTop: 16,
      marginBottom: 8,
    },
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 52,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    campoActivo: {
      borderColor: c.marca,
      backgroundColor: c.superficieActiva,
    },
    campoConError: {
      borderColor: c.peligro,
    },
    entrada: {
      flex: 1,
      height: '100%',
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      color: c.texto,
    },
    filaError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    textoError: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      color: c.peligro,
    },
    ayuda: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      color: c.textoSecundario,
      marginTop: 6,
    },
    filaOpciones: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
    },
    recordarme: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    casilla: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    casillaMarcada: {
      borderColor: c.marca,
      backgroundColor: c.marca,
    },
    textoRecordarme: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: c.texto,
    },
    enlace: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: c.marca,
      textDecorationLine: 'underline',
    },
    botonPrincipal: {
      height: 54,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    botonDeshabilitado: {
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
    },
    presionado: {
      opacity: 0.85,
    },
    filaCargando: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    textoBotonPrincipal: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.textoSobreMarca,
    },
    textoBotonDeshabilitado: {
      color: c.textoTenue,
    },
    textoVerificando: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      color: c.textoSecundario,
      textAlign: 'center',
      marginTop: 12,
    },
    separador: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginVertical: 20,
    },
    linea: {
      flex: 1,
      height: 1,
      backgroundColor: c.divisor,
    },
    textoSeparador: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      color: c.textoSecundario,
    },
    botonSocial: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 12,
    },
    botonGoogle: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E6E2D8',
    },
    botonApple: {
      backgroundColor: c.fondoApple,
      borderColor: c.bordeApple,
    },
    textoBotonSocial: {
      fontFamily: 'Inter_500Medium',
      fontSize: 16,
    },
    textoGoogle: {
      color: '#161616',
    },
    textoApple: {
      color: '#FFFFFF',
    },
    espaciador: {
      flex: 1,
    },
    filaRegistro: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    textoPie: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      color: c.textoSecundario,
    },
    enlaceRegistro: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: c.marca,
      textDecorationLine: 'underline',
    },
    legal: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 19,
      color: c.textoTenue,
      textAlign: 'center',
      marginTop: 12,
    },
    subrayado: {
      textDecorationLine: 'underline',
    },
  });
}
