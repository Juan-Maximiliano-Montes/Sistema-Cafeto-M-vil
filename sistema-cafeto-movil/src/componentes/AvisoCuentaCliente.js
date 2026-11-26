import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../tema/TemaContext';
import { useCuentaCliente } from '../cliente/CuentaClienteContext';
import { erroresPorCampo, mensajeDeError } from '../api/cliente';
import { hapticExito } from '../utilidades/haptics';
import { limpiar } from '../utilidades/texto';
import { filtrarDni, filtrarTelefono, validarDni, validarTelefono } from '../utilidades/validaciones';
import CampoTexto from './CampoTexto';
import CuadroAyuda from './CuadroAyuda';

const EN_OTRA_FICHA = 'ya está en otra ficha del club. Si es tuyo, pedí en la caja que le agreguen tu correo: la app la encuentra sola, con tus puntos.';

function enumerar(lista) {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

function mensajeDelDni(fallo) {
  if (fallo?.datos?.codigo === 'DNI_NO_COINCIDE') {
    return 'Ese DNI no está en ninguna de las fichas con tu correo. Revisalo o acercate a la caja.';
  }
  if (fallo?.estado === 429) {
    return 'Probaste varias veces seguidas. Esperá un rato o acercate a la caja.';
  }
  return mensajeDeError(fallo, 'No pudimos buscar tu ficha.');
}

function Boton({ texto, alPresionar, ocupado, estilos, colores }) {
  return (
    <Pressable
      style={({ pressed }) => [estilos.boton, pressed && estilos.presionado, ocupado && estilos.apagado]}
      onPress={alPresionar}
      disabled={ocupado}
      accessibilityRole="button"
      accessibilityState={{ disabled: ocupado, busy: ocupado }}
    >
      {ocupado ? <ActivityIndicator color={colores.textoSobreMarca} /> : <Text style={estilos.textoBoton}>{texto}</Text>}
    </Pressable>
  );
}

export default function AvisoCuentaCliente() {
  const { colores } = useTema();
  const { estado, error, codigo, faltan, actualizar, buscarConDni, completarFicha } = useCuentaCliente();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const buscar = async () => {
    if (enviando) return;
    const problema = validarDni(dni, { obligatorio: true });
    if (problema) {
      setErrores({ dni: problema });
      return;
    }
    setEnviando(true);
    try {
      await buscarConDni(dni);
      hapticExito();
    } catch (fallo) {
      setErrores({ dni: mensajeDelDni(fallo) });
    } finally {
      setEnviando(false);
    }
  };

  const completar = async () => {
    if (enviando) return;
    const problemas = { telefono: validarTelefono(telefono), dni: validarDni(dni) };
    if (!problemas.telefono && !problemas.dni && !limpiar(telefono) && !limpiar(dni)) {
      problemas.telefono = 'Cargá tu teléfono o tu DNI.';
    }
    if (problemas.telefono || problemas.dni) {
      setErrores(problemas);
      return;
    }
    setEnviando(true);
    try {
      await completarFicha({ telefono, dni });
      hapticExito();
    } catch (fallo) {
      const codigoFallo = fallo?.datos?.codigo;
      const porCampo = erroresPorCampo(fallo);
      if (codigoFallo === 'TELEFONO_DE_OTRO_CLIENTE') {
        setErrores({ telefono: `Ese teléfono ${EN_OTRA_FICHA}` });
      } else if (codigoFallo === 'DNI_DE_OTRO_CLIENTE') {
        setErrores({ dni: `Ese DNI ${EN_OTRA_FICHA}` });
      } else if (porCampo.telefono || porCampo.dni) {
        setErrores({ telefono: porCampo.telefono, dni: porCampo.dni });
      } else {
        setErrores({ general: mensajeDeError(fallo, 'No pudimos crear tu ficha.') });
      }
    } finally {
      setEnviando(false);
    }
  };

  if (estado === 'cargando' || estado === 'inactivo') {
    return (
      <View style={estilos.cargando}>
        <ActivityIndicator color={colores.marca} />
        <Text style={estilos.texto}>Buscando tu cuenta del club...</Text>
      </View>
    );
  }

  if (estado === 'sin_servicio') {
    return (
      <CuadroAyuda
        tipo="consejo"
        icono="construct-outline"
        titulo="Tus puntos todavía no están conectados"
        texto="El local está terminando de conectar la app con la caja. Mientras tanto, en la caja te buscan por tu DNI o tu teléfono y te suman los puntos igual."
        accion={{ texto: 'Probar de nuevo', alPresionar: actualizar }}
      />
    );
  }

  if (estado === 'falta_identificacion') {
    return (
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>Falta un dato para crear tu ficha</Text>
        <Text style={estilos.texto}>
          Con tu teléfono o tu DNI te encuentran en la caja para sumarte puntos. Cargá al menos uno.
        </Text>
        <CampoTexto
          etiqueta="Teléfono"
          icono="smartphone"
          prefijo={<Text style={estilos.prefijo}>+54</Text>}
          placeholder="387 000 0000"
          valor={telefono}
          alCambiar={(texto) => {
            setTelefono(filtrarTelefono(texto));
            setErrores((anteriores) => ({ ...anteriores, telefono: '', general: '' }));
          }}
          alSalir={() => setErrores((anteriores) => ({ ...anteriores, telefono: validarTelefono(telefono) }))}
          error={errores.telefono ?? ''}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={20}
          editable={!enviando}
        />
        <CampoTexto
          etiqueta="DNI"
          icono="credit-card"
          placeholder="30123456"
          valor={dni}
          alCambiar={(texto) => {
            setDni(filtrarDni(texto));
            setErrores((anteriores) => ({ ...anteriores, dni: '', general: '' }));
          }}
          alSalir={() => setErrores((anteriores) => ({ ...anteriores, dni: validarDni(dni) }))}
          error={errores.dni ?? ''}
          ayuda="Sin puntos."
          keyboardType="number-pad"
          maxLength={8}
          editable={!enviando}
        />
        {errores.general ? <Text style={estilos.error}>{errores.general}</Text> : null}
        <Boton texto="Crear mi ficha" alPresionar={completar} ocupado={enviando} estilos={estilos} colores={colores} />
      </View>
    );
  }

  if (estado === 'correo_repetido') {
    return (
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>Hay más de una ficha con tu correo</Text>
        <Text style={estilos.texto}>
          Para darte la tuya y no la de otra persona, escribí tu DNI. Si no aparece, acercate a la caja y la unifican.
        </Text>
        <CampoTexto
          etiqueta="Tu DNI"
          icono="credit-card"
          placeholder="Sin puntos, por ejemplo 30123456"
          valor={dni}
          alCambiar={(texto) => {
            setDni(filtrarDni(texto));
            setErrores((anteriores) => ({ ...anteriores, dni: '' }));
          }}
          alSalir={() => {
            if (limpiar(dni)) {
              setErrores((anteriores) => ({ ...anteriores, dni: validarDni(dni, { obligatorio: true }) }));
            }
          }}
          error={errores.dni ?? ''}
          keyboardType="number-pad"
          maxLength={8}
          editable={!enviando}
          returnKeyType="search"
          onSubmitEditing={buscar}
        />
        <Boton texto="Buscar mi ficha" alPresionar={buscar} ocupado={enviando} estilos={estilos} colores={colores} />
      </View>
    );
  }

  if (estado === 'dato_de_otro') {
    const cual = codigo === 'DNI_DE_OTRO_CLIENTE' ? 'DNI' : 'teléfono';
    return (
      <CuadroAyuda
        tipo="atencion"
        icono={cual === 'DNI' ? 'card-outline' : 'call-outline'}
        titulo={`Tu ${cual} ya está en otra ficha`}
        texto={`Si es tuyo, ya tenés una ficha en el local: pedí en la caja que le agreguen tu correo y la app la encuentra sola, con tus puntos.${
          cual === 'teléfono' ? ' Si te equivocaste de número, corregilo en tu perfil.' : ''
        }`}
        accion={{ texto: 'Probar de nuevo', alPresionar: actualizar }}
      />
    );
  }

  if (estado === 'en_caja') {
    return (
      <CuadroAyuda
        tipo="atencion"
        icono="storefront-outline"
        titulo="Pasá por la caja"
        texto={error || 'Hay que revisar tu ficha del club en el local.'}
        accion={{ texto: 'Probar de nuevo', alPresionar: actualizar }}
      />
    );
  }

  if (estado === 'faltan_datos') {
    return (
      <CuadroAyuda
        tipo="consejo"
        icono="person-outline"
        titulo="Falta un dato para crear tu ficha"
        texto={`Completá ${enumerar(faltan)} en tu perfil y volvé a probar.`}
        accion={{ texto: 'Probar de nuevo', alPresionar: actualizar }}
      />
    );
  }

  if (estado === 'sin_verificar') {
    return (
      <CuadroAyuda
        tipo="atencion"
        icono="mail-unread-outline"
        titulo="Falta verificar tu correo"
        texto="Abrí el enlace que te mandamos por correo y volvé a probar."
        accion={{ texto: 'Probar de nuevo', alPresionar: actualizar }}
      />
    );
  }

  return (
    <CuadroAyuda
      tipo="atencion"
      icono="cloud-offline-outline"
      titulo="No pudimos traer tus puntos"
      texto={error || 'Revisá tu conexión y probá de nuevo.'}
      accion={{ texto: 'Reintentar', alPresionar: actualizar }}
    />
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    cargando: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    tarjeta: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    titulo: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto, marginBottom: 6 },
    texto: { fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 19, color: c.textoSecundario },
    prefijo: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSecundario },
    error: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: c.peligro, marginTop: 10 },
    boton: {
      height: 48,
      borderRadius: 12,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    textoBoton: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSobreMarca },
    presionado: { opacity: 0.85 },
    apagado: { opacity: 0.7 },
  });
}
