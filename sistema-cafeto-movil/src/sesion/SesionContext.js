import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { onIdTokenChanged, signOut, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { entrarEquipo, salirEquipo } from '../api/equipo';
import { escucharEntrada, hayEntrada, reiniciarEntrada } from './entrada';

const CLAVE_EQUIPO = 'cafeto.sesionEquipo';

function textoOpcional(valor, porDefecto) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : porDefecto;
}

export function aSesionEquipo(datos) {
  if (!datos || typeof datos !== 'object') return null;
  const token = textoOpcional(datos.token, '');
  if (!token) return null;
  return {
    token,
    nombre: textoOpcional(datos.nombre, 'Equipo'),
    apellido: textoOpcional(datos.apellido, ''),
    perfil: textoOpcional(datos.perfil, 'Equipo Cafeto'),
    esAdministrador: datos.esAdministrador === true || datos.es_administrador === true,
    esTitular: datos.esTitular === true || datos.es_titular === true,
    permisos: Array.isArray(datos.permisos) ? datos.permisos.filter((permiso) => typeof permiso === 'string') : [],
  };
}

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(undefined);
  const [equipo, setEquipo] = useState(null);
  const [equipoLeido, setEquipoLeido] = useState(false);
  const [entrada, setEntrada] = useState(hayEntrada());
  const [versionPerfil, setVersionPerfil] = useState(0);
  const entroYaVerificado = useRef(false);
  const uidPrevio = useRef(null);

  useEffect(() => escucharEntrada(setEntrada), []);

  useEffect(() => {
    SecureStore.getItemAsync(CLAVE_EQUIPO)
      .then((guardado) => {
        if (!guardado) return;
        let sesion = null;
        try {
          sesion = aSesionEquipo(JSON.parse(guardado));
        } catch (error) {
          sesion = null;
        }
        if (sesion) {
          setEquipo(sesion);
        } else {
          SecureStore.deleteItemAsync(CLAVE_EQUIPO).catch(() => null);
        }
      })
      .catch(() => null)
      .finally(() => setEquipoLeido(true));
  }, []);

  useEffect(() => {
    if (!auth) {
      setUsuario(null);
      return undefined;
    }
    return onIdTokenChanged(auth, (actual) => {
      if (!actual) {
        uidPrevio.current = null;
        entroYaVerificado.current = false;
        reiniciarEntrada();
        setUsuario(null);
        return;
      }
      if (uidPrevio.current !== actual.uid) {
        uidPrevio.current = actual.uid;
        entroYaVerificado.current = Boolean(actual.emailVerified);
      }
      setUsuario(actual);
    });
  }, []);

  const olvidarEquipo = useCallback(async () => {
    setEquipo(null);
    await SecureStore.deleteItemAsync(CLAVE_EQUIPO).catch(() => null);
  }, []);

  const entrarComoEquipo = useCallback(async (nombreUsuario, clave) => {
    const respuesta = await entrarEquipo(nombreUsuario, clave);
    const sesion = aSesionEquipo({ ...(respuesta?.usuario ?? {}), token: respuesta?.token });
    if (!sesion) throw { respuestaInvalida: true };
    if (auth?.currentUser) await signOut(auth).catch(() => null);
    await SecureStore.setItemAsync(CLAVE_EQUIPO, JSON.stringify(sesion)).catch(() => null);
    setEquipo(sesion);
  }, []);

  const cerrarSesion = useCallback(async () => {
    if (equipo) {
      salirEquipo(equipo.token).catch(() => null);
      await olvidarEquipo();
    }
    if (auth?.currentUser) await signOut(auth).catch(() => null);
  }, [equipo, olvidarEquipo]);

  const actualizarNombre = useCallback(async (nombre) => {
    const actual = auth?.currentUser;
    if (!actual) throw { code: 'auth/no-current-user' };
    await updateProfile(actual, { displayName: nombre });
    setVersionPerfil((version) => version + 1);
  }, []);

  const valor = useMemo(() => {
    const cuentaPropia = Boolean(usuario && !usuario.isAnonymous);
    const esCliente = cuentaPropia && usuario.emailVerified && (entroYaVerificado.current || entrada);
    const rol = equipo ? 'equipo' : esCliente ? 'cliente' : 'invitado';

    return {
      cargando: usuario === undefined || !equipoLeido,
      usuario,
      equipo,
      rol,
      nombreVisible: usuario?.displayName ?? '',
      versionPerfil,
      necesitaVerificar: !equipo && cuentaPropia && !esCliente,
      tienePermiso: (codigo) => Boolean(equipo?.esTitular || equipo?.permisos?.includes(codigo)),
      entrarComoEquipo,
      sesionVencida: olvidarEquipo,
      cerrarSesion,
      actualizarNombre,
    };
  }, [usuario, equipo, equipoLeido, entrada, versionPerfil, entrarComoEquipo, olvidarEquipo, cerrarSesion, actualizarNombre]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  return useContext(SesionContext);
}
