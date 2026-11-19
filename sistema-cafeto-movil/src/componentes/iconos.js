import { Ionicons } from '@expo/vector-icons';

export function iconoSeguro(nombre, porDefecto = 'ellipse-outline') {
  const mapa = Ionicons.glyphMap ?? {};
  return typeof nombre === 'string' && Object.prototype.hasOwnProperty.call(mapa, nombre) ? nombre : porDefecto;
}
