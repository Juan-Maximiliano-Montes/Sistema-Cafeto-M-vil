export const ordenCategorias = ['Bronze', 'Silver', 'Gold'];

export const coloresCategoria = {
  Bronze: '#C98A52',
  Silver: '#CFD3DE',
  Gold: '#FAB41F',
};

export const categorias = [
  { nombre: 'Bronze', desde: 'Desde que creás tu cuenta', tasa: '1 pto c/ $100' },
  { nombre: 'Silver', desde: 'Desde 1.000 puntos', tasa: '1 pto c/ $83' },
  { nombre: 'Gold', desde: 'Desde 5.000 puntos', tasa: '1 pto c/ $67' },
];

export const cliente = {
  categoria: 'Silver',
  puntosDisponibles: 320,
  puntosAcumulados: 1840,
  proximaCategoria: 'Gold',
  puntosProximaCategoria: 5000,
  codigoQr: 'CAF-0042-7731',
};

export const beneficios = [
  { id: 1, icono: 'pricetag-outline', titulo: '5% off en cada compra', detalle: 'Se aplica solo al pagar', tipo: 'AUTOMATICO', categoria: 'Silver', puntos: 0 },
  { id: 2, icono: 'gift-outline', titulo: 'Regalo de cumpleaños', detalle: 'Un café gratis en tu semana', tipo: 'AUTOMATICO', categoria: 'Bronze', puntos: 0 },
  { id: 3, icono: 'restaurant-outline', titulo: 'Medialunas x3', detalle: 'Retirás en el mostrador', tipo: 'CANJEABLE', categoria: 'Bronze', puntos: 300 },
  { id: 4, icono: 'cafe-outline', titulo: 'Café con leche gratis', detalle: 'Retirás en el mostrador', tipo: 'CANJEABLE', categoria: 'Bronze', puntos: 400 },
  { id: 5, icono: 'pricetag-outline', titulo: '10% off en cada compra', detalle: 'Se aplica solo al pagar', tipo: 'AUTOMATICO', categoria: 'Gold', puntos: 0 },
  { id: 6, icono: 'fast-food-outline', titulo: 'Desayuno completo', detalle: 'Café con leche + tostado J&Q', tipo: 'CANJEABLE', categoria: 'Gold', puntos: 900 },
];

export const movimientos = [
  { id: 1, concepto: 'Compra en caja', fecha: '12 oct', puntos: 38 },
  { id: 2, concepto: 'Canje: medialunas x3', fecha: '2 oct', puntos: -300 },
  { id: 3, concepto: 'Compra en caja', fecha: '28 sep', puntos: 54 },
  { id: 4, concepto: 'Compra en caja', fecha: '21 sep', puntos: 27 },
  { id: 5, concepto: 'Subiste a Silver', fecha: '15 sep', puntos: 0 },
];

export const rubros = ['Todo', 'Café', 'Panadería', 'Brunch', 'Frío'];

export const productos = [
  { id: 1, nombre: 'Café con leche', detalle: 'Doble, con leche a elección', precio: 3200, rubro: 'Café', icono: 'cafe-outline', imagen: require('../../assets/productos/cafe-con-leche.jpg') },
  { id: 2, nombre: 'Espresso', detalle: 'Café de especialidad', precio: 2200, rubro: 'Café', icono: 'cafe-outline', imagen: require('../../assets/productos/espresso.jpg') },
  { id: 3, nombre: 'Capuchino', detalle: 'Con espuma y cacao', precio: 3500, rubro: 'Café', icono: 'cafe-outline', imagen: require('../../assets/productos/capuchino.jpg') },
  { id: 4, nombre: 'Medialunas x3', detalle: 'De manteca, recién horneadas', precio: 2800, rubro: 'Panadería', icono: 'restaurant-outline', imagen: require('../../assets/productos/medialunas.jpg') },
  { id: 5, nombre: 'Budín de limón', detalle: 'Porción casera', precio: 2500, rubro: 'Panadería', icono: 'restaurant-outline', imagen: require('../../assets/productos/budin-limon.jpg') },
  { id: 6, nombre: 'Tostado J&Q', detalle: 'Jamón y queso en pan de miga', precio: 4500, rubro: 'Brunch', icono: 'fast-food-outline', imagen: require('../../assets/productos/tostado.jpg') },
  { id: 7, nombre: 'Tostadas con palta', detalle: 'Pan de campo y huevo', precio: 5200, rubro: 'Brunch', icono: 'fast-food-outline', imagen: require('../../assets/productos/tostadas-palta.jpg') },
  { id: 8, nombre: 'Cold brew', detalle: 'Café frío, con o sin azúcar', precio: 4100, rubro: 'Frío', icono: 'snow-outline', imagen: require('../../assets/productos/cold-brew.jpg') },
  { id: 9, nombre: 'Limonada', detalle: 'Con menta y jengibre', precio: 3000, rubro: 'Frío', icono: 'snow-outline', imagen: require('../../assets/productos/limonada.jpg') },
];
