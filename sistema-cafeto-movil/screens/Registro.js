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
import DateTimePicker from '@react-native-community/datetimepicker';
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
import ModalLegal from '../src/componentes/ModalLegal';
import { aIso, formatearFechaLarga } from '../src/utilidades/formato';
import { limpiar } from '../src/utilidades/texto';
import {
  filtrarCorreo,
  filtrarDni,
  filtrarNombre,
  filtrarTelefono,
  formatearTelefonoGuardado,
  medirFortaleza,
  validarCorreo,
  validarDni,
  validarFechaNacimiento,
  validarNombrePersona,
  validarTelefono,
} from '../src/utilidades/validaciones';

function mensajeDelEnvio(error) {
  if (error?.code === 'auth/too-many-requests') {
    return 'Tu cuenta quedó creada, pero se pidieron muchos correos seguidos desde esta red. Esperá unos minutos y tocá «Reenviar enlace».';
  }
  if (error?.code === 'auth/quota-exceeded') {
    return 'Tu cuenta quedó creada, pero hoy ya se mandaron todos los correos que permite el sistema. Probá mañana con «Reenviar enlace».';
  }
  if (error?.code === 'auth/network-request-failed') {
    return 'Tu cuenta quedó creada, pero se cortó la conexión. Revisala y tocá «Reenviar enlace».';
  }
  return `Tu cuenta quedó creada, pero el correo de verificación no salió. Tocá «Reenviar enlace».

Código: ${error?.code ?? 'desconocido'}`;
}

export default function Registro({ navigation }) {
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repetir, setRepetir] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPromociones, setAceptaPromociones] = useState(false);
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [correoYaRegistrado, setCorreoYaRegistrado] = useState(false);
  const [creando, setCreando] = useState(false);
  const [legal, setLegal] = useState(null);
  const enviando = useRef(false);
  const montado = useRef(true);

  const { tema, colores, isotipo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const fortaleza = medirFortaleza(contrasena);
  const colorFortaleza =
    fortaleza.puntaje === 4 ? colores.exito : fortaleza.segura ? colores.marca : colores.peligro;
  const coinciden = repetir !== '' && repetir === contrasena;
  const paso1Completo =
    nombre.trim() !== '' && apellido.trim() !== '' && correo.trim() !== '' && contrasena !== '' && repetir !== '';

  const limpiarError = (campo) => {
    setErrores((anteriores) => ({ ...anteriores, [campo]: '' }));
  };

  const alCambiar = (campo, setter) => (texto) => {
    setter(texto);
    limpiarError(campo);
    setTocados((anteriores) => ({ ...anteriores, [campo]: false }));
    if (campo === 'correo') setCorreoYaRegistrado(false);
  };

  const validarFormato = (campo) => {
    switch (campo) {
      case 'nombre':
        return nombre.trim() ? validarNombrePersona(nombre, 'nombre') : '';
      case 'apellido':
        return apellido.trim() ? validarNombrePersona(apellido, 'apellido') : '';
      case 'correo':
        return validarCorreo(correo);
      case 'contrasena':
        return contrasena && !fortaleza.segura ? 'Usá 8 caracteres o más, con mayúsculas, minúsculas y un número.' : '';
      case 'repetir':
        return repetir && repetir !== contrasena ? 'Las contraseñas no coinciden.' : '';
      case 'telefono':
        return validarTelefono(telefono);
      case 'dni':
        return validarDni(dni);
      default:
        return '';
    }
  };

  const salirDe = (campo) => () => {
    const revisar = campo === 'contrasena' && tocados.repetir ? [campo, 'repetir'] : [campo];
    setTocados((anteriores) => ({ ...anteriores, ...Object.fromEntries(revisar.map((c) => [c, true])) }));
    setErrores((anteriores) => ({
      ...anteriores,
      ...Object.fromEntries(revisar.map((c) => [c, validarFormato(c)])),
    }));
  };

  const mostrarValido = (campo, valor) => Boolean(tocados[campo] && valor.trim() && !errores[campo]);

  const validarPaso1 = () => {
    const nuevos = {};
    setTocados((anteriores) => ({
      ...anteriores,
      nombre: true,
      apellido: true,
      correo: true,
      contrasena: true,
      repetir: true,
    }));

    const errorNombre = validarNombrePersona(nombre, 'nombre');
    if (errorNombre) nuevos.nombre = errorNombre;

    const errorApellido = validarNombrePersona(apellido, 'apellido');
    if (errorApellido) nuevos.apellido = errorApellido;

    const errorCorreo = validarCorreo(correo, { obligatorio: true });
    if (errorCorreo) nuevos.correo = errorCorreo;

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

    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) nuevos.telefono = errorTelefono;

    const errorDni = validarDni(dni);
    if (errorDni) nuevos.dni = errorDni;

    if (!errorTelefono && !errorDni && !limpiar(telefono) && !limpiar(dni)) {
      nuevos.telefono = 'Cargá tu teléfono o tu DNI: con uno de los dos te encuentran en la caja.';
    }

    const errorFecha = validarFechaNacimiento(fechaNacimiento);
    if (errorFecha) nuevos.fecha = errorFecha;

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
    switch (error?.code) {
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
        avisar('error', 'Error', `No pudimos crear la cuenta.\n\nCódigo: ${error?.code ?? 'desconocido'}`);
    }
  };

  const crearCuenta = async () => {
    if (enviando.current || !validarPaso2()) return;

    enviando.current = true;
    setCreando(true);
    try {
      const credencial = await createUserWithEmailAndPassword(auth, correo.trim(), contrasena);
      await updateProfile(credencial.user, { displayName: `${limpiar(nombre)} ${limpiar(apellido)}` }).catch(() => null);
      await AsyncStorage.setItem(
        `cafeto:perfil:${credencial.user.uid}`,
        JSON.stringify({
          nombre: limpiar(nombre),
          apellido: limpiar(apellido),
          telefono: formatearTelefonoGuardado(telefono),
          dni: limpiar(dni) || null,
          fechaNacimiento: aIso(fechaNacimiento),
          aceptaPromociones,
        })
      ).catch(() => null);
      try {
        await sendEmailVerification(credencial.user);
      } catch (problema) {
        avisar('advertencia', 'No pudimos mandarte el correo', mensajeDelEnvio(problema));
      }
    } catch (error) {
      enviando.current = false;
      if (!montado.current) return;
      setCreando(false);
      mostrarErrorDeRegistro(error);
    }
  };

  const iniciarSesionConEseCorreo = () => {
    navigation.replace('Login', { correo: correo.trim() });
  };

  const recuperarContrasena = async () => {
    try {
      await sendPasswordResetEmail(auth, correo.trim());
      if (montado.current) {
        avisar('exito', 'Revisá tu correo', `Te mandamos un enlace a ${correo.trim()} para que elijas una contraseña nueva.`);
      }
    } catch (error) {
      if (montado.current) {
        avisar('error', 'Error', `No pudimos enviar el correo.\n\nCódigo: ${error?.code ?? 'desconocido'}`);
      }
    }
  };

  const usarOtroCorreo = () => {
    setCorreo('');
    setCorreoYaRegistrado(false);
    limpiarError('correo');
  };

  const alternarTerminos = () => {
    setAceptaTerminos((actual) => !actual);
    limpiarError('terminos');
  };

  const pie = (
    <>
      <View style={estilos.filaPie}>
        <Text style={estilos.textoPie}>¿Ya tenés cuenta? </Text>
        <Pressable onPress={() => navigation.replace('Login')} disabled={creando}>
          <Text style={[estilos.textoPie, estilos.enlace]}>Iniciá sesión</Text>
        </Pressable>
      </View>
      <Pressable
        style={estilos.filaAyuda}
        onPress={() => navigation.navigate('Ayuda')}
        hitSlop={8}
        disabled={creando}
      >
        <Text style={[estilos.textoAyudaPie, estilos.enlace]}>¿Tenés problemas para ingresar?</Text>
      </Pressable>
    </>
  );

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                  alCambiar={alCambiar('nombre', (texto) => setNombre(filtrarNombre(texto)))}
                  alSalir={salirDe('nombre')}
                  error={errores.nombre ?? ''}
                  valido={mostrarValido('nombre', nombre)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={50}
                />
                <CampoTexto
                  estiloContenedor={estilos.mitad}
                  etiqueta="Apellido"
                  placeholder="Montes"
                  valor={apellido}
                  alCambiar={alCambiar('apellido', (texto) => setApellido(filtrarNombre(texto)))}
                  alSalir={salirDe('apellido')}
                  error={errores.apellido ?? ''}
                  valido={mostrarValido('apellido', apellido)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="family-name"
                  textContentType="familyName"
                  maxLength={50}
                />
              </View>

              <CampoTexto
                etiqueta="Correo electrónico"
                icono="mail"
                placeholder="tunombre@correo.com"
                valor={correo}
                alCambiar={alCambiar('correo', (texto) => setCorreo(filtrarCorreo(texto)))}
                alSalir={salirDe('correo')}
                error={errores.correo ?? ''}
                ayudaAlEnfocar="Vas a entrar con este correo y te mandamos ahí el enlace de verificación."
                valido={!correoYaRegistrado && mostrarValido('correo', correo)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
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
                    alSalir={salirDe('contrasena')}
                    error={errores.contrasena ?? ''}
                    valido={mostrarValido('contrasena', contrasena)}
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
                              numero <= fortaleza.puntaje && { backgroundColor: colorFortaleza },
                            ]}
                          />
                        ))}
                      </View>
                      <View style={estilos.filaFortaleza}>
                        <Text style={estilos.textoFortaleza}>
                          Fortaleza:{' '}
                          <Text style={[estilos.nivelFortaleza, { color: colorFortaleza }]}>{fortaleza.nivel}</Text>
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
                    alSalir={salirDe('repetir')}
                    error={errores.repetir ?? ''}
                    mensajeExito={tocados.repetir && coinciden ? 'Las contraseñas coinciden' : ''}
                    valido={tocados.repetir && coinciden}
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
                    <Text style={[estilos.textoBotonPrincipal, !paso1Completo && estilos.textoBotonDeshabilitado]}>
                      Continuar
                    </Text>
                  </Pressable>

                  <View style={estilos.espaciador} />
                  {pie}
                </>
              )}
            </>
          ) : (
            <>
              <Text style={estilos.titulo}>Últimos datos</Text>
              <Text style={estilos.subtitulo}>
                Con tu teléfono o tu DNI te encontramos en la caja para sumarte puntos. Cargá al menos uno.
              </Text>

              <CampoTexto
                etiqueta="Teléfono"
                icono="smartphone"
                prefijo={
                  <View style={estilos.prefijo}>
                    <Text style={estilos.pais}>AR</Text>
                    <Text style={estilos.codigoPais}>+54</Text>
                  </View>
                }
                placeholder="387 000 0000"
                valor={telefono}
                alCambiar={alCambiar('telefono', (texto) => setTelefono(filtrarTelefono(texto)))}
                alSalir={salirDe('telefono')}
                error={errores.telefono ?? ''}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={20}
              />

              <CampoTexto
                etiqueta="DNI"
                icono="credit-card"
                placeholder="30123456"
                valor={dni}
                alCambiar={alCambiar('dni', (texto) => setDni(filtrarDni(texto)))}
                alSalir={salirDe('dni')}
                error={errores.dni ?? ''}
                ayuda="Sin puntos. Si no querés dar tu teléfono, con el DNI alcanza."
                keyboardType="number-pad"
                maxLength={8}
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
                  {fechaNacimiento ? formatearFechaLarga(fechaNacimiento) : 'Elegí tu fecha'}
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
                <View style={estilos.filaCasilla}>
                  <Pressable
                    onPress={alternarTerminos}
                    hitSlop={8}
                    disabled={creando}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: aceptaTerminos }}
                    accessibilityLabel="Aceptar términos y política de privacidad"
                  >
                    <View style={[estilos.casilla, aceptaTerminos && estilos.casillaMarcada]}>
                      {aceptaTerminos && <Feather name="check" size={16} color={colores.textoSobreMarca} />}
                    </View>
                  </Pressable>
                  <Text style={estilos.textoCasilla}>
                    <Text onPress={!creando ? alternarTerminos : undefined}>Acepto los </Text>
                    <Text style={estilos.enlace} onPress={() => setLegal('terminos')}>
                      Términos y Condiciones
                    </Text>
                    <Text onPress={!creando ? alternarTerminos : undefined}> y la </Text>
                    <Text style={estilos.enlace} onPress={() => setLegal('privacidad')}>
                      Política de privacidad
                    </Text>
                  </Text>
                </View>

                <Pressable
                  style={estilos.filaCasilla}
                  onPress={() => setAceptaPromociones(!aceptaPromociones)}
                  disabled={creando}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: aceptaPromociones }}
                >
                  <View style={[estilos.casilla, aceptaPromociones && estilos.casillaMarcada]}>
                    {aceptaPromociones && <Feather name="check" size={16} color={colores.textoSobreMarca} />}
                  </View>
                  <Text style={estilos.textoCasilla}>Quiero recibir promociones y novedades por correo</Text>
                </Pressable>

                {errores.terminos ? (
                  <View style={estilos.filaMensaje}>
                    <Feather name="alert-circle" size={14} color={colores.peligro} />
                    <Text style={estilos.textoError}>{errores.terminos}</Text>
                  </View>
                ) : null}
              </View>

              <View style={estilos.espaciador} />

              <Pressable
                style={({ pressed }) => [
                  estilos.botonPrincipal,
                  !creando && !aceptaTerminos && estilos.botonDeshabilitado,
                  pressed && estilos.presionado,
                ]}
                onPress={crearCuenta}
                disabled={creando || !aceptaTerminos}
              >
                {creando ? (
                  <View style={estilos.filaCargando}>
                    <ActivityIndicator color={colores.textoSobreMarca} />
                    <Text style={estilos.textoBotonPrincipal}>Creando cuenta...</Text>
                  </View>
                ) : (
                  <Text style={[estilos.textoBotonPrincipal, !aceptaTerminos && estilos.textoBotonDeshabilitado]}>
                    Crear cuenta
                  </Text>
                )}
              </Pressable>
              {pie}
            </>
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
    filaAyuda: {
      alignSelf: 'center',
      marginTop: 12,
    },
    textoAyudaPie: {
      fontSize: 14,
    },
  });
}
