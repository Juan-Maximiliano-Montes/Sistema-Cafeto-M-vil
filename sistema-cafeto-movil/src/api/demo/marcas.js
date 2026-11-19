import { crearAbmDemo } from './abm';
import { MARCAS } from './datos';

export const marcasDemo = crearAbmDemo({
  clave: 'cafeto:demo:v2:marcas',
  semilla: MARCAS,
  permisos: { ver: 'ver_marcas', crear: 'crear_marca', editar: 'editar_marca', eliminar: 'eliminar_marca' },
  maximoNombre: 50,
  articulo: 'una marca',
  genero: 'f',
  campoProducto: 'idMarca',
  conActivo: false,
  mensajeBaja: (cantidad) =>
    `No se puede dar de baja: tiene ${cantidad} producto(s) vigente(s). Dalos de baja o cambialos de marca primero desde la web.`,
});
