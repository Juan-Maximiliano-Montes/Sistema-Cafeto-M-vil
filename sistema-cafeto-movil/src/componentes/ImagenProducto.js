import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ORIGEN_API } from '../api/cliente';
import { useTema } from '../tema/TemaContext';
import { iconoSeguro } from './iconos';

export function resolverUrlImagen(imagen) {
  if (typeof imagen !== 'string') return null;
  const limpia = imagen.trim();
  if (!limpia) return null;
  if (limpia.startsWith('/')) {
    return ORIGEN_API ? `${ORIGEN_API}${limpia}` : null;
  }
  if (/^https:\/\//i.test(limpia)) return limpia;
  if (/^http:\/\//i.test(limpia)) {
    const permitido =
      (typeof __DEV__ !== 'undefined' && __DEV__) || (ORIGEN_API !== '' && limpia.startsWith(ORIGEN_API));
    return permitido ? limpia : null;
  }
  return null;
}

export default function ImagenProducto({ imagen, icono, estilo, tamanoIcono = 34 }) {
  const { colores } = useTema();
  const [fallo, setFallo] = useState(false);
  const uri = resolverUrlImagen(imagen);

  useEffect(() => {
    setFallo(false);
  }, [uri]);

  if (uri && !fallo) {
    return <Image source={{ uri }} style={estilo} resizeMode="cover" onError={() => setFallo(true)} />;
  }

  return (
    <View style={[estilo, { backgroundColor: colores.marcaSuave, justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name={iconoSeguro(icono, 'pricetag-outline')} size={tamanoIcono} color={colores.marca} />
    </View>
  );
}
