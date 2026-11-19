import { MODO_DEMO, solicitud } from './cliente';
import { aEntidad, aLista } from './formas';

function exigirEntidad(respuesta) {
  const entidad = aEntidad(respuesta);
  if (!entidad) throw { respuestaInvalida: true };
  return entidad;
}

export function crearApiAbm({ ruta, demo }) {
  return {
    async listar(token, { busqueda = '', pagina = 1 } = {}) {
      const respuesta = MODO_DEMO
        ? await demo.listar(token, { busqueda, pagina })
        : await solicitud(`${ruta}?q=${encodeURIComponent(String(busqueda).trim())}&pagina=${pagina}`, { token });
      return aLista(respuesta, aEntidad);
    },

    async crear(token, datos) {
      const respuesta = MODO_DEMO
        ? await demo.crear(token, datos)
        : await solicitud(ruta, { metodo: 'POST', cuerpo: datos, token });
      return exigirEntidad(respuesta);
    },

    async editar(token, id, datos) {
      const respuesta = MODO_DEMO
        ? await demo.editar(token, id, datos)
        : await solicitud(`${ruta}${encodeURIComponent(id)}/`, { metodo: 'PATCH', cuerpo: datos, token });
      return exigirEntidad(respuesta);
    },

    async darDeBaja(token, id) {
      if (MODO_DEMO) return demo.darDeBaja(token, id);
      return solicitud(`${ruta}${encodeURIComponent(id)}/`, { metodo: 'DELETE', token });
    },
  };
}
