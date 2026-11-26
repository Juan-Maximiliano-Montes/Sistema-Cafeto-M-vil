import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { mensajeDeError } from '../src/api/cliente';
import { cargarConteo, enviarConteo, iniciarConteo, leerConteo } from '../src/api/ajustes';
import { listarLotes } from '../src/api/stock';
import { MOTIVOS_AJUSTE, conUnidad, textoMotivo } from '../src/datos/ajustes';
import { aIso, describirVencimiento, formatearFechaLarga } from '../src/utilidades/formato';
import { hapticExito, hapticImpactoSuave } from '../src/utilidades/haptics';
import { limpiar } from '../src/utilidades/texto';
import { leerCantidad, validarCantidad, validarTextoCatalogo } from '../src/utilidades/validaciones';
import BarraVolver from '../src/componentes/BarraVolver';
import BuscadorProducto from '../src/componentes/BuscadorProducto';
import CampoTexto from '../src/componentes/CampoTexto';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import { BotonAyuda } from '../src/componentes/HojaAyuda';
import Opciones from '../src/componentes/Opciones';
import SelectorFecha from '../src/componentes/SelectorFecha';
import SelectorLote from '../src/componentes/SelectorLote';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

const AYUDA_CONTEO = [
  {
    icono: 'eye-off-outline',
    titulo: 'Conteo a ciegas',
    texto: 'La app no muestra el stock teórico mientras contás para evitar sesgos. Quien autoriza ve las diferencias.',
  },
  {
    icono: 'create-outline',
    titulo: 'Corregir un renglón',
    texto: 'Si te equivocaste al anotar un producto, tocalo en la lista para reemplazar la cantidad antes de enviar.',
  },
  {
    icono: 'calendar-outline',
    titulo: 'Lotes no registrados',
    texto: 'Si encontrás un envase cuyo lote no aparece en el sistema, elegí «Un lote que no figura» y cargá su vencimiento.',
  },
];

const conStockPropio = (producto) => producto.stockActual !== null;

function hoyMas(dias) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

const HOJA_VACIA = {
  producto: null,
  lotes: [],
  cargandoLotes: false,
  errorLotes: '',
  idLote: null,
  nuevo: false,
  vence: null,
  numero: '',
  contada: '',
  errores: {},
  error: '',
};

export default function Conteo() {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const propios = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;

  const [conteo, setConteo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('DIFERENCIA_CONTEO');
  const [trabajando, setTrabajando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [hoja, setHoja] = useState(null);
  const montado = useRef(true);

  const tratarError = useCallback(
    (problema, porDefecto) => {
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return '';
      }
      return mensajeDeError(problema, porDefecto);
    },
    [manejarError]
  );

  const cargar = useCallback(async () => {
    try {
      const actual = await leerConteo(token);
      if (!montado.current) return;
      setConteo(actual);
      setError('');
    } catch (problema) {
      if (!montado.current) return;
      setError(tratarError(problema, 'No pudimos traer el conteo.'));
    } finally {
      if (montado.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
  }, [token, tratarError]);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  const empezar = async () => {
    if (trabajando) return;
    setTrabajando(true);
    try {
      const nuevo = await iniciarConteo(token, motivo);
      if (!montado.current) return;
      setConteo(nuevo);
    } catch (problema) {
      if (!montado.current) return;
      const mensaje = tratarError(problema, 'No pudimos empezar el conteo.');
      if (mensaje) avisar('advertencia', 'No se pudo empezar', mensaje);
      cargar();
    } finally {
      if (montado.current) setTrabajando(false);
    }
  };

  const cargarLotesDe = async (producto, idPreferido = null) => {
    try {
      const lotes = await listarLotes(token, producto.id);
      if (!montado.current) return;
      setHoja((anterior) => {
        if (!anterior || anterior.producto?.id !== producto.id) return anterior;
        const elegido = lotes.some((lote) => lote.id === idPreferido) ? idPreferido : lotes[0]?.id ?? null;
        return { ...anterior, lotes, cargandoLotes: false, idLote: elegido, nuevo: lotes.length === 0 };
      });
    } catch (problema) {
      if (!montado.current) return;
      const mensaje = tratarError(problema, 'No pudimos traer los lotes.');
      setHoja((anterior) => (anterior ? { ...anterior, cargandoLotes: false, errorLotes: mensaje } : anterior));
    }
  };

  const abrirHoja = (producto, renglon = null) => {
    setBuscando(false);
    setHoja({
      ...HOJA_VACIA,
      producto,
      cargandoLotes: producto.controlaVencimiento,
      idLote: renglon?.lote?.id ?? null,
      contada: renglon?.contada !== null && renglon?.contada !== undefined ? String(renglon.contada).replace('.', ',') : '',
    });
    if (producto.controlaVencimiento) cargarLotesDe(producto, renglon?.lote?.id ?? null);
  };

  const guardarRenglon = async () => {
    if (!hoja || trabajando) return;
    const { producto } = hoja;
    const errores = {
      contada: validarCantidad(hoja.contada, { etiqueta: 'Lo contado', entera: producto.cantidadEntera, permitirCero: !hoja.nuevo }),
      lote: producto.controlaVencimiento && !hoja.nuevo && hoja.idLote === null ? 'Elegí el lote o marcá que es uno nuevo.' : '',
      vence: hoja.nuevo && !hoja.vence ? 'Indicá cuándo vence el lote nuevo.' : '',
      numero: hoja.nuevo
        ? validarTextoCatalogo(hoja.numero, { etiqueta: 'El número de lote', minimo: 1, maximo: 40, obligatorio: false })
        : '',
    };
    if (Object.values(errores).some(Boolean)) {
      setHoja((anterior) => ({ ...anterior, errores }));
      return;
    }
    setTrabajando(true);
    try {
      const datos = { producto: producto.id, contada: leerCantidad(hoja.contada) };
      if (hoja.nuevo) {
        datos.nuevo_lote = { fecha_vencimiento: aIso(hoja.vence), numero_lote: limpiar(hoja.numero) || null };
      } else if (hoja.idLote !== null) {
        datos.lote = hoja.idLote;
      }
      const actualizado = await cargarConteo(token, datos);
      if (!montado.current) return;
      hapticImpactoSuave();
      setConteo(actualizado);
      setHoja(null);
    } catch (problema) {
      if (!montado.current) return;
      const mensaje = tratarError(problema, 'No pudimos anotar lo contado.');
      if (!mensaje) {
        setHoja(null);
        return;
      }
      setHoja((anterior) => (anterior ? { ...anterior, error: mensaje } : anterior));
      if (problema?.estado === 400) cargar();
    } finally {
      if (montado.current) setTrabajando(false);
    }
  };

  const enviar = () => {
    avisar(
      'advertencia',
      '¿Enviar el conteo a revisión?',
      'Después ya no se pueden agregar productos. El stock se corrige cuando lo apruebe quien autoriza ajustes.',
      [
        { texto: 'Seguir contando', estilo: 'cancelar' },
        {
          texto: 'Enviar',
          alPresionar: async () => {
            setTrabajando(true);
            try {
              const enviado = await enviarConteo(token);
              if (!montado.current) return;
              hapticExito();
              setConteo(enviado);
              avisar('exito', 'Conteo enviado', 'Ahora lo revisa quien autoriza los ajustes.');
            } catch (problema) {
              if (!montado.current) return;
              const mensaje = tratarError(problema, 'No pudimos enviar el conteo.');
              if (mensaje) avisar('advertencia', 'No se pudo enviar', mensaje);
              cargar();
            } finally {
              if (montado.current) setTrabajando(false);
            }
          },
        },
      ]
    );
  };

  const renderRenglones = (editable) =>
    conteo.renglones.length === 0 ? (
      <Text style={estilos.detalle}>Todavía no anotaste nada. Empezá por una góndola y seguí en orden.</Text>
    ) : (
      conteo.renglones.map((renglon) => (
        <Pressable
          key={renglon.clave}
          style={({ pressed }) => [estilos.tarjeta, pressed && editable && estilos.presionado]}
          onPress={editable ? () => abrirHoja(renglon.producto, renglon) : undefined}
          disabled={!editable}
          accessibilityRole={editable ? 'button' : undefined}
          accessibilityLabel={editable ? `Volver a contar ${renglon.producto.nombre}` : undefined}
        >
          <View style={estilos.filaEntre}>
            <View style={estilos.textos}>
              <Text style={estilos.nombre}>{renglon.producto.nombre}</Text>
              <Text style={estilos.detalle}>
                {[renglon.producto.presentacion, renglon.lote ? `Lote ${renglon.lote.numero}` : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={propios.contada}>{conUnidad(renglon.contada ?? 0, renglon.producto.unidad)}</Text>
          </View>
        </Pressable>
      ))
    );

  const renderContenido = () => {
    if (cargando) return <EstadoVacio cargando texto="Buscando el conteo abierto..." />;
    if (error) {
      return (
        <EstadoVacio
          icono="cloud-offline-outline"
          titulo="No pudimos cargar el conteo"
          texto={error}
          accion={{
            texto: 'Reintentar',
            alPresionar: () => {
              setCargando(true);
              cargar();
            },
          }}
        />
      );
    }
    if (!conteo) {
      return (
        <View style={estilos.tarjeta}>
          <Text style={estilos.nombre}>No hay ningún conteo abierto</Text>
          <Text style={estilos.detalle}>Puede haber uno solo a la vez. Elegí el motivo y empezá.</Text>
          <Opciones opciones={MOTIVOS_AJUSTE.CONTEO} elegida={motivo} alElegir={setMotivo} deshabilitado={trabajando} />
          <Pressable
            style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
            onPress={empezar}
            disabled={trabajando}
            accessibilityRole="button"
          >
            {trabajando ? <ActivityIndicator color={colores.textoSobreMarca} /> : <Text style={estilos.textoBotonPrincipal}>Empezar conteo</Text>}
          </Pressable>
        </View>
      );
    }
    const enCurso = conteo.estado === 'EN_CURSO';
    return (
      <>
        <View style={[estilos.tarjeta, propios.resumen]}>
          <Text style={estilos.chipEstado}>{enCurso ? 'CONTANDO' : 'ESPERA AUTORIZACIÓN'}</Text>
          <Text style={estilos.detalle}>
            {textoMotivo('CONTEO', conteo.motivo)} · lo empezó {conteo.iniciadoPor || 'alguien del equipo'}
            {conteo.fecha ? ` el ${formatearFechaLarga(conteo.fecha)}` : ''}.
          </Text>
          <Text style={estilos.detalle}>
            {conteo.renglones.length} producto{conteo.renglones.length === 1 ? '' : 's'} anotado{conteo.renglones.length === 1 ? '' : 's'}.
          </Text>
        </View>
        {enCurso ? (
          <Pressable
            style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
            onPress={() => setBuscando(true)}
            disabled={trabajando}
            accessibilityRole="button"
          >
            <Ionicons name="barcode-outline" size={20} color={colores.textoSobreMarca} />
            <Text style={estilos.textoBotonPrincipal}>Contar un producto</Text>
          </Pressable>
        ) : (
          <CuadroAyuda
            tipo="consejo"
            icono="time-outline"
            titulo="Esperando autorización"
            texto="Cuando lo apruebe quien autoriza ajustes se corrige el stock. Hasta entonces no se puede empezar otro conteo."
          />
        )}
        <Text style={estilos.seccion}>{enCurso ? 'LO QUE YA CONTASTE' : 'LO QUE SE CONTÓ'}</Text>
        {renderRenglones(enCurso)}
        {enCurso && conteo.renglones.length > 0 ? (
          <Pressable
            style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
            onPress={enviar}
            disabled={trabajando}
            accessibilityRole="button"
          >
            <Feather name="send" size={18} color={colores.texto} />
            <Text style={estilos.textoBotonSecundario}>Terminé: enviar a revisión</Text>
          </Pressable>
        ) : null}
      </>
    );
  };

  const producto = hoja?.producto;

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => {
              setActualizando(true);
              cargar();
            }}
            tintColor={colores.marca}
            colors={[colores.marca]}
          />
        }
      >
        <BarraVolver
          deshabilitado={trabajando}
          derecha={
            <BotonAyuda
              titulo="Contar stock"
              subtitulo="Reglas del inventario físico"
              items={AYUDA_CONTEO}
              nota="Solo puede haber un conteo abierto a la vez en el local."
              deshabilitado={trabajando}
            />
          }
        />
        <Text style={estilos.titulo}>Contar stock</Text>
        <Text style={estilos.subtitulo}>Recorré la góndola o el depósito y anotá lo que hay de verdad.</Text>
        <CuadroAyuda
          id="conteo-a-ciegas"
          cerrable
          titulo="Contá sin mirar el sistema"
          texto="No te mostramos cuánto dice el sistema para que el conteo sea honesto. Si te equivocaste, tocá el producto y volvé a contarlo."
        />
        {renderContenido()}
      </ScrollView>

      <BuscadorProducto
        visible={buscando}
        titulo="¿Qué contaste?"
        ayuda="Buscalo o escaneá el código de barras."
        alCerrar={() => setBuscando(false)}
        alElegir={(elegido) => abrirHoja(elegido)}
        filtrar={conStockPropio}
        ocultarStock
      />

      <Modal visible={hoja !== null} transparent animationType="slide" onRequestClose={() => !trabajando && setHoja(null)}>
        <KeyboardAvoidingView style={propios.velo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={propios.zonaCierre} onPress={() => !trabajando && setHoja(null)} accessibilityLabel="Cerrar" />
          {producto ? (
            <View style={propios.hoja}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={propios.tituloHoja}>{producto.nombre}</Text>
                <Text style={estilos.detalle}>{producto.presentacion}</Text>
                {producto.controlaVencimiento ? (
                  <>
                    <Text style={[estilos.etiqueta, propios.separado]}>¿De qué lote?</Text>
                    <SelectorLote
                      lotes={hoja.lotes}
                      elegido={hoja.idLote}
                      alElegir={(lote) => setHoja((anterior) => ({ ...anterior, idLote: lote.id, nuevo: false, errores: {} }))}
                      unidad={producto.unidad}
                      cargando={hoja.cargandoLotes}
                      error={hoja.errorLotes || hoja.errores.lote || ''}
                      alReintentar={() => {
                        setHoja((anterior) => ({ ...anterior, cargandoLotes: true, errorLotes: '' }));
                        cargarLotesDe(producto, hoja.idLote);
                      }}
                      permitirNuevo
                      nuevoElegido={hoja.nuevo}
                      alElegirNuevo={() => setHoja((anterior) => ({ ...anterior, nuevo: true, idLote: null, errores: {} }))}
                      ocultarCantidad
                    />
                    {hoja.nuevo ? (
                      <>
                        <SelectorFecha
                          etiqueta="Vence el"
                          valor={hoja.vence}
                          alCambiar={(fecha) => setHoja((anterior) => ({ ...anterior, vence: fecha, errores: {} }))}
                          minimo={hoyMas(-365)}
                          maximo={hoyMas(3660)}
                          error={hoja.errores.vence ?? ''}
                          deshabilitado={trabajando}
                        />
                        <CampoTexto
                          etiqueta="Número de lote"
                          opcional
                          icono="tag"
                          placeholder="Como figura en el envase"
                          valor={hoja.numero}
                          alCambiar={(texto) =>
                            setHoja((anterior) =>
                              anterior ? { ...anterior, numero: texto, errores: { ...anterior.errores, numero: '' } } : anterior
                            )
                          }
                          alSalir={() =>
                            setHoja((anterior) => {
                              if (!anterior || !limpiar(anterior.numero)) return anterior;
                              return {
                                ...anterior,
                                errores: {
                                  ...anterior.errores,
                                  numero: validarTextoCatalogo(anterior.numero, {
                                    etiqueta: 'El número de lote',
                                    minimo: 1,
                                    maximo: 40,
                                    obligatorio: false,
                                  }),
                                },
                              };
                            })
                          }
                          error={hoja.errores.numero ?? ''}
                          maxLength={40}
                          editable={!trabajando}
                        />
                      </>
                    ) : hoja.idLote !== null ? (
                      <Text style={[estilos.detalle, propios.separado]}>
                        {describirVencimiento(hoja.lotes.find((lote) => lote.id === hoja.idLote)?.dias)}
                      </Text>
                    ) : null}
                  </>
                ) : null}
                <CampoTexto
                  etiqueta={`¿Cuánto hay? (${conUnidad(1, producto.unidad).replace('1 ', '')})`}
                  icono="hash"
                  placeholder={producto.cantidadEntera ? 'Ej.: 12' : 'Ej.: 1,250'}
                  valor={hoja.contada}
                  alCambiar={(texto) =>
                    setHoja((anterior) =>
                      anterior
                        ? { ...anterior, contada: texto, errores: { ...anterior.errores, contada: '' }, error: '' }
                        : anterior
                    )
                  }
                  alSalir={() =>
                    setHoja((anterior) => {
                      if (!anterior || !limpiar(anterior.contada)) return anterior;
                      return {
                        ...anterior,
                        errores: {
                          ...anterior.errores,
                          contada: validarCantidad(anterior.contada, {
                            etiqueta: 'Lo contado',
                            entera: anterior.producto.cantidadEntera,
                            permitirCero: !anterior.nuevo,
                          }),
                        },
                      };
                    })
                  }
                  error={hoja.errores.contada ?? ''}
                  ayudaAlEnfocar="Si no hay nada, poné 0."
                  keyboardType="decimal-pad"
                  maxLength={12}
                  editable={!trabajando}
                  autoFocus={!producto.controlaVencimiento}
                  returnKeyType="done"
                  onSubmitEditing={guardarRenglon}
                />
                {hoja.error ? (
                  <View style={[estilos.errorGeneral, propios.separado]}>
                    <Feather name="alert-circle" size={16} color={colores.peligro} />
                    <Text style={estilos.textoErrorGeneral}>{hoja.error}</Text>
                  </View>
                ) : null}
                <View style={propios.botones}>
                  <Pressable style={[estilos.botonSecundario, propios.mitad]} onPress={() => setHoja(null)} disabled={trabajando}>
                    <Text style={estilos.textoBotonSecundario}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[estilos.botonPrincipal, propios.mitad, propios.sinMargen]}
                    onPress={guardarRenglon}
                    disabled={trabajando}
                  >
                    {trabajando ? <ActivityIndicator color={colores.textoSobreMarca} /> : <Text style={estilos.textoBotonPrincipal}>Anotar</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    resumen: { borderColor: c.bordeAdvertencia, backgroundColor: c.marcaSuave },
    contada: { fontFamily: 'Inter_700Bold', fontSize: 15, color: c.texto },
    velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.velo },
    zonaCierre: { flex: 1 },
    hoja: {
      maxHeight: '90%',
      padding: 22,
      paddingBottom: 32,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: c.fondo,
    },
    tituloHoja: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    separado: { marginTop: 10 },
    botones: { flexDirection: 'row', gap: 12, marginTop: 20 },
    mitad: { flex: 1 },
    sinMargen: { marginTop: 0, height: 48 },
  });
}
