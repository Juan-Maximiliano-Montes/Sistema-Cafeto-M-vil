import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';
import { conUnidad } from '../datos/ajustes';
import { describirVencimiento, formatearFechaLarga } from '../utilidades/formato';

export default function SelectorLote({
  lotes,
  elegido,
  alElegir,
  unidad,
  cargando = false,
  error = '',
  alReintentar,
  permitirNuevo = false,
  nuevoElegido = false,
  alElegirNuevo,
  ocultarCantidad = false,
}) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  if (cargando) {
    return (
      <View style={estilos.estado}>
        <ActivityIndicator color={colores.marca} />
        <Text style={estilos.textoEstado}>Buscando los lotes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={estilos.estado}>
        <Ionicons name="cloud-offline-outline" size={18} color={colores.textoTenue} />
        <Text style={estilos.textoEstado}>{error}</Text>
        {alReintentar ? (
          <Pressable onPress={alReintentar} hitSlop={8}>
            <Text style={estilos.enlace}>Reintentar</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={estilos.lista}>
      {lotes.length === 0 && !permitirNuevo ? (
        <Text style={estilos.textoEstado}>No hay lotes con stock para este producto.</Text>
      ) : null}
      {lotes.map((lote) => {
        const activo = !nuevoElegido && elegido === lote.id;
        const vencido = lote.dias !== null && lote.dias < 0;
        return (
          <Pressable
            key={lote.id}
            style={[estilos.fila, activo && estilos.filaActiva]}
            onPress={() => alElegir(lote)}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
          >
            <Ionicons
              name={activo ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={activo ? colores.marca : colores.textoTenue}
            />
            <View style={estilos.textos}>
              <Text style={estilos.numero}>Lote {lote.numero}</Text>
              <Text style={[estilos.detalle, vencido && estilos.vencido]}>
                {[describirVencimiento(lote.dias), lote.vence ? formatearFechaLarga(lote.vence) : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {!ocultarCantidad && lote.cantidad > 0 ? (
              <Text style={estilos.cantidad}>{conUnidad(lote.cantidad, unidad)}</Text>
            ) : null}
          </Pressable>
        );
      })}
      {permitirNuevo ? (
        <Pressable
          style={[estilos.fila, nuevoElegido && estilos.filaActiva]}
          onPress={alElegirNuevo}
          accessibilityRole="radio"
          accessibilityState={{ checked: nuevoElegido }}
        >
          <Ionicons
            name={nuevoElegido ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={nuevoElegido ? colores.marca : colores.textoTenue}
          />
          <View style={estilos.textos}>
            <Text style={estilos.numero}>Un lote que no figura</Text>
            <Text style={estilos.detalle}>Encontraste mercadería de un lote que el sistema no tiene.</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    lista: { gap: 8 },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    filaActiva: { borderColor: c.marca, backgroundColor: c.marcaSuave },
    textos: { flex: 1, gap: 2 },
    numero: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoSecundario },
    vencido: { color: c.peligro, fontFamily: 'Inter_600SemiBold' },
    cantidad: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.texto },
    estado: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    textoEstado: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.textoSecundario },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.marca },
  });
}
