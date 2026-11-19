export const CLAVE_DEMO = 'Cafeto2026';

const PERMISOS_OPERADOR = [
  'ver_productos',
  'ver_stock',
  'contar_stock',
  'registrar_merma',
  'registrar_produccion',
  'imprimir_ofertas',
];

const PERMISOS_ENCARGADO = [
  ...PERMISOS_OPERADOR,
  'ver_ventas',
  'ver_caja',
  'registrar_traspaso',
  'autorizar_ajustes',
  'registrar_compra',
  'gestionar_ordenes',
  'ver_egresos',
  'ver_reportes',
  'ver_marcas',
  'crear_marca',
  'editar_marca',
  'ver_rubros',
  'crear_rubro',
  'editar_rubro',
];

const PERMISOS_ADMINISTRADOR = [
  ...PERMISOS_ENCARGADO,
  'ver_auditoria',
  'eliminar_marca',
  'eliminar_rubro',
];

export const USUARIOS = [
  {
    usuario: 'admin',
    dni: '30123456',
    nombre: 'Juan',
    apellido: 'Montes',
    perfil: 'Administrador',
    esAdministrador: true,
    esTitular: true,
    permisos: PERMISOS_ADMINISTRADOR,
  },
  {
    usuario: 'encargado',
    dni: '33456789',
    nombre: 'Camila',
    apellido: 'Aramayo',
    perfil: 'Encargado',
    esAdministrador: false,
    esTitular: false,
    permisos: PERMISOS_ENCARGADO,
  },
  {
    usuario: 'operador',
    dni: '40111222',
    nombre: 'Ariel',
    apellido: 'Roldán',
    perfil: 'Operador',
    esAdministrador: false,
    esTitular: false,
    permisos: PERMISOS_OPERADOR,
  },
];

export const PROVEEDORES = [
  { id: 1, nombre: 'Distribuidora Norte' },
  { id: 2, nombre: 'Lácteos del Valle' },
  { id: 3, nombre: 'Fiambres Salta' },
];

export const ORDENES = [
  {
    id: 501,
    idProveedor: 1,
    diasDesdeHoy: -1,
    estado: 'EMITIDA',
    renglones: [
      { idProducto: 201, pedido: 24, precio: 1500 },
      { idProducto: 202, pedido: 12, precio: 2600 },
      { idProducto: 205, pedido: 20, precio: 1300 },
      { idProducto: 206, pedido: 12, precio: 1700 },
    ],
    recibido: {},
  },
  {
    id: 502,
    idProveedor: 2,
    diasDesdeHoy: 0,
    estado: 'EMITIDA',
    renglones: [
      { idProducto: 209, pedido: 12, precio: 1300 },
      { idProducto: 210, pedido: 12, precio: 1000 },
      { idProducto: 304, pedido: 2, precio: 9000 },
    ],
    recibido: {},
  },
  {
    id: 503,
    idProveedor: 3,
    diasDesdeHoy: -2,
    estado: 'CON_DIFERENCIAS',
    renglones: [
      { idProducto: 211, pedido: 4, precio: 6200 },
      { idProducto: 212, pedido: 3, precio: 9800 },
    ],
    recibido: { 211: 4, 212: 2 },
  },
];

export const RECETAS = {
  108: [
    { idInsumo: 303, cantidad: 0.04 },
    { idInsumo: 304, cantidad: 0.015 },
  ],
  109: [
    { idInsumo: 303, cantidad: 0.06 },
    { idInsumo: 304, cantidad: 0.02 },
  ],
};

export const VENTAS_DEMO = { total: 186400, tickets: 57, semanaPasada: 171900, cajasAbiertas: 1 };

export const RUBROS = [
  { id: 1, nombre: 'Cafetería', descripcion: 'Cafés, infusiones y bebidas preparadas', activo: true, diasRebaja: null, porcentajeRebaja: null },
  { id: 2, nombre: 'Minisuper', descripcion: 'Almacén, bebidas envasadas y artículos de conveniencia', activo: true, diasRebaja: null, porcentajeRebaja: null },
  { id: 3, nombre: 'Lácteos', descripcion: 'Leches, yogures y quesos', activo: true, diasRebaja: 4, porcentajeRebaja: 30 },
  { id: 4, nombre: 'Bebidas', descripcion: 'Gaseosas, aguas y jugos', activo: true, diasRebaja: null, porcentajeRebaja: null },
  { id: 5, nombre: 'Golosinas', descripcion: 'Alfajores, chocolates y caramelos', activo: true, diasRebaja: null, porcentajeRebaja: null },
  { id: 6, nombre: 'Almacén', descripcion: 'Yerba, azúcar, galletitas', activo: true, diasRebaja: null, porcentajeRebaja: null },
  { id: 7, nombre: 'Panificados', descripcion: 'Medialunas y facturas del día', activo: true, diasRebaja: 1, porcentajeRebaja: 50 },
  { id: 8, nombre: 'Fiambrería', descripcion: 'Fiambres y quesos por peso', activo: true, diasRebaja: 3, porcentajeRebaja: 20 },
];

export const MARCAS = [
  { id: 1, nombre: 'Sin marca', descripcion: 'Productos sueltos o sin marca comercial' },
  { id: 2, nombre: 'La Serenísima', descripcion: 'Lácteos' },
  { id: 3, nombre: 'Cabrales', descripcion: 'Café en grano y molido' },
  { id: 4, nombre: 'Coca-Cola', descripcion: 'Gaseosas' },
  { id: 5, nombre: 'Arcor', descripcion: 'Golosinas' },
  { id: 6, nombre: 'Havanna', descripcion: 'Alfajores' },
  { id: 7, nombre: 'Terrabusi', descripcion: 'Galletitas' },
  { id: 8, nombre: 'Taragüí', descripcion: 'Yerba mate' },
  { id: 9, nombre: 'Ledesma', descripcion: 'Azúcar' },
  { id: 10, nombre: 'Villavicencio', descripcion: 'Agua mineral' },
  { id: 11, nombre: 'Tregar', descripcion: 'Quesos y yogures' },
  { id: 12, nombre: 'Paladini', descripcion: 'Fiambres' },
  { id: 13, nombre: 'Pureza', descripcion: 'Harinas' },
  { id: 14, nombre: 'Cafeto', descripcion: 'Elaboración propia del local' },
  { id: 15, nombre: 'Bimbo', descripcion: 'Panificados envasados' },
  { id: 16, nombre: 'Cachafaz', descripcion: 'Alfajores artesanales' },
  { id: 17, nombre: 'Milka', descripcion: 'Chocolates' },
  { id: 18, nombre: 'Rosamonte', descripcion: 'Yerba mate' },
  { id: 19, nombre: 'Playadito', descripcion: 'Yerba mate' },
  { id: 20, nombre: 'Sancor', descripcion: 'Lácteos' },
  { id: 21, nombre: 'Fargo', descripcion: 'Pan lactal' },
  { id: 22, nombre: 'Don Satur', descripcion: 'Bizcochos' },
  { id: 23, nombre: 'Baggio', descripcion: 'Jugos' },
  { id: 24, nombre: 'Cindor', descripcion: 'Chocolatada' },
];

export const PRODUCTOS = [
  { id: 101, nombre: 'Café chico', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Taza chica', precio: 1800, descripcion: 'Espresso corto, como en el bar', imagen: 'espresso', icono: 'cafe-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 102, nombre: 'Café con leche', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Taza grande', precio: 2600, descripcion: 'Con leche a elección', imagen: 'cafe-con-leche', icono: 'cafe-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 103, nombre: 'Capuchino', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Taza grande', precio: 3200, descripcion: 'Con espuma y cacao', imagen: 'capuchino', icono: 'cafe-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 104, nombre: 'Cold brew', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Vaso de 400 ml', precio: 3800, descripcion: 'Café frío, con o sin azúcar', imagen: 'cold-brew', icono: 'snow-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 105, nombre: 'Limonada con menta', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Vaso de 400 ml', precio: 3000, descripcion: 'Con menta y jengibre', imagen: 'limonada', icono: 'snow-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 106, nombre: 'Tostado de jamón y queso', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Porción', precio: 4500, descripcion: 'En pan de miga, bien caliente', imagen: 'tostado', icono: 'fast-food-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 107, nombre: 'Tostadas con palta', tipo: 'ELABORADO', idRubro: 1, idMarca: 14, presentacion: 'Porción', precio: 5200, descripcion: 'Pan de campo, palta y huevo', imagen: 'tostadas-palta', icono: 'fast-food-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 108, nombre: 'Medialuna de manteca', tipo: 'PRODUCIDO', idRubro: 7, idMarca: 14, presentacion: 'Unidad', precio: 900, descripcion: 'Recién horneadas en el local', imagen: 'medialunas', icono: 'restaurant-outline', stock: 18, stockMinimo: 6, controlaVencimiento: true, lotes: [{ numero: 'M-HOY', venceEnDias: 0, cantidad: 18 }], codigoBarras: null },
  { id: 109, nombre: 'Budín de limón', tipo: 'PRODUCIDO', idRubro: 7, idMarca: 14, presentacion: 'Porción', precio: 2500, descripcion: 'Casero, con glaseado de limón', imagen: 'budin-limon', icono: 'restaurant-outline', stock: 10, stockMinimo: 4, controlaVencimiento: true, lotes: [{ numero: 'B-01', venceEnDias: 3, cantidad: 10 }], codigoBarras: null },
  { id: 110, nombre: 'Desayuno Cafeto', tipo: 'COMBO', idRubro: 1, idMarca: 14, presentacion: 'Combo', precio: 4000, descripcion: 'Café con leche y 2 medialunas de manteca', imagen: 'medialunas', icono: 'sunny-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 111, nombre: 'Merienda dulce', tipo: 'COMBO', idRubro: 1, idMarca: 14, presentacion: 'Combo', precio: 4800, descripcion: 'Capuchino y una porción de budín de limón', imagen: 'budin-limon', icono: 'cafe-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 112, nombre: 'Brunch Cafeto', tipo: 'COMBO', idRubro: 1, idMarca: 14, presentacion: 'Combo', precio: 7900, descripcion: 'Café con leche, tostadas con palta y limonada', imagen: 'tostadas-palta', icono: 'restaurant-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 113, nombre: 'Combo al paso', tipo: 'COMBO', idRubro: 1, idMarca: 14, presentacion: 'Combo', precio: 5500, descripcion: 'Cold brew y tostado de jamón y queso', imagen: 'tostado', icono: 'walk-outline', stock: 0, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 201, nombre: 'Gaseosa cola', tipo: 'REVENTA', idRubro: 4, idMarca: 4, presentacion: '500 ml', precio: 2500, descripcion: 'Bien fría', imagen: null, icono: 'beer-outline', stock: 30, stockMinimo: 12, controlaVencimiento: false, lotes: [], codigoBarras: '7790895000782' },
  { id: 202, nombre: 'Gaseosa cola', tipo: 'REVENTA', idRubro: 4, idMarca: 4, presentacion: '1,5 L', precio: 4200, descripcion: 'Para compartir', imagen: null, icono: 'beer-outline', stock: 5, stockMinimo: 6, controlaVencimiento: false, lotes: [], codigoBarras: '7790895000997' },
  { id: 203, nombre: 'Agua sin gas', tipo: 'REVENTA', idRubro: 4, idMarca: 10, presentacion: '500 ml', precio: 1500, descripcion: 'Agua mineral natural', imagen: null, icono: 'water-outline', stock: 24, stockMinimo: 12, controlaVencimiento: false, lotes: [], codigoBarras: '7798062540018' },
  { id: 204, nombre: 'Chocolate con leche', tipo: 'REVENTA', idRubro: 5, idMarca: 5, presentacion: '100 g', precio: 1800, descripcion: 'Tableta clásica', imagen: null, icono: 'ice-cream-outline', stock: 15, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: '7790580327214' },
  { id: 205, nombre: 'Alfajor de dulce de leche', tipo: 'REVENTA', idRubro: 5, idMarca: 6, presentacion: 'Unidad', precio: 2200, descripcion: 'Bañado en chocolate', imagen: null, icono: 'ice-cream-outline', stock: 8, stockMinimo: 10, controlaVencimiento: false, lotes: [], codigoBarras: '7790040613201' },
  { id: 206, nombre: 'Galletitas surtidas', tipo: 'REVENTA', idRubro: 6, idMarca: 7, presentacion: '400 g', precio: 2900, descripcion: 'Para el mate o el café', imagen: null, icono: 'basket-outline', stock: 0, stockMinimo: 4, controlaVencimiento: false, lotes: [], codigoBarras: '7790040929906' },
  { id: 207, nombre: 'Yerba mate', tipo: 'REVENTA', idRubro: 6, idMarca: 8, presentacion: '1 kg', precio: 5200, descripcion: 'Con palo, molienda tradicional', imagen: null, icono: 'leaf-outline', stock: 12, stockMinimo: 4, controlaVencimiento: false, lotes: [], codigoBarras: '7790387013109' },
  { id: 208, nombre: 'Azúcar', tipo: 'REVENTA', idRubro: 6, idMarca: 9, presentacion: '1 kg', precio: 1500, descripcion: 'Azúcar común tipo A', imagen: null, icono: 'basket-outline', stock: 20, stockMinimo: 5, controlaVencimiento: false, lotes: [], codigoBarras: '7790150006139' },
  { id: 209, nombre: 'Yogur bebible frutilla', tipo: 'REVENTA', idRubro: 3, idMarca: 2, presentacion: '1 L', precio: 2200, descripcion: 'Bebible, sabor frutilla', imagen: null, icono: 'pint-outline', stock: 9, stockMinimo: 4, controlaVencimiento: true, lotes: [{ numero: 'Y-0412', venceEnDias: 2, cantidad: 4 }, { numero: 'Y-0420', venceEnDias: 12, cantidad: 5 }], codigoBarras: '7790742334305' },
  { id: 210, nombre: 'Leche entera larga vida', tipo: 'REVENTA', idRubro: 3, idMarca: 2, presentacion: '1 L', precio: 1700, descripcion: 'Larga vida, entera', imagen: null, icono: 'pint-outline', stock: 14, stockMinimo: 6, controlaVencimiento: true, lotes: [{ numero: 'L-1101', venceEnDias: 40, cantidad: 14 }], codigoBarras: '7790742001221' },
  { id: 211, nombre: 'Queso cremoso', tipo: 'REVENTA', fraccionable: true, unidad: 'KG', idRubro: 8, idMarca: 11, presentacion: 'Por kg', precio: 9000, descripcion: 'Se corta en el momento', imagen: null, icono: 'pizza-outline', stock: 3.5, stockMinimo: 1, controlaVencimiento: true, lotes: [{ numero: 'Q-0398', venceEnDias: -1, cantidad: 0.5 }, { numero: 'Q-0405', venceEnDias: 6, cantidad: 3 }], codigoBarras: null },
  { id: 212, nombre: 'Jamón cocido', tipo: 'REVENTA', fraccionable: true, unidad: 'KG', idRubro: 8, idMarca: 12, presentacion: 'Por kg', precio: 14000, descripcion: 'Feteado en el momento', imagen: null, icono: 'pizza-outline', stock: 2.2, stockMinimo: 1, controlaVencimiento: true, lotes: [{ numero: 'J-0211', venceEnDias: 2, cantidad: 2.2 }], codigoBarras: null },
  { id: 301, nombre: 'Café en grano', tipo: 'INSUMO', unidad: 'KG', idRubro: 1, idMarca: 3, presentacion: '1 kg', precio: 0, descripcion: 'Para la máquina de café', imagen: null, icono: 'cube-outline', stock: 1.5, stockMinimo: 2, controlaVencimiento: false, lotes: [], codigoBarras: '7791234500017' },
  { id: 302, nombre: 'Leche para cafetería', tipo: 'INSUMO', unidad: 'L', idRubro: 1, idMarca: 2, presentacion: '1 L', precio: 0, descripcion: 'Para preparar cafés', imagen: null, icono: 'cube-outline', stock: 8, stockMinimo: 6, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 303, nombre: 'Harina 000', tipo: 'INSUMO', unidad: 'KG', idRubro: 1, idMarca: 13, presentacion: '1 kg', precio: 0, descripcion: 'Para las medialunas', imagen: null, icono: 'cube-outline', stock: 10, stockMinimo: 0, controlaVencimiento: false, lotes: [], codigoBarras: null },
  { id: 304, nombre: 'Manteca', tipo: 'INSUMO', unidad: 'KG', idRubro: 1, idMarca: 2, presentacion: '1 kg', precio: 0, descripcion: 'Para las medialunas', imagen: null, icono: 'cube-outline', stock: 0.8, stockMinimo: 1, controlaVencimiento: false, lotes: [], codigoBarras: null },
];

export const BENEFICIOS = [
  { id: 1, icono: 'pricetag-outline', titulo: '5% off en cada compra', detalle: 'Se aplica solo al pagar', tipo: 'AUTOMATICO', categoria: 'Silver', puntos: 0 },
  { id: 2, icono: 'gift-outline', titulo: 'Regalo de cumpleaños', detalle: 'Un café gratis en tu semana', tipo: 'AUTOMATICO', categoria: 'Bronze', puntos: 0 },
  { id: 3, icono: 'restaurant-outline', titulo: 'Medialunas x3', detalle: 'Retirás en el mostrador', tipo: 'CANJEABLE', categoria: 'Bronze', puntos: 300 },
  { id: 4, icono: 'cafe-outline', titulo: 'Café con leche gratis', detalle: 'Retirás en el mostrador', tipo: 'CANJEABLE', categoria: 'Bronze', puntos: 400 },
  { id: 5, icono: 'pricetag-outline', titulo: '10% off en cada compra', detalle: 'Se aplica solo al pagar', tipo: 'AUTOMATICO', categoria: 'Gold', puntos: 0 },
  { id: 6, icono: 'fast-food-outline', titulo: 'Desayuno completo', detalle: 'Café con leche y tostado de jamón y queso', tipo: 'CANJEABLE', categoria: 'Gold', puntos: 900 },
  { id: 7, icono: 'diamond-outline', titulo: '15% off en cada compra', detalle: 'Se aplica solo al pagar', tipo: 'AUTOMATICO', categoria: 'Platinum', puntos: 0 },
];
