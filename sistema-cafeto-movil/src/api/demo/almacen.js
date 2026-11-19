import AsyncStorage from '@react-native-async-storage/async-storage';
import { fallar } from './utilidades';

const colas = new Map();
const CLAVE_OPERACIONES = 'cafeto:demo:v3:operaciones';
const MAXIMO_OPERACIONES = 200;

export function enCola(clave, tarea) {
  const anterior = colas.get(clave) ?? Promise.resolve();
  const resultado = anterior.then(tarea, tarea);
  colas.set(
    clave,
    resultado.catch(() => null)
  );
  return resultado;
}

export async function guardarColeccion(clave, datos) {
  try {
    await AsyncStorage.setItem(clave, JSON.stringify(datos));
  } catch (error) {
    throw fallar(500, 'No pudimos guardar los datos en este celular. Liberá espacio y probá de nuevo.');
  }
}

async function leerTexto(clave) {
  try {
    return await AsyncStorage.getItem(clave);
  } catch (error) {
    throw fallar(500, 'No pudimos leer los datos guardados en este celular. Probá de nuevo.');
  }
}

function interpretar(texto) {
  try {
    return texto ? JSON.parse(texto) : null;
  } catch (error) {
    return null;
  }
}

export async function leerColeccion(clave, crearInicial, esValido) {
  const guardado = interpretar(await leerTexto(clave));
  if (Array.isArray(guardado) && guardado.length > 0 && guardado.every(esValido)) {
    return guardado;
  }
  const inicial = crearInicial();
  await guardarColeccion(clave, inicial);
  return inicial;
}

export async function leerObjeto(clave, crearInicial, esValido) {
  const guardado = interpretar(await leerTexto(clave));
  if (guardado && typeof guardado === 'object' && !Array.isArray(guardado) && esValido(guardado)) {
    return guardado;
  }
  const inicial = crearInicial();
  await guardarColeccion(clave, inicial);
  return inicial;
}

export async function exigirOperacionNueva(claveOperacion) {
  if (typeof claveOperacion !== 'string' || !claveOperacion) return;
  const usadas = interpretar(await leerTexto(CLAVE_OPERACIONES));
  const lista = Array.isArray(usadas) ? usadas.filter((item) => typeof item === 'string') : [];
  if (lista.includes(claveOperacion)) {
    throw fallar(409, 'Esa operación ya se había cargado. No se repitió.');
  }
}

export async function anotarOperacion(claveOperacion) {
  if (typeof claveOperacion !== 'string' || !claveOperacion) return;
  const usadas = interpretar(await leerTexto(CLAVE_OPERACIONES));
  const lista = Array.isArray(usadas) ? usadas.filter((item) => typeof item === 'string') : [];
  await guardarColeccion(CLAVE_OPERACIONES, [...lista, claveOperacion].slice(-MAXIMO_OPERACIONES));
}
