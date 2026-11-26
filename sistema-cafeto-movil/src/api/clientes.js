import { solicitud } from './cliente';
import { aCuentaCliente } from './formas';

function exigirCuenta(respuesta) {
  const cuenta = aCuentaCliente(respuesta);
  if (!cuenta) throw { respuestaInvalida: true };
  return cuenta;
}

export async function leerCuenta(usuario) {
  const token = await usuario.getIdToken();
  return exigirCuenta(await solicitud('/clientes/yo/', { token, firebase: true }));
}

export async function vincularCliente(usuario, datos) {
  const token = await usuario.getIdToken();
  return exigirCuenta(
    await solicitud('/clientes/vincular/', { metodo: 'POST', cuerpo: datos, token, firebase: true })
  );
}

export async function actualizarPerfilCliente(usuario, datos) {
  const token = await usuario.getIdToken();
  return exigirCuenta(
    await solicitud('/clientes/yo/', { metodo: 'PATCH', cuerpo: datos, token, firebase: true })
  );
}
