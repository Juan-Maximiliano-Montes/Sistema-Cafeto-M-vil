import React from 'react';
import 'react-native-gesture-handler';
import Navigation from './navigation/Navigation';
import { TemaProvider } from './src/tema/TemaContext';
import { AvisoProvider } from './src/aviso/AvisoContext';

export default function App() {
  return (
    <TemaProvider>
      <AvisoProvider>
        <Navigation />
      </AvisoProvider>
    </TemaProvider>
  );
}
