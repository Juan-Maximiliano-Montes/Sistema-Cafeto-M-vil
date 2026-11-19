import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isotipos, logos, temas } from './temas';

const CLAVE_TEMA = 'cafeto:tema';

const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const [tema, setTema] = useState('oscuro');
  const [leido, setLeido] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_TEMA)
      .then((guardado) => {
        if (guardado === 'claro' || guardado === 'oscuro') setTema(guardado);
      })
      .catch(() => null)
      .finally(() => setLeido(true));
  }, []);

  useEffect(() => {
    if (leido) AsyncStorage.setItem(CLAVE_TEMA, tema).catch(() => null);
  }, [tema, leido]);

  const valor = useMemo(
    () => ({
      tema,
      colores: temas[tema],
      logo: logos[tema],
      isotipo: isotipos[tema],
      cambiarTema: () => setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro')),
    }),
    [tema]
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  return useContext(TemaContext);
}
