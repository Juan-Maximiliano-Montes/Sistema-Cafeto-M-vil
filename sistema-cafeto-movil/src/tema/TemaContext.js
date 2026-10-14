import React, { createContext, useContext, useMemo, useState } from 'react';
import { isotipos, logos, temas } from './temas';

const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const [tema, setTema] = useState('oscuro');

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
