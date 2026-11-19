import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTema } from '../tema/TemaContext';

export default function BarraVolver({ texto = 'Volver', alPresionar, derecha = null, deshabilitado = false }) {
  const navigation = useNavigation();
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const volver = () => {
    if (alPresionar) {
      alPresionar();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation.getState()?.routeNames?.includes('Principal')) {
      navigation.navigate('Principal');
    }
  };

  return (
    <View style={estilos.barra}>
      <Pressable
        style={estilos.chip}
        onPress={volver}
        disabled={deshabilitado}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={texto}
      >
        <Feather name="chevron-left" size={16} color={colores.textoSecundario} />
        <Text style={estilos.texto}>{texto}</Text>
      </Pressable>
      {derecha}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    texto: { fontFamily: 'Inter_500Medium', fontSize: 14, color: c.textoSecundario },
  });
}
