import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREFIJO_AYUDA = 'cafeto:ayuda:';

const VALOR_POR_DEFECTO = {
  versionGuias: 0,
  restablecerGuias: async () => 0,
};

const GuiasContext = createContext(VALOR_POR_DEFECTO);

export function GuiasProvider({ children }) {
  const [versionGuias, setVersionGuias] = useState(0);

  const restablecerGuias = useCallback(async () => {
    const claves = await AsyncStorage.getAllKeys();
    const clavesAyuda = claves.filter((clave) => clave.startsWith(PREFIJO_AYUDA));
    if (clavesAyuda.length > 0) {
      await AsyncStorage.multiRemove(clavesAyuda);
    }
    setVersionGuias((actual) => actual + 1);
    return clavesAyuda.length;
  }, []);

  const valor = useMemo(
    () => ({
      versionGuias,
      restablecerGuias,
    }),
    [versionGuias, restablecerGuias]
  );

  return <GuiasContext.Provider value={valor}>{children}</GuiasContext.Provider>;
}

export function useGuias() {
  return useContext(GuiasContext);
}
