import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTema } from '../tema/TemaContext';
import { limpiar } from '../utilidades/texto';
import { validarCodigoBarras } from '../utilidades/validaciones';
import EstadoVacio from './EstadoVacio';

const TIPOS_CODIGO = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'];
const PAUSA_TRAS_ERROR = 1800;

export default function EscanerCodigo({ visible, alCerrar, alLeer, alEscribir, titulo = 'Escanear código' }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [aviso, setAviso] = useState('');
  const leido = useRef(false);
  const pidio = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      leido.current = false;
      setAviso('');
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      pidio.current = false;
      return;
    }
    if (!pidio.current && permiso && !permiso.granted && permiso.canAskAgain) {
      pidio.current = true;
      pedirPermiso().catch(() => null);
    }
  }, [visible, permiso, pedirPermiso]);

  const leer = ({ data }) => {
    if (leido.current) return;
    leido.current = true;
    const codigo = limpiar(data);
    if (validarCodigoBarras(codigo)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
      setAviso('Ese código no es de un producto. Apuntá al código de barras del envase.');
      setTimeout(() => {
        leido.current = false;
        if (montado.current) setAviso('');
      }, PAUSA_TRAS_ERROR);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
    alLeer(codigo);
  };

  const renderContenido = () => {
    if (!permiso) return <EstadoVacio cargando texto="Preparando la cámara..." estilo={estilos.centro} />;
    if (!permiso.granted) {
      return (
        <View style={estilos.permiso}>
          <View style={estilos.iconoPermiso}>
            <Ionicons name="camera-outline" size={38} color={colores.marca} />
          </View>
          <Text style={estilos.tituloPermiso}>Necesitamos la cámara</Text>
          <Text style={estilos.textoPermiso}>
            La usamos solo para leer el código de barras mientras esta pantalla está abierta.
          </Text>
          {permiso.canAskAgain ? (
            <Pressable style={estilos.botonPermiso} onPress={() => pedirPermiso().catch(() => null)}>
              <Text style={estilos.textoBotonPermiso}>Permitir cámara</Text>
            </Pressable>
          ) : (
            <Pressable style={estilos.botonPermiso} onPress={() => Linking.openSettings().catch(() => null)}>
              <Text style={estilos.textoBotonPermiso}>Abrir configuración</Text>
            </Pressable>
          )}
          {alEscribir ? (
            <Pressable onPress={alEscribir} hitSlop={8}>
              <Text style={estilos.enlace}>Prefiero escribir el código</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    return (
      <View style={estilos.camara}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: TIPOS_CODIGO }}
          onBarcodeScanned={visible ? leer : undefined}
        />
        <View style={estilos.capa} pointerEvents="none">
          <View style={estilos.marco} />
          <Text style={estilos.textoCapa}>Apuntá al código de barras del envase</Text>
        </View>
        {aviso !== '' && (
          <View style={estilos.aviso}>
            <Ionicons name="warning-outline" size={18} color={colores.marca} />
            <Text style={estilos.textoAviso}>{aviso}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={alCerrar}>
      <SafeAreaView style={estilos.pantalla}>
        <View style={estilos.barra}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Pressable onPress={alCerrar} hitSlop={10} style={estilos.cerrar} accessibilityLabel="Cerrar escáner">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        {renderContenido()}
      </SafeAreaView>
    </Modal>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#000000' },
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    titulo: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },
    cerrar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    centro: { flex: 1, justifyContent: 'center' },
    camara: { flex: 1, overflow: 'hidden' },
    capa: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 18 },
    marco: { width: '78%', height: 150, borderRadius: 18, borderWidth: 3, borderColor: c.marca },
    textoCapa: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14.5,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      overflow: 'hidden',
    },
    aviso: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: 'rgba(20, 20, 20, 0.9)',
    },
    textoAviso: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13.5, lineHeight: 19, color: '#FFFFFF' },
    permiso: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 28, backgroundColor: c.fondo },
    iconoPermiso: {
      width: 76,
      height: 76,
      borderRadius: 22,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tituloPermiso: { fontFamily: 'Inter_700Bold', fontSize: 18, color: c.texto },
    textoPermiso: { fontFamily: 'Inter_400Regular', fontSize: 14.5, lineHeight: 21, color: c.textoSecundario, textAlign: 'center' },
    botonPermiso: {
      height: 50,
      alignSelf: 'stretch',
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 6,
    },
    textoBotonPermiso: { fontFamily: 'Inter_600SemiBold', fontSize: 15.5, color: c.textoSobreMarca },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.marca },
  });
}
