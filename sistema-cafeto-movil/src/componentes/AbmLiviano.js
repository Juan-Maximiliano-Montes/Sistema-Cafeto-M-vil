import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';
import { useAviso } from '../aviso/AvisoContext';
import { useSesion } from '../sesion/SesionContext';
import { erroresPorCampo, mensajeDeError } from '../api/cliente';
import { unirSinRepetidos } from '../api/formas';
import { hapticExito } from '../utilidades/haptics';
import { limpiar } from '../utilidades/texto';
import { validarTextoCatalogo } from '../utilidades/validaciones';
import CampoTexto from './CampoTexto';
import CuadroAyuda from './CuadroAyuda';
import EstadoVacio from './EstadoVacio';
import BarraVolver from './BarraVolver';

const ESPERA_BUSQUEDA = 400;
const MAXIMO_DESCRIPCION = 120;
const ESPERA_AVISO = 350;

function palabras(singular, genero) {
  const femenino = genero === 'f';
  const final = femenino ? 'a' : 'o';
  const Singular = singular.charAt(0).toUpperCase() + singular.slice(1);
  return {
    Singular,
    plural: `${singular}s`,
    final,
    un: femenino ? 'una' : 'un',
    el: femenino ? 'la' : 'el',
    los: femenino ? 'las' : 'los',
    nuevo: femenino ? 'Nueva' : 'Nuevo',
  };
}

function estadoInicial(item, conActivo) {
  const base = {
    id: item?.id ?? null,
    nombre: item?.nombre ?? '',
    descripcion: item?.descripcion ?? '',
    activo: conActivo ? item?.activo !== false : true,
  };
  return { ...base, original: { nombre: base.nombre, descripcion: base.descripcion, activo: base.activo } };
}

function tieneCambios(formulario) {
  if (!formulario) return false;
  const { original } = formulario;
  return (
    limpiar(formulario.nombre) !== limpiar(original.nombre) ||
    limpiar(formulario.descripcion) !== limpiar(original.descripcion) ||
    formulario.activo !== original.activo
  );
}

export default function AbmLiviano({ configuracion }) {
  const {
    clave,
    titulo,
    singular,
    genero,
    icono,
    permisos,
    api,
    maximoNombre,
    conActivo = false,
    ejemploNombre,
    ejemploDescripcion,
    ayuda,
    textoBaja,
    textoActivo,
  } = configuracion;
  const p = useMemo(() => palabras(singular, genero), [singular, genero]);

  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo, tienePermiso, sesionVencida } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;

  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorMas, setErrorMas] = useState('');
  const ultimaConsulta = useRef(0);
  const montado = useRef(true);
  const enviando = useRef(false);

  const [formulario, setFormulario] = useState(null);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [bajando, setBajando] = useState(null);

  const puedeCrear = tienePermiso(permisos.crear);
  const puedeEditar = tienePermiso(permisos.editar);
  const puedeDarDeBaja = tienePermiso(permisos.eliminar);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const avisarLuego = useCallback(
    (...argumentos) => {
      setTimeout(() => {
        if (montado.current) avisar(...argumentos);
      }, ESPERA_AVISO);
    },
    [avisar]
  );

  const manejarError = useCallback(
    (error, tituloAviso) => {
      if (error?.estado === 401) {
        sesionVencida();
        avisar('error', 'Tu sesión venció', 'Volvé a entrar con tu usuario del sistema.');
        return;
      }
      if (error?.estado === 403) {
        avisar(
          'error',
          'Sin permiso',
          'Tu usuario ya no tiene permiso para esto. Si te cambiaron los permisos, cerrá sesión y volvé a entrar.'
        );
        return;
      }
      avisar('error', tituloAviso, mensajeDeError(error));
    },
    [avisar, sesionVencida]
  );

  const cargar = useCallback(
    async (numeroPagina, texto) => {
      const consulta = ++ultimaConsulta.current;
      try {
        const respuesta = await api.listar(token, { busqueda: texto, pagina: numeroPagina });
        if (!montado.current || consulta !== ultimaConsulta.current) return;
        setItems((anteriores) =>
          numeroPagina === 1 ? respuesta.resultados : unirSinRepetidos(anteriores, respuesta.resultados)
        );
        setPagina(numeroPagina);
        setHayMas(respuesta.hayMas);
        setErrorCarga('');
        setErrorMas('');
      } catch (error) {
        if (!montado.current || consulta !== ultimaConsulta.current) return;
        if (error?.estado === 401 || error?.estado === 403) {
          manejarError(error);
          return;
        }
        const mensaje = mensajeDeError(error, `No pudimos traer ${p.los} ${p.plural}.`);
        if (numeroPagina === 1) {
          setErrorCarga(mensaje);
          setItems([]);
          setHayMas(false);
        } else {
          setErrorMas(mensaje);
        }
      } finally {
        if (montado.current && consulta === ultimaConsulta.current) {
          setCargando(false);
          setCargandoMas(false);
          setActualizando(false);
        }
      }
    },
    [api, token, manejarError, p]
  );

  useEffect(() => {
    setCargando(true);
    const espera = setTimeout(() => cargar(1, busqueda), ESPERA_BUSQUEDA);
    return () => clearTimeout(espera);
  }, [busqueda, cargar]);

  const actualizar = () => {
    setActualizando(true);
    cargar(1, busqueda);
  };

  const reintentar = () => {
    setCargando(true);
    setErrorCarga('');
    cargar(1, busqueda);
  };

  const cargarMas = () => {
    if (!hayMas || cargando || cargandoMas || errorMas || items.length === 0) return;
    setCargandoMas(true);
    cargar(pagina + 1, busqueda);
  };

  const reintentarMas = () => {
    setErrorMas('');
    setCargandoMas(true);
    cargar(pagina + 1, busqueda);
  };

  const abrirFormulario = (item, nombreSugerido = '') => {
    setErrores({});
    setErrorGeneral('');
    setConfirmarDescarte(false);
    const inicial = estadoInicial(item, conActivo);
    setFormulario(item ? inicial : { ...inicial, nombre: limpiar(nombreSugerido).slice(0, maximoNombre) });
  };

  const cerrarFormulario = (forzar = false) => {
    if (guardando) return;
    if (!forzar && tieneCambios(formulario)) {
      setConfirmarDescarte(true);
      return;
    }
    setConfirmarDescarte(false);
    setFormulario(null);
  };

  const cambiar = (campo) => (valor) => {
    setFormulario((anterior) => (anterior ? { ...anterior, [campo]: valor } : anterior));
    setErrores((anteriores) => ({ ...anteriores, [campo]: '' }));
    setErrorGeneral('');
    setConfirmarDescarte(false);
  };

  const validarNombre = (valor) =>
    validarTextoCatalogo(valor, { etiqueta: 'El nombre', minimo: 2, maximo: maximoNombre });

  const validarDescripcion = (valor) =>
    validarTextoCatalogo(valor, { etiqueta: 'La descripción', minimo: 1, maximo: MAXIMO_DESCRIPCION, obligatorio: false });

  const salirDe = (campo, validar) => () => {
    const valor = formulario?.[campo] ?? '';
    setErrores((anteriores) => ({ ...anteriores, [campo]: limpiar(valor) ? validar(valor) : '' }));
  };

  const guardar = async () => {
    if (!formulario || enviando.current) return;
    const nuevos = { nombre: validarNombre(formulario.nombre), descripcion: validarDescripcion(formulario.descripcion) };
    if (nuevos.nombre || nuevos.descripcion) {
      setErrores(nuevos);
      return;
    }
    if (formulario.id && !tieneCambios(formulario)) {
      cerrarFormulario(true);
      return;
    }

    const datos = {
      nombre: limpiar(formulario.nombre),
      descripcion: limpiar(formulario.descripcion) || null,
      ...(conActivo ? { activo: formulario.activo } : {}),
    };
    const editando = Boolean(formulario.id);

    enviando.current = true;
    setGuardando(true);
    setErrorGeneral('');
    try {
      const guardado = editando ? await api.editar(token, formulario.id, datos) : await api.crear(token, datos);
      enviando.current = false;
      if (!montado.current) return;
      setGuardando(false);
      setFormulario(null);
      hapticExito();
      cargar(1, busqueda);
      avisarLuego(
        'exito',
        editando ? `${p.Singular} actualizad${p.final}` : `${p.Singular} cread${p.final}`,
        editando ? `Guardamos los cambios de «${guardado.nombre}».` : `«${guardado.nombre}» ya está en el sistema.`
      );
    } catch (error) {
      enviando.current = false;
      if (!montado.current) return;
      setGuardando(false);
      if (error?.estado === 401 || error?.estado === 403) {
        setFormulario(null);
        manejarError(error);
        return;
      }
      if (error?.estado === 404) {
        setFormulario(null);
        cargar(1, busqueda);
        avisarLuego('advertencia', 'Ya no existe', mensajeDeError(error));
        return;
      }
      const delServidor = erroresPorCampo(error);
      if (delServidor.nombre || delServidor.descripcion) {
        setErrores({ nombre: delServidor.nombre ?? '', descripcion: delServidor.descripcion ?? '' });
      }
      if (delServidor.activo) {
        setErrorGeneral(delServidor.activo);
      } else if (!delServidor.nombre && !delServidor.descripcion) {
        setErrorGeneral(mensajeDeError(error, `No pudimos guardar ${p.el} ${singular}.`));
      }
    }
  };

  const darDeBaja = async (item) => {
    if (bajando) return;
    setBajando(item.id);
    try {
      await api.darDeBaja(token, item.id);
      if (!montado.current) return;
      setItems((anteriores) => anteriores.filter((actual) => actual.id !== item.id));
      cargar(1, busqueda);
      avisar(
        'exito',
        `${p.Singular} dad${p.final} de baja`,
        `«${item.nombre}» ya no aparece. Si te equivocaste, se reactiva desde la web.`
      );
    } catch (error) {
      if (!montado.current) return;
      if (error?.estado === 409) {
        avisar('advertencia', 'No se puede dar de baja', mensajeDeError(error));
        return;
      }
      if (error?.estado === 404) {
        cargar(1, busqueda);
        avisar('advertencia', 'Ya no existe', mensajeDeError(error));
        return;
      }
      manejarError(error, `No pudimos dar de baja ${p.el} ${singular}`);
    } finally {
      if (montado.current) setBajando(null);
    }
  };

  const confirmarBaja = (item) => {
    avisar('advertencia', `¿Dar de baja «${item.nombre}»?`, textoBaja, [
      { texto: 'Cancelar', estilo: 'cancelar' },
      { texto: 'Dar de baja', estilo: 'destructivo', alPresionar: () => darDeBaja(item) },
    ]);
  };

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [estilos.fila, pressed && puedeEditar && estilos.presionado]}
      onPress={puedeEditar ? () => abrirFormulario(item) : undefined}
      disabled={!puedeEditar}
      accessibilityRole={puedeEditar ? 'button' : undefined}
      accessibilityLabel={puedeEditar ? `Editar ${item.nombre}` : item.nombre}
    >
      <View style={[estilos.inicial, conActivo && item.activo === false && estilos.inicialApagada]}>
        <Text style={estilos.inicialTexto}>{Array.from(item.nombre)[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={estilos.textosFila}>
        <Text style={estilos.nombre} numberOfLines={1}>
          {item.nombre}
        </Text>
        <Text style={estilos.descripcion} numberOfLines={1}>
          {item.descripcion || 'Sin descripción'}
        </Text>
        {conActivo && item.activo === false && <Text style={estilos.etiquetaApagada}>NO SE OFRECE</Text>}
      </View>
      {puedeDarDeBaja &&
        (bajando === item.id ? (
          <ActivityIndicator color={colores.textoTenue} />
        ) : (
          <Pressable
            onPress={() => confirmarBaja(item)}
            hitSlop={10}
            style={estilos.botonBaja}
            disabled={bajando !== null}
            accessibilityRole="button"
            accessibilityLabel={`Dar de baja ${item.nombre}`}
          >
            <Feather name="trash-2" size={18} color={colores.textoTenue} />
          </Pressable>
        ))}
    </Pressable>
  );

  const textoBusqueda = limpiar(busqueda);

  const contenidoVacio = () => {
    if (cargando) return <EstadoVacio cargando texto={`Buscando ${p.plural}...`} />;
    if (errorCarga) {
      return (
        <EstadoVacio
          icono="cloud-offline-outline"
          titulo="No pudimos cargar la lista"
          texto={errorCarga}
          accion={{ texto: 'Reintentar', alPresionar: reintentar }}
        />
      );
    }
    if (textoBusqueda) {
      return (
        <EstadoVacio
          icono="search-outline"
          titulo={`No encontramos «${textoBusqueda}»`}
          texto={puedeCrear ? `Si no existe, podés crearl${p.final} ahora.` : 'Probá con otra palabra.'}
          accion={
            puedeCrear
              ? { texto: `Crear «${textoBusqueda.slice(0, 24)}»`, alPresionar: () => abrirFormulario(null, textoBusqueda) }
              : { texto: 'Limpiar búsqueda', alPresionar: () => setBusqueda('') }
          }
        />
      );
    }
    return (
      <EstadoVacio
        icono={icono}
        titulo={`Todavía no hay ${p.plural}`}
        texto={puedeCrear ? `Creá ${p.el} primer${p.final} con el botón ${p.nuevo}.` : ''}
      />
    );
  };

  const pieLista = () => {
    if (errorMas) {
      return (
        <Pressable style={estilos.pieError} onPress={reintentarMas}>
          <Ionicons name="refresh" size={16} color={colores.marca} />
          <Text style={estilos.textoPieError}>No pudimos traer más. Tocá para reintentar.</Text>
        </Pressable>
      );
    }
    if (cargandoMas) return <ActivityIndicator style={estilos.cargandoMas} color={colores.marca} />;
    return null;
  };

  const cambios = tieneCambios(formulario);
  const sinCambiosAlEditar = Boolean(formulario?.id) && !cambios;

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <View style={estilos.cabecera}>
        <BarraVolver
          texto="Gestión"
          derecha={
            puedeCrear ? (
              <Pressable
                style={({ pressed }) => [estilos.botonNuevo, pressed && estilos.presionado]}
                onPress={() => abrirFormulario(null)}
                accessibilityRole="button"
              >
                <Feather name="plus" size={18} color={colores.textoSobreMarca} />
                <Text style={estilos.textoNuevo}>{p.nuevo}</Text>
              </Pressable>
            ) : null
          }
        />
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.subtitulo}>
          {puedeEditar
            ? `Tocá ${p.un} ${singular} para corregirl${p.final}.`
            : `Podés ver ${p.los} ${p.plural}, pero no modificarl${p.final}s.`}
        </Text>
        {ayuda ? <CuadroAyuda id={`abm-${clave}`} cerrable titulo="Antes de empezar" texto={ayuda} /> : null}
        <View style={estilos.buscador}>
          <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
          <TextInput
            style={estilos.entradaBusqueda}
            placeholder={`Buscar ${p.un} ${singular}`}
            placeholderTextColor={colores.textoTenue}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            returnKeyType="search"
            maxLength={60}
          />
          {cargando && items.length > 0 ? <ActivityIndicator size="small" color={colores.marca} /> : null}
          {busqueda !== '' && (
            <Pressable onPress={() => setBusqueda('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={18} color={colores.textoTenue} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={estilos.lista}
        ListEmptyComponent={contenidoVacio}
        ListFooterComponent={pieLista}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={actualizando} onRefresh={actualizar} tintColor={colores.marca} colors={[colores.marca]} />
        }
        keyboardShouldPersistTaps="handled"
      />

      <Modal visible={formulario !== null} transparent animationType="slide" onRequestClose={() => cerrarFormulario()}>
        <KeyboardAvoidingView style={estilos.velo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={estilos.zonaCierre} onPress={() => cerrarFormulario()} accessibilityLabel="Cerrar" />
          {formulario && (
            <View style={estilos.hoja}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={estilos.tituloHoja}>
                  {formulario.id ? `Editar ${singular}` : `${p.nuevo} ${singular}`}
                </Text>
                <CampoTexto
                  etiqueta="Nombre"
                  icono="tag"
                  placeholder={ejemploNombre}
                  valor={formulario.nombre}
                  alCambiar={cambiar('nombre')}
                  alSalir={salirDe('nombre', validarNombre)}
                  error={errores.nombre ?? ''}
                  ayudaAlEnfocar={`Hasta ${maximoNombre} caracteres. Evitá símbolos como < > { } [ ].`}
                  maxLength={maximoNombre + 10}
                  autoCapitalize="words"
                  editable={!guardando}
                />
                <CampoTexto
                  etiqueta="Descripción"
                  opcional
                  icono="align-left"
                  placeholder={ejemploDescripcion}
                  valor={formulario.descripcion}
                  alCambiar={cambiar('descripcion')}
                  alSalir={salirDe('descripcion', validarDescripcion)}
                  error={errores.descripcion ?? ''}
                  ayudaAlEnfocar={`Hasta ${MAXIMO_DESCRIPCION} caracteres.`}
                  maxLength={MAXIMO_DESCRIPCION + 10}
                  editable={!guardando}
                  returnKeyType="done"
                  onSubmitEditing={guardar}
                />
                {conActivo && (
                  <View style={estilos.filaSwitch}>
                    <View style={estilos.textosFila}>
                      <Text style={estilos.etiquetaSwitch}>{textoActivo?.etiqueta}</Text>
                      <Text style={estilos.ayudaSwitch}>{textoActivo?.ayuda}</Text>
                    </View>
                    <Switch
                      value={formulario.activo}
                      onValueChange={cambiar('activo')}
                      disabled={guardando}
                      trackColor={{ true: colores.marca, false: colores.borde }}
                      thumbColor={colores.superficie}
                      accessibilityLabel={textoActivo?.etiqueta}
                    />
                  </View>
                )}
                {errorGeneral !== '' && (
                  <View style={estilos.errorGeneral}>
                    <Feather name="alert-circle" size={16} color={colores.peligro} />
                    <Text style={estilos.textoErrorGeneral}>{errorGeneral}</Text>
                  </View>
                )}
                {confirmarDescarte ? (
                  <View style={estilos.descarte}>
                    <Text style={estilos.textoDescarte}>Tenés cambios sin guardar. ¿Querés descartarlos?</Text>
                    <View style={estilos.botonesHoja}>
                      <Pressable
                        style={[estilos.botonHoja, estilos.botonCancelar]}
                        onPress={() => setConfirmarDescarte(false)}
                      >
                        <Text style={estilos.textoCancelar}>Seguir editando</Text>
                      </Pressable>
                      <Pressable style={[estilos.botonHoja, estilos.botonDescartar]} onPress={() => cerrarFormulario(true)}>
                        <Text style={estilos.textoDescartar}>Descartar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    {sinCambiosAlEditar && <Text style={estilos.sinCambios}>Cambiá algún dato para poder guardar.</Text>}
                    <View style={estilos.botonesHoja}>
                      <Pressable
                        style={[estilos.botonHoja, estilos.botonCancelar]}
                        onPress={() => cerrarFormulario()}
                        disabled={guardando}
                      >
                        <Text style={estilos.textoCancelar}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        style={[estilos.botonHoja, estilos.botonGuardar, sinCambiosAlEditar && estilos.botonApagado]}
                        onPress={guardar}
                        disabled={guardando || sinCambiosAlEditar}
                      >
                        {guardando ? (
                          <ActivityIndicator color={colores.textoSobreMarca} />
                        ) : (
                          <Text style={[estilos.textoGuardar, sinCambiosAlEditar && estilos.textoApagado]}>Guardar</Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    cabecera: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    botonNuevo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 38,
      paddingHorizontal: 16,
      borderRadius: 19,
      backgroundColor: c.marca,
    },
    textoNuevo: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.textoSobreMarca },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 36, color: c.titulo, marginBottom: -8 },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
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
    entradaBusqueda: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    lista: { padding: 20, gap: 10, flexGrow: 1 },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    presionado: { opacity: 0.85 },
    inicial: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inicialApagada: { opacity: 0.5 },
    inicialTexto: { fontFamily: 'Inter_700Bold', fontSize: 16, color: c.marca },
    textosFila: { flex: 1, gap: 2 },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    descripcion: { fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textoSecundario },
    etiquetaApagada: {
      alignSelf: 'flex-start',
      marginTop: 4,
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      letterSpacing: 1,
      color: c.textoSecundario,
      backgroundColor: c.superficieActiva,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    botonBaja: { padding: 6 },
    cargandoMas: { marginVertical: 16 },
    pieError: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    textoPieError: { fontFamily: 'Inter_500Medium', fontSize: 13.5, color: c.marca },
    velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.velo },
    zonaCierre: { flex: 1 },
    hoja: {
      maxHeight: '88%',
      padding: 22,
      paddingBottom: 32,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: c.fondo,
    },
    tituloHoja: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
    etiquetaSwitch: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    ayudaSwitch: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 17, color: c.textoSecundario },
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
    descarte: {
      marginTop: 18,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.fondoAdvertencia,
    },
    textoDescarte: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, color: c.texto },
    sinCambios: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: c.textoTenue,
      textAlign: 'center',
      marginTop: 18,
    },
    botonesHoja: { flexDirection: 'row', gap: 12, marginTop: 18 },
    botonHoja: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    botonCancelar: { borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie },
    botonGuardar: { backgroundColor: c.marca },
    botonDescartar: { backgroundColor: c.peligro },
    botonApagado: { backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde },
    textoCancelar: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    textoGuardar: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSobreMarca },
    textoDescartar: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
    textoApagado: { color: c.textoTenue },
  });
}
