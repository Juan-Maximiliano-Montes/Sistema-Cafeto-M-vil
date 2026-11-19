export const TIPOS_AJUSTE = {
  CONTEO: { texto: 'Conteo de inventario', icono: 'clipboard-outline' },
  MERMA: { texto: 'Merma', icono: 'trash-outline' },
  TRASPASO: { texto: 'Traspaso', icono: 'swap-horizontal-outline' },
};

export const MOTIVOS_AJUSTE = {
  CONTEO: [
    { clave: 'DIFERENCIA_CONTEO', texto: 'Diferencia de conteo' },
    { clave: 'INVENTARIO_INICIAL', texto: 'Inventario inicial' },
  ],
  MERMA: [
    { clave: 'VENCIMIENTO', texto: 'Vencido' },
    { clave: 'ROTURA', texto: 'Rotura o daño' },
    { clave: 'DETERIORO', texto: 'Mal estado' },
    { clave: 'CONSUMO_INTERNO', texto: 'Consumo interno' },
    { clave: 'OTRO', texto: 'Otro' },
  ],
  TRASPASO: [
    { clave: 'USO_EN_CAFETERIA', texto: 'Pasa a usarse como insumo' },
    { clave: 'REEMPAQUE', texto: 'Reempaque o fraccionamiento' },
    { clave: 'OTRO', texto: 'Otro' },
  ],
};

export function textoMotivo(tipo, clave) {
  return MOTIVOS_AJUSTE[tipo]?.find((motivo) => motivo.clave === clave)?.texto ?? 'Sin motivo';
}

export const TIPOS_COMPROBANTE = [
  { clave: 'REMITO', texto: 'Remito' },
  { clave: 'FACTURA_A', texto: 'Factura A' },
  { clave: 'FACTURA_B', texto: 'Factura B' },
  { clave: 'FACTURA_C', texto: 'Factura C' },
  { clave: 'TICKET', texto: 'Ticket' },
  { clave: 'OTRO', texto: 'Otro' },
];

export const UNIDADES = {
  UNIDAD: 'u.',
  KG: 'kg',
  G: 'g',
  L: 'l',
  ML: 'ml',
};

export function stockARevisar(cantidad) {
  return typeof cantidad === 'number' && cantidad < 0;
}

export function textoDeStock(cantidad, unidad) {
  return stockARevisar(cantidad) ? 'a revisar' : conUnidad(cantidad, unidad);
}

export function usadoDeMas(cantidad, unidad) {
  return `se usó ${conUnidad(Math.abs(cantidad), unidad)} más de lo cargado`;
}

export function conUnidad(cantidad, unidad) {
  const numero = Number(cantidad);
  if (!Number.isFinite(numero)) return '';
  const texto = String(Math.round(numero * 1000) / 1000).replace('.', ',');
  return `${texto} ${UNIDADES[unidad] ?? 'u.'}`;
}
