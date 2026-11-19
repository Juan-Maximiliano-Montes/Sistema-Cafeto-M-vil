import { MODO_DEMO, solicitud } from './cliente';
import { aBeneficio, aCategorias, aLista, aProducto, aReferencia } from './formas';
import {
  listarBeneficiosDemo,
  listarDestacadosDemo,
  listarProductosDemo,
  listarRubrosDeSeccionDemo,
} from './demo';

export const SECCIONES = [
  { clave: 'CAFETERIA', nombre: 'Cafetería', icono: 'cafe-outline' },
  { clave: 'MINISUPER', nombre: 'Minisuper', icono: 'basket-outline' },
];

export async function listarProductos({ seccion, rubro = null, busqueda = '', pagina = 1 }) {
  const respuesta = MODO_DEMO
    ? await listarProductosDemo({ seccion, rubro, busqueda, pagina })
    : await solicitud(
        `/catalogo/productos/?seccion=${encodeURIComponent(seccion)}&rubro=${encodeURIComponent(rubro ?? '')}` +
          `&q=${encodeURIComponent(String(busqueda).trim())}&pagina=${pagina}`
      );
  return aLista(respuesta, aProducto);
}

export async function listarDestacados() {
  const respuesta = MODO_DEMO ? await listarDestacadosDemo() : await solicitud('/catalogo/destacados/');
  return aLista(respuesta, aProducto);
}

export async function listarRubrosDeSeccion(seccion) {
  const respuesta = MODO_DEMO
    ? await listarRubrosDeSeccionDemo(seccion)
    : await solicitud(`/catalogo/rubros/?seccion=${encodeURIComponent(seccion)}`);
  return aLista(respuesta, aReferencia);
}

export async function listarBeneficios() {
  const respuesta = MODO_DEMO ? await listarBeneficiosDemo() : await solicitud('/catalogo/beneficios/');
  return { ...aLista(respuesta, aBeneficio), categorias: aCategorias(respuesta?.categorias) };
}
