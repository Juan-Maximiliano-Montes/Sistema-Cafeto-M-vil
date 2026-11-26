import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ORIGEN_API } from '../api/cliente';
import { useTema } from '../tema/TemaContext';
import { iconoSeguro } from './iconos';

function extraerHost(url) {
  const coincidencia = url.match(/^https?:\/\/([^/?#]+)/i);
  return coincidencia ? coincidencia[1].toLowerCase() : '';
}

function codificarEspacios(url) {
  return url.replace(/\s/g, '%20');
}

export function resolverUrlImagen(imagen) {
  if (typeof imagen !== 'string') return null;
  const limpia = imagen.trim();
  if (!limpia) return null;

  if (limpia.startsWith('//')) {
    return codificarEspacios(`https:${limpia}`);
  }

  if (limpia.startsWith('/') || !/^[a-z][a-z0-9+.-]*:/i.test(limpia)) {
    if (!ORIGEN_API) return null;
    const ruta = limpia.replace(/^\/+/, '');
    return ruta ? codificarEspacios(`${ORIGEN_API}/${ruta}`) : null;
  }

  if (/^https:\/\//i.test(limpia)) {
    return codificarEspacios(limpia);
  }

  if (/^http:\/\//i.test(limpia)) {
    const hostOrigen = extraerHost(ORIGEN_API);
    const hostImagen = extraerHost(limpia);
    if (hostOrigen && hostImagen === hostOrigen && /^https:\/\//i.test(ORIGEN_API)) {
      return codificarEspacios(limpia.replace(/^http:\/\//i, 'https://'));
    }
    const permitido =
      (typeof __DEV__ !== 'undefined' && __DEV__) ||
      (ORIGEN_API !== '' && limpia.toLowerCase().startsWith(ORIGEN_API.toLowerCase()));
    return permitido ? codificarEspacios(limpia) : null;
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
