import { comoTexto, largoReal, limpiar, normalizar } from './texto';
import { aFecha } from './formato';

export const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
const ALGUNA_LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const LETRAS = 'A-Za-zÀ-ÖØ-öø-ÿ';
const NOMBRE_DE_PERSONA = new RegExp(`^[${LETRAS}]+(?:[ '-][${LETRAS}]+)*$`);
const NO_VA_EN_NOMBRE = new RegExp(`[^${LETRAS}' -]`, 'g');
const CONTROL = /[\u0000-\u001f\u007f]/;
const SIMBOLOS_PROHIBIDOS = '<>{}[]\\|^`';
const NIVELES = ['muy débil', 'débil', 'regular', 'fuerte'];

export function validarCorreo(valor, { obligatorio = false } = {}) {
  const texto = comoTexto(valor).trim();
  if (!texto) return obligatorio ? 'Ingresá tu correo electrónico.' : '';
  if (/\s/.test(texto)) return 'El correo no lleva espacios.';
  if (!texto.includes('@')) return 'Falta la @. Ejemplo: tunombre@correo.com';
  if (!FORMATO_CORREO.test(texto)) return 'Falta el dominio. Ejemplo: tunombre@correo.com';
  if (texto.length > 254) return 'El correo es demasiado largo.';
  return '';
}

export function filtrarNombre(valor) {
  return comoTexto(valor)
    .replace(/[’´`]/g, "'")
    .replace(NO_VA_EN_NOMBRE, '')
    .replace(/^[ '-]+/, '')
    .replace(/([ '-])[ '-]+/g, '$1');
}

export function filtrarTelefono(valor) {
  return comoTexto(valor).replace(/[^\d\s()+-]/g, '');
}

export function filtrarDni(valor) {
  return comoTexto(valor).replace(/\D/g, '').slice(0, 8);
}

export function validarDni(valor, { obligatorio = false } = {}) {
  const texto = comoTexto(valor).replace(/[.\s]/g, '');
  if (!texto) return obligatorio ? 'Ingresá tu DNI.' : '';
  if (!/^\d+$/.test(texto)) return 'El DNI va solo con números.';
  if (texto.length < 7 || texto.length > 8) return 'El DNI tiene 7 u 8 números.';
  return '';
}

export function filtrarCorreo(valor) {
  return comoTexto(valor).replace(/\s/g, '');
}

export function validarNombrePersona(valor, etiqueta = 'nombre', { obligatorio = true } = {}) {
  const texto = limpiar(valor);
  if (!texto) return obligatorio ? `Ingresá tu ${etiqueta}.` : '';
  if (!SOLO_LETRAS.test(texto) || !ALGUNA_LETRA.test(texto)) return 'Usá solo letras.';
  if (!NOMBRE_DE_PERSONA.test(texto)) return 'El apóstrofo y el guion van entre letras, como en D’Angelo o Pérez-Gómez.';
  if (largoReal(texto) < 2) return `Tu ${etiqueta} tiene que tener al menos 2 letras.`;
  if (largoReal(texto) > 50) return `Tu ${etiqueta} puede tener hasta 50 caracteres.`;
  return '';
}

export function validarTelefono(valor, { obligatorio = false } = {}) {
  const texto = comoTexto(valor).trim();
  if (!texto) return obligatorio ? 'Ingresá tu teléfono.' : '';
  if (/[^\d\s()+-]/.test(texto)) return 'El teléfono lleva solo números.';
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length < 7 || digitos.length > 15) return 'El teléfono tiene entre 7 y 15 dígitos.';
  return '';
}

export function medirFortaleza(clave) {
  const texto = comoTexto(clave);
  const pruebas = [
    { cumple: texto.length >= 8, consejo: 'Usá 8 caracteres o más' },
    { cumple: /[a-z]/.test(texto) && /[A-Z]/.test(texto), consejo: 'Combiná mayúsculas y minúsculas' },
    { cumple: /\d/.test(texto), consejo: 'Sumá un número' },
    { cumple: /[^A-Za-z0-9]/.test(texto), consejo: 'Sumá un símbolo' },
  ];
  const cumplidas = pruebas.filter((prueba) => prueba.cumple).length;
  const pendiente = pruebas.find((prueba) => !prueba.cumple);
  const segura = pruebas[0].cumple && pruebas[1].cumple && pruebas[2].cumple;
  const puntaje = !texto ? 0 : segura ? (pruebas[3].cumple ? 4 : 3) : cumplidas >= 2 ? 2 : 1;

  return {
    puntaje,
    nivel: NIVELES[Math.max(puntaje, 1) - 1],
    consejo: pendiente ? pendiente.consejo : 'Excelente',
    segura,
  };
}

export function calcularEdad(nacimiento, hoy = new Date()) {
  const fecha = aFecha(nacimiento);
  if (!fecha) return NaN;
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const yaCumplio =
    hoy.getMonth() > fecha.getMonth() || (hoy.getMonth() === fecha.getMonth() && hoy.getDate() >= fecha.getDate());
  if (!yaCumplio) edad -= 1;
  return edad;
}

export function validarFechaNacimiento(nacimiento, hoy = new Date()) {
  if (nacimiento === null || nacimiento === undefined || nacimiento === '') return '';
  const fecha = aFecha(nacimiento);
  if (!fecha) return 'Revisá la fecha de nacimiento.';
  if (fecha.getTime() > hoy.getTime()) return 'La fecha no puede ser posterior a hoy.';
  const edad = calcularEdad(fecha, hoy);
  if (edad < 14) return 'Tenés que tener al menos 14 años.';
  if (edad > 100) return 'Revisá el año de nacimiento.';
  return '';
}

export function validarTextoCatalogo(valor, { etiqueta = 'El nombre', minimo = 2, maximo = 50, obligatorio = true } = {}) {
  const crudo = comoTexto(valor);
  if (CONTROL.test(crudo)) return `${etiqueta} no puede tener saltos de línea ni tabulaciones.`;
  const usados = [...new Set(Array.from(crudo).filter((caracter) => SIMBOLOS_PROHIBIDOS.includes(caracter)))];
  if (usados.length > 0) return `${etiqueta} no admite los símbolos ${usados.join(' ')}.`;
  const texto = limpiar(crudo);
  if (!texto) return obligatorio ? `${etiqueta} es obligatorio.` : '';
  if (normalizar(texto) === '') return `${etiqueta} tiene que tener letras o números.`;
  if (largoReal(texto) < minimo) return `${etiqueta} tiene que tener al menos ${minimo} caracteres.`;
  if (largoReal(texto) > maximo) return `${etiqueta} puede tener hasta ${maximo} caracteres.`;
  return '';
}

export function normalizarUsuarioEquipo(valor) {
  const texto = comoTexto(valor).trim();
  return /^\d{1,2}\.\d{3}\.\d{3}$/.test(texto) ? texto.replace(/\./g, '') : texto;
}

export function validarUsuarioEquipo(valor) {
  const texto = normalizarUsuarioEquipo(valor);
  if (!texto) return '';
  if (/\s/.test(texto)) return 'No lleva espacios.';
  if (/^[\d.]+$/.test(texto)) return /^\d{7,8}$/.test(texto) ? '' : 'El DNI tiene 7 u 8 números.';
  if (/^\d/.test(texto)) return 'Si es tu DNI, va solo con números. Si es tu usuario, empieza con una letra.';
  if (!/^[a-z][a-z0-9]{1,34}$/i.test(texto)) return 'El usuario va con letras y números, sin tildes, como en la web.';
  return '';
}

export const CANTIDAD_MAXIMA = 999999;

export function leerCantidad(valor) {
  const texto = comoTexto(valor).trim().replace(/\s/g, '');
  if (!texto) return null;
  if (!/^\d+([.,]\d+)?$/.test(texto)) return NaN;
  return Number(texto.replace(',', '.'));
}

export function validarCantidad(
  valor,
  { etiqueta = 'La cantidad', entera = false, existencia = null, permitirCero = false } = {}
) {
  const texto = comoTexto(valor).trim().replace(/\s/g, '');
  if (!texto) return `Escribí ${etiqueta.charAt(0).toLowerCase()}${etiqueta.slice(1)}.`;
  const numero = leerCantidad(texto);
  if (numero === null || Number.isNaN(numero)) return `${etiqueta} va en números, por ejemplo 2 o 0,5.`;
  if (permitirCero ? numero < 0 : numero <= 0) {
    return permitirCero ? `${etiqueta} no puede ser menor que cero.` : `${etiqueta} tiene que ser mayor que cero.`;
  }
  if (numero > CANTIDAD_MAXIMA) return `${etiqueta} es demasiado grande: revisá el número.`;
  const decimales = texto.split(/[.,]/)[1] ?? '';
  if (decimales.length > 3) return `${etiqueta} admite hasta 3 decimales (un gramo).`;
  if (entera && !Number.isInteger(numero)) return 'Este producto va por unidad: la cantidad tiene que ser entera.';
  if (existencia !== null && numero > existencia + 1e-9) {
    return `No puede ser más de lo que hay (${String(Math.round(existencia * 1000) / 1000).replace('.', ',')}).`;
  }
  return '';
}

export function validarCodigoBarras(valor) {
  const texto = comoTexto(valor).trim();
  if (!texto) return 'Escribí o escaneá un código.';
  if (!/^\d{6,14}$/.test(texto)) return 'El código de barras tiene entre 6 y 14 números.';
  return '';
}
