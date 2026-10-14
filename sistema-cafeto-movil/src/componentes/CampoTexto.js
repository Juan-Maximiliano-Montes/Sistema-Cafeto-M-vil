import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';

export default function CampoTexto({
  etiqueta,
  opcional = false,
  icono,
  prefijo,
  valor,
  alCambiar,
  error = '',
  mensajeExito = '',
  ayuda = '',
  ayudaAlEnfocar = '',
  valido = false,
  seguro = false,
  estiloContenedor,
  ...propsEntrada
}) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [enfocado, setEnfocado] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  let mensaje = null;
  if (error !== '') {
    mensaje = { texto: error, icono: 'alert-circle', estilo: estilos.textoError, color: colores.peligro };
  } else if (mensajeExito !== '') {
    mensaje = { texto: mensajeExito, icono: 'check-circle', estilo: estilos.textoExito, color: colores.exito };
  } else if (enfocado && ayudaAlEnfocar !== '') {
    mensaje = { texto: ayudaAlEnfocar, estilo: estilos.textoAyuda };
  } else if (ayuda !== '') {
    mensaje = { texto: ayuda, estilo: estilos.textoAyuda };
  }

  return (
    <View style={estiloContenedor}>
      <Text style={estilos.etiqueta}>
        {etiqueta}
        {opcional && <Text style={estilos.opcional}> · opcional</Text>}
      </Text>
      <View
        style={[
          estilos.campo,
          valido && estilos.campoValido,
          enfocado && estilos.campoActivo,
          error !== '' && estilos.campoConError,
        ]}
      >
        {icono && <Feather name={icono} size={20} color={colores.textoSecundario} />}
        {prefijo}
        <TextInput
          style={estilos.entrada}
          placeholderTextColor={colores.textoTenue}
          value={valor}
          onChangeText={alCambiar}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          secureTextEntry={seguro && !mostrar}
          {...propsEntrada}
        />
        {seguro && (
          <Pressable onPress={() => setMostrar(!mostrar)} hitSlop={10}>
            <Feather name={mostrar ? 'eye-off' : 'eye'} size={20} color={colores.textoSecundario} />
          </Pressable>
        )}
      </View>
      {mensaje && (
        <View style={estilos.filaMensaje}>
          {mensaje.icono && <Feather name={mensaje.icono} size={14} color={mensaje.color} />}
          <Text style={mensaje.estilo}>{mensaje.texto}</Text>
        </View>
      )}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    etiqueta: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
      color: c.texto,
      marginTop: 16,
      marginBottom: 8,
    },
    opcional: {
      fontFamily: 'Inter_400Regular',
      color: c.textoTenue,
    },
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 52,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    campoValido: {
      borderColor: c.exito,
    },
    campoActivo: {
      borderColor: c.marca,
      backgroundColor: c.superficieActiva,
    },
    campoConError: {
      borderColor: c.peligro,
    },
    entrada: {
      flex: 1,
      height: '100%',
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      color: c.texto,
    },
    filaMensaje: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    textoError: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      color: c.peligro,
    },
    textoExito: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      color: c.exito,
    },
    textoAyuda: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      color: c.textoSecundario,
    },
  });
}
