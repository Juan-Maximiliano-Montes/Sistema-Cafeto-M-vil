import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';
import { useSesion } from '../sesion/SesionContext';
import { useErrorEquipo } from '../sesion/useErrorEquipo';
import { mensajeDeError } from '../api/cliente';
import { consultarProductos } from '../api/stock';
import { conUnidad, stockARevisar } from '../datos/ajustes';
import { limpiar } from '../utilidades/texto';
import EscanerCodigo from './EscanerCodigo';
import EstadoVacio from './EstadoVacio';

const ESPERA = 350;

export default function BuscadorProducto({
  visible,
  titulo = 'Elegí el producto',
  ayuda,
  alCerrar,
  alElegir,
  filtrar,
  ocultarStock = false,
}) {
  const { colores } = useTema();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [busqueda, setBusqueda] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [escaneando, setEscaneando] = useState(false);
  const ultima = useRef(0);
  const montado = useRef(true);
  const entrada = useRef(null);
  const llamadas = useRef({ alCerrar, filtrar, manejarError });
  llamadas.current = { alCerrar, filtrar, manejarError };
  const token = equipo?.token;

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setBusqueda('');
    setCodigo('');
    setResultados([]);
    setHayMas(false);
    setError('');
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const texto = limpiar(busqueda);
    if (!codigo && texto.length < 2) {
      ultima.current += 1;
      setResultados([]);
      setHayMas(false);
      setCargando(false);
      return undefined;
    }
    const espera = setTimeout(async () => {
      const consulta = ++ultima.current;
      setCargando(true);
      try {
        const respuesta = await consultarProductos(token, codigo ? { codigo } : { busqueda: texto });
        if (!montado.current || consulta !== ultima.current) return;
        const { filtrar: filtro } = llamadas.current;
        setResultados(filtro ? respuesta.resultados.filter(filtro) : respuesta.resultados);
        setHayMas(respuesta.hayMas);
        setError('');
      } catch (problema) {
        if (!montado.current || consulta !== ultima.current) return;
        if (problema?.estado === 401 || problema?.estado === 403) {
          llamadas.current.alCerrar();
          llamadas.current.manejarError(problema);
          return;
        }
        setError(mensajeDeError(problema, 'No pudimos buscar el producto.'));
      } finally {
        if (montado.current && consulta === ultima.current) setCargando(false);
      }
    }, codigo ? 0 : ESPERA);
    return () => clearTimeout(espera);
  }, [visible, busqueda, codigo, token]);

  const cambiarTexto = (texto) => {
    setCodigo('');
    setBusqueda(texto);
  };

  const alLeer = (leido) => {
    setEscaneando(false);
    setCodigo(leido);
    setBusqueda(leido);
  };

  const contenidoVacio = () => {
    if (cargando) return <EstadoVacio cargando texto="Buscando..." />;
    if (error) return <EstadoVacio icono="cloud-offline-outline" titulo="No pudimos buscar" texto={error} />;
    if (!codigo && limpiar(busqueda).length < 2) {
      return (
        <EstadoVacio
          icono="barcode-outline"
          titulo="Buscá o escaneá"
          texto="Escribí al menos 2 letras del nombre, la marca o el rubro, o escaneá el código de barras."
          accion={{ texto: 'Escanear código', alPresionar: () => setEscaneando(true) }}
        />
      );
    }
    return (
      <EstadoVacio
        icono="help-circle-outline"
        titulo={codigo ? `No encontramos el código ${codigo}` : 'No encontramos productos para esto'}
        texto="Probá con otra palabra. Si el producto no está cargado, se da de alta desde la web."
      />
    );
  };

  const renderProducto = ({ item }) => (
    <Pressable
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionado]}
      onPress={() => alElegir(item)}
      accessibilityRole="button"
      accessibilityLabel={`Elegir ${item.nombre}`}
    >
      <View style={estilos.textos}>
        <Text style={estilos.nombre}>{item.nombre}</Text>
        <Text style={estilos.detalle}>
          {[item.presentacion, item.marca?.nombre].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={estilos.derecha}>
        {ocultarStock ? null : item.stockActual === null ? (
          <Text style={estilos.detalle}>Sin stock propio</Text>
        ) : stockARevisar(item.stockActual) ? (
          <Text style={estilos.aRevisar}>A revisar</Text>
        ) : (
          <Text style={estilos.stock}>{conUnidad(item.stockActual, item.unidad)}</Text>
        )}
        {item.controlaVencimiento ? <Text style={estilos.etiqueta}>POR LOTE</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={alCerrar}>
      <SafeAreaView style={estilos.pantalla}>
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Pressable onPress={alCerrar} hitSlop={10} style={estilos.cerrar} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={colores.texto} />
          </Pressable>
        </View>
        {ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
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
              autoCorrect={false}
              autoFocus
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
            onPress={() => setEscaneando(true)}
            accessibilityRole="button"
            accessibilityLabel="Escanear código de barras"
          >
            <Ionicons name="scan-outline" size={24} color={colores.textoSobreMarca} />
          </Pressable>
        </View>
        <FlatList
          data={resultados}
          keyExtractor={(item) => item.id}
          renderItem={renderProducto}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={contenidoVacio}
          ListFooterComponent={
            hayMas ? <Text style={estilos.pie}>Mostramos los primeros resultados: escribí más para afinar.</Text> : null
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
        <EscanerCodigo
          visible={escaneando}
          alCerrar={() => setEscaneando(false)}
          alLeer={alLeer}
          alEscribir={() => {
            setEscaneando(false);
            setTimeout(() => entrada.current?.focus(), 400);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    titulo: { flex: 1, fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    cerrar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ayuda: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textoSecundario,
      paddingHorizontal: 20,
      marginTop: 2,
    },
    filaBuscador: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 },
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
    textos: { flex: 1, gap: 2 },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoSecundario },
    derecha: { alignItems: 'flex-end', gap: 4 },
    stock: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.texto },
    aRevisar: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11.5,
      color: c.texto,
      backgroundColor: c.fondoAdvertencia,
      borderColor: c.bordeAdvertencia,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    etiqueta: {
      fontFamily: 'Inter_700Bold',
      fontSize: 9.5,
      letterSpacing: 1,
      color: c.textoSecundario,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    pie: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoTenue, textAlign: 'center', marginTop: 6 },
  });
}
