import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTema } from '../src/tema/TemaContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { mensajeDeError } from '../src/api/cliente';
import { listarOfertas } from '../src/api/stock';
import { conUnidad } from '../src/datos/ajustes';
import { aIso, describirVencimiento, formatearPrecio } from '../src/utilidades/formato';
import BarraVolver from '../src/componentes/BarraVolver';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

function claveDelDia() {
  return `cafeto:ofertas-marcadas:${aIso(new Date())}`;
}

export default function OfertasEtiquetar() {
  const { colores } = useTema();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const propios = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;

  const [ofertas, setOfertas] = useState([]);
  const [marcadas, setMarcadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const [lista, guardadas] = await Promise.all([
        listarOfertas(token),
        AsyncStorage.getItem(claveDelDia()).catch(() => null),
      ]);
      if (!montado.current) return;
      let leidas = [];
      try {
        const datos = guardadas ? JSON.parse(guardadas) : [];
        leidas = Array.isArray(datos) ? datos.filter((valor) => typeof valor === 'string') : [];
      } catch (problema) {
        leidas = [];
      }
      setOfertas(lista);
      setMarcadas(leidas);
      setError('');
    } catch (problema) {
      if (!montado.current) return;
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setError(mensajeDeError(problema, 'No pudimos traer las ofertas.'));
    } finally {
      if (montado.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
  }, [token, manejarError]);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  const alternar = (id) => {
    setMarcadas((anteriores) => {
      const nuevas = anteriores.includes(id) ? anteriores.filter((actual) => actual !== id) : [...anteriores, id];
      AsyncStorage.setItem(claveDelDia(), JSON.stringify(nuevas)).catch(() => null);
      return nuevas;
    });
  };

  const hechas = ofertas.filter((oferta) => marcadas.includes(oferta.id)).length;

  const renderOferta = ({ item }) => {
    const marcada = marcadas.includes(item.id);
    return (
      <Pressable
        style={({ pressed }) => [estilos.tarjeta, propios.fila, marcada && propios.filaMarcada, pressed && estilos.presionado]}
        onPress={() => alternar(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcada }}
        accessibilityLabel={`${item.producto.nombre}, lote ${item.lote.numero}`}
      >
        <Ionicons
          name={marcada ? 'checkbox' : 'square-outline'}
          size={26}
          color={marcada ? colores.exito : colores.textoTenue}
        />
        <View style={estilos.textos}>
          <Text style={[estilos.nombre, marcada && propios.tachado]}>{item.producto.nombre}</Text>
          <Text style={estilos.detalle}>
            {[item.producto.presentacion, `Lote ${item.lote.numero}`, describirVencimiento(item.lote.dias)].filter(Boolean).join(' · ')}
          </Text>
          <Text style={estilos.detalle}>Hay {conUnidad(item.lote.cantidad, 'UNIDAD').replace(' u.', '')} para etiquetar</Text>
        </View>
        <View style={propios.precios}>
          <Text style={propios.porcentaje}>-{item.porcentaje}%</Text>
          <Text style={propios.precio}>{formatearPrecio(item.precioOferta)}</Text>
          <Text style={propios.anterior}>{formatearPrecio(item.precio)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <FlatList
        data={ofertas}
        keyExtractor={(item) => item.id}
        renderItem={renderOferta}
        contentContainerStyle={estilos.contenido}
        ListHeaderComponent={
          <View style={propios.cabecera}>
            <BarraVolver />
            <Text style={estilos.titulo}>Ofertas para etiquetar</Text>
            <Text style={estilos.subtitulo}>
              {ofertas.length > 0
                ? `${hechas} de ${ofertas.length} lote${ofertas.length === 1 ? '' : 's'} con la etiqueta puesta.`
                : 'Lotes que hoy se venden con rebaja por vencimiento.'}
            </Text>
            <CuadroAyuda
              id="ofertas-etiquetar"
              cerrable
              tipo="consejo"
              icono="pricetag-outline"
              titulo="Cómo usarla"
              texto="Pegá la etiqueta de oferta en cada lote y tildalo. Las etiquetas se imprimen desde la web; las tildes quedan en este celular hasta mañana."
            />
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <EstadoVacio cargando texto="Buscando las ofertas de hoy..." />
          ) : error ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos traer las ofertas"
              texto={error}
              accion={{
                texto: 'Reintentar',
                alPresionar: () => {
                  setCargando(true);
                  cargar();
                },
              }}
            />
          ) : (
            <EstadoVacio icono="pricetags-outline" titulo="Hoy no hay ofertas" texto="Ningún lote está dentro de los días de rebaja." />
          )
        }
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
      />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    cabecera: { gap: 14 },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    filaMarcada: { borderColor: c.bordeExito, backgroundColor: c.fondoExito },
    tachado: { textDecorationLine: 'line-through', color: c.textoSecundario },
    precios: { alignItems: 'flex-end', gap: 2 },
    porcentaje: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      color: '#FFFFFF',
      backgroundColor: c.exito,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    precio: { fontFamily: 'Inter_700Bold', fontSize: 15, color: c.texto },
    anterior: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoTenue, textDecorationLine: 'line-through' },
  });
}
