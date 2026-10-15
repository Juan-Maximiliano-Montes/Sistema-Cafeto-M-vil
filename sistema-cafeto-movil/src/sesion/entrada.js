let entro = false;
const oyentes = new Set();

export const hayEntrada = () => entro;

export const marcarEntrada = () => {
  entro = true;
  oyentes.forEach((oyente) => oyente(true));
};

export const reiniciarEntrada = () => {
  entro = false;
  oyentes.forEach((oyente) => oyente(false));
};

export const escucharEntrada = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};
