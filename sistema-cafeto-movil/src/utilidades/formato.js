const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function conPuntos(entero) {
  return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean') return NaN;
  const numero = Number(valor);
  return Math.abs(numero) > Number.MAX_SAFE_INTEGER ? NaN : numero;
}

export function formatearNumero(valor) {
  const numero = aNumero(valor);
  if (!Number.isFinite(numero)) return '0';
  const redondeado = Math.round(numero);
  return `${redondeado < 0 ? '-' : ''}${conPuntos(Math.abs(redondeado))}`;
}

export function formatearPrecio(valor) {
  const numero = aNumero(valor);
  if (!Number.isFinite(numero) || numero < 0) return 'Consultá en el local';
  return `$${conPuntos(Math.round(numero))}`;
}

export function formatearPuntos(valor) {
  const numero = aNumero(valor);
  if (!Number.isFinite(numero)) return '0 pts';
  const redondeado = Math.round(numero);
  const signo = redondeado > 0 ? '+' : '';
  return `${signo}${formatearNumero(redondeado)} pts`;
}

export function formatearCantidad(valor) {
  const numero = aNumero(valor);
  if (!Number.isFinite(numero)) return '0';
  const [entero, decimales] = Math.abs(numero).toFixed(2).split('.');
  const signo = numero < 0 && Number(`${entero}.${decimales}`) !== 0 ? '-' : '';
  const sinCeros = decimales.replace(/0+$/, '');
  return `${signo}${conPuntos(entero)}${sinCeros ? `,${sinCeros}` : ''}`;
}

export function aFecha(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null;
  const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return fecha;
}

export function aIso(fecha) {
  const valida = aFecha(fecha);
  if (!valida) return null;
  const mes = String(valida.getMonth() + 1).padStart(2, '0');
  const dia = String(valida.getDate()).padStart(2, '0');
  return `${valida.getFullYear()}-${mes}-${dia}`;
}

export function formatearFechaCorta(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return '';
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
}

export function formatearFechaLarga(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return '';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

export function diasHasta(valor, hoy = new Date()) {
  const fecha = aFecha(valor);
  if (!fecha) return null;
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fecha.getTime() - base.getTime()) / 86400000);
}

export function describirVencimiento(dias) {
  if (typeof dias !== 'number' || !Number.isFinite(dias)) return '';
  if (dias < -1) return `Venció hace ${-dias} días`;
  if (dias === -1) return 'Venció ayer';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}
