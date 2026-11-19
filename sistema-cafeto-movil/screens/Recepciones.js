import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTema } from '../src/tema/TemaContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { mensajeDeError } from '../src/api/cliente';
import { listarOrdenesPorRecibir } from '../src/api/compras';
import { formatearFechaLarga, formatearPrecio } from '../src/utilidades/formato';
import BarraVolver from '../src/componentes/BarraVolver';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

export default function Recepciones({ navigation }) {
  const { colores } = useTema();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const propios = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;

  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const vigente = useRef(0);

  const cargar = useCallback(async () => {
    const consulta = ++vigente.current;
    try {
      const lista = await listarOrdenesPorRecibir(token);
      if (consulta !== vigente.current) return;
      setOrdenes(lista);
      setError('');
    } catch (problema) {
      if (consulta !== vigente.current) return;
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setError(mensajeDeError(problema, 'No pudimos traer las órdenes.'));
    } finally {
      if (consulta === vigente.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
  }, [token, manejarError]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      return () => {
        vigente.current += 1;
      };
    }, [cargar])
  );

  const renderOrden = ({ item }) => {
    const conDiferencias = item.estado === 'CON_DIFERENCIAS';
    return (
      <Pressable
        style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionado]}
        onPress={() => navigation.navigate('RecibirOrden', { id: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`Recibir la orden ${item.id} de ${item.proveedor.nombre}`}
      >
        <View style={estilos.filaEntre}>
          <View style={estilos.textos}>
            <Text style={estilos.nombre}>{item.proveedor.nombre}</Text>
            <Text style={estilos.detalle}>
              Orden N° {item.id}
              {item.fecha ? ` · ${formatearFechaLarga(item.fecha)}` : ''} · {item.renglones} producto{item.renglones === 1 ? '' : 's'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colores.textoTenue} />
        </View>
        <View style={estilos.filaEntre}>
          <Text style={[estilos.chipEstado, conDiferencias && propios.chipDiferencias]}>
            {conDiferencias ? 'FALTA MERCADERÍA' : 'POR RECIBIR'}
          </Text>
          {item.total !== null ? <Text style={estilos.detalle}>Pedido por {formatearPrecio(item.total)}</Text> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <FlatList
        data={ordenes}
        keyExtractor={(item) => item.id}
        renderItem={renderOrden}
        contentContainerStyle={estilos.contenido}
        ListHeaderComponent={
          <View style={propios.cabecera}>
            <BarraVolver />
            <Text style={estilos.titulo}>Recibir mercadería</Text>
            <Text style={estilos.subtitulo}>Elegí la orden del proveedor que llegó y controlá lo que entregó.</Text>
            <CuadroAyuda
              id="recepciones-ordenes"
              cerrable
              titulo="Las órdenes salen de la web"
              texto="Acá aparecen las órdenes ya enviadas al proveedor. Para armar o cancelar una orden, o recibir algo que no se pidió, usá la web."
            />
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <EstadoVacio cargando texto="Buscando órdenes..." />
          ) : error ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos traer las órdenes"
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
            <EstadoVacio icono="cube-outline" titulo="No hay mercadería por recibir" texto="Cuando se envíe una orden a un proveedor, aparece acá." />
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
    chipDiferencias: { borderColor: c.bordePeligro, backgroundColor: c.fondoPeligro },
  });
}
