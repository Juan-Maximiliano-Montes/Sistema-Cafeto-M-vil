import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useSesion } from '../src/sesion/SesionContext';
import { coincide } from '../src/utilidades/texto';
import { filtrarCorreo, validarCorreo } from '../src/utilidades/validaciones';
import BarraVolver from '../src/componentes/BarraVolver';
import CampoTexto from '../src/componentes/CampoTexto';
import EstadoVacio from '../src/componentes/EstadoVacio';

const ACCIONES = {
  login: { texto: 'Ir a iniciar sesión', ruta: 'Login' },
  registro: { texto: 'Crear mi cuenta', ruta: 'Registro' },
};

const PROBLEMAS_CLIENTE = [
  {
    id: 'clave',
    icono: 'key-outline',
    titulo: 'Me olvidé la contraseña',
    pasos: [
      'Escribí el correo con el que te registraste y tocá «Mandarme el enlace».',
      'Abrí el correo de Cafeto y elegí una contraseña nueva. Si no lo ves, mirá en spam o promociones.',
      'Volvé a la app e iniciá sesión con la contraseña nueva.',
    ],
    restablecer: true,
  },
  {
    id: 'verificacion',
    icono: 'mail-unread-outline',
    titulo: 'No me llega el correo de verificación',
    pasos: [
      'Esperá un par de minutos: a veces tarda en llegar.',
      'Buscalo en spam, promociones o correo no deseado.',
      'En la pantalla «Revisá tu correo» tocá «Reenviar enlace». Se habilita al minuto.',
      'Si escribiste mal el correo, tocá «Corregilo» y registrate de nuevo.',
    ],
  },
  {
    id: 'registrado',
    icono: 'person-circle-outline',
    titulo: 'Me dice que el correo ya está registrado',
    pasos: [
      'Ya tenés una cuenta con ese correo, así que iniciá sesión.',
      'Si no te acordás la contraseña, pedí el enlace para cambiarla en «Me olvidé la contraseña».',
    ],
    accion: 'login',
  },
  {
    id: 'no-coinciden',
    icono: 'close-circle-outline',
    titulo: 'Me dice que los datos no coinciden',
    pasos: [
      'Revisá que el correo esté bien escrito y sin espacios.',
      'La contraseña distingue mayúsculas de minúsculas. Tocá el ojito para ver lo que escribiste.',
      'Si sigue sin funcionar, cambiala con «Me olvidé la contraseña».',
    ],
  },
  {
    id: 'intentos',
    icono: 'time-outline',
    titulo: 'Me dice «demasiados intentos»',
    pasos: [
      'Por seguridad, después de varios intentos fallidos se bloquea el ingreso por un rato.',
      'Esperá unos minutos y probá de nuevo, o cambiá la contraseña con el enlace.',
    ],
  },
  {
    id: 'conexion',
    icono: 'wifi-outline',
    titulo: 'La app no conecta',
    pasos: [
      'Revisá que tengas wifi o datos móviles.',
      'Abrí otra app o página para confirmar que hay internet.',
      'Cerrá la app y volvé a abrirla.',
    ],
  },
];

const PROBLEMAS_EQUIPO = [
  {
    id: 'equipo-clave',
    icono: 'key-outline',
    titulo: 'Me olvidé la contraseña',
    pasos: [
      'La contraseña del equipo no se cambia desde el celular.',
      'Pedile al administrador que te la restablezca desde la web: te va a dar una contraseña provisoria.',
      'Entrá primero a la web con la provisoria y elegí una nueva. Después usala en la app.',
    ],
  },
  {
    id: 'usuario',
    icono: 'person-outline',
    titulo: 'No sé cuál es mi usuario',
    pasos: [
      'Es el mismo usuario con el que entrás al sistema web del local.',
      'También podés entrar con tu DNI, con o sin puntos.',
      'Si no lo recordás, pedíselo al administrador: lo ve en la web, en Usuarios.',
    ],
  },
  {
    id: 'no-coinciden-equipo',
    icono: 'close-circle-outline',
    titulo: 'Me dice que los datos no coinciden',
    pasos: [
      'El usuario va sin espacios ni tildes.',
      'La contraseña distingue mayúsculas de minúsculas. Tocá el ojito para ver lo que escribiste.',
      'Si te la cambiaron hace poco, usá la nueva.',
    ],
  },
  {
    id: 'provisoria',
    icono: 'refresh-outline',
    titulo: 'Tengo una contraseña provisoria',
    pasos: [
      'Primero cambiala en la web: el sistema te pide una nueva apenas entrás.',
      'Después entrá a la app con la contraseña nueva.',
    ],
  },
  {
    id: 'tareas',
    icono: 'lock-closed-outline',
    titulo: 'No veo una tarea en el Panel',
    pasos: [
      'Cada tarea aparece según los permisos de tu perfil.',
      'Si necesitás alguna, pedísela al administrador. Después cerrá sesión y volvé a entrar para que se actualice.',
    ],
  },
  {
    id: 'sesion',
    icono: 'log-out-outline',
    titulo: 'Me sacó de la sesión',
    pasos: [
      'Por seguridad la sesión se cierra sola después de un tiempo, o si entrás con tu usuario en otro equipo.',
      'Volvé a entrar con tu usuario y contraseña.',
    ],
  },
  {
    id: 'sistema',
    icono: 'server-outline',
    titulo: 'No conecta con el sistema',
    pasos: [
      'Revisá la conexión de red del teléfono y volvé a probar.',
      'Si sigue sin conectar, avisale al administrador. Puede que el servidor se esté reiniciando.',
    ],
  },
];

function mensajeDeRestablecer(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'El formato del correo no es válido.';
    case 'auth/too-many-requests':
      return 'Pediste muchos enlaces seguidos. Esperá unos minutos y probá de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión. Revisá el wifi o los datos del teléfono.';
    default:
      return 'No pudimos mandar el enlace ahora. Probá de nuevo en un rato.';
  }
}

function obtenerProblemasSegunSesion(esEquipoAutenticado) {
  return esEquipoAutenticado ? PROBLEMAS_EQUIPO : PROBLEMAS_CLIENTE;
}

export default function Ayuda({ navigation }) {
  const { colores } = useTema();
  const { usuario, rol, equipo } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const esEquipo = rol === 'equipo' && Boolean(equipo?.token);
  const esCliente = rol === 'cliente';

  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [correo, setCorreo] = useState(usuario?.email ?? '');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoA, setEnviadoA] = useState('');
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    setAbierto(null);
    setBusqueda('');
  }, [esEquipo]);

  const rutas = navigation.getState()?.routeNames ?? [];
  const problemas = obtenerProblemasSegunSesion(esEquipo);
  const visibles = problemas.filter((problema) => coincide(`${problema.titulo} ${problema.pasos.join(' ')}`, busqueda));

  const alternar = (id) => setAbierto((actual) => (actual === id ? null : id));

  const restablecer = async () => {
    if (esEquipo) return;
    const error = validarCorreo(correo, { obligatorio: true });
    if (error) {
      setErrorCorreo(error);
      return;
    }
    if (!auth) {
      setErrorCorreo('La app todavía no está conectada con Firebase.');
      return;
    }
    setEnviando(true);
    setEnviadoA('');
    try {
      await sendPasswordResetEmail(auth, correo.trim());
      if (montado.current) setEnviadoA(correo.trim());
    } catch (problema) {
      if (!montado.current) return;
      if (problema?.code === 'auth/user-not-found') {
        setEnviadoA(correo.trim());
      } else {
        setErrorCorreo(mensajeDeRestablecer(problema));
      }
    } finally {
      if (montado.current) setEnviando(false);
    }
  };

  const renderAccion = (problema) => {
    const accion = ACCIONES[problema.accion];
    if (!accion || !rutas.includes(accion.ruta)) return null;
    return (
      <Pressable
        style={({ pressed }) => [estilos.botonAccion, pressed && estilos.presionado]}
        onPress={() => navigation.navigate(accion.ruta)}
        accessibilityRole="button"
      >
        <Text style={estilos.textoBotonAccion}>{accion.texto}</Text>
        <Feather name="arrow-right" size={16} color={colores.textoSobreMarca} />
      </Pressable>
    );
  };

  const renderRestablecer = () => (
    <View style={estilos.formulario}>
      <CampoTexto
        etiqueta="Tu correo"
        icono="mail"
        placeholder="ejemplo@correo.com"
        valor={correo}
        alCambiar={(texto) => {
          setCorreo(filtrarCorreo(texto));
          setErrorCorreo('');
          setEnviadoA('');
        }}
        alSalir={() => setErrorCorreo(validarCorreo(correo))}
        error={errorCorreo}
        mensajeExito={enviadoA ? `Listo. Si hay una cuenta con ${enviadoA}, te llega el enlace en unos minutos.` : ''}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={restablecer}
        editable={!enviando}
        maxLength={254}
      />
      <Pressable
        style={({ pressed }) => [estilos.botonAccion, estilos.botonFormulario, pressed && estilos.presionado]}
        onPress={restablecer}
        disabled={enviando}
        accessibilityRole="button"
      >
        {enviando ? (
          <ActivityIndicator color={colores.textoSobreMarca} />
        ) : (
          <Text style={estilos.textoBotonAccion}>{enviadoA ? 'Mandarlo de nuevo' : 'Mandarme el enlace'}</Text>
        )}
      </Pressable>
    </View>
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
          <BarraVolver />
          <View style={estilos.icono}>
            <Ionicons name="help-buoy-outline" size={34} color={colores.marca} />
          </View>
          <Text style={estilos.titulo}>{esEquipo || esCliente ? 'Ayuda' : '¿Tenés problemas para ingresar?'}</Text>
          <Text style={estilos.subtitulo}>
            {esEquipo
              ? 'Problemas con tu usuario del sistema y cómo resolverlos.'
              : esCliente
              ? 'Problemas con tu cuenta de cliente y cómo resolverlos.'
              : 'Tocá lo que te pasa y te contamos cómo resolverlo.'}
          </Text>

          <View style={estilos.buscador}>
            <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
            <TextInput
              style={estilos.entrada}
              placeholder="Buscá tu problema"
              placeholderTextColor={colores.textoTenue}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCorrect={false}
              maxLength={60}
            />
            {busqueda !== '' && (
              <Pressable onPress={() => setBusqueda('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={18} color={colores.textoTenue} />
              </Pressable>
            )}
          </View>

          {visibles.length === 0 ? (
            <EstadoVacio
              icono="chatbubbles-outline"
              titulo="No encontramos ese problema"
              texto={
                esEquipo
                  ? 'Probá con otra palabra o consultale al administrador.'
                  : 'Probá con otra palabra o acercate al mostrador y te ayudamos.'
              }
              accion={{ texto: 'Ver todos', alPresionar: () => setBusqueda('') }}
            />
          ) : (
            <View style={estilos.lista}>
              {visibles.map((problema, posicion) => {
                const desplegado = abierto === problema.id;
                return (
                  <View key={problema.id} style={[estilos.item, posicion > 0 && estilos.divisor]}>
                    <Pressable
                      style={estilos.cabeceraItem}
                      onPress={() => alternar(problema.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: desplegado }}
                    >
                      <View style={estilos.iconoItem}>
                        <Ionicons name={problema.icono} size={18} color={colores.marca} />
                      </View>
                      <Text style={estilos.tituloItem}>{problema.titulo}</Text>
                      <Feather name={desplegado ? 'chevron-up' : 'chevron-down'} size={20} color={colores.textoSecundario} />
                    </Pressable>
                    {desplegado && (
                      <View style={estilos.solucion}>
                        {problema.pasos.map((paso, numero) => (
                          <View key={paso} style={estilos.paso}>
                            <View style={estilos.numero}>
                              <Text style={estilos.textoNumero}>{numero + 1}</Text>
                            </View>
                            <Text style={estilos.textoPaso}>{paso}</Text>
                          </View>
                        ))}
                        {!esEquipo && problema.restablecer ? renderRestablecer() : null}
                        {renderAccion(problema)}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={estilos.pie}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colores.textoSecundario} />
            <Text style={estilos.textoPie}>
              {esEquipo
                ? '¿Seguís sin poder entrar? Hablá con el administrador del sistema.'
                : '¿Seguís sin poder entrar? Acercate al mostrador y te ayudamos en el momento.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 14 },
    icono: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: 22,
      marginTop: 8,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 34, lineHeight: 40, color: c.titulo, textAlign: 'center' },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14.5, color: c.textoSecundario, textAlign: 'center', marginTop: -8 },
    buscador: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    entrada: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    lista: { borderRadius: 16, borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, overflow: 'hidden' },
    item: { paddingHorizontal: 14 },
    divisor: { borderTopWidth: 1, borderTopColor: c.divisor },
    cabeceraItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    iconoItem: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tituloItem: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14.5, lineHeight: 20, color: c.texto },
    solucion: { gap: 10, paddingBottom: 16, paddingLeft: 48 },
    paso: { flexDirection: 'row', gap: 10 },
    numero: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.superficieActiva,
      borderWidth: 1,
      borderColor: c.borde,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoNumero: { fontFamily: 'Inter_700Bold', fontSize: 11, color: c.textoSecundario },
    textoPaso: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: c.textoSecundario },
    formulario: { marginTop: -6 },
    botonAccion: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 8,
      height: 42,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.marca,
      justifyContent: 'center',
      marginTop: 4,
    },
    botonFormulario: { alignSelf: 'stretch', marginTop: 12 },
    textoBotonAccion: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.textoSobreMarca },
    presionado: { opacity: 0.85 },
    pie: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoPie: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 19, color: c.textoSecundario },
  });
}
