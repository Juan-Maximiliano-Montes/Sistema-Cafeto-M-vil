import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/TemaContext';

export default function Opciones({ opciones, elegida, alElegir, deshabilitado = false, estilo }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  return (
    <View style={[estilos.fila, estilo]}>
      {opciones.map((opcion) => {
        const activa = opcion.clave === elegida;
        return (
          <Pressable
            key={opcion.clave}
            style={[estilos.chip, activa && estilos.chipActivo, deshabilitado && estilos.apagado]}
            onPress={() => alElegir(opcion.clave)}
            disabled={deshabilitado}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa, disabled: deshabilitado }}
          >
            <Text style={[estilos.texto, activa && estilos.textoActivo]}>{opcion.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActivo: { backgroundColor: c.marca, borderColor: c.marca },
    apagado: { opacity: 0.6 },
    texto: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    textoActivo: { color: c.textoSobreMarca },
  });
}
