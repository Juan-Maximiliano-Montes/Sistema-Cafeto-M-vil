import { CLAVE_DEMO, USUARIOS } from './datos';
import { esperar, fallar } from './utilidades';

export const USUARIOS_DEMO = USUARIOS.map((usuario) => ({
  usuario: usuario.usuario,
  dni: usuario.dni,
  clave: CLAVE_DEMO,
  perfil: usuario.perfil,
}));

const PREFIJO = 'demo-';

export function usuarioDelToken(token) {
  if (typeof token !== 'string' || !token.startsWith(PREFIJO)) return null;
  return USUARIOS.find((usuario) => usuario.usuario === token.slice(PREFIJO.length)) ?? null;
}

function exigirSesion(token) {
  const usuario = usuarioDelToken(token);
  if (!usuario) throw fallar(401, 'Tu sesión venció. Volvé a entrar con tu usuario.');
  return usuario;
}

export function exigirPermiso(token, codigo) {
  const usuario = exigirSesion(token);
  if (!usuario.permisos.includes(codigo)) throw fallar(403, 'Tu usuario no tiene permiso para hacer esto.');
  return usuario;
}

export function exigirAlguno(token, codigos) {
  const usuario = exigirSesion(token);
  if (!codigos.some((codigo) => usuario.permisos.includes(codigo))) {
    throw fallar(403, 'Tu usuario no tiene permiso para hacer esto.');
  }
  return usuario;
}

export function nombreCompleto(usuario) {
  return `${usuario.nombre} ${usuario.apellido}`;
}

export async function entrarDemo(usuario, clave) {
  await esperar();
  const nombreUsuario = String(usuario ?? '').trim().toLowerCase();
  const encontrado = USUARIOS.find((item) => item.usuario === nombreUsuario || item.dni === nombreUsuario);
  if (!encontrado || clave !== CLAVE_DEMO) {
    throw fallar(401, 'El usuario o la contraseña no coinciden.');
  }
  return {
    token: `${PREFIJO}${encontrado.usuario}`,
    usuario: {
      nombre: encontrado.nombre,
      apellido: encontrado.apellido,
      perfil: encontrado.perfil,
      es_administrador: encontrado.esAdministrador,
      es_titular: encontrado.esTitular,
      permisos: [...encontrado.permisos],
    },
  };
}

export async function salirDemo() {
  return null;
}
