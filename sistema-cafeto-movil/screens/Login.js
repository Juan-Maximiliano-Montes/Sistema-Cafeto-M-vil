import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import SinConexion from './SinConexion';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { mensajeDeError } from '../src/api/cliente';
import {
  filtrarCorreo,
  normalizarUsuarioEquipo,
  validarCorreo,
  validarUsuarioEquipo,
} from '../src/utilidades/validaciones';
import CampoTexto from '../src/componentes/CampoTexto';
import ModalLegal from '../src/componentes/ModalLegal';

const CLAVE_CORREO_RECORDADO = 'cafeto:correoRecordado';

function validarIdentificador(valor, { obligatorio = false } = {}) {
  const limpio = valor.trim();
  if (!limpio) return obligatorio ? 'Ingresá tu correo, usuario o DNI.' : '';
  if (limpio.includes('@')) return validarCorreo(limpio, { obligatorio });
  return validarUsuarioEquipo(limpio);
}

export default function Login({ navigation, route }) {
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordarme, setRecordarme] = useState(false);
  const [errorIdentificador, setErrorIdentificador] = useState('');
  const [errorContrasena, setErrorContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);
  const [legal, setLegal] = useState(null);
  const montado = useRef(true);

  const { colores, logo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const { entrarComoEquipo } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const formularioCompleto = identificador.trim() !== '' && contrasena !== '';
  const esModoCorreo = identificador.includes('@');

  useEffect(() => {
    montado.current = true;
    AsyncStorage.getItem(CLAVE_CORREO_RECORDADO)
      .then((guardado) => {
        if (montado.current && guardado) {
          setIdentificador((actual) => actual || guardado);
          setRecordarme(true);
        }
      })
      .catch(() => null);
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (route.params?.correo) {
      setIdentificador(route.params.correo);
      setErrorIdentificador('');
    }
  }, [route.params?.correo]);

  const cambiarIdentificador = (texto) => {
    setIdentificador(filtrarCorreo(texto));
    setErrorIdentificador('');
  };

  const cambiarContrasena = (texto) => {
    setContrasena(texto);
    setErrorContrasena('');
  };

  const salirDeIdentificador = () => {
    setErrorIdentificador(validarIdentificador(identificador));
  };

  const validarFormulario = () => {
    let esValido = true;

    const problemaIdentificador = validarIdentificador(identificador, { obligatorio: true });
    if (problemaIdentificador) {
      setErrorIdentificador(problemaIdentificador);
      esValido = false;
    }

    if (!contrasena) {
      setErrorContrasena('Ingresá tu contraseña.');
      esValido = false;
    }

    return esValido;
  };

  const guardarPreferenciaRecordarme = async () => {
    const guardado = recordarme
      ? AsyncStorage.setItem(CLAVE_CORREO_RECORDADO, identificador.trim())
      : AsyncStorage.removeItem(CLAVE_CORREO_RECORDADO);
    await guardado.catch(() => null);
  };

  const mostrarErrorDeFirebase = (error) => {
    switch (error?.code) {
      case 'auth/invalid-email':
        setErrorIdentificador('El formato del correo no es válido.');
        break;
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        setErrorContrasena('Los datos ingresados no coinciden. Revisalos y probá de nuevo.');
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
        avisar('error', 'Error', `No pudimos iniciar sesión.\n\nCódigo: ${error?.code ?? 'desconocido'}`);
    }
  };

  const esFaltaDeConexion = (error) => {
    if (error?.sinConexion) return true;
    const codigo = error?.code ?? '';
    const mensaje = error?.message ?? '';
    return (
      codigo === 'auth/network-request-failed' ||
      codigo === 'auth/internal-error' ||
      codigo === 'auth/timeout' ||
      /network|offline|failed to fetch|timeout|unreachable/i.test(mensaje)
    );
  };

  const iniciarSesion = async () => {
    if (cargando || !validarFormulario()) return;

    setCargando(true);
    try {
      await guardarPreferenciaRecordarme();
      if (esModoCorreo) {
        await signInWithEmailAndPassword(auth, identificador.trim(), contrasena);
      } else {
        await entrarComoEquipo(normalizarUsuarioEquipo(identificador), contrasena);
        avisar('exito', 'Listo', 'Entraste en modo equipo. Tus tareas están en la pestaña Gestión.');
      }
    } catch (error) {
      if (!montado.current) return;
      if (esFaltaDeConexion(error)) {
        setSinConexion(true);
      } else if (esModoCorreo) {
        mostrarErrorDeFirebase(error);
      } else if (error?.estado === 400 || error?.estado === 401) {
        setErrorContrasena('Los datos ingresados no coinciden. Revisalos y probá de nuevo.');
      } else {
        avisar('error', 'No pudimos iniciar sesión', mensajeDeError(error));
      }
    } finally {
      if (montado.current) setCargando(false);
    }
  };

  const recuperarContrasena = async () => {
    const limpio = identificador.trim();
    if (!limpio || !limpio.includes('@')) {
      setErrorIdentificador('Escribí el correo electrónico de tu cuenta para enviarte el enlace.');
      return;
    }
    const problemaCorreo = validarCorreo(limpio, { obligatorio: true });
    if (problemaCorreo) {
      setErrorIdentificador(problemaCorreo);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, limpio);
      if (montado.current) {
        avisar('exito', 'Revisá tu correo', `Te mandamos un enlace a ${limpio} para que elijas una contraseña nueva.`);
      }
    } catch (error) {
      if (montado.current) mostrarErrorDeFirebase(error);
    }
  };

  if (sinConexion) {
    return <SinConexion alReintentar={() => setSinConexion(false)} />;
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.barraSuperior}>
            <Pressable style={estilos.chipInvitado} onPress={() => navigation.goBack()} disabled={cargando}>
              <Feather name="chevron-left" size={16} color={colores.textoSecundario} />
              <Text style={estilos.textoChip}>Seguir mirando</Text>
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

          <CampoTexto
            etiqueta="Correo, usuario o DNI"
            icono={esModoCorreo ? 'mail' : 'user'}
            placeholder="ejemplo@correo.com o tu usuario"
            valor={identificador}
            alCambiar={cambiarIdentificador}
            alSalir={salirDeIdentificador}
            error={errorIdentificador}
            ayudaAlEnfocar="Ingresá el correo de tu cuenta, tu usuario o tu DNI."
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            returnKeyType="next"
            editable={!cargando}
            maxLength={254}
          />

          <CampoTexto
            etiqueta="Contraseña"
            icono="lock"
            placeholder="Tu contraseña"
            valor={contrasena}
            alCambiar={cambiarContrasena}
            error={errorContrasena}
            seguro
            autoCapitalize="none"
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={iniciarSesion}
            editable={!cargando}
          />

          <View style={estilos.filaOpciones}>
            <Pressable style={estilos.recordarme} onPress={() => setRecordarme(!recordarme)} disabled={cargando}>
              <View style={[estilos.casilla, recordarme && estilos.casillaMarcada]}>
                {recordarme && <Feather name="check" size={16} color={colores.textoSobreMarca} />}
              </View>
              <Text style={estilos.textoRecordarme}>Recordarme</Text>
            </Pressable>
            <Pressable onPress={recuperarContrasena} disabled={cargando}>
              <Text style={estilos.enlace}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              estilos.botonPrincipal,
              !cargando && !formularioCompleto && estilos.botonDeshabilitado,
              pressed && estilos.presionado,
            ]}
            onPress={iniciarSesion}
            disabled={cargando || !formularioCompleto}
            accessibilityRole="button"
          >
            {cargando ? (
              <View style={estilos.filaCargando}>
                <ActivityIndicator color={colores.textoSobreMarca} />
                <Text style={estilos.textoBotonPrincipal}>Iniciando sesión...</Text>
              </View>
            ) : (
              <Text style={[estilos.textoBotonPrincipal, !formularioCompleto && estilos.textoBotonDeshabilitado]}>
                Iniciar sesión
              </Text>
            )}
          </Pressable>

          {cargando ? <Text style={estilos.textoVerificando}>Un momento, estamos verificando tus datos.</Text> : null}

          <View style={estilos.espaciador} />

          <View style={estilos.filaRegistro}>
            <Text style={estilos.textoPie}>¿No tenés cuenta? </Text>
            <Pressable onPress={() => navigation.navigate('Registro')} disabled={cargando}>
              <Text style={estilos.enlaceRegistro}>Registrate</Text>
            </Pressable>
          </View>

          <Pressable
            style={estilos.filaAyuda}
            onPress={() => navigation.navigate('Ayuda')}
            disabled={cargando}
            hitSlop={8}
          >
            <Text style={estilos.enlace}>¿Tenés problemas para ingresar?</Text>
          </Pressable>

          {!cargando && (
            <Text style={estilos.legal}>
              Al continuar aceptás los{' '}
              <Text style={estilos.enlaceLegal} onPress={() => setLegal('terminos')}>
                Términos y Condiciones
              </Text>{' '}
              y la{' '}
              <Text style={estilos.enlaceLegal} onPress={() => setLegal('privacidad')}>
                Política de privacidad
              </Text>
              .
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalLegal visible={legal !== null} tipo={legal} alCerrar={() => setLegal(null)} />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: c.fondo,
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
    espaciador: {
      flex: 1,
      minHeight: 24,
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
    filaAyuda: {
      alignSelf: 'center',
      marginTop: 12,
    },
    legal: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 19,
      color: c.textoTenue,
      textAlign: 'center',
      marginTop: 12,
    },
    enlaceLegal: {
      fontFamily: 'Inter_600SemiBold',
      color: c.textoSecundario,
      textDecorationLine: 'underline',
    },
  });
}
