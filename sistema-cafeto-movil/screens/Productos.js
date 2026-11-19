import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { mensajeDeError } from '../src/api/cliente';
import { unirSinRepetidos } from '../src/api/formas';
import { SECCIONES, listarProductos, listarRubrosDeSeccion } from '../src/api/catalogo';
import { limpiar } from '../src/utilidades/texto';
import TarjetaProducto from '../src/componentes/TarjetaProducto';
import DetalleProducto from '../src/componentes/DetalleProducto';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import Esqueleto from '../src/componentes/Esqueleto';

const ESPERA_BUSQUEDA = 350;
const MARGEN = 20;
const SEPARACION = 12;

function esSeccionValida(clave) {
  return SECCIONES.some((seccion) => seccion.clave === clave);
}

export default function Productos({ route }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const { width } = useWindowDimensions();
  const anchoTarjeta = Math.floor((width - MARGEN * 2 - SEPARACION) / 2);

  const [seccion, setSeccion] = useState('CAFETERIA');
  const [rubro, setRubro] = useState(null);
  const [rubros, setRubros] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [textoBuscado, setTextoBuscado] = useState('');
  const [productos, setProductos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [errorMas, setErrorMas] = useState('');
  const [elegido, setElegido] = useState(null);
  const ultimaConsulta = useRef(0);
  const montado = useRef(true);
  const entrada = useRef(null);
  const lista = useRef(null);

  const datosSeccion = SECCIONES.find((item) => item.clave === seccion) ?? SECCIONES[0];
  const otraSeccion = SECCIONES.find((item) => item.clave !== seccion) ?? SECCIONES[0];

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const pedido = route?.params?.pedido;
  const seccionPedida = route?.params?.seccion;
  const enfocar = route?.params?.enfocar;
  useEffect(() => {
    if (!pedido) return undefined;
    if (esSeccionValida(seccionPedida)) {
      setSeccion(seccionPedida);
      setRubro(null);
      setBusqueda('');
      setTextoBuscado('');
    }
    if (enfocar) {
      const espera = setTimeout(() => entrada.current?.focus(), 350);
      return () => clearTimeout(espera);
    }
    return undefined;
  }, [pedido, seccionPedida, enfocar]);

  useEffect(() => {
    const espera = setTimeout(() => setTextoBuscado(limpiar(busqueda)), ESPERA_BUSQUEDA);
    return () => clearTimeout(espera);
  }, [busqueda]);

  useEffect(() => {
    let vigente = true;
    setRubros([]);
    listarRubrosDeSeccion(seccion)
      .then((respuesta) => {
        if (vigente) setRubros(respuesta.resultados);
      })
      .catch(() => {
        if (vigente) setRubros([]);
      });
    return () => {
      vigente = false;
    };
  }, [seccion]);

  const cargar = useCallback(async (numeroPagina, filtros) => {
    const consulta = ++ultimaConsulta.current;
    try {
      const respuesta = await listarProductos({ ...filtros, pagina: numeroPagina });
      if (!montado.current || consulta !== ultimaConsulta.current) return;
      setProductos((anteriores) =>
        numeroPagina === 1 ? respuesta.resultados : unirSinRepetidos(anteriores, respuesta.resultados)
      );
      setPagina(numeroPagina);
      setHayMas(respuesta.hayMas);
      setError('');
      setErrorMas('');
    } catch (problema) {
      if (!montado.current || consulta !== ultimaConsulta.current) return;
      const mensaje = mensajeDeError(problema, 'No pudimos traer los productos.');
      if (numeroPagina === 1) {
        setError(mensaje);
        setProductos([]);
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
  }, []);

  const filtros = useMemo(() => ({ seccion, rubro, busqueda: textoBuscado }), [seccion, rubro, textoBuscado]);

  useEffect(() => {
    setCargando(true);
    setError('');
    setErrorMas('');
    lista.current?.scrollToOffset({ offset: 0, animated: false });
    cargar(1, filtros);
  }, [filtros, cargar]);

  const cambiarSeccion = (clave) => {
    if (clave === seccion) return;
    setProductos([]);
    setSeccion(clave);
    setRubro(null);
  };

  const elegirRubro = (id) => {
    setRubro((actual) => (actual === id ? null : id));
  };

  const actualizar = () => {
    setActualizando(true);
    cargar(1, filtros);
  };

  const reintentar = () => {
    setCargando(true);
    setError('');
    cargar(1, filtros);
  };

  const cargarMas = () => {
    if (!hayMas || cargando || cargandoMas || errorMas || productos.length === 0) return;
    setCargandoMas(true);
    cargar(pagina + 1, filtros);
  };

  const reintentarMas = () => {
    setErrorMas('');
    setCargandoMas(true);
    cargar(pagina + 1, filtros);
  };

  const buscandoAhora = limpiar(busqueda) !== textoBuscado;

  const contenidoVacio = () => {
    if (cargando || buscandoAhora) {
      return (
        <View style={estilos.grillaEsqueleto}>
          {[0, 1, 2, 3].map((posicion) => (
            <Esqueleto key={posicion} estilo={[estilos.tarjetaEsqueleto, { width: anchoTarjeta }]} />
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <EstadoVacio
          icono="cloud-offline-outline"
          titulo="No pudimos cargar los productos"
          texto={error}
          accion={{ texto: 'Reintentar', alPresionar: reintentar }}
        />
      );
    }
    if (textoBuscado) {
      return (
        <EstadoVacio
          icono="search-outline"
          titulo={`No encontramos «${textoBuscado}» en ${datosSeccion.nombre}`}
          texto="Probá con otra palabra o fijate en la otra sección."
          accion={{ texto: `Buscar en ${otraSeccion.nombre}`, alPresionar: () => cambiarSeccion(otraSeccion.clave) }}
        />
      );
    }
    if (rubro !== null) {
      return (
        <EstadoVacio
          icono="file-tray-outline"
          titulo="Por ahora no hay productos en este rubro"
          accion={{ texto: 'Ver todos', alPresionar: () => setRubro(null) }}
        />
      );
    }
    return <EstadoVacio icono="file-tray-outline" titulo="Pronto vas a ver productos acá" />;
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

  const encabezadoLista = (
    <View style={estilos.encabezadoLista}>
      {rubros.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.chips}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={[estilos.chip, rubro === null && estilos.chipActivo]}
            onPress={() => setRubro(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: rubro === null }}
          >
            <Text style={[estilos.textoChip, rubro === null && estilos.textoChipActivo]}>Todos</Text>
          </Pressable>
          {rubros.map((item) => {
            const activo = rubro === item.id;
            return (
              <Pressable
                key={item.id}
                style={[estilos.chip, activo && estilos.chipActivo]}
                onPress={() => elegirRubro(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
              >
                <Text style={[estilos.textoChip, activo && estilos.textoChipActivo]}>{item.nombre}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <CuadroAyuda
        id="productos-precios"
        cerrable
        icono="pricetag-outline"
        tipo="consejo"
        titulo="Precios del mostrador"
        texto="Son los mismos que pagás en el local. Las ofertas por vencimiento cambian todos los días y valen hasta agotar stock."
      />
    </View>
  );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>Productos</Text>
        <View style={estilos.buscador}>
          <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
          <TextInput
            ref={entrada}
            style={estilos.entrada}
            placeholder={`Buscar en ${datosSeccion.nombre}`}
            placeholderTextColor={colores.textoTenue}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            returnKeyType="search"
            maxLength={60}
          />
          {buscandoAhora || (cargando && productos.length > 0) ? (
            <ActivityIndicator size="small" color={colores.marca} />
          ) : null}
          {busqueda !== '' && (
            <Pressable onPress={() => setBusqueda('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={18} color={colores.textoTenue} />
            </Pressable>
          )}
        </View>
        <View style={estilos.segmento} accessibilityRole="tablist">
          {SECCIONES.map((item) => {
            const activa = item.clave === seccion;
            return (
              <Pressable
                key={item.clave}
                style={[estilos.opcionSegmento, activa && estilos.opcionActiva]}
                onPress={() => cambiarSeccion(item.clave)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
              >
                <Ionicons name={item.icono} size={18} color={activa ? colores.textoSobreMarca : colores.textoSecundario} />
                <Text style={[estilos.textoSegmento, activa && estilos.textoSegmentoActivo]}>{item.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        ref={lista}
        key="grilla"
        data={productos}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TarjetaProducto producto={item} alPresionar={setElegido} estilo={{ width: anchoTarjeta }} />
        )}
        columnWrapperStyle={estilos.columnas}
        contentContainerStyle={estilos.lista}
        ListHeaderComponent={encabezadoLista}
        ListEmptyComponent={contenidoVacio}
        ListFooterComponent={pieLista}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={actualizando} onRefresh={actualizar} tintColor={colores.marca} colors={[colores.marca]} />
        }
      />

      <DetalleProducto producto={elegido} alCerrar={() => setElegido(null)} />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    cabecera: { paddingHorizontal: MARGEN, paddingTop: 12, gap: 12 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 36, color: c.titulo, marginBottom: -6 },
    buscador: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    entrada: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    segmento: {
      flexDirection: 'row',
      gap: 6,
      padding: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    opcionSegmento: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      height: 42,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    opcionActiva: { backgroundColor: c.marca },
    textoSegmento: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: c.textoSecundario },
    textoSegmentoActivo: { color: c.textoSobreMarca },
    encabezadoLista: { gap: 12, marginBottom: 12 },
    chips: { gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    chipActivo: { backgroundColor: c.texto, borderColor: c.texto },
    textoChip: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    textoChipActivo: { color: c.fondo },
    lista: { paddingHorizontal: MARGEN, paddingTop: 14, paddingBottom: 28, flexGrow: 1 },
    columnas: { gap: SEPARACION, marginBottom: SEPARACION },
    grillaEsqueleto: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION },
    tarjetaEsqueleto: { height: 214 },
    cargandoMas: { marginVertical: 16 },
    pieError: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    textoPieError: { fontFamily: 'Inter_500Medium', fontSize: 13.5, color: c.marca },
  });
}
