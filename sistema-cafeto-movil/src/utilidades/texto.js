const SIN_ACENTO = {
  á: 'a',
  à: 'a',
  ä: 'a',
  â: 'a',
  ã: 'a',
  é: 'e',
  è: 'e',
  ë: 'e',
  ê: 'e',
  í: 'i',
  ì: 'i',
  ï: 'i',
  î: 'i',
  ó: 'o',
  ò: 'o',
  ö: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ù: 'u',
  ü: 'u',
  û: 'u',
  ñ: 'n',
  ç: 'c',
};

export function comoTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return typeof valor === 'string' ? valor : String(valor);
}

export function limpiar(valor) {
  return comoTexto(valor).replace(/\s+/g, ' ').trim();
}

export function normalizar(valor) {
  return comoTexto(valor)
    .toLowerCase()
    .replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, (letra) => SIN_ACENTO[letra])
    .replace(/[^a-z0-9]/g, '');
}

export function coincide(texto, busqueda) {
  const buscado = normalizar(busqueda);
  return buscado === '' || normalizar(texto).includes(buscado);
}

export function largoReal(valor) {
  return Array.from(comoTexto(valor)).length;
}

export function iniciales(nombre) {
  const letras = limpiar(nombre)
    .split(' ')
    .map((palabra) => Array.from(palabra)[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letras || 'C';
}

export function primerNombre(nombre, porDefecto = '') {
  return limpiar(nombre).split(' ')[0] || porDefecto;
}

export function codigoDeCliente(uid) {
  const fuente = comoTexto(uid) || 'cafeto';
  let primero = 7;
  let segundo = 13;
  for (const caracter of fuente) {
    const codigo = caracter.charCodeAt(0);
    primero = (primero * 31 + codigo) % 1048576;
    segundo = (segundo * 37 + codigo) % 1048576;
  }
  const parte = (valor) => valor.toString(16).toUpperCase().padStart(5, '0');
  return `CAF-${parte(primero)}${parte(segundo)}`;
}
