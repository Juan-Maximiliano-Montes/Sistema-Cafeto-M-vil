import React, { useMemo, useState } from 'react';
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
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import CampoTexto from '../src/componentes/CampoTexto';

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
const NIVELES = ['muy débil', 'débil', 'regular', 'buena', 'fuerte'];

function medirFortaleza(clave) {
  const pruebas = [
    { cumple: clave.length >= 8, consejo: 'Usá 8 caracteres o más' },
    { cumple: /[a-z]/.test(clave) && /[A-Z]/.test(clave), consejo: 'Combiná mayúsculas y minúsculas' },
    { cumple: /\d/.test(clave), consejo: 'Sumá un número' },
    { cumple: /[^A-Za-z0-9]/.test(clave), consejo: 'Sumá un símbolo' },
  ];
  const puntaje = pruebas.filter((prueba) => prueba.cumple).length;
  const pendiente = pruebas.find((prueba) => !prueba.cumple);

  return {
    puntaje,
    nivel: NIVELES[puntaje],
    consejo: pendiente ? pendiente.consejo : 'Excelente',
    segura: pruebas[0].cumple && pruebas[1].cumple && pruebas[2].cumple,
  };
}

function calcularEdad(nacimiento) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const yaCumplio =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!yaCumplio) edad -= 1;
  return edad;
}

function formatearFecha(fecha) {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

export default function Registro({ navigation }) {
  const [fuentesCargadas] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repetir, setRepetir] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPromociones, setAceptaPromociones] = useState(false);
  const [errores, setErrores] = useState({});
  const [correoYaRegistrado, setCorreoYaRegistrado] = useState(false);
  const [creando, setCreando] = useState(false);

  const { tema, colores, isotipo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const fortaleza = medirFortaleza(contrasena);
  const coinciden = repetir !== '' && repetir === contrasena;
  const paso1Completo =
    nombre.trim() !== '' && apellido.trim() !== '' && correo.trim() !== '' && contrasena !== '' && repetir !== '';

  const limpiarError = (campo) => {
    setErrores((anteriores) => ({ ...anteriores, [campo]: '' }));
  };

  const alCambiar = (campo, setter) => (texto) => {
    setter(texto);
    limpiarError(campo);
    if (campo === 'correo') setCorreoYaRegistrado(false);
  };

  const validarNombre = (valor, etiqueta) => {
    if (!valor.trim()) return `Ingresá tu ${etiqueta}.`;
    if (!SOLO_LETRAS.test(valor.trim())) return 'Usá solo letras.';
    return '';
  };

  const validarPaso1 = () => {
    const nuevos = {};

    const errorNombre = validarNombre(nombre, 'nombre');
    if (errorNombre) nuevos.nombre = errorNombre;

    const errorApellido = validarNombre(apellido, 'apellido');
    if (errorApellido) nuevos.apellido = errorApellido;

    if (!correo.includes('@')) {
      nuevos.correo = 'Falta la @. Ejemplo: maxi@cafeto.com.ar';
    } else if (!FORMATO_CORREO.test(correo.trim())) {
      nuevos.correo = 'Falta el dominio. Ejemplo: maxi@cafeto.com.ar';
    }

    if (!fortaleza.segura) {
      nuevos.contrasena = 'Usá 8 caracteres o más, con mayúsculas, minúsculas y un número.';
    }

    if (repetir !== contrasena) {
      nuevos.repetir = 'Las contraseñas no coinciden.';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const validarPaso2 = () => {
    const nuevos = {};

    if (telefono.trim()) {
      const digitos = telefono.replace(/\D/g, '');
      if (digitos.length < 7 || digitos.length > 15) {
        nuevos.telefono = 'El teléfono son entre 7 y 15 dígitos.';
      }
    }

    if (fechaNacimiento) {
      const edad = calcularEdad(fechaNacimiento);
      if (edad < 14) nuevos.fecha = 'Tenés que tener al menos 14 años.';
      if (edad > 100) nuevos.fecha = 'Revisá el año de nacimiento.';
    }

    if (!aceptaTerminos) {
      nuevos.terminos = 'Para crear la cuenta tenés que aceptar los términos.';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const continuar = () => {
    if (validarPaso1()) setPaso(2);
  };

  const volver = () => {
    if (paso === 2) {
      setPaso(1);
    } else {
      navigation.goBack();
    }
  };

  const elegirFecha = (evento, fecha) => {
    if (Platform.OS === 'android') setMostrarCalendario(false);
    if (evento.type === 'set' && fecha) {
      setFechaNacimiento(fecha);
      limpiarError('fecha');
    }
  };

  const mostrarErrorDeRegistro = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        setCorreoYaRegistrado(true);
        setErrores({ correo: 'Ese correo ya tiene una cuenta en Cafeto.' });
        setPaso(1);
        break;
      case 'auth/invalid-email':
        setErrores({ correo: 'El formato del correo no es válido.' });
        setPaso(1);
        break;
      case 'auth/weak-password':
        setErrores({ contrasena: 'La contraseña es demasiado débil.' });
        setPaso(1);
        break;
      case 'auth/configuration-not-found':
      case 'auth/operation-not-allowed':
        avisar('advertencia', 'Registro no disponible', 'Falta habilitar el acceso con correo y contraseña en Firebase.');
        break;
      case 'auth/network-request-failed':
        avisar('error', 'Sin conexión', 'Revisá el wifi o los datos del teléfono.');
        break;
      default:
        avisar('error', 'Error', `No pudimos crear la cuenta.\n\nCódigo: ${error.code ?? 'desconocido'}`);
    }
  };

  const crearCuenta = async () => {
    if (!validarPaso2()) return;

    setCreando(true);
    try {
      const credencial = await createUserWithEmailAndPassword(auth, correo.trim(), contrasena);
      await updateProfile(credencial.user, { displayName: `${nombre.trim()} ${apellido.trim()}` });
      await AsyncStorage.setItem(
        `cafeto:perfil:${credencial.user.uid}`,
        JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim() ? `+54 ${telefono.trim()}` : null,
          fechaNacimiento: fechaNacimiento ? fechaNacimiento.toISOString().slice(0, 10) : null,
          aceptaPromociones,
        })
      );
      await sendEmailVerification(credencial.user);
    } catch (error) {
      setCreando(false);
      mostrarErrorDeRegistro(error);
    }
  };

  const iniciarSesionConEseCorreo = () => {
    navigation.popTo('Login', { correo: correo.trim() });
  };

  const recuperarContrasena = async () => {
    try {
      await sendPasswordResetEmail(auth, correo.trim());
      avisar('exito', 'Revisá tu correo', `Te mandamos un enlace a ${correo.trim()} para que elijas una contraseña nueva.`);
    } catch (error) {
      avisar('error', 'Error', `No pudimos enviar el correo.\n\nCódigo: ${error.code ?? 'desconocido'}`);
    }
  };

  const usarOtroCorreo = () => {
    setCorreo('');
    setCorreoYaRegistrado(false);
    limpiarError('correo');
  };

  const avisarProximamente = (proveedor) => {
    avisar('advertencia', 'Próximamente', `El registro con ${proveedor} todavía no está disponible.`);
  };

  if (!fuentesCargadas) {
    return (
      <View style={[estilos.pantalla, estilos.centrado]}>
        <ActivityIndicator size="large" color={colores.marca} />
      </View>
    );
  }

  const casilla = (marcada, alTocar, contenido) => (
    <Pressable style={estilos.filaCasilla} onPress={alTocar}>
      <View style={[estilos.casilla, marcada && estilos.casillaMarcada]}>
        {marcada && <Feather name="check" size={16} color={colores.textoSobreMarca} />}
      </View>
      <Text style={estilos.textoCasilla}>{contenido}</Text>
    </Pressable>
  );

  const pie = (
    <View style={estilos.filaPie}>
      <Text style={estilos.textoPie}>¿Ya tenés cuenta? </Text>
      <Pressable onPress={() => navigation.popTo('Login')}>
        <Text style={[estilos.textoPie, estilos.enlace]}>Iniciá sesión</Text>
      </Pressable>
    </View>
  );

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
          <View style={estilos.encabezado}>
            <Pressable onPress={volver} hitSlop={10} disabled={creando}>
              <Feather name="arrow-left" size={24} color={colores.texto} />
            </Pressable>
            <Image source={isotipo} style={estilos.isotipo} resizeMode="contain" />
            <Text style={estilos.textoPaso}>PASO {paso} DE 2</Text>
            <Pressable style={estilos.botonTema} onPress={cambiarTema}>
              <Ionicons name="contrast" size={20} color={colores.texto} />
            </Pressable>
          </View>

          <View style={estilos.progreso}>
            <View style={[estilos.segmento, estilos.segmentoActivo]} />
            <View style={[estilos.segmento, paso === 2 && estilos.segmentoActivo]} />
          </View>

          {paso === 1 ? (
            <>
              <Text style={estilos.titulo}>Creá tu cuenta</Text>

              <View style={estilos.fila}>
                <CampoTexto
                  estiloContenedor={estilos.mitad}
                  etiqueta="Nombre"
                  placeholder="Juan"
                  valor={nombre}
                  alCambiar={alCambiar('nombre', setNombre)}
                  error={errores.nombre ?? ''}
                  valido={validarNombre(nombre, 'nombre') === ''}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  maxLength={50}
                />
                <CampoTexto
                  estiloContenedor={estilos.mitad}
                  etiqueta="Apellido"
                  placeholder="Montes"
                  valor={apellido}
                  alCambiar={alCambiar('apellido', setApellido)}
                  error={errores.apellido ?? ''}
                  valido={validarNombre(apellido, 'apellido') === ''}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  maxLength={50}
                />
              </View>

              <CampoTexto
                etiqueta="Correo electrónico"
                icono="mail"
                placeholder="tunombre@correo.com"
                valor={correo}
                alCambiar={alCambiar('correo', setCorreo)}
                error={errores.correo ?? ''}
                ayudaAlEnfocar="Vas a entrar con este correo y te mandamos ahí el enlace de verificación."
                valido={!correoYaRegistrado && FORMATO_CORREO.test(correo.trim())}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />

              {correoYaRegistrado ? (
                <>
                  <View style={estilos.aviso}>
                    <Feather name="info" size={18} color={colores.texto} />
                    <View style={estilos.textosAviso}>
                      <Text style={estilos.tituloAviso}>¿Sos vos?</Text>
                      <Text style={estilos.detalleAviso}>
                        Podés entrar con esa cuenta, o recuperar la contraseña si no te acordás.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
                    onPress={iniciarSesionConEseCorreo}
                  >
                    <Text style={estilos.textoBotonPrincipal}>Iniciar sesión con ese correo</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
                    onPress={recuperarContrasena}
                  >
                    <Text style={estilos.textoBotonSecundario}>Recuperar contraseña</Text>
                  </Pressable>

                  <View style={estilos.espaciador} />

                  <View style={estilos.filaPie}>
                    <Text style={estilos.textoPie}>¿Te equivocaste? </Text>
                    <Pressable onPress={usarOtroCorreo}>
                      <Text style={[estilos.textoPie, estilos.enlace]}>Usá otro correo</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <CampoTexto
                    etiqueta="Contraseña"
                    icono="lock"
                    placeholder="Mínimo 8 caracteres"
                    valor={contrasena}
                    alCambiar={alCambiar('contrasena', setContrasena)}
                    error={errores.contrasena ?? ''}
                    seguro
                    autoCapitalize="none"
                    autoComplete="new-password"
                  />
                  {contrasena !== '' && (
                    <>
                      <View style={estilos.barrasFortaleza}>
                        {[1, 2, 3, 4].map((numero) => (
                          <View
                            key={numero}
                            style={[
                              estilos.barraFortaleza,
                              numero <= fortaleza.puntaje && {
                                backgroundColor: fortaleza.segura ? colores.marca : colores.peligro,
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <View style={estilos.filaFortaleza}>
                        <Text style={estilos.textoFortaleza}>
                          Fortaleza: <Text style={estilos.nivelFortaleza}>{fortaleza.nivel}</Text>
                        </Text>
                        <Text style={estilos.textoFortaleza}>{fortaleza.consejo}</Text>
                      </View>
                    </>
                  )}

                  <CampoTexto
                    etiqueta="Repetir contraseña"
                    icono="lock"
                    placeholder="Repetí la contraseña"
                    valor={repetir}
                    alCambiar={alCambiar('repetir', setRepetir)}
                    error={errores.repetir ?? ''}
                    mensajeExito={coinciden ? 'Las contraseñas coinciden' : ''}
                    valido={coinciden}
                    seguro
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="next"
                    onSubmitEditing={continuar}
                  />

                  <Pressable
                    style={({ pressed }) => [
                      estilos.botonPrincipal,
                      !paso1Completo && estilos.botonDeshabilitado,
                      pressed && estilos.presionado,
                    ]}
                    onPress={continuar}
                    disabled={!paso1Completo}
                  >
                    <Text
                      style={[estilos.textoBotonPrincipal, !paso1Completo && estilos.textoBotonDeshabilitado]}
                    >
                      Continuar
                    </Text>
                  </Pressable>

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

                  <View style={estilos.espaciador} />
                  {pie}
                </>
              )}
            </>
          ) : (
            <>
              <Text style={estilos.titulo}>Últimos datos</Text>
              <Text style={estilos.subtitulo}>Opcionales, pero nos ayudan a reconocerte en el salón.</Text>

              <CampoTexto
                etiqueta="Teléfono"
                opcional
                icono="smartphone"
                prefijo={
                  <View style={estilos.prefijo}>
                    <Text style={estilos.pais}>AR</Text>
                    <Text style={estilos.codigoPais}>+54</Text>
                  </View>
                }
                placeholder="387 000 0000"
                valor={telefono}
                alCambiar={alCambiar('telefono', setTelefono)}
                error={errores.telefono ?? ''}
                ayuda="Con tu teléfono también te encontramos en la caja para sumarte puntos."
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={20}
              />

              <Text style={estilos.etiqueta}>
                Fecha de nacimiento<Text style={estilos.opcional}> · opcional</Text>
              </Text>
              <Pressable
                style={[estilos.selectorFecha, errores.fecha && estilos.campoConError]}
                onPress={() => setMostrarCalendario(true)}
              >
                <Feather name="calendar" size={20} color={colores.textoSecundario} />
                <Text style={[estilos.textoFecha, !fechaNacimiento && estilos.textoFechaVacia]}>
                  {fechaNacimiento ? formatearFecha(fechaNacimiento) : 'Elegí tu fecha'}
                </Text>
                <Feather name="chevron-down" size={20} color={colores.textoSecundario} />
              </Pressable>
              {errores.fecha ? (
                <View style={estilos.filaMensaje}>
                  <Feather name="alert-circle" size={14} color={colores.peligro} />
                  <Text style={estilos.textoError}>{errores.fecha}</Text>
                </View>
              ) : (
                <Text style={estilos.ayuda}>Te regalamos un café en tu cumpleaños.</Text>
              )}

              {mostrarCalendario && (
                <DateTimePicker
                  value={fechaNacimiento ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={elegirFecha}
                  themeVariant={tema === 'oscuro' ? 'dark' : 'light'}
                  locale="es-AR"
                />
              )}
              {mostrarCalendario && Platform.OS === 'ios' && (
                <Pressable style={estilos.botonListo} onPress={() => setMostrarCalendario(false)}>
                  <Text style={[estilos.textoPie, estilos.enlace]}>Listo</Text>
                </Pressable>
              )}

              <View style={estilos.casillas}>
                {casilla(
                  aceptaTerminos,
                  () => {
                    setAceptaTerminos(!aceptaTerminos);
                    limpiarError('terminos');
                  },
                  <>
                    Acepto los <Text style={estilos.enlace}>Términos y Condiciones</Text> y la{' '}
                    <Text style={estilos.enlace}>Política de privacidad</Text>
                  </>
                )}
                {casilla(
                  aceptaPromociones,
                  () => setAceptaPromociones(!aceptaPromociones),
                  'Quiero recibir promociones y novedades por correo'
                )}
                {errores.terminos ? (
                  <View style={estilos.filaMensaje}>
                    <Feather name="alert-circle" size={14} color={colores.peligro} />
                    <Text style={estilos.textoError}>{errores.terminos}</Text>
                  </View>
                ) : null}
              </View>

              <View style={estilos.espaciador} />

              <Pressable
                style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
                onPress={crearCuenta}
                disabled={creando}
              >
                {creando ? (
                  <View style={estilos.filaCargando}>
                    <ActivityIndicator color={colores.textoSobreMarca} />
                    <Text style={estilos.textoBotonPrincipal}>Creando cuenta...</Text>
                  </View>
                ) : (
                  <Text style={estilos.textoBotonPrincipal}>Crear cuenta</Text>
                )}
              </Pressable>
              {pie}
            </>
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
    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    isotipo: {
      width: 34,
      height: 34,
    },
    textoPaso: {
      flex: 1,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      letterSpacing: 3,
      color: c.textoSecundario,
      textAlign: 'center',
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
    progreso: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    segmento: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borde,
    },
    segmentoActivo: {
      backgroundColor: c.marca,
    },
    titulo: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 38,
      color: c.titulo,
      marginTop: 20,
    },
    subtitulo: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 21,
      color: c.textoSecundario,
    },
    fila: {
      flexDirection: 'row',
      gap: 12,
    },
    mitad: {
      flex: 1,
    },
    etiqueta: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
      color: c.texto,
      marginTop: 16,
      marginBottom: 8,
    },
    opcional: {
      fontFamily: 'Inter_400Regular',
      color: c.textoTenue,
    },
    barrasFortaleza: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
    },
    barraFortaleza: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borde,
    },
    filaFortaleza: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    textoFortaleza: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      color: c.textoSecundario,
    },
    nivelFortaleza: {
      fontFamily: 'Inter_600SemiBold',
      color: c.marca,
    },
    aviso: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      marginTop: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.peligro,
      backgroundColor: c.fondoPeligro,
    },
    textosAviso: {
      flex: 1,
      gap: 4,
    },
    tituloAviso: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: c.texto,
    },
    detalleAviso: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textoSecundario,
    },
    prefijo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pais: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      color: c.textoSecundario,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: c.borde,
      overflow: 'hidden',
    },
    codigoPais: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.texto,
    },
    selectorFecha: {
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
    campoConError: {
      borderColor: c.peligro,
    },
    textoFecha: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      color: c.texto,
    },
    textoFechaVacia: {
      color: c.textoTenue,
    },
    filaMensaje: {
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
    botonListo: {
      alignSelf: 'flex-end',
      paddingVertical: 8,
    },
    casillas: {
      gap: 14,
      marginTop: 20,
    },
    filaCasilla: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
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
    textoCasilla: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
      color: c.texto,
    },
    enlace: {
      fontFamily: 'Inter_600SemiBold',
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
    textoBotonPrincipal: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.textoSobreMarca,
    },
    textoBotonDeshabilitado: {
      color: c.textoTenue,
    },
    botonSecundario: {
      height: 54,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
    textoBotonSecundario: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.texto,
    },
    presionado: {
      opacity: 0.85,
    },
    filaCargando: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
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
      minHeight: 16,
    },
    filaPie: {
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
  });
}
