import React from 'react';
import AbmLiviano from '../src/componentes/AbmLiviano';
import { apiRubros } from '../src/api/rubros';

const CONFIGURACION = {
  clave: 'rubros',
  titulo: 'Rubros',
  singular: 'rubro',
  genero: 'm',
  icono: 'albums-outline',
  permisos: { crear: 'crear_rubro', editar: 'editar_rubro', eliminar: 'eliminar_rubro' },
  api: apiRubros,
  maximoNombre: 40,
  conActivo: true,
  ejemploNombre: 'Ej.: Lácteos',
  ejemploDescripcion: 'Ej.: Leches, yogures y quesos',
  ayuda:
    'Los rubros ordenan los productos en la app y en la web. La rebaja automática por vencimiento de cada rubro se configura desde la web.',
  textoBaja: 'Deja de ofrecerse al cargar productos. Los productos que ya lo usan no cambian.',
  textoActivo: {
    etiqueta: 'Se ofrece al cargar productos',
    ayuda: 'Si lo apagás, el rubro sigue guardado pero no aparece al cargar productos nuevos.',
  },
};

export default function Rubros() {
  return <AbmLiviano configuracion={CONFIGURACION} />;
}
