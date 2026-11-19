import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useCuentaCliente } from '../src/cliente/CuentaClienteContext';
import { categorias as categoriasDeEjemplo, coloresCategoria } from '../src/datos/ejemplo';
import { formatearNumero, formatearPuntos } from '../src/utilidades/formato';
import { resumirPuntos } from '../src/utilidades/puntos';
import BarraVolver from '../src/componentes/BarraVolver';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import AvisoCuentaCliente from '../src/componentes/AvisoCuentaCliente';

export default function MisPuntos({ navigation }) {
  const { colores } = useTema();
  const { cuenta, cargando, actualizar } = useCuentaCliente();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const puntos = resumirPuntos(cuenta);
  const categorias = cuenta?.categorias?.length ? cuenta.categorias : categoriasDeEjemplo;
  const movimientos = cuenta?.movimientos ?? [];

  if (!cuenta) {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <StatusBar style={colores.barraEstado} />
        <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <BarraVolver />
          <Text style={estilos.titulo}>Mis puntos</Text>
          {cargando ? <EstadoVacio cargando texto="Buscando tus puntos..." /> : <AvisoCuentaCliente />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={actualizar} tintColor={colores.marca} colors={[colores.marca]} />
        }
      >
        <BarraVolver />
        <Text style={estilos.titulo}>Mis puntos</Text>

        {cuenta.ejemplo ? (
          <CuadroAyuda
            icono="flask-outline"
            titulo="Puntos de ejemplo"
            texto="Todavía no está conectado el sistema de la caja. Cuando lo esté, acá vas a ver tus puntos reales."
          />
        ) : null}

        <View style={estilos.tarjeta}>
          <View style={[estilos.chip, { backgroundColor: coloresCategoria[puntos.categoria] ?? colores.marca }]}>
            <Ionicons name="star" size={12} color="#161616" />
            <Text style={estilos.textoChip}>{puntos.categoria.toUpperCase()}</Text>
          </View>
          <View style={estilos.filaPuntos}>
            <Text style={estilos.puntos}>{formatearNumero(puntos.disponibles)}</Text>
            <Text style={estilos.textoPuntos}>puntos para canjear</Text>
          </View>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${puntos.avance}%` }]} />
          </View>
          <View style={estilos.filaEntre}>
            <Text style={estilos.detalle}>{formatearNumero(puntos.acumulados)} acumulados</Text>
            <Text style={estilos.detalle}>
              {puntos.proxima ? `Te faltan ${formatearNumero(puntos.faltan)} para ${puntos.proxima}` : 'Categoría máxima'}
            </Text>
          </View>
          <View style={estilos.acciones}>
            <Pressable
              style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('MiQR')}
            >
              <Ionicons name="qr-code-outline" size={18} color={colores.textoSobreMarca} />
              <Text style={estilos.textoBotonPrincipal}>Mostrar mi QR</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('Principal', { screen: 'Beneficios' })}
            >
              <Ionicons name="gift-outline" size={18} color={colores.texto} />
              <Text style={estilos.textoBotonSecundario}>Canjear</Text>
            </Pressable>
          </View>
        </View>

        <Text style={estilos.seccion}>CÓMO SUMÁS</Text>
        <View style={estilos.lista}>
          {categorias.map((categoria, posicion) => {
            const actual = categoria.nombre === puntos.categoria;
            return (
              <View key={categoria.nombre} style={[estilos.fila, posicion > 0 && estilos.divisor, actual && estilos.filaActual]}>
                <View style={[estilos.punto, { backgroundColor: coloresCategoria[categoria.nombre] ?? colores.borde }]} />
                <View style={estilos.textos}>
                  <Text style={estilos.nombreFila}>
                    {categoria.nombre}
                    {actual ? '  ·  tu categoría' : ''}
                  </Text>
                  <Text style={estilos.detalle}>{categoria.desde}</Text>
                </View>
                <Text style={estilos.detalle}>{categoria.tasa}</Text>
              </View>
            );
          })}
        </View>

        <Text style={estilos.seccion}>TUS MOVIMIENTOS</Text>
        <View style={estilos.lista}>
          {movimientos.length === 0 ? (
            <Text style={[estilos.detalle, estilos.vacio]}>Todavía no tenés movimientos.</Text>
          ) : (
            movimientos.map((movimiento, posicion) => (
              <View key={movimiento.id} style={[estilos.fila, posicion > 0 && estilos.divisor]}>
                <View style={estilos.textos}>
                  <Text style={estilos.nombreFila}>{movimiento.concepto}</Text>
                  <Text style={estilos.detalle}>{movimiento.fecha}</Text>
                </View>
                <Text
                  style={[
                    estilos.puntosMovimiento,
                    movimiento.puntos > 0 && estilos.suma,
                    movimiento.puntos < 0 && estilos.resta,
                  ]}
                >
                  {movimiento.puntos === 0 ? '—' : formatearPuntos(movimiento.puntos)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 14 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 38, color: c.titulo },
    tarjeta: {
      gap: 12,
      padding: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    chip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    textoChip: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#161616' },
    filaPuntos: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    puntos: { fontFamily: 'Inter_700Bold', fontSize: 40, color: c.texto },
    textoPuntos: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    barra: { height: 6, borderRadius: 3, backgroundColor: c.bordeAdvertencia, overflow: 'hidden' },
    barraRelleno: { height: 6, borderRadius: 3, backgroundColor: c.marca },
    filaEntre: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoSecundario },
    acciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
    botonPrincipal: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      height: 48,
      borderRadius: 12,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoBotonPrincipal: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSobreMarca },
    botonSecundario: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoBotonSecundario: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    presionado: { opacity: 0.85 },
    seccion: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: c.textoSecundario, marginTop: 6 },
    lista: { borderRadius: 16, borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, overflow: 'hidden' },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    filaActual: { backgroundColor: c.marcaSuave },
    divisor: { borderTopWidth: 1, borderTopColor: c.divisor },
    punto: { width: 12, height: 12, borderRadius: 6 },
    textos: { flex: 1, gap: 2 },
    nombreFila: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    puntosMovimiento: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.textoSecundario },
    suma: { color: c.exito },
    resta: { color: c.peligro },
    vacio: { padding: 14 },
  });
}
