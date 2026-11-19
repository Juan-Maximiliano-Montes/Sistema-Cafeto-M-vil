import { crearAbmDemo } from './abm';
import { RUBROS } from './datos';

export const rubrosDemo = crearAbmDemo({
  clave: 'cafeto:demo:v2:rubros',
  semilla: RUBROS,
  permisos: { ver: 'ver_rubros', crear: 'crear_rubro', editar: 'editar_rubro', eliminar: 'eliminar_rubro' },
  maximoNombre: 40,
  articulo: 'un rubro',
  genero: 'm',
  campoProducto: 'idRubro',
  conActivo: true,
  porDefecto: { activo: true, diasRebaja: null, porcentajeRebaja: null },
  mensajeBaja: (cantidad) =>
    `No se puede dar de baja: tiene ${cantidad} producto(s) vigente(s). Pasalos a otro rubro primero desde la web.`,
});
