import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const SOPORTADO = Platform.OS === 'ios' || Platform.OS === 'android';

export function hapticImpactoSuave() {
  if (!SOPORTADO) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
}

export function hapticExito() {
  if (!SOPORTADO) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
}

export function hapticAdvertencia() {
  if (!SOPORTADO) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
}
