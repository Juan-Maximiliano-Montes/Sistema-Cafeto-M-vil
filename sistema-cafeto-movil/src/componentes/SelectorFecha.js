import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTema } from '../tema/TemaContext';
import { formatearFechaLarga } from '../utilidades/formato';

function hoyMas(dias) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

export default function SelectorFecha({
  etiqueta,
  valor,
  alCambiar,
  minimo,
  maximo,
  opcional = false,
  error = '',
  atajos = [],
  deshabilitado = false,
}) {
  const { colores, tema } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [abierto, setAbierto] = useState(false);

  const elegir = (evento, fecha) => {
    if (Platform.OS !== 'ios') setAbierto(false);
    if (evento.type === 'dismissed') return;
    if (fecha) alCambiar(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  };

  return (
    <View>
      {etiqueta ? (
        <Text style={estilos.etiqueta}>
          {etiqueta}
          {opcional ? <Text style={estilos.opcional}> · opcional</Text> : null}
        </Text>
      ) : null}
      <Pressable
        style={[estilos.campo, error ? estilos.campoConError : null]}
        onPress={() => setAbierto(true)}
        disabled={deshabilitado}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta ?? 'Fecha'}: ${valor ? formatearFechaLarga(valor) : 'sin elegir'}`}
      >
        <Feather name="calendar" size={20} color={colores.textoSecundario} />
        <Text style={[estilos.texto, !valor && estilos.textoVacio]}>
          {valor ? formatearFechaLarga(valor) : 'Elegí la fecha'}
        </Text>
        <Feather name="chevron-down" size={20} color={colores.textoSecundario} />
      </Pressable>
      {atajos.length > 0 ? (
        <View style={estilos.atajos}>
          {atajos.map((atajo) => (
            <Pressable
              key={atajo.texto}
              style={estilos.atajo}
              onPress={() => alCambiar(hoyMas(atajo.dias))}
              disabled={deshabilitado}
              accessibilityRole="button"
            >
              <Text style={estilos.textoAtajo}>{atajo.texto}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? (
        <View style={estilos.filaError}>
          <Feather name="alert-circle" size={14} color={colores.peligro} />
          <Text style={estilos.textoError}>{error}</Text>
        </View>
      ) : null}
      {abierto ? (
        <DateTimePicker
          value={valor ?? minimo ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimo}
          maximumDate={maximo}
          onChange={elegir}
          themeVariant={tema === 'oscuro' ? 'dark' : 'light'}
          locale="es-AR"
        />
      ) : null}
      {abierto && Platform.OS === 'ios' ? (
        <Pressable style={estilos.listo} onPress={() => setAbierto(false)}>
          <Text style={estilos.textoAtajo}>Listo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    etiqueta: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.texto, marginTop: 16, marginBottom: 8 },
    opcional: { fontFamily: 'Inter_400Regular', color: c.textoTenue },
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    campoConError: { borderColor: c.peligro },
    texto: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto },
    textoVacio: { color: c.textoTenue },
    atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    atajo: {
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    textoAtajo: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    filaError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    textoError: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: c.peligro },
    listo: { alignSelf: 'center', paddingVertical: 10 },
  });
}
