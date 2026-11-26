import { solicitud } from './cliente';
import { aEntidad, aLista } from './formas';

function exigirEntidad(respuesta) {
  const entidad = aEntidad(respuesta);
  if (!entidad) throw { respuestaInvalida: true };
  return entidad;
}

export function crearApiAbm({ ruta }) {
  return {
    async listar(token, { busqueda = '', pagina = 1 } = {}) {
      const respuesta = await solicitud(`${ruta}?q=${encodeURIComponent(String(busqueda).trim())}&pagina=${pagina}`, {
        token,
      });
      return aLista(respuesta, aEntidad);
    },

    async crear(token, datos) {
      const respuesta = await solicitud(ruta, { metodo: 'POST', cuerpo: datos, token });
      return exigirEntidad(respuesta);
    },

    async editar(token, id, datos) {
      const respuesta = await solicitud(`${ruta}${encodeURIComponent(id)}/`, { metodo: 'PATCH', cuerpo: datos, token });
      return exigirEntidad(respuesta);
    },

    async darDeBaja(token, id) {
      return solicitud(`${ruta}${encodeURIComponent(id)}/`, { metodo: 'DELETE', token });
    },
  };
}
