import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { coloresCategoria } from '../src/datos/ejemplo';
import { useCuentaCliente } from '../src/cliente/CuentaClienteContext';
import { aFecha, aIso, formatearNumero, formatearPuntos } from '../src/utilidades/formato';
import { iniciales, limpiar } from '../src/utilidades/texto';
import {
  filtrarNombre,
  filtrarTelefono,
  validarFechaNacimiento,
  validarNombrePersona,
  validarTelefono,
} from '../src/utilidades/validaciones';
import { resumirPuntos } from '../src/utilidades/puntos';
import CampoTexto from '../src/componentes/CampoTexto';
import AvisoCuentaCliente from '../src/componentes/AvisoCuentaCliente';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ULTIMOS_MOVIMIENTOS = 3;

function formatearCumple(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return 'Todavía no lo agregaste';
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function leerPerfil(texto) {
  if (!texto) return null;
  try {
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
    return {
      nombre: typeof datos.nombre === 'string' ? limpiar(datos.nombre) : '',
      apellido: typeof datos.apellido === 'string' ? limpiar(datos.apellido) : '',
      telefono: typeof datos.telefono === 'string' ? limpiar(datos.telefono) : '',
      fechaNacimiento: aIso(datos.fechaNacimiento),
      aceptaPromociones: datos.aceptaPromociones === true,
    };
  } catch (error) {
    return null;
  }
}

function separarNombre(completo) {
  const partes = limpiar(completo).split(' ').filter(Boolean);
  return { nombre: partes[0] ?? '', apellido: partes.slice(1).join(' ') };
}

export default function Perfil() {
  const navigation = useNavigation();
  const { colores, tema, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const { usuario, nombreVisible, actualizarNombre, cerrarSesion } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const [perfil, setPerfil] = useState(null);
  const [editando, setEditando] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [borrador, setBorrador] = useState({ nombre: '', apellido: '', telefono: '', cumple: null, aceptaPromociones: false });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const uid = usuario?.uid;
  const claveGuardado = `cafeto:perfil:${uid}`;
  const nombreCompleto =
    limpiar(nombreVisible) || limpiar(`${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`) || 'Cliente Cafeto';
  const { cuenta, cargando: cargandoCuenta } = useCuentaCliente();
  const puntos = resumirPuntos(cuenta);
  const codigo = cuenta?.qr ?? null;
  const movimientos = cuenta?.movimientos ?? [];

  useEffect(() => {
    if (!uid) return undefined;
    let vigente = true;
    AsyncStorage.getItem(`cafeto:perfil:${uid}`)
      .then((guardado) => {
        if (vigente) setPerfil(leerPerfil(guardado));
      })
      .catch(() => {
        if (vigente) setPerfil(null);
      });
    return () => {
      vigente = false;
    };
  }, [uid]);

  const abrirEditor = () => {
    const desdeNombre = separarNombre(nombreCompleto === 'Cliente Cafeto' ? '' : nombreCompleto);
    setBorrador({
      nombre: perfil?.nombre || desdeNombre.nombre,
      apellido: perfil?.apellido || desdeNombre.apellido,
      telefono: perfil?.telefono ?? '',
      cumple: aFecha(perfil?.fechaNacimiento),
      aceptaPromociones: Boolean(perfil?.aceptaPromociones),
    });
    setErrores({});
    setErrorGeneral('');
    setEditando(true);
  };

  const cerrarEditor = () => {
    if (guardando) return;
    setMostrarCalendario(false);
    setEditando(false);
  };

  const cambiar = (campo) => (valor) => {
    setBorrador((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: '' }));
    setErrorGeneral('');
  };

  const salirDe = (campo) => () => {
    const valor = borrador[campo];
    let error = '';
    if (campo === 'nombre' && limpiar(valor)) error = validarNombrePersona(valor, 'nombre');
    if (campo === 'apellido' && limpiar(valor)) error = validarNombrePersona(valor, 'apellido');
    if (campo === 'telefono') error = validarTelefono(valor);
    setErrores((previos) => ({ ...previos, [campo]: error }));
  };

  const elegirFecha = (evento, fecha) => {
    if (Platform.OS !== 'ios') setMostrarCalendario(false);
    if (evento.type === 'dismissed') return;
    if (fecha) {
      setBorrador((previo) => ({ ...previo, cumple: fecha }));
      setErrores((previos) => ({ ...previos, cumple: validarFechaNacimiento(fecha) }));
    }
  };

  const guardar = async () => {
    if (guardando || !uid) return;
    const nuevos = {
      nombre: validarNombrePersona(borrador.nombre, 'nombre'),
      apellido: validarNombrePersona(borrador.apellido, 'apellido'),
      telefono: validarTelefono(borrador.telefono),
      cumple: validarFechaNacimiento(borrador.cumple),
    };
    if (Object.values(nuevos).some(Boolean)) {
      setErrores(nuevos);
      return;
    }

    const nuevo = {
      nombre: limpiar(borrador.nombre),
      apellido: limpiar(borrador.apellido),
      telefono: limpiar(borrador.telefono) || null,
      fechaNacimiento: aIso(borrador.cumple),
      aceptaPromociones: borrador.aceptaPromociones,
    };
    const nombreNuevo = `${nuevo.nombre} ${nuevo.apellido}`;

    setGuardando(true);
    setErrorGeneral('');
    try {
      if (nombreNuevo !== limpiar(nombreVisible)) await actualizarNombre(nombreNuevo);
    } catch (error) {
      setGuardando(false);
      setErrorGeneral(
        error?.code === 'auth/network-request-failed'
          ? 'No hay conexión y no pudimos guardar tu nombre. Revisá el wifi o los datos y probá de nuevo.'
          : 'No pudimos guardar tu nombre. Probá de nuevo en un rato.'
      );
      return;
    }
    try {
      await AsyncStorage.setItem(claveGuardado, JSON.stringify(nuevo));
    } catch (error) {
      setGuardando(false);
      setErrorGeneral('No pudimos guardar tus datos en este celular. Liberá espacio y probá de nuevo.');
      return;
    }

    setPerfil({ ...nuevo, telefono: nuevo.telefono ?? '' });
    setGuardando(false);
    setMostrarCalendario(false);
    setEditando(false);
    setTimeout(() => avisar('exito', 'Datos actualizados', 'Tus datos quedaron guardados.'), 350);
  };

  const confirmarSalida = () => {
    avisar('advertencia', '¿Cerrar sesión?', 'Vas a tener que volver a ingresar con tu correo y contraseña.', [
      { texto: 'Cancelar', estilo: 'cancelar' },
      { texto: 'Cerrar sesión', estilo: 'destructivo', alPresionar: cerrarSesion },
    ]);
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={estilos.encabezado}>
          <View style={estilos.avatar}>
            <Text style={estilos.iniciales}>{iniciales(nombreCompleto)}</Text>
          </View>
          <View style={estilos.textos}>
            <Text style={estilos.nombre} numberOfLines={1}>
              {nombreCompleto}
            </Text>
            <Text style={estilos.detalle} numberOfLines={1}>
              {usuario?.email}
            </Text>
          </View>
          <Pressable
            style={estilos.botonEditar}
            onPress={abrirEditor}
            accessibilityRole="button"
            accessibilityLabel="Editar mis datos"
          >
            <Ionicons name="pencil" size={18} color={colores.marca} />
          </Pressable>
        </View>

        {!cuenta && !cargandoCuenta ? (
          <AvisoCuentaCliente />
        ) : (
          <Pressable
            style={({ pressed }) => [estilos.tarjetaQr, pressed && estilos.presionado]}
            onPress={() => navigation.navigate('MiQR')}
            accessibilityRole="button"
            accessibilityLabel="Ver mi QR en grande"
          >
            <View style={estilos.marcoQr}>
              {codigo ? (
                <QRCode value={codigo} size={96} color="#161616" backgroundColor="#FFFFFF" quietZone={4} ecl="M" />
              ) : (
                <View style={estilos.qrVacio}>
                  <ActivityIndicator color="#161616" />
                </View>
              )}
            </View>
            <View style={estilos.textos}>
              <View style={[estilos.chip, { backgroundColor: coloresCategoria[puntos.categoria] ?? colores.marca }]}>
                <Ionicons name="star" size={12} color="#161616" />
                <Text style={estilos.chipTexto}>{puntos.categoria.toUpperCase()}</Text>
              </View>
              <Text style={estilos.codigo}>{codigo ?? 'Buscando tu código...'}</Text>
              <Text style={estilos.detalle}>Mostralo en caja para sumar puntos.</Text>
              <Text style={estilos.enlace}>Tocá para agrandarlo</Text>
            </View>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [estilos.filaPuntos, pressed && estilos.presionado]}
          onPress={() => navigation.navigate('MisPuntos')}
          accessibilityRole="button"
        >
          <Ionicons name="star-outline" size={20} color={colores.marca} />
          <Text style={estilos.etiqueta}>Mis puntos</Text>
          <Text style={estilos.valorDestacado}>{cuenta ? `${formatearNumero(puntos.disponibles)} pts` : ''}</Text>
          <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
        </Pressable>

        <Text style={estilos.seccion}>MIS DATOS</Text>
        <View style={estilos.lista}>
          <View style={estilos.fila}>
            <Ionicons name="call-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Teléfono</Text>
            <Text style={estilos.valor}>{perfil?.telefono || 'Todavía no lo agregaste'}</Text>
          </View>
          <View style={[estilos.fila, estilos.divisor]}>
            <Ionicons name="calendar-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Cumpleaños</Text>
            <Text style={estilos.valor}>{formatearCumple(perfil?.fechaNacimiento)}</Text>
          </View>
          <View style={[estilos.fila, estilos.divisor]}>
            <Ionicons name="mail-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Querés recibir promos</Text>
            <Text style={estilos.valor}>{perfil?.aceptaPromociones ? 'Sí' : 'No'}</Text>
          </View>
        </View>

        <View style={estilos.filaSeccion}>
          <Text style={estilos.seccion}>ÚLTIMOS MOVIMIENTOS</Text>
          <Pressable onPress={() => navigation.navigate('MisPuntos')} hitSlop={8}>
            <Text style={estilos.enlace}>Ver todo</Text>
          </Pressable>
        </View>
        <View style={estilos.lista}>
          {movimientos.slice(0, ULTIMOS_MOVIMIENTOS).map((movimiento, posicion) => (
            <View key={movimiento.id} style={[estilos.fila, posicion > 0 && estilos.divisor]}>
              <View style={estilos.textos}>
                <Text style={estilos.valorIzquierda}>{movimiento.concepto}</Text>
                <Text style={estilos.detalle}>{movimiento.fecha}</Text>
              </View>
              <Text style={[estilos.puntos, movimiento.puntos > 0 && estilos.puntosSuma]}>
                {formatearPuntos(movimiento.puntos)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={estilos.seccion}>PREFERENCIAS</Text>
        <View style={estilos.lista}>
          <Pressable style={estilos.fila} onPress={cambiarTema} accessibilityRole="button">
            <Ionicons name={tema === 'oscuro' ? 'moon-outline' : 'sunny-outline'} size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Tema</Text>
            <Text style={estilos.valor}>{tema === 'oscuro' ? 'Oscuro' : 'Claro'}</Text>
          </Pressable>
          <Pressable
            style={[estilos.fila, estilos.divisor]}
            onPress={() => navigation.navigate('Ayuda', { tipo: 'cliente' })}
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Ayuda</Text>
            <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
          </Pressable>
          <Pressable style={[estilos.fila, estilos.divisor]} onPress={confirmarSalida} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={20} color={colores.peligro} />
            <Text style={[estilos.etiqueta, { color: colores.peligro }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={editando} transparent animationType="slide" onRequestClose={cerrarEditor}>
        <KeyboardAvoidingView style={estilos.fondoModal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={estilos.zonaCierre} onPress={cerrarEditor} accessibilityLabel="Cerrar" />
          <View style={estilos.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={estilos.tituloModal}>Editar mis datos</Text>

              <View style={estilos.filaCampos}>
                <CampoTexto
                  estiloContenedor={estilos.mitad}
                  etiqueta="Nombre"
                  valor={borrador.nombre}
                  alCambiar={(texto) => cambiar('nombre')(filtrarNombre(texto))}
                  alSalir={salirDe('nombre')}
                  error={errores.nombre ?? ''}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={50}
                  editable={!guardando}
                />
                <CampoTexto
                  estiloContenedor={estilos.mitad}
                  etiqueta="Apellido"
                  valor={borrador.apellido}
                  alCambiar={(texto) => cambiar('apellido')(filtrarNombre(texto))}
                  alSalir={salirDe('apellido')}
                  error={errores.apellido ?? ''}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="family-name"
                  textContentType="familyName"
                  maxLength={50}
                  editable={!guardando}
                />
              </View>

              <CampoTexto
                etiqueta="Teléfono"
                opcional
                icono="smartphone"
                placeholder="+54 387 000 0000"
                valor={borrador.telefono}
                alCambiar={(texto) => cambiar('telefono')(filtrarTelefono(texto))}
                alSalir={salirDe('telefono')}
                error={errores.telefono ?? ''}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={20}
                editable={!guardando}
              />

              <Text style={estilos.etiquetaCampo}>
                Cumpleaños<Text style={estilos.opcional}> · opcional</Text>
              </Text>
              <Pressable
                style={[estilos.selectorFecha, errores.cumple ? estilos.selectorConError : null]}
                onPress={() => setMostrarCalendario(true)}
                disabled={guardando}
              >
                <Feather name="calendar" size={20} color={colores.textoSecundario} />
                <Text style={[estilos.textoFecha, !borrador.cumple && estilos.textoFechaVacia]}>
                  {borrador.cumple ? formatearCumple(borrador.cumple) : 'Elegí tu fecha'}
                </Text>
                {borrador.cumple ? (
                  <Pressable onPress={() => cambiar('cumple')(null)} hitSlop={10} accessibilityLabel="Borrar fecha">
                    <Ionicons name="close-circle" size={18} color={colores.textoTenue} />
                  </Pressable>
                ) : (
                  <Feather name="chevron-down" size={20} color={colores.textoSecundario} />
                )}
              </Pressable>
              {errores.cumple ? (
                <View style={estilos.filaError}>
                  <Feather name="alert-circle" size={14} color={colores.peligro} />
                  <Text style={estilos.textoError}>{errores.cumple}</Text>
                </View>
              ) : null}

              {mostrarCalendario ? (
                <DateTimePicker
                  value={borrador.cumple ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={elegirFecha}
                  themeVariant={tema === 'oscuro' ? 'dark' : 'light'}
                  locale="es-AR"
                />
              ) : null}

              {mostrarCalendario && Platform.OS === 'ios' ? (
                <Pressable style={estilos.botonListo} onPress={() => setMostrarCalendario(false)}>
                  <Text style={estilos.enlace}>Listo</Text>
                </Pressable>
              ) : null}

              <View style={estilos.filaSwitch}>
                <Text style={estilos.etiqueta}>Querés recibir promos</Text>
                <Switch
                  value={borrador.aceptaPromociones}
                  onValueChange={cambiar('aceptaPromociones')}
                  disabled={guardando}
                  trackColor={{ true: colores.marca, false: colores.borde }}
                  thumbColor={colores.superficie}
                />
              </View>

              {errorGeneral !== '' && (
                <View style={estilos.errorGeneral}>
                  <Feather name="alert-circle" size={16} color={colores.peligro} />
                  <Text style={estilos.textoErrorGeneral}>{errorGeneral}</Text>
                </View>
              )}

              <View style={estilos.accionesModal}>
                <Pressable style={estilos.botonCancelar} onPress={cerrarEditor} disabled={guardando}>
                  <Text style={estilos.textoCancelar}>Cancelar</Text>
                </Pressable>
                <Pressable style={estilos.botonGuardar} onPress={guardar} disabled={guardando}>
                  {guardando ? (
                    <ActivityIndicator color={colores.textoSobreMarca} />
                  ) : (
                    <Text style={estilos.textoGuardar}>Guardar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 20, paddingBottom: 32, gap: 14 },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.marca, justifyContent: 'center', alignItems: 'center' },
    iniciales: { fontFamily: 'Inter_700Bold', fontSize: 22, color: c.textoSobreMarca },
    textos: { flex: 1, gap: 4 },
    nombre: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textoSecundario },
    presionado: { opacity: 0.85 },
    tarjetaQr: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      backgroundColor: c.marcaSuave,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      borderRadius: 20,
    },
    marcoQr: { padding: 6, borderRadius: 12, backgroundColor: '#FFFFFF' },
    qrVacio: { width: 104, height: 104, justifyContent: 'center', alignItems: 'center' },
    codigo: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1.5, color: c.texto },
    chip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipTexto: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2, color: '#161616' },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.marca },
    filaPuntos: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    valorDestacado: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.texto },
    seccion: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: c.textoSecundario, marginTop: 6 },
    filaSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    lista: { backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16 },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    divisor: { borderTopWidth: 1, borderTopColor: c.divisor },
    etiqueta: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: c.texto },
    valor: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario, flexShrink: 1, textAlign: 'right' },
    valorIzquierda: { fontFamily: 'Inter_500Medium', fontSize: 14, color: c.texto },
    puntos: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.textoSecundario },
    puntosSuma: { color: c.exito },
    botonEditar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
    },
    fondoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.velo },
    zonaCierre: { flex: 1 },
    modal: {
      maxHeight: '90%',
      padding: 22,
      paddingBottom: 34,
      backgroundColor: c.fondo,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: c.borde,
    },
    tituloModal: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    filaCampos: { flexDirection: 'row', gap: 12 },
    mitad: { flex: 1 },
    etiquetaCampo: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.texto, marginTop: 16, marginBottom: 8 },
    opcional: { fontFamily: 'Inter_400Regular', color: c.textoTenue },
    selectorFecha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    selectorConError: { borderColor: c.peligro },
    textoFecha: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    textoFechaVacia: { color: c.textoTenue },
    filaError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    textoError: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: c.peligro },
    botonListo: { alignSelf: 'center', paddingVertical: 10 },
    filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
    errorGeneral: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.bordePeligro,
      backgroundColor: c.fondoPeligro,
    },
    textoErrorGeneral: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 19, color: c.texto },
    accionesModal: { flexDirection: 'row', gap: 12, marginTop: 22 },
    botonCancelar: {
      flex: 1,
      height: 50,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoCancelar: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    botonGuardar: {
      flex: 1,
      height: 50,
      backgroundColor: c.marca,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoGuardar: { fontFamily: 'Inter_700Bold', fontSize: 15, color: c.textoSobreMarca },
  });
}
