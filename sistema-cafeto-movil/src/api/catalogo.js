import { solicitud } from './cliente';
import { aBeneficio, aCategorias, aLista, aProducto, aReferencia } from './formas';

export const SECCIONES = [
  { clave: 'CAFETERIA', nombre: 'Cafetería', icono: 'cafe-outline' },
  { clave: 'MINISUPER', nombre: 'Minisuper', icono: 'basket-outline' },
];

export async function listarProductos({ seccion, rubro = null, busqueda = '', pagina = 1 }) {
  const respuesta = await solicitud(
    `/catalogo/productos/?seccion=${encodeURIComponent(seccion)}&rubro=${encodeURIComponent(rubro ?? '')}` +
      `&q=${encodeURIComponent(String(busqueda).trim())}&pagina=${pagina}`
  );
  return aLista(respuesta, aProducto);
}

export async function listarDestacados() {
  const respuesta = await solicitud('/catalogo/destacados/');
  return aLista(respuesta, aProducto);
}

export async function listarRubrosDeSeccion(seccion) {
  const respuesta = await solicitud(`/catalogo/rubros/?seccion=${encodeURIComponent(seccion)}`);
  return aLista(respuesta, aReferencia);
}

export async function listarBeneficios() {
  const respuesta = await solicitud('/catalogo/beneficios/');
  return { ...aLista(respuesta, aBeneficio), categorias: aCategorias(respuesta?.categorias) };
}
