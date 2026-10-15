import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../src/config/firebaseConfig';
import Login from '../screens/Login';
import Registro from '../screens/Registro';
import Verificacion from '../screens/Verificacion';
import Pestanas from './Pestanas';
import { escucharEntrada, hayEntrada, reiniciarEntrada } from '../src/sesion/entrada';

const Stack = createStackNavigator();

export default function Navigation() {
  const [user, setUser] = useState(undefined);
  const [entrada, setEntrada] = useState(hayEntrada());
  const entroYaVerificado = useRef(false);
  const uidPrevio = useRef(null);

  useEffect(() => escucharEntrada(setEntrada), []);

  useEffect(() => {
    if (!auth) return;
    return onIdTokenChanged(auth, (usuario) => {
      if (!usuario) {
        uidPrevio.current = null;
        entroYaVerificado.current = false;
        reiniciarEntrada();
        setUser(null);
        return;
      }

      if (uidPrevio.current !== usuario.uid) {
        uidPrevio.current = usuario.uid;
        entroYaVerificado.current = Boolean(usuario.emailVerified || usuario.isAnonymous);
      }

      setUser(usuario);
    });
  }, []);

  const verificado = Boolean(
    user &&
      (user.isAnonymous ||
        (user.emailVerified && (entroYaVerificado.current || entrada)))
  );

  if (!isFirebaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Falta configurar Firebase. Copia .env.example como .env y completa los datos de tu proyecto.
        </Text>
      </View>
    );
  }

  if (user === undefined) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Registro" component={Registro} />
          </>
        ) : !verificado ? (
          <Stack.Screen name="Verificacion" component={Verificacion} />
        ) : (
          <Stack.Screen name="Home" component={Pestanas} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { textAlign: 'center', fontSize: 16 },
});
