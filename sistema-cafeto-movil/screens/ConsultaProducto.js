import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { mensajeDeError } from '../src/api/cliente';
import { unirSinRepetidos } from '../src/api/formas';
import { consultarProductos } from '../src/api/stock';
import { A_REVISAR, TIPOS_ALERTA } from '../src/datos/alertas';
import { stockARevisar, usadoDeMas } from '../src/datos/ajustes';
import { describirVencimiento, formatearCantidad, formatearFechaLarga, formatearPrecio } from '../src/utilidades/formato';
import { limpiar } from '../src/utilidades/texto';
import BarraVolver from '../src/componentes/BarraVolver';
import EscanerCodigo from '../src/componentes/EscanerCodigo';
import EstadoVacio from '../src/componentes/EstadoVacio';
import ImagenProducto from '../src/componentes/ImagenProducto';

const ESPERA_BUSQUEDA = 400;

export default function ConsultaProducto({ navigation, route }) {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo, sesionVencida, tienePermiso } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;
  const puedeMerma = tienePermiso('registrar_merma');

  const [busqueda, setBusqueda] = useState('');
  const [codigo, setCodigo] = useState('');
  const [filtro, setFiltro] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [errorMas, setErrorMas] = useState('');
  const [escaneando, setEscaneando] = useState(false);
  const ultimaConsulta = useRef(0);
  const montado = useRef(true);
  const entrada = useRef(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const pedida = route?.params?.busqueda;
  useEffect(() => {
    if (typeof pedida === 'string' && limpiar(pedida)) {
      setCodigo('');
      setBusqueda(limpiar(pedida));
    }
  }, [pedida]);

  useEffect(() => {
    if (codigo) return undefined;
    const espera = setTimeout(() => {
      const texto = limpiar(busqueda);
      setFiltro(texto.length >= 2 ? { busqueda: texto, codigo: '' } : null);
    }, ESPERA_BUSQUEDA);
    return () => clearTimeout(espera);
  }, [busqueda, codigo]);

  const cargar = useCallback(
    async (numeroPagina, consultaFiltro) => {
      const consulta = ++ultimaConsulta.current;
      try {
        const respuesta = await consultarProductos(token, { ...consultaFiltro, pagina: numeroPagina });
        if (!montado.current || consulta !== ultimaConsulta.current) return;
        setResultados((anteriores) =>
          numeroPagina === 1 ? respuesta.resultados : unirSinRepetidos(anteriores, respuesta.resultados)
        );
        setPagina(numeroPagina);
        setHayMas(respuesta.hayMas);
        setError('');
        setErrorMas('');
      } catch (problema) {
        if (!montado.current || consulta !== ultimaConsulta.current) return;
        if (problema?.estado === 401) {
          sesionVencida();
          avisar('error', 'Tu sesión venció', 'Volvé a entrar con tu usuario del sistema.');
          return;
        }
        const mensaje = mensajeDeError(problema, 'No pudimos consultar el producto.');
        if (numeroPagina === 1) {
          setError(mensaje);
          setResultados([]);
          setHayMas(false);
        } else {
          setErrorMas(mensaje);
        }
      } finally {
        if (montado.current && consulta === ultimaConsulta.current) {
          setCargando(false);
          setCargandoMas(false);
        }
      }
    },
    [token, avisar, sesionVencida]
  );

  useEffect(() => {
    if (!filtro) {
      ultimaConsulta.current += 1;
      setResultados([]);
      setHayMas(false);
      setError('');
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    setErrorMas('');
    cargar(1, filtro);
  }, [filtro, cargar]);

  const cambiarTexto = (texto) => {
    setCodigo('');
    setBusqueda(texto);
  };

  const buscarAhora = () => {
    const texto = limpiar(busqueda);
    if (/^\d{6,14}$/.test(texto)) {
      setCodigo(texto);
      setFiltro({ busqueda: '', codigo: texto });
    } else if (texto.length >= 2) {
      setFiltro({ busqueda: texto, codigo: '' });
    }
  };

  const reintentar = () => {
    if (!filtro) return;
    setCargando(true);
    setError('');
    cargar(1, filtro);
  };

  const cargarMas = () => {
    if (!filtro || !hayMas || cargando || cargandoMas || errorMas || resultados.length === 0) return;
    setCargandoMas(true);
    cargar(pagina + 1, filtro);
  };

  const abrirEscaner = () => setEscaneando(true);

  const escribirCodigo = () => {
    setEscaneando(false);
    setTimeout(() => entrada.current?.focus(), 400);
  };

  const alLeer = (leidoTexto) => {
    setEscaneando(false);
    setCodigo(leidoTexto);
    setBusqueda(leidoTexto);
    setFiltro({ busqueda: '', codigo: leidoTexto });
  };

  const renderResultado = ({ item }) => {
    const sinControlDeStock = item.stockActual === null;
    const aRevisar = stockARevisar(item.stockActual);
    const graves = item.alertas.filter((alerta) => TIPOS_ALERTA[alerta]?.grave);
    const colorStock = aRevisar
      ? colores.marca
      : graves.includes('SIN_STOCK')
      ? colores.peligro
      : item.alertas.includes('STOCK_BAJO')
      ? colores.marca
      : colores.exito;

    return (
      <View style={estilos.tarjeta}>
        <View style={estilos.filaProducto}>
          <ImagenProducto imagen={item.imagen} icono={item.icono} estilo={estilos.foto} tamanoIcono={26} />
          <View style={estilos.textos}>
            <Text style={estilos.nombre}>{item.nombre}</Text>
            <Text style={estilos.detalle}>
              {[item.presentacion, item.marca?.nombre, item.rubro?.nombre].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={estilos.precios}>
            <Text style={estilos.precio}>{formatearPrecio(item.precioOferta ?? item.precio)}</Text>
            {item.precioOferta !== null ? <Text style={estilos.precioAnterior}>{formatearPrecio(item.precio)}</Text> : null}
          </View>
        </View>

        <View style={estilos.datos}>
          <View style={estilos.dato}>
            <Ionicons name="cube-outline" size={16} color={sinControlDeStock ? colores.textoTenue : colorStock} />
            <Text style={estilos.textoDato}>
              {sinControlDeStock
                ? 'Se prepara en el local'
                : aRevisar
                ? `Stock a revisar: ${usadoDeMas(item.stockActual, item.unidad)}. Falta cargar la compra o contarlo.`
                : `Stock: ${formatearCantidad(item.stockActual)}${
                    item.stockMinimo ? ` · mínimo ${formatearCantidad(item.stockMinimo)}` : ''
                  }`}
            </Text>
          </View>
          {item.proximoVencimiento ? (
            <View style={estilos.dato}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={item.proximoVencimiento.dias <= 3 ? colores.marca : colores.textoSecundario}
              />
              <Text style={estilos.textoDato}>
                {describirVencimiento(item.proximoVencimiento.dias)}
                {item.proximoVencimiento.fecha ? ` (${formatearFechaLarga(item.proximoVencimiento.fecha)})` : ''}
                {item.proximoVencimiento.lote ? ` · lote ${item.proximoVencimiento.lote}` : ''}
              </Text>
            </View>
          ) : item.controlaVencimiento ? (
            <View style={estilos.dato}>
              <Ionicons name="calendar-outline" size={16} color={colores.textoTenue} />
              <Text style={estilos.textoDato}>Sin lotes vigentes cargados</Text>
            </View>
          ) : null}
          {item.codigoBarras ? (
            <View style={estilos.dato}>
              <Ionicons name="barcode-outline" size={16} color={colores.textoSecundario} />
              <Text style={estilos.textoDato} selectable>
                {item.codigoBarras}
              </Text>
            </View>
          ) : null}
        </View>

        {item.alertas.length > 0 && (
          <View style={estilos.etiquetas}>
            {item.alertas.map((alerta) => {
              const datos = aRevisar && alerta === 'SIN_STOCK' ? A_REVISAR : TIPOS_ALERTA[alerta];
              return (
                <View key={alerta} style={[estilos.etiqueta, datos.grave ? estilos.etiquetaGrave : estilos.etiquetaLeve]}>
                  <Ionicons name={datos.icono} size={13} color={datos.grave ? colores.peligro : colores.marca} />
                  <Text style={estilos.textoEtiqueta}>{datos.etiqueta}</Text>
                </View>
              );
            })}
          </View>
        )}
        {puedeMerma && item.stockActual !== null && item.stockActual > 0 ? (
          <Pressable
            style={({ pressed }) => [estilos.botonMerma, pressed && estilos.presionado]}
            onPress={() => navigation.navigate('Merma', { producto: item })}
            accessibilityRole="button"
            accessibilityLabel={`Cargar merma de ${item.nombre}`}
          >
            <Ionicons name="trash-outline" size={15} color={colores.textoSecundario} />
            <Text style={estilos.textoMerma}>Cargar merma</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const contenidoVacio = () => {
    if (cargando) return <EstadoVacio cargando texto="Buscando en el sistema..." />;
    if (error) {
      return (
        <EstadoVacio
          icono="cloud-offline-outline"
          titulo="No pudimos consultar"
          texto={error}
          accion={{ texto: 'Reintentar', alPresionar: reintentar }}
        />
      );
    }
    if (!filtro) {
      return (
        <EstadoVacio
          icono="barcode-outline"
          titulo="Buscá un producto"
          texto="Escribí al menos 2 letras del nombre, la marca o el rubro, o escaneá el código de barras."
          accion={{ texto: 'Escanear código', alPresionar: abrirEscaner }}
        />
      );
    }
    if (filtro.codigo) {
      return (
        <EstadoVacio
          icono="help-circle-outline"
          titulo={`No encontramos el código ${filtro.codigo}`}
          texto="Puede que el producto todavía no esté cargado. Si es nuevo, cargalo desde la web."
          accion={{ texto: 'Escanear otro', alPresionar: abrirEscaner }}
        />
      );
    }
    return (
      <EstadoVacio
        icono="search-outline"
        titulo={`No encontramos «${filtro.busqueda}»`}
        texto="Probá con otra palabra, la marca o el rubro."
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <View style={estilos.cabecera}>
        <BarraVolver texto="Volver" />
        <Text style={estilos.titulo}>Consultar producto</Text>
        <Text style={estilos.subtitulo}>Precio, stock y vencimientos en el momento.</Text>
        <View style={estilos.filaBuscador}>
          <View style={estilos.buscador}>
            <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
            <TextInput
              ref={entrada}
              style={estilos.entrada}
              placeholder="Nombre, marca o código"
              placeholderTextColor={colores.textoTenue}
              value={busqueda}
              onChangeText={cambiarTexto}
              onSubmitEditing={buscarAhora}
              autoCorrect={false}
              returnKeyType="search"
              maxLength={60}
            />
            {cargando && resultados.length > 0 ? <ActivityIndicator size="small" color={colores.marca} /> : null}
            {busqueda !== '' && (
              <Pressable onPress={() => cambiarTexto('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={18} color={colores.textoTenue} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [estilos.botonEscanear, pressed && estilos.presionado]}
            onPress={abrirEscaner}
            accessibilityRole="button"
            accessibilityLabel="Escanear código de barras"
          >
            <Ionicons name="scan-outline" size={24} color={colores.textoSobreMarca} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={resultados}
        keyExtractor={(item) => item.id}
        renderItem={renderResultado}
        contentContainerStyle={estilos.lista}
        ListEmptyComponent={contenidoVacio}
        ListFooterComponent={
          errorMas ? (
            <Pressable
              style={estilos.pieError}
              onPress={() => {
                setErrorMas('');
                setCargandoMas(true);
                cargar(pagina + 1, filtro);
              }}
            >
              <Ionicons name="refresh" size={16} color={colores.marca} />
              <Text style={estilos.enlace}>No pudimos traer más. Tocá para reintentar.</Text>
            </Pressable>
          ) : cargandoMas ? (
            <ActivityIndicator style={estilos.cargandoMas} color={colores.marca} />
          ) : null
        }
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <EscanerCodigo
        visible={escaneando}
        alCerrar={() => setEscaneando(false)}
        alLeer={alLeer}
        alEscribir={escribirCodigo}
      />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    cabecera: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 34, color: c.titulo, marginBottom: -8 },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    filaBuscador: { flexDirection: 'row', gap: 10 },
    buscador: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 50,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    entrada: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    botonEscanear: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    presionado: { opacity: 0.85 },
    lista: { padding: 20, gap: 12, flexGrow: 1 },
    tarjeta: {
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    filaProducto: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    foto: { width: 56, height: 56, borderRadius: 12 },
    textos: { flex: 1, gap: 2 },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoSecundario },
    precios: { alignItems: 'flex-end' },
    precio: { fontFamily: 'Inter_700Bold', fontSize: 16, color: c.texto },
    precioAnterior: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoTenue, textDecorationLine: 'line-through' },
    datos: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.divisor },
    dato: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    textoDato: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.texto },
    etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    etiqueta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    etiquetaGrave: { backgroundColor: c.fondoPeligro, borderColor: c.bordePeligro },
    etiquetaLeve: { backgroundColor: c.fondoAdvertencia, borderColor: c.bordeAdvertencia },
    textoEtiqueta: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: c.texto },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.marca },
    pieError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
    cargandoMas: { marginVertical: 16 },
    botonMerma: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficieActiva,
    },
    textoMerma: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.textoSecundario },
  });
}
