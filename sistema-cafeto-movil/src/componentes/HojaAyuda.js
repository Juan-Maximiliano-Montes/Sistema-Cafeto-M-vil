import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';

export function HojaAyuda({ visible, alCerrar, titulo, subtitulo, items = [], nota }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={alCerrar}>
      <View style={estilos.contenedorModal}>
        <Pressable style={estilos.velo} onPress={alCerrar} accessibilityLabel="Cerrar ayuda" />
        <View style={estilos.hoja}>
          <View style={estilos.tirador} />
          <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
            <View style={estilos.cabecera}>
              <View style={estilos.iconoCabecera}>
                <Ionicons name="bulb-outline" size={22} color={colores.marca} />
              </View>
              <View style={estilos.textosCabecera}>
                <Text style={estilos.titulo}>{titulo}</Text>
                {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
              </View>
            </View>

            <View style={estilos.lista}>
              {items.map((item, indice) => (
                <View key={item.titulo} style={[estilos.item, indice > 0 && estilos.divisor]}>
                  <View style={estilos.iconoItem}>
                    <Ionicons name={item.icono || 'checkmark-circle-outline'} size={18} color={colores.marca} />
                  </View>
                  <View style={estilos.textosItem}>
                    <Text style={estilos.tituloItem}>{item.titulo}</Text>
                    <Text style={estilos.textoItem}>{item.texto}</Text>
                  </View>
                </View>
              ))}
            </View>

            {nota ? (
              <View style={estilos.nota}>
                <Ionicons name="information-circle-outline" size={18} color={colores.textoSecundario} />
                <Text style={estilos.textoNota}>{nota}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [estilos.botonCerrar, pressed && estilos.presionado]}
              onPress={alCerrar}
              accessibilityRole="button"
            >
              <Text style={estilos.textoBotonCerrar}>Entendido</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function BotonAyuda({ titulo, subtitulo, items = [], nota, deshabilitado = false }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <Pressable
        style={({ pressed }) => [estilos.botonAyuda, pressed && estilos.presionado]}
        onPress={() => setAbierta(true)}
        disabled={deshabilitado}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Cómo funciona ${titulo}`}
      >
        <Ionicons name="help" size={18} color={colores.marca} />
      </Pressable>
      <HojaAyuda
        visible={abierta}
        alCerrar={() => setAbierta(false)}
        titulo={titulo}
        subtitulo={subtitulo}
        items={items}
        nota={nota}
      />
    </>
  );
}

export default HojaAyuda;

function crearEstilos(c) {
  return StyleSheet.create({
    botonAyuda: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contenedorModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: c.velo,
    },
    velo: {
      flex: 1,
    },
    hoja: {
      maxHeight: '85%',
      backgroundColor: c.fondo,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: c.borde,
    },
    tirador: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borde,
      marginTop: 10,
    },
    contenido: {
      padding: 20,
      paddingTop: 14,
      paddingBottom: 32,
      gap: 16,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconoCabecera: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.marcaSuave,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textosCabecera: {
      flex: 1,
      gap: 2,
    },
    titulo: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 30,
      color: c.titulo,
    },
    subtitulo: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      color: c.textoSecundario,
    },
    lista: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      overflow: 'hidden',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
    },
    divisor: {
      borderTopWidth: 1,
      borderTopColor: c.divisor,
    },
    iconoItem: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    textosItem: {
      flex: 1,
      gap: 3,
    },
    tituloItem: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: c.texto,
    },
    textoItem: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textoSecundario,
    },
    nota: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoNota: {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
      color: c.textoSecundario,
    },
    botonCerrar: {
      height: 50,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    textoBotonCerrar: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15.5,
      color: c.textoSobreMarca,
    },
    presionado: {
      opacity: 0.85,
    },
  });
}
