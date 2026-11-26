import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFonts, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { isFirebaseConfigured } from '../src/config/firebaseConfig';
import { useSesion } from '../src/sesion/SesionContext';
import { useTema } from '../src/tema/TemaContext';
import Pestanas from './Pestanas';
import Login from '../screens/Login';
import Registro from '../screens/Registro';
import Verificacion from '../screens/Verificacion';
import Ayuda from '../screens/Ayuda';
import MiQR from '../screens/MiQR';
import MisPuntos from '../screens/MisPuntos';
import ConsultaProducto from '../screens/ConsultaProducto';
import Alertas from '../screens/Alertas';
import Marcas from '../screens/Marcas';
import Rubros from '../screens/Rubros';
import Merma from '../screens/Merma';
import Traspaso from '../screens/Traspaso';
import Produccion from '../screens/Produccion';
import Conteo from '../screens/Conteo';
import Autorizaciones from '../screens/Autorizaciones';
import OfertasEtiquetar from '../screens/OfertasEtiquetar';
import Recepciones from '../screens/Recepciones';
import RecibirOrden from '../screens/RecibirOrden';

const Stack = createStackNavigator();

const PANTALLAS_EQUIPO = [
  { nombre: 'ConsultaProducto', componente: ConsultaProducto, permiso: 'ver_productos' },
  { nombre: 'Alertas', componente: Alertas, permiso: 'ver_stock' },
  { nombre: 'Marcas', componente: Marcas, permiso: 'ver_marcas' },
  { nombre: 'Rubros', componente: Rubros, permiso: 'ver_rubros' },
  { nombre: 'Merma', componente: Merma, permiso: 'registrar_merma' },
  { nombre: 'Traspaso', componente: Traspaso, permiso: 'registrar_traspaso' },
  { nombre: 'Produccion', componente: Produccion, permiso: 'registrar_produccion' },
  { nombre: 'Conteo', componente: Conteo, permiso: 'contar_stock' },
  { nombre: 'Autorizaciones', componente: Autorizaciones, permiso: 'autorizar_ajustes' },
  { nombre: 'OfertasEtiquetar', componente: OfertasEtiquetar, permiso: 'imprimir_ofertas' },
  { nombre: 'Recepciones', componente: Recepciones, permiso: 'registrar_compra' },
  { nombre: 'RecibirOrden', componente: RecibirOrden, permiso: 'registrar_compra' },
];

export default function Navigation() {
  const { cargando, necesitaVerificar, rol, tienePermiso } = useSesion();
  const { colores } = useTema();
  const [fuentesCargadas] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!isFirebaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Falta configurar Firebase. Copiá .env.example como .env y completá los datos de tu proyecto.
        </Text>
      </View>
    );
  }

  if (cargando || !fuentesCargadas) {
    return (
      <View style={[styles.center, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" color={colores.marca} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {necesitaVerificar ? (
          <>
            <Stack.Screen name="Verificacion" component={Verificacion} />
            <Stack.Screen name="Ayuda" component={Ayuda} />
          </>
        ) : (
          <>
            <Stack.Screen name="Principal" component={Pestanas} />
            <Stack.Screen name="Ayuda" component={Ayuda} />
            {rol === 'invitado' && (
              <Stack.Group screenOptions={{ presentation: 'modal' }}>
                <Stack.Screen name="Login" component={Login} />
                <Stack.Screen name="Registro" component={Registro} />
              </Stack.Group>
            )}
            {rol === 'cliente' && (
              <>
                <Stack.Screen name="MiQR" component={MiQR} />
                <Stack.Screen name="MisPuntos" component={MisPuntos} />
              </>
            )}
            {rol === 'equipo' &&
              PANTALLAS_EQUIPO.filter((pantalla) => tienePermiso(pantalla.permiso)).map((pantalla) => (
                <Stack.Screen key={pantalla.nombre} name={pantalla.nombre} component={pantalla.componente} />
              ))}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { textAlign: 'center', fontSize: 16 },
});
