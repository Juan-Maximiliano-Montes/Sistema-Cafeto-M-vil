import React from 'react';
import AbmLiviano from '../src/componentes/AbmLiviano';
import { apiMarcas } from '../src/api/marcas';

const CONFIGURACION = {
  clave: 'marcas',
  titulo: 'Marcas',
  singular: 'marca',
  genero: 'f',
  icono: 'pricetags-outline',
  permisos: { crear: 'crear_marca', editar: 'editar_marca', eliminar: 'eliminar_marca' },
  api: apiMarcas,
  maximoNombre: 50,
  ejemploNombre: 'Ej.: La Morenita',
  ejemploDescripcion: 'Ej.: Café y yerba',
  ayuda:
    'Escribí la marca tal como figura en el envase. Si una marca tiene productos vigentes, no se puede dar de baja: primero hay que cambiarlos desde la web.',
  textoBaja: 'Deja de ofrecerse al cargar productos. Su historial no se borra.',
};

export default function Marcas() {
  return <AbmLiviano configuracion={CONFIGURACION} />;
}
