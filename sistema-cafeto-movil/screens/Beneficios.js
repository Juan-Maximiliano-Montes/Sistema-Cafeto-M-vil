import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { beneficios, cliente, coloresCategoria, ordenCategorias } from '../src/datos/ejemplo';

const filtros = [
  { clave: 'TODOS', texto: 'Todos' },
  { clave: 'AUTOMATICO', texto: 'Automáticos' },
  { clave: 'CANJEABLE', texto: 'Canjeables' },
];

export default function Beneficios() {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [filtro, setFiltro] = useState('TODOS');

  const esInvitado = auth.currentUser?.isAnonymous ?? true;
  const nivelCliente = ordenCategorias.indexOf(cliente.categoria);

  const visibles = beneficios.filter((beneficio) => filtro === 'TODOS' || beneficio.tipo === filtro);

  const irARegistro = async () => {
    await AsyncStorage.setItem('cafeto:abrirRegistro', 'si');
    await signOut(auth);
  };

  const canjear = (beneficio) => {
    if (esInvitado) {
      avisar('advertencia', 'Necesitás una cuenta', 'Creá tu cuenta para sumar puntos y canjear beneficios.');
      return;
    }
    avisar('exito', '¡Canje listo!', `Mostrá tu QR en el mostrador para retirar: ${beneficio.titulo}.`);
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={estilos.titulo}>Beneficios</Text>
          <Text style={estilos.subtitulo}>
            {esInvitado
              ? 'Creá tu cuenta y empezá a sumar puntos'
              : `Sos ${cliente.categoria} · ${cliente.puntosDisponibles} pts para canjear`}
          </Text>
        </View>

        {esInvitado ? (
          <Pressable style={estilos.aviso} onPress={irARegistro}>
            <Ionicons name="lock-closed" size={18} color={colores.marca} />
            <Text style={estilos.avisoTexto}>Mirá todos los beneficios. Para canjearlos necesitás tu cuenta.</Text>
            <Text style={estilos.avisoEnlace}>Crear cuenta</Text>
          </Pressable>
        ) : null}

        <View style={estilos.filtros}>
          {filtros.map((opcion) => {
            const activo = filtro === opcion.clave;
            return (
              <Pressable
                key={opcion.clave}
                style={[estilos.chip, activo && estilos.chipActivo]}
                onPress={() => setFiltro(opcion.clave)}
              >
                <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{opcion.texto}</Text>
              </Pressable>
            );
          })}
        </View>

        {visibles.map((beneficio) => {
          const bloqueado = esInvitado || ordenCategorias.indexOf(beneficio.categoria) > nivelCliente;
          const alcanza = cliente.puntosDisponibles >= beneficio.puntos;

          return (
            <Pressable
              key={beneficio.id}
              style={[estilos.fila, bloqueado && estilos.filaBloqueada]}
              onPress={esInvitado ? () => canjear(beneficio) : undefined}
            >
              <View style={estilos.icono}>
                <Ionicons name={beneficio.icono} size={20} color={colores.marca} />
              </View>
              <View style={estilos.textos}>
                <Text style={estilos.nombre}>{beneficio.titulo}</Text>
                <Text style={estilos.detalle}>
                  {beneficio.tipo === 'CANJEABLE' ? `${beneficio.puntos} pts · ${beneficio.detalle}` : beneficio.detalle}
                </Text>
                <View style={estilos.filaCategoria}>
                  <View style={[estilos.punto, { backgroundColor: coloresCategoria[beneficio.categoria] }]} />
                  <Text style={estilos.detalle}>Disponible desde {beneficio.categoria}</Text>
                </View>
              </View>

              {esInvitado ? (
                <Ionicons name="lock-closed" size={20} color={colores.textoTenue} />
              ) : bloqueado ? (
                <Ionicons name="lock-closed-outline" size={20} color={colores.textoTenue} />
              ) : beneficio.tipo === 'AUTOMATICO' ? (
                <Text style={estilos.activo}>ACTIVO</Text>
              ) : (
                <Pressable
                  style={[estilos.boton, !alcanza && estilos.botonApagado]}
                  disabled={!alcanza}
                  onPress={() => canjear(beneficio)}
                >
                  <Text style={[estilos.botonTexto, !alcanza && estilos.textoApagado]}>
                    {alcanza ? 'Canjear' : `Faltan ${beneficio.puntos - cliente.puntosDisponibles} pts`}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
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
    filtros: { flexDirection: 'row', gap: 8 },
    aviso: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.superficieActiva, borderWidth: 1, borderColor: c.bordeAdvertencia,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    },
    avisoTexto: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12.5, lineHeight: 17, color: c.texto },
    avisoEnlace: { fontFamily: 'Inter_700Bold', fontSize: 12.5, color: c.marca },
    chip: { borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    chipActivo: { backgroundColor: c.marca, borderColor: c.marca },
    chipTexto: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    chipTextoActivo: { color: c.textoSobreMarca },
    fila: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16, padding: 14,
    },
    filaBloqueada: { opacity: 0.55 },
    icono: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.superficieActiva, justifyContent: 'center', alignItems: 'center' },
    textos: { flex: 1, gap: 3 },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoSecundario },
    filaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    punto: { width: 8, height: 8, borderRadius: 4 },
    activo: {
      fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, color: c.exito,
      backgroundColor: c.fondoExito, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden',
    },
    boton: { borderWidth: 1, borderColor: c.marca, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    botonApagado: { borderColor: c.borde },
    botonTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    textoApagado: { color: c.textoTenue },
  });
}
