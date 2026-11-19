import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSesion } from '../sesion/SesionContext';
import { mensajeDeError } from '../api/cliente';
import { leerCuenta, vincularCliente } from '../api/clientes';
import { aIso } from '../utilidades/formato';
import { limpiar } from '../utilidades/texto';

const CuentaClienteContext = createContext(null);

const CAMPOS_DEL_ALTA = {
  nombre: 'tu nombre',
  nombre_cliente: 'tu nombre',
  apellido: 'tu apellido',
  apellido_cliente: 'tu apellido',
  telefono: 'tu teléfono',
  telefono_cliente: 'tu teléfono',
  dni: 'tu DNI',
  dni_cliente: 'tu DNI',
  fecha_nacimiento: 'tu fecha de nacimiento',
};

function clavePerfil(usuario) {
  return `cafeto:perfil:${usuario.uid}`;
}

async function leerPerfil(usuario) {
  try {
    const texto = await AsyncStorage.getItem(clavePerfil(usuario));
    const datos = texto ? JSON.parse(texto) : {};
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  } catch (error) {
    return {};
  }
}

async function datosParaVincular(usuario, { conDni = true } = {}) {
  const guardado = await leerPerfil(usuario);
  const partes = limpiar(usuario.displayName).split(' ').filter(Boolean);
  return {
    nombre: limpiar(guardado.nombre) || partes[0] || '',
    apellido: limpiar(guardado.apellido) || partes.slice(1).join(' ') || '',
    telefono: limpiar(guardado.telefono) || null,
    dni: conDni ? limpiar(guardado.dni) || null : null,
    fecha_nacimiento: aIso(guardado.fechaNacimiento) ?? null,
  };
}

async function guardarEnPerfil(usuario, cambios) {
  const guardado = await leerPerfil(usuario);
  await AsyncStorage.setItem(clavePerfil(usuario), JSON.stringify({ ...guardado, ...cambios })).catch(() => null);
}

export function camposDelAlta(error) {
  const errores = error?.datos?.errores;
  if (!errores || typeof errores !== 'object') return [];
  return [...new Set(Object.keys(errores).map((campo) => CAMPOS_DEL_ALTA[campo]).filter(Boolean))];
}

export function estadoDelError(error) {
  const codigo = error?.datos?.codigo;
  if (error?.estado === 503) return 'sin_servicio';
  if (codigo === 'FICHA_DADA_DE_BAJA' || codigo === 'FICHA_DE_OTRA_CUENTA') return 'en_caja';
  if (error?.estado === 409 && (codigo === 'CORREO_REPETIDO' || codigo === 'DNI_NO_COINCIDE')) return 'correo_repetido';
  if (error?.estado === 400 && codigo === 'FALTA_TELEFONO_O_DNI') return 'falta_identificacion';
  if (error?.estado === 400 && (codigo === 'TELEFONO_DE_OTRO_CLIENTE' || codigo === 'DNI_DE_OTRO_CLIENTE')) return 'dato_de_otro';
  if (error?.estado === 400 && camposDelAlta(error).length > 0) return 'faltan_datos';
  if (error?.estado === 403) return 'sin_verificar';
  return 'error';
}

export function CuentaClienteProvider({ children }) {
  const { rol, usuario } = useSesion();
  const [cuenta, setCuenta] = useState(null);
  const [estado, setEstado] = useState('inactivo');
  const [error, setError] = useState('');
  const [codigo, setCodigo] = useState('');
  const [faltan, setFaltan] = useState([]);
  const consulta = useRef(0);
  const dniRechazado = useRef(false);
  const esCliente = rol === 'cliente' && Boolean(usuario);

  const listo = useCallback((datos) => {
    setCuenta(datos);
    setError('');
    setCodigo('');
    setFaltan([]);
    setEstado('listo');
  }, []);

  const cargar = useCallback(async () => {
    const actual = ++consulta.current;
    if (!esCliente) {
      setCuenta(null);
      setError('');
      setCodigo('');
      setFaltan([]);
      setEstado('inactivo');
      return;
    }
    setEstado((anterior) => (anterior === 'listo' ? 'listo' : 'cargando'));
    try {
      let datos;
      try {
        datos = await leerCuenta(usuario);
      } catch (problema) {
        if (problema?.estado !== 404 || problema?.datos?.codigo) throw problema;
        datos = await vincularCliente(usuario, await datosParaVincular(usuario, { conDni: !dniRechazado.current }));
      }
      if (actual !== consulta.current) return;
      listo(datos);
    } catch (problema) {
      if (actual !== consulta.current) return;
      if (problema?.datos?.codigo === 'DNI_NO_COINCIDE') dniRechazado.current = true;
      setError(mensajeDeError(problema, 'No pudimos traer tus puntos.'));
      setCodigo(problema?.datos?.codigo ?? '');
      setFaltan(camposDelAlta(problema));
      setEstado((anterior) => (anterior === 'listo' ? 'listo' : estadoDelError(problema)));
    }
  }, [esCliente, usuario, listo]);

  useEffect(() => {
    dniRechazado.current = false;
    cargar();
  }, [cargar]);

  const buscarConDni = useCallback(
    async (dni) => {
      const actual = ++consulta.current;
      const datos = await vincularCliente(usuario, { ...(await datosParaVincular(usuario)), dni });
      await guardarEnPerfil(usuario, { dni });
      if (actual === consulta.current) listo(datos);
      return datos;
    },
    [usuario, listo]
  );

  const completarFicha = useCallback(
    async ({ telefono, dni }) => {
      const actual = ++consulta.current;
      const extras = {};
      if (limpiar(telefono)) extras.telefono = `+54 ${limpiar(telefono)}`;
      if (limpiar(dni)) extras.dni = limpiar(dni);
      const datos = await vincularCliente(usuario, { ...(await datosParaVincular(usuario)), ...extras });
      await guardarEnPerfil(usuario, extras);
      if (actual === consulta.current) listo(datos);
      return datos;
    },
    [usuario, listo]
  );

  const estadoVisible = esCliente && estado === 'inactivo' ? 'cargando' : estado;

  const valor = useMemo(
    () => ({
      cuenta,
      estado: estadoVisible,
      cargando: estadoVisible === 'cargando',
      error,
      codigo,
      faltan,
      actualizar: cargar,
      buscarConDni,
      completarFicha,
    }),
    [cuenta, estadoVisible, error, codigo, faltan, cargar, buscarConDni, completarFicha]
  );

  return <CuentaClienteContext.Provider value={valor}>{children}</CuentaClienteContext.Provider>;
}

export function useCuentaCliente() {
  return useContext(CuentaClienteContext);
}
