import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';
import { IMAGENES_PRODUCTOS } from '../datos/imagenesProductos';
import { iconoSeguro } from './iconos';

function fuenteDe(imagen) {
  if (typeof imagen !== 'string' || !imagen) return null;
  if (IMAGENES_PRODUCTOS[imagen]) return IMAGENES_PRODUCTOS[imagen];
  if (/^https:\/\//i.test(imagen)) return { uri: imagen };
  return null;
}

export default function ImagenProducto({ imagen, icono, estilo, tamanoIcono = 34 }) {
  const { colores } = useTema();
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setFallo(false);
  }, [imagen]);

  const fuente = fallo ? null : fuenteDe(imagen);

  if (fuente) {
    return <Image source={fuente} style={estilo} resizeMode="cover" onError={() => setFallo(true)} />;
  }

  return (
    <View style={[estilo, { backgroundColor: colores.marcaSuave, justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name={iconoSeguro(icono, 'pricetag-outline')} size={tamanoIcono} color={colores.marca} />
    </View>
  );
}
