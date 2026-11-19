export const TIPOS_ALERTA = {
  VENCIDO: { etiqueta: 'Lote vencido', icono: 'alert-circle', grave: true },
  SIN_STOCK: { etiqueta: 'Sin stock', icono: 'close-circle', grave: true },
  POR_VENCER: { etiqueta: 'Por vencer', icono: 'time', grave: false },
  STOCK_BAJO: { etiqueta: 'Stock bajo', icono: 'trending-down', grave: false },
};

export const A_REVISAR = { etiqueta: 'A revisar', icono: 'help-circle', grave: false };

export const FILTROS_ALERTA = [
  { clave: 'TODAS', texto: 'Todas' },
  { clave: 'STOCK', texto: 'Stock' },
  { clave: 'VENCIMIENTO', texto: 'Vencimientos' },
];
