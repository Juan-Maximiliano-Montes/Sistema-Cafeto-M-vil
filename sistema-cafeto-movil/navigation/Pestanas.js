import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import Home from '../screens/Home';
import Beneficios from '../screens/Beneficios';
import Carta from '../screens/Carta';
import Perfil from '../screens/Perfil';

const Tab = createBottomTabNavigator();

const iconos = {
  Inicio: 'home-outline',
  Beneficios: 'gift-outline',
  Carta: 'book-outline',
  Perfil: 'person-outline',
};

export default function Pestanas() {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const insets = useSafeAreaInsets();
  const abajo = Math.max(insets.bottom, 10);
  const [usuario, setUsuario] = useState(auth.currentUser);

  useEffect(() => onIdTokenChanged(auth, setUsuario), []);

  const esInvitado = usuario?.isAnonymous ?? true;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colores.marca,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarStyle: {
          backgroundColor: colores.superficie,
          borderTopColor: colores.borde,
          borderTopWidth: 1,
          height: 66 + abajo,
          paddingBottom: abajo + 10,
          paddingTop: 10,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 13 },
        tabBarIcon: ({ color, size }) => <Ionicons name={iconos[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Inicio" component={Home} />
      <Tab.Screen name="Beneficios" component={Beneficios} />
      <Tab.Screen name="Carta" component={Carta} />
      <Tab.Screen
        name="Perfil"
        component={Perfil}
        options={{ title: esInvitado ? 'Entrar' : 'Perfil' }}
        listeners={{
          tabPress: (evento) => {
            if (esInvitado) {
              evento.preventDefault();
              avisar(
                'advertencia',
                '¿Entrar con tu cuenta?',
                'Vas a salir del modo invitado para iniciar sesión o crear tu cuenta.',
                [
                  { texto: 'Cancelar', estilo: 'cancelar' },
                  { texto: 'Entrar', alPresionar: () => signOut(auth) },
                ]
              );
            }
          },
        }}
      />
    </Tab.Navigator>
  );
}
