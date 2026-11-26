import { solicitud } from './cliente';
import { aLista, aLote, aProducible } from './formas';

export async function listarProducibles(token) {
  const respuesta = await solicitud('/stock/producibles/', { token });
  return aLista(respuesta, aProducible).resultados;
}

export async function registrarProduccion(token, datos, claveOperacion) {
  const respuesta = await solicitud('/stock/producciones/', { metodo: 'POST', cuerpo: datos, token, claveOperacion });
  if (!respuesta || typeof respuesta !== 'object' || !respuesta.producto) throw { respuestaInvalida: true };
  const cantidad = Number(respuesta.cantidad);
  return {
    nombre: String(respuesta.producto.nombre ?? 'Producto'),
    cantidad: Number.isFinite(cantidad) ? cantidad : 0,
    lote: aLote(respuesta.lote),
  };
}
