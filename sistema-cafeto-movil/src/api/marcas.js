import { crearApiAbm } from './abm';
import { marcasDemo } from './demo';

export const apiMarcas = crearApiAbm({ ruta: '/marcas/', demo: marcasDemo });
