import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { esOperacionRepetida, mensajeDeError, nuevaClaveOperacion } from '../src/api/cliente';
import { registrarMerma } from '../src/api/ajustes';
import { listarLotes } from '../src/api/stock';
import { MOTIVOS_AJUSTE, conUnidad, textoDeStock } from '../src/datos/ajustes';
import { hapticExito } from '../src/utilidades/haptics';
import { limpiar } from '../src/utilidades/texto';
import { leerCantidad, validarCantidad, validarTextoCatalogo } from '../src/utilidades/validaciones';
import BarraVolver from '../src/componentes/BarraVolver';
import BuscadorProducto from '../src/componentes/BuscadorProducto';
import CampoTexto from '../src/componentes/CampoTexto';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import Opciones from '../src/componentes/Opciones';
import SelectorLote from '../src/componentes/SelectorLote';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

const conStockPropio = (producto) => producto.stockActual !== null;

function nuevoRenglon(producto, lote = null, cantidad = '') {
  return {
    clave: `${producto.id}-${Date.now()}`,
    producto,
    lotes: lote ? [{ id: lote.id, numero: lote.numero, vence: null, dias: null, cantidad: lote.cantidad }] : [],
    cargandoLotes: producto.controlaVencimiento,
    errorLotes: '',
    idLote: lote ? lote.id : null,
    cantidad,
    error: '',
  };
}

function existencia(renglon) {
  if (renglon.idLote !== null) return renglon.lotes.find((lote) => lote.id === renglon.idLote)?.cantidad ?? null;
  if (renglon.producto.tipo === 'INSUMO') return null;
  return renglon.producto.stockActual;
}

export default function Merma({ navigation, route }) {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const token = equipo?.token;
  const inicial = route?.params;

  const [motivo, setMotivo] = useState(inicial?.motivo ?? null);
  const [detalle, setDetalle] = useState('');
  const [errorDetalle, setErrorDetalle] = useState('');
  const [renglones, setRenglones] = useState(() =>
    inicial?.producto ? [nuevoRenglon(inicial.producto, inicial.lote ?? null, inicial.lote ? String(inicial.lote.cantidad).replace('.', ',') : '')] : []
  );
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const clave = useRef(nuevaClaveOperacion());
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const actualizar = (claveRenglon, cambios) =>
    setRenglones((anteriores) => anteriores.map((renglon) => (renglon.clave === claveRenglon ? { ...renglon, ...cambios } : renglon)));

  const cargarLotes = useCallback(
    async (renglon) => {
      try {
        const lotes = await listarLotes(token, renglon.producto.id);
        if (!montado.current) return;
        setRenglones((anteriores) =>
          anteriores.map((actual) => {
            if (actual.clave !== renglon.clave) return actual;
            const elegido = lotes.some((lote) => lote.id === actual.idLote) ? actual.idLote : lotes[0]?.id ?? null;
            return { ...actual, lotes, idLote: elegido, cargandoLotes: false, errorLotes: '' };
          })
        );
      } catch (problema) {
        if (!montado.current) return;
        if (problema?.estado === 401 || problema?.estado === 403) {
          manejarError(problema);
          return;
        }
        setRenglones((anteriores) =>
          anteriores.map((actual) =>
            actual.clave === renglon.clave
              ? { ...actual, cargandoLotes: false, errorLotes: mensajeDeError(problema, 'No pudimos traer los lotes.') }
              : actual
          )
        );
      }
    },
    [token, manejarError]
  );

  const primeraCarga = useRef(true);
  useEffect(() => {
    if (!primeraCarga.current) return;
    primeraCarga.current = false;
    renglones.filter((renglon) => renglon.producto.controlaVencimiento).forEach(cargarLotes);
  }, [renglones, cargarLotes]);

  const agregar = (producto) => {
    setBuscando(false);
    setErrorGeneral('');
    if (renglones.some((renglon) => renglon.producto.id === producto.id && !producto.controlaVencimiento)) {
      avisar('advertencia', 'Ya está en la lista', `«${producto.nombre}» ya está cargado: cambiá la cantidad en su renglón.`);
      return;
    }
    const renglon = nuevoRenglon(producto);
    setRenglones((anteriores) => [...anteriores, renglon]);
    if (producto.controlaVencimiento) cargarLotes(renglon);
  };

  const validar = () => {
    let valido = true;
    if (!motivo) {
      setErrorGeneral('Elegí el motivo de la merma.');
      valido = false;
    }
    const problemaDetalle = validarTextoCatalogo(detalle, {
      etiqueta: 'El detalle',
      minimo: 3,
      maximo: 120,
      obligatorio: motivo === 'OTRO',
    });
    setErrorDetalle(problemaDetalle);
    if (problemaDetalle) valido = false;
    if (renglones.length === 0) {
      setErrorGeneral('Agregá al menos un producto.');
      return false;
    }
    const vistos = new Set();
    const errores = {};
    renglones.forEach((renglon) => {
      let error = '';
      if (renglon.producto.controlaVencimiento && renglon.idLote === null) error = 'Elegí el lote.';
      const claveLote = `${renglon.producto.id}-${renglon.idLote ?? 'p'}`;
      if (!error && vistos.has(claveLote)) error = 'Este producto y lote ya están en otro renglón.';
      vistos.add(claveLote);
      if (!error) {
        error = validarCantidad(renglon.cantidad, {
          entera: renglon.producto.cantidadEntera,
          existencia: existencia(renglon),
        });
      }
      if (error) valido = false;
      errores[renglon.clave] = error;
    });
    setRenglones((anteriores) => anteriores.map((renglon) => ({ ...renglon, error: errores[renglon.clave] ?? '' })));
    return valido;
  };

  const enviar = async () => {
    if (enviando) return;
    setErrorGeneral('');
    if (!validar()) return;
    setEnviando(true);
    try {
      const resultado = await registrarMerma(
        token,
        {
          motivo,
          detalle: limpiar(detalle) || null,
          renglones: renglones.map((renglon) => ({
            producto: renglon.producto.id,
            lote: renglon.idLote,
            cantidad: leerCantidad(renglon.cantidad),
          })),
        },
        clave.current
      );
      clave.current = nuevaClaveOperacion();
      hapticExito();
      navigation.goBack();
      avisar('exito', 'Merma cargada', `La merma N° ${resultado.id} quedó esperando que la apruebe quien autoriza los ajustes.`);
    } catch (problema) {
      if (!montado.current) return;
      setEnviando(false);
      if (esOperacionRepetida(problema)) {
        navigation.goBack();
        avisar('exito', 'Ya estaba cargada', 'Esa merma ya se había cargado. No se repitió.');
        return;
      }
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setErrorGeneral(mensajeDeError(problema, 'No pudimos cargar la merma.'));
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <BarraVolver deshabilitado={enviando} />
          <Text style={estilos.titulo}>Cargar merma</Text>
          <Text style={estilos.subtitulo}>Lo que se rompió, se venció o ya no se puede vender.</Text>
          <CuadroAyuda
            id="merma-como-funciona"
            cerrable
            titulo="Queda pendiente"
            texto="El stock no se descuenta hasta que la apruebe quien autoriza ajustes. Si la cargás vos, la tiene que aprobar otra persona."
          />

          <Text style={estilos.etiqueta}>Motivo</Text>
          <Opciones
            opciones={MOTIVOS_AJUSTE.MERMA}
            elegida={motivo}
            alElegir={(valor) => {
              setMotivo(valor);
              setErrorGeneral('');
              setErrorDetalle('');
            }}
            deshabilitado={enviando}
          />
          <CampoTexto
            etiqueta="Detalle"
            opcional={motivo !== 'OTRO'}
            icono="edit-3"
            placeholder={motivo === 'OTRO' ? 'Contá qué pasó' : 'Ej.: se cayó la caja al reponer'}
            valor={detalle}
            alCambiar={(texto) => {
              setDetalle(texto);
              setErrorDetalle('');
            }}
            alSalir={() => {
              if (limpiar(detalle) || motivo === 'OTRO') {
                setErrorDetalle(
                  validarTextoCatalogo(detalle, {
                    etiqueta: 'El detalle',
                    minimo: 3,
                    maximo: 120,
                    obligatorio: motivo === 'OTRO',
                  })
                );
              }
            }}
            error={errorDetalle}
            maxLength={130}
            editable={!enviando}
          />

          <Text style={estilos.seccion}>PRODUCTOS</Text>
          {renglones.map((renglon) => (
            <View key={renglon.clave} style={estilos.tarjeta}>
              <View style={estilos.filaEntre}>
                <View style={estilos.textos}>
                  <Text style={estilos.nombre}>{renglon.producto.nombre}</Text>
                  <Text style={estilos.detalle}>
                    {[
                      renglon.producto.presentacion,
                      renglon.producto.stockActual !== null ? `Stock: ${textoDeStock(renglon.producto.stockActual, renglon.producto.unidad)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setRenglones((anteriores) => anteriores.filter((actual) => actual.clave !== renglon.clave))}
                  hitSlop={10}
                  style={estilos.quitar}
                  disabled={enviando}
                  accessibilityLabel={`Quitar ${renglon.producto.nombre}`}
                >
                  <Feather name="x" size={20} color={colores.textoTenue} />
                </Pressable>
              </View>
              {renglon.producto.controlaVencimiento ? (
                <SelectorLote
                  lotes={renglon.lotes}
                  elegido={renglon.idLote}
                  alElegir={(lote) => actualizar(renglon.clave, { idLote: lote.id, error: '' })}
                  unidad={renglon.producto.unidad}
                  cargando={renglon.cargandoLotes}
                  error={renglon.errorLotes}
                  alReintentar={() => {
                    actualizar(renglon.clave, { cargandoLotes: true, errorLotes: '' });
                    cargarLotes(renglon);
                  }}
                />
              ) : null}
              <CampoTexto
                etiqueta={`Cantidad (${conUnidad(1, renglon.producto.unidad).replace('1 ', '')})`}
                icono="hash"
                placeholder={renglon.producto.cantidadEntera ? 'Ej.: 2' : 'Ej.: 0,5'}
                valor={renglon.cantidad}
                alCambiar={(texto) => actualizar(renglon.clave, { cantidad: texto, error: '' })}
                alSalir={() => {
                  if (limpiar(renglon.cantidad)) {
                    actualizar(renglon.clave, {
                      error: validarCantidad(renglon.cantidad, {
                        entera: renglon.producto.cantidadEntera,
                        existencia: existencia(renglon),
                      }),
                    });
                  }
                }}
                error={renglon.error}
                keyboardType="decimal-pad"
                maxLength={12}
                editable={!enviando}
              />
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
            onPress={() => setBuscando(true)}
            disabled={enviando}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colores.texto} />
            <Text style={estilos.textoBotonSecundario}>{renglones.length ? 'Agregar otro producto' : 'Agregar producto'}</Text>
          </Pressable>

          {errorGeneral !== '' && (
            <View style={estilos.errorGeneral}>
              <Feather name="alert-circle" size={16} color={colores.peligro} />
              <Text style={estilos.textoErrorGeneral}>{errorGeneral}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
            onPress={enviar}
            disabled={enviando}
            accessibilityRole="button"
          >
            {enviando ? (
              <ActivityIndicator color={colores.textoSobreMarca} />
            ) : (
              <Text style={estilos.textoBotonPrincipal}>Cargar merma</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <BuscadorProducto
        visible={buscando}
        titulo="¿Qué producto?"
        ayuda="Solo aparecen productos con stock propio."
        alCerrar={() => setBuscando(false)}
        alElegir={agregar}
        filtrar={conStockPropio}
      />
    </SafeAreaView>
  );
}
