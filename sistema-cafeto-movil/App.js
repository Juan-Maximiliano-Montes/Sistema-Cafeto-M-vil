import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './navigation/Navigation';
import { TemaProvider } from './src/tema/TemaContext';
import { AvisoProvider } from './src/aviso/AvisoContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <AvisoProvider>
          <Navigation />
        </AvisoProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
