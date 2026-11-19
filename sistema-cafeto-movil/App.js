import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './navigation/Navigation';
import { TemaProvider } from './src/tema/TemaContext';
import { AvisoProvider } from './src/aviso/AvisoContext';
import { SesionProvider } from './src/sesion/SesionContext';
import { CuentaClienteProvider } from './src/cliente/CuentaClienteContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <AvisoProvider>
          <SesionProvider>
            <CuentaClienteProvider>
              <Navigation />
            </CuentaClienteProvider>
          </SesionProvider>
        </AvisoProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
