import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTema } from '../tema/TemaContext';
import { PREFIJO_AYUDA, useGuias } from '../ayuda/GuiasContext';

export default function CuadroAyuda({
  id,
  titulo,
  texto,
  icono = 'information-circle-outline',
  tipo = 'info',
  cerrable = false,
  accion,
  estilo,
}) {
  const { colores } = useTema();
  const { versionGuias } = useGuias();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [visible, setVisible] = useState(!cerrable);

  useEffect(() => {
    if (!cerrable || !id) return undefined;
    let vigente = true;
    AsyncStorage.getItem(`${PREFIJO_AYUDA}${id}`)
      .then((valor) => {
        if (vigente) setVisible(valor !== 'visto');
      })
      .catch(() => {
        if (vigente) setVisible(true);
      });
    return () => {
      vigente = false;
    };
  }, [cerrable, id, versionGuias]);

  const cerrar = () => {
    setVisible(false);
    if (id) AsyncStorage.setItem(`${PREFIJO_AYUDA}${id}`, 'visto').catch(() => null);
  };

  if (!visible) return null;

  const colorIcono = tipo === 'atencion' ? colores.peligro : tipo === 'consejo' ? colores.marca : colores.textoSecundario;

  return (
    <View style={[estilos.cuadro, estilos[tipo] ?? estilos.info, estilo]} accessibilityRole="summary">
      <Ionicons name={icono} size={20} color={colorIcono} />
      <View style={estilos.textos}>
        {titulo ? <Text style={estilos.titulo}>{titulo}</Text> : null}
        {texto ? <Text style={estilos.texto}>{texto}</Text> : null}
        {(accion || cerrable) && (
          <View style={estilos.acciones}>
            {accion && (
              <Pressable onPress={accion.alPresionar} hitSlop={8}>
                <Text style={estilos.enlace}>{accion.texto}</Text>
              </Pressable>
            )}
            {cerrable && (
              <Pressable onPress={cerrar} hitSlop={8}>
                <Text style={estilos.entendido}>Entendido</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    cuadro: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
    info: { backgroundColor: c.superficie, borderColor: c.borde },
    consejo: { backgroundColor: c.marcaSuave, borderColor: c.bordeAdvertencia },
    atencion: { backgroundColor: c.fondoPeligro, borderColor: c.bordePeligro },
    textos: { flex: 1, gap: 4 },
    titulo: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    texto: { fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 19, color: c.textoSecundario },
    acciones: { flexDirection: 'row', gap: 18, marginTop: 4 },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.marca, textDecorationLine: 'underline' },
    entendido: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.textoSecundario },
  });
}
