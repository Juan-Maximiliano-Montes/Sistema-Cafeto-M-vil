import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { productos, rubros } from '../src/datos/ejemplo';

export default function Carta() {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [rubro, setRubro] = useState('Todo');
  const [busqueda, setBusqueda] = useState('');

  const esInvitado = auth.currentUser?.isAnonymous ?? true;

  const texto = busqueda.trim().toLowerCase();
  const visibles = productos.filter(
    (producto) =>
      (rubro === 'Todo' || producto.rubro === rubro) &&
      producto.nombre.toLowerCase().includes(texto)
  );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={estilos.titulo}>Nuestra carta</Text>
          <Text style={estilos.subtitulo}>
            {esInvitado
              ? 'Mirá los precios. Con una cuenta, cada compra te suma puntos.'
              : 'Pedí en el mostrador y mostrá tu QR para sumar puntos.'}
          </Text>
        </View>

        <View style={estilos.buscador}>
          <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
          <TextInput
            style={estilos.entrada}
            placeholder="Buscar en la carta"
            placeholderTextColor={colores.textoTenue}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda !== '' && (
            <Pressable onPress={() => setBusqueda('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colores.textoTenue} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.rubros}>
          {rubros.map((nombre) => {
            const activo = rubro === nombre;
            return (
              <Pressable key={nombre} style={[estilos.chip, activo && estilos.chipActivo]} onPress={() => setRubro(nombre)}>
                <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{nombre}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visibles.length === 0 ? (
          <View style={estilos.vacio}>
            <Ionicons name="search-outline" size={32} color={colores.textoTenue} />
            <Text style={estilos.subtitulo}>No encontramos productos con ese nombre.</Text>
          </View>
        ) : (
          <View style={estilos.grilla}>
            {visibles.map((producto) => (
              <View key={producto.id} style={estilos.tarjeta}>
                {producto.imagen ? (
                  <Image source={producto.imagen} style={estilos.foto} />
                ) : (
                  <View style={[estilos.foto, estilos.fotoVacia]}>
                    <Ionicons name={producto.icono} size={34} color={colores.marca} />
                  </View>
                )}
                <Text style={estilos.nombre}>{producto.nombre}</Text>
                <Text style={estilos.detalle} numberOfLines={2}>{producto.detalle}</Text>
                <Text style={estilos.precio}>${producto.precio.toLocaleString('es-AR')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 20, gap: 14 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 36, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    buscador: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 14, paddingHorizontal: 14, height: 48,
    },
    entrada: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    rubros: { gap: 8 },
    chip: { borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    chipActivo: { backgroundColor: c.marca, borderColor: c.marca },
    chipTexto: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    chipTextoActivo: { color: c.textoSobreMarca },
    grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
    tarjeta: {
      width: '48%', backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16, padding: 10, gap: 4,
    },
    foto: {
      width: '100%', height: 112, borderRadius: 12, marginBottom: 6,
      backgroundColor: c.marcaSuave, resizeMode: 'cover',
    },
    fotoVacia: { justifyContent: 'center', alignItems: 'center' },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19, minHeight: 19, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, minHeight: 32, color: c.textoSecundario },
    precio: { fontFamily: 'Inter_700Bold', fontSize: 15, color: c.texto, marginTop: 4 },
    vacio: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  });
}
