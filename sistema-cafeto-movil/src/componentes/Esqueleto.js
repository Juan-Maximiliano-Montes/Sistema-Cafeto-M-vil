import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTema } from '../tema/TemaContext';

export default function Esqueleto({ estilo }) {
  const { colores } = useTema();
  const opacidad = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    animacion.start();
    return () => animacion.stop();
  }, [opacidad]);

  return <Animated.View style={[{ backgroundColor: colores.borde, borderRadius: 16 }, estilo, { opacity: opacidad }]} />;
}
