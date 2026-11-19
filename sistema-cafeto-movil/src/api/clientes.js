import { MODO_DEMO, solicitud } from './cliente';
import { aCuentaCliente } from './formas';
import { leerCuentaDemo, vincularClienteDemo } from './demo';

function exigirCuenta(respuesta) {
  const cuenta = aCuentaCliente(respuesta);
  if (!cuenta) throw { respuestaInvalida: true };
  return cuenta;
}

export async function leerCuenta(usuario) {
  if (MODO_DEMO) return exigirCuenta(await leerCuentaDemo(usuario?.uid));
  const token = await usuario.getIdToken();
  return exigirCuenta(await solicitud('/clientes/yo/', { token, firebase: true }));
}

export async function vincularCliente(usuario, datos) {
  if (MODO_DEMO) return exigirCuenta(await vincularClienteDemo(usuario?.uid));
  const token = await usuario.getIdToken();
  return exigirCuenta(
    await solicitud('/clientes/vincular/', { metodo: 'POST', cuerpo: datos, token, firebase: true })
  );
}
