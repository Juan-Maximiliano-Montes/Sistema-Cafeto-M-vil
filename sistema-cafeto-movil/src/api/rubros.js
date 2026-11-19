import { crearApiAbm } from './abm';
import { rubrosDemo } from './demo';

export const apiRubros = crearApiAbm({ ruta: '/rubros/', demo: rubrosDemo });
