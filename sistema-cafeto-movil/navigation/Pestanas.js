import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../src/tema/TemaContext';
import { useSesion } from '../src/sesion/SesionContext';
import Inicio from '../screens/Inicio';
import Productos from '../screens/Productos';
import Beneficios from '../screens/Beneficios';
import Gestion from '../screens/Gestion';
import Perfil from '../screens/Perfil';
import Cuenta from '../screens/Cuenta';

const Tab = createBottomTabNavigator();

const iconos = {
  Inicio: ['home', 'home-outline'],
  Productos: ['storefront', 'storefront-outline'],
  Beneficios: ['gift', 'gift-outline'],
  Gestion: ['briefcase', 'briefcase-outline'],
  Perfil: ['person', 'person-outline'],
};

function PestanaPerfil() {
  const { rol } = useSesion();
  return rol === 'cliente' ? <Perfil /> : <Cuenta />;
}

export default function Pestanas() {
  const { colores } = useTema();
  const { rol } = useSesion();
  const insets = useSafeAreaInsets();
  const abajo = Math.max(insets.bottom, 10);

  const etiquetas = {
    Inicio: 'Inicio',
    Productos: 'Productos',
    Beneficios: 'Beneficios',
    Gestion: 'Gestión',
    Perfil: rol === 'invitado' ? 'Entrar' : rol === 'equipo' ? 'Cuenta' : 'Perfil',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colores.marca,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colores.superficie,
          borderTopColor: colores.borde,
          borderTopWidth: 1,
          height: 66 + abajo,
          paddingBottom: abajo + 10,
          paddingTop: 10,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabel: ({ color }) => (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 14, color, textAlign: 'center' }}
          >
            {etiquetas[route.name]}
          </Text>
        ),
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={iconos[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
        tabBarAccessibilityLabel: etiquetas[route.name],
      })}
    >
      <Tab.Screen name="Inicio" component={Inicio} />
      <Tab.Screen name="Productos" component={Productos} />
      {rol === 'equipo' ? (
        <Tab.Screen name="Gestion" component={Gestion} />
      ) : (
        <Tab.Screen name="Beneficios" component={Beneficios} />
      )}
      <Tab.Screen name="Perfil" component={PestanaPerfil} />
    </Tab.Navigator>
  );
}
