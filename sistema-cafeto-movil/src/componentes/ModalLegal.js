import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';

const DOCUMENTOS = {
  terminos: {
    titulo: 'Términos y Condiciones',
    introduccion:
      'Estos términos regulan el uso de la aplicación móvil de Cafeto · Las Lomitas y su programa de fidelización.',
    secciones: [
      {
        subtitulo: '1. Cuenta y uso personal',
        texto:
          'La cuenta del club y su código QR son personales e intransferibles. Sos responsable de mantener la confidencialidad de tu contraseña y de los movimientos realizados con tu sesión.',
      },
      {
        subtitulo: '2. Acumulación y canje de puntos',
        texto:
          'Los puntos se acreditan al presentar tu código QR o identificarte en la caja del local al momento de abonar tu compra. Los puntos no tienen valor monetario, no son canjeables por dinero en efectivo y aplican según las categorías vigentes.',
      },
      {
        subtitulo: '3. Vigencia de beneficios y precios',
        texto:
          'Los productos, combos, ofertas del día y beneficios publicados en la aplicación están sujetos a disponibilidad de stock en el local al momento de la compra o del canje.',
      },
      {
        subtitulo: '4. Uso adecuado',
        texto:
          'Cafeto podrá suspender cuentas ante usos fraudulentos, intentos de manipulación del sistema o incumplimiento de estas condiciones.',
      },
    ],
  },
  privacidad: {
    titulo: 'Política de privacidad',
    introduccion:
      'En Cafeto · Las Lomitas cuidamos tus datos personales conforme a la Ley N.° 25.326 de Protección de los Datos Personales.',
    secciones: [
      {
        subtitulo: '1. Qué datos recolectamos',
        texto:
          'Guardamos tu nombre, apellido, correo electrónico y al menos un dato de identificación para mostrador (DNI o teléfono). Opcionalmente podés informar tu fecha de nacimiento para beneficios de cumpleaños y tu preferencia de comunicaciones.',
      },
      {
        subtitulo: '2. Para qué los usamos',
        texto:
          'Usamos tus datos exclusivamente para vincular tu ficha del club en caja, acreditar y canjear tus puntos, enviarte correos transaccionales de seguridad y, solo si lo aceptaste, novedades o promociones del local.',
      },
      {
        subtitulo: '3. Resguardo y confidencialidad',
        texto:
          'No vendemos ni cedemos tus datos personales a terceros. La autenticación se gestiona mediante conexiones cifradas y proveedores seguros.',
      },
      {
        subtitulo: '4. Tus derechos',
        texto:
          'Podés consultar y actualizar tus datos en cualquier momento desde la pestaña Perfil, o solicitar la rectificación o baja de tu ficha acercándote al mostrador del local.',
      },
    ],
  },
};

export default function ModalLegal({ visible, tipo, alCerrar }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const documento = DOCUMENTOS[tipo] ?? DOCUMENTOS.terminos;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={alCerrar}>
      <View style={estilos.velo}>
        <Pressable style={estilos.zonaCierre} onPress={alCerrar} accessibilityLabel="Cerrar documento legal" />
        <View style={estilos.hoja}>
          <View style={estilos.encabezado}>
            <Text style={estilos.titulo}>{documento.titulo}</Text>
            <Pressable onPress={alCerrar} hitSlop={10} style={estilos.botonCerrar} accessibilityLabel="Cerrar">
              <Feather name="x" size={20} color={colores.textoSecundario} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.contenido}>
            <Text style={estilos.introduccion}>{documento.introduccion}</Text>
            {documento.secciones.map((seccion) => (
              <View key={seccion.subtitulo} style={estilos.bloque}>
                <Text style={estilos.subtitulo}>{seccion.subtitulo}</Text>
                <Text style={estilos.texto}>{seccion.texto}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
            onPress={alCerrar}
            accessibilityRole="button"
          >
            <Text style={estilos.textoBoton}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.velo },
    zonaCierre: { flex: 1 },
    hoja: {
      maxHeight: '86%',
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 30,
      backgroundColor: c.fondo,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: c.borde,
    },
    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 8,
    },
    titulo: { flex: 1, fontFamily: 'Caveat_700Bold', fontSize: 32, color: c.titulo },
    botonCerrar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contenido: { gap: 14, paddingBottom: 18 },
    introduccion: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: c.textoSecundario },
    bloque: { gap: 4 },
    subtitulo: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: c.texto },
    texto: { fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 20, color: c.textoSecundario },
    boton: {
      height: 50,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    textoBoton: { fontFamily: 'Inter_600SemiBold', fontSize: 15.5, color: c.textoSobreMarca },
    presionado: { opacity: 0.85 },
  });
}
