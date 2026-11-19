export const POR_PAGINA = 20;

let demora = 350;

export function configurarDemora(milisegundos) {
  demora = milisegundos;
}

export function esperar() {
  return new Promise((resolver) => setTimeout(resolver, demora));
}

export function numeroDePagina(valor) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero) || numero < 1) return 1;
  return Math.min(numero, 100000);
}

export function paginar(lista, pagina) {
  const desde = (numeroDePagina(pagina) - 1) * POR_PAGINA;
  return {
    resultados: lista.slice(desde, desde + POR_PAGINA),
    hay_mas: lista.length > desde + POR_PAGINA,
  };
}

export function fallar(estado, detalle) {
  return { estado, datos: { detail: detalle } };
}

export function fallarCampos(errores) {
  return { estado: 400, datos: { errores } };
}

export function ordenarPorNombre(lista) {
  return [...lista].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
}

export function mismoId(a, b) {
  return a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
}
