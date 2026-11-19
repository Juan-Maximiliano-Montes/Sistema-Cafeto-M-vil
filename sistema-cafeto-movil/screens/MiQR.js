import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTema } from '../src/tema/TemaContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useCuentaCliente } from '../src/cliente/CuentaClienteContext';
import { coloresCategoria } from '../src/datos/ejemplo';
import { limpiar } from '../src/utilidades/texto';
import { formatearNumero } from '../src/utilidades/formato';
import { resumirPuntos } from '../src/utilidades/puntos';
import BarraVolver from '../src/componentes/BarraVolver';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import AvisoCuentaCliente from '../src/componentes/AvisoCuentaCliente';

function beneficioPedido(valor) {
  if (!valor || typeof valor !== 'object') return null;
  const titulo = limpiar(valor.titulo);
  const puntos = Number(valor.puntos);
  if (!titulo) return null;
  return { titulo, puntos: Number.isFinite(puntos) && puntos > 0 ? Math.round(puntos) : 0 };
}

export default function MiQR({ route }) {
  const { colores } = useTema();
  const { usuario, nombreVisible } = useSesion();
  const { cuenta, cargando } = useCuentaCliente();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const { width } = useWindowDimensions();

  const puntos = resumirPuntos(cuenta);
  const canje = beneficioPedido(route?.params?.beneficio);
  const tamano = Math.max(160, Math.min(260, width - 140));

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <BarraVolver />
        <Text style={estilos.titulo}>Tu QR</Text>
        <Text style={estilos.subtitulo}>Mostralo en la caja antes de pagar.</Text>

        {canje && (
          <View style={estilos.canje}>
            <Ionicons name="gift" size={22} color={colores.marca} />
            <View style={estilos.textos}>
              <Text style={estilos.tituloCanje}>Vas a canjear: {canje.titulo}</Text>
              <Text style={estilos.detalleCanje}>
                {canje.puntos > 0
                  ? `Se descuentan ${formatearNumero(canje.puntos)} puntos cuando el cajero confirma el canje.`
                  : 'El cajero lo aplica cuando escanea tu QR.'}
              </Text>
            </View>
          </View>
        )}

        {!cuenta ? (
          cargando ? (
            <EstadoVacio cargando texto="Buscando tu código..." />
          ) : (
            <AvisoCuentaCliente />
          )
        ) : (
          <View style={estilos.tarjeta}>
            <View style={estilos.marcoQr} accessible accessibilityLabel={`Código QR de cliente ${cuenta.qr}`}>
              <QRCode value={cuenta.qr} size={tamano} color="#161616" backgroundColor="#FFFFFF" quietZone={10} ecl="M" />
            </View>
            <Text style={estilos.codigo} selectable>
              {cuenta.qr}
            </Text>
            <Text style={estilos.nombre}>{nombreVisible || usuario?.email || 'Cliente Cafeto'}</Text>
            <View style={[estilos.chip, { backgroundColor: coloresCategoria[puntos.categoria] ?? colores.marca }]}>
              <Ionicons name="star" size={12} color="#161616" />
              <Text style={estilos.textoChip}>{puntos.categoria.toUpperCase()}</Text>
            </View>
          </View>
        )}

        {cuenta?.ejemplo ? (
          <CuadroAyuda
            icono="flask-outline"
            titulo="Código de la demo"
            texto="Todavía no está conectado el sistema de la caja. Cuando lo esté, acá vas a ver tu código real de cliente."
          />
        ) : null}
        <CuadroAyuda
          icono="sunny-outline"
          titulo="¿No lo lee el escáner?"
          texto="Subí el brillo de la pantalla y alejá un poco el celular del lector. Si igual no anda, dictale el código al cajero."
        />
        <CuadroAyuda
          id="qr-como-suma"
          cerrable
          tipo="consejo"
          icono="star-outline"
          titulo="¿Cómo sumo puntos?"
          texto="Cada compra que pagás mostrando tu QR suma puntos según tu categoría. Los ves en Perfil, en «Mis puntos»."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 14 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 38, color: c.titulo, textAlign: 'center', marginTop: 4 },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14.5, color: c.textoSecundario, textAlign: 'center', marginTop: -10 },
    canje: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    textos: { flex: 1, gap: 2 },
    tituloCanje: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: c.texto },
    detalleCanje: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: c.textoSecundario },
    tarjeta: {
      alignItems: 'center',
      gap: 10,
      padding: 22,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    marcoQr: { padding: 8, borderRadius: 18, backgroundColor: '#FFFFFF' },
    codigo: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: 2, color: c.texto, marginTop: 6 },
    nombre: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    textoChip: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#161616' },
  });
}
