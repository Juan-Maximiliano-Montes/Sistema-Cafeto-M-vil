export const ordenCategorias = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export const coloresCategoria = {
  Bronze: '#C98A52',
  Silver: '#CFD3DE',
  Gold: '#FAB41F',
  Platinum: '#9FB4CC',
};

export const categorias = [
  { nombre: 'Bronze', puntosMinimos: 0, desde: 'Desde que creás tu cuenta', tasa: '1 pto c/ $100' },
  { nombre: 'Silver', puntosMinimos: 1000, desde: 'Desde 1.000 puntos', tasa: '1 pto c/ $83' },
  { nombre: 'Gold', puntosMinimos: 5000, desde: 'Desde 5.000 puntos', tasa: '1 pto c/ $67' },
  { nombre: 'Platinum', puntosMinimos: 15000, desde: 'Desde 15.000 puntos', tasa: '1 pto c/ $50' },
];

export const cliente = {
  categoria: 'Silver',
  puntosDisponibles: 320,
  puntosAcumulados: 1840,
  proximaCategoria: 'Gold',
  puntosProximaCategoria: 5000,
};

export const movimientos = [
  { id: 1, concepto: 'Compra en caja', fecha: '12 oct', puntos: 38 },
  { id: 2, concepto: 'Canje: medialunas x3', fecha: '2 oct', puntos: -300 },
  { id: 3, concepto: 'Compra en caja', fecha: '28 sep', puntos: 54 },
  { id: 4, concepto: 'Compra en caja', fecha: '21 sep', puntos: 27 },
  { id: 5, concepto: 'Subiste a Silver', fecha: '15 sep', puntos: 0 },
];
