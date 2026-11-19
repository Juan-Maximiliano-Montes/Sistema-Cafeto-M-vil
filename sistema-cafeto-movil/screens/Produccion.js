import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { esOperacionRepetida, mensajeDeError, nuevaClaveOperacion } from '../src/api/cliente';
import { listarProducibles, registrarProduccion } from '../src/api/produccion';
import { conUnidad, usadoDeMas } from '../src/datos/ajustes';
import { aIso, describirVencimiento, diasHasta, formatearFechaLarga } from '../src/utilidades/formato';
import { limpiar } from '../src/utilidades/texto';
import { leerCantidad, validarCantidad } from '../src/utilidades/validaciones';
import BarraVolver from '../src/componentes/BarraVolver';
import CampoTexto from '../src/componentes/CampoTexto';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import SelectorFecha from '../src/componentes/SelectorFecha';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

const ATAJOS = [
  { texto: 'Hoy', dias: 0 },
  { texto: 'Mañana', dias: 1 },
  { texto: 'En 2 días', dias: 2 },
  { texto: 'En 5 días', dias: 5 },
];
const DIAS_MAXIMOS = 730;

function hoyMas(dias) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

export default function Produccion() {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const token = equipo?.token;

  const [producibles, setProducibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [elegido, setElegido] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [vence, setVence] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [errores, setErrores] = useState({ cantidad: '', vence: '' });
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const clave = useRef(nuevaClaveOperacion());
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const lista = await listarProducibles(token);
      if (!montado.current) return;
      setProducibles(lista);
      setError('');
    } catch (problema) {
      if (!montado.current) return;
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setError(mensajeDeError(problema, 'No pudimos traer lo que se produce en el local.'));
    } finally {
      if (montado.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
  }, [token, manejarError]);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  const producible = producibles.find((item) => item.id === elegido) ?? null;
  const cantidadLeida = validarCantidad(cantidad, { entera: producible?.producto.cantidadEntera }) ? null : leerCantidad(cantidad);

  const elegir = (id) => {
    setElegido(id);
    setCantidad('');
    setVence(null);
    setObservacion('');
    setErrores({ cantidad: '', vence: '' });
    setErrorGeneral('');
  };

  const enviar = async () => {
    if (!producible || enviando) return;
    setErrorGeneral('');
    const dias = vence ? diasHasta(vence) : null;
    const nuevos = {
      cantidad: validarCantidad(cantidad, { etiqueta: 'La cantidad producida', entera: producible.producto.cantidadEntera }),
      vence: !producible.producto.controlaVencimiento
        ? ''
        : !vence
        ? 'Indicá hasta cuándo vale la tanda.'
        : dias < 0
        ? 'La fecha de vencimiento ya pasó.'
        : dias > DIAS_MAXIMOS
        ? 'Es dentro de más de dos años: revisá el año.'
        : '',
    };
    setErrores(nuevos);
    if (nuevos.cantidad || nuevos.vence) return;
    setEnviando(true);
    try {
      const resultado = await registrarProduccion(
        token,
        {
          producto: producible.producto.id,
          cantidad: leerCantidad(cantidad),
          fecha_vencimiento: producible.producto.controlaVencimiento ? aIso(vence) : null,
          observacion: limpiar(observacion) || null,
        },
        clave.current
      );
      clave.current = nuevaClaveOperacion();
      if (!montado.current) return;
      setEnviando(false);
      elegir(null);
      cargar();
      avisar(
        'exito',
        'Tanda cargada',
        `Entraron ${conUnidad(resultado.cantidad, producible.producto.unidad)} de ${resultado.nombre}` +
          (resultado.lote ? ` (lote ${resultado.lote.numero}, ${describirVencimiento(resultado.lote.dias).toLowerCase()}).` : '.')
      );
    } catch (problema) {
      if (!montado.current) return;
      setEnviando(false);
      if (esOperacionRepetida(problema)) {
        clave.current = nuevaClaveOperacion();
        elegir(null);
        cargar();
        avisar('exito', 'Ya estaba cargada', 'Esa tanda ya se había cargado. No se repitió.');
        return;
      }
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setErrorGeneral(mensajeDeError(problema, 'No pudimos cargar la producción.'));
    }
  };

  const renderReceta = (item) =>
    item.receta.map(({ insumo, cantidad: porUnidad }) => {
      const usa = cantidadLeida ? Math.round(porUnidad * cantidadLeida * 1000) / 1000 : porUnidad;
      const queda = insumo.stockActual !== null && cantidadLeida ? insumo.stockActual - usa : null;
      return (
        <View key={insumo.id} style={estilos.filaEntre}>
          <Text style={estilos.detalle}>
            {conUnidad(usa, insumo.unidad)} de {insumo.nombre}
            {cantidadLeida ? '' : ' por unidad'}
          </Text>
          {queda !== null && queda < 0 ? (
            insumo.controlaVencimiento ? (
              <Text style={estilos.textoError}>No alcanza</Text>
            ) : (
              <Text style={estilos.chipRevisar} accessibilityLabel={`Supera lo cargado: ${usadoDeMas(queda, insumo.unidad)}`}>
                Supera lo cargado
              </Text>
            )
          ) : null}
        </View>
      );
    });

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => {
                setActualizando(true);
                cargar();
              }}
              tintColor={colores.marca}
              colors={[colores.marca]}
            />
          }
        >
          <BarraVolver deshabilitado={enviando} />
          <Text style={estilos.titulo}>Cargar producción</Text>
          <Text style={estilos.subtitulo}>Una tanda de lo que se hace en el local: entra lo producido y salen los insumos de la receta.</Text>

          {cargando ? (
            <EstadoVacio cargando texto="Buscando lo que se produce..." />
          ) : error ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos cargar la lista"
              texto={error}
              accion={{
                texto: 'Reintentar',
                alPresionar: () => {
                  setCargando(true);
                  cargar();
                },
              }}
            />
          ) : producibles.length === 0 ? (
            <EstadoVacio
              icono="restaurant-outline"
              titulo="No hay productos para producir"
              texto="Los productos que se hacen por tanda y su receta se cargan desde la web."
            />
          ) : (
            producibles.map((item) => {
              const activo = item.id === elegido;
              return (
                <View key={item.id} style={[estilos.tarjeta, activo && { borderColor: colores.marca }]}>
                  <Pressable
                    style={estilos.filaEntre}
                    onPress={() => elegir(activo ? null : item.id)}
                    disabled={enviando}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: activo }}
                  >
                    <View style={estilos.textos}>
                      <Text style={estilos.nombre}>{item.producto.nombre}</Text>
                      <Text style={estilos.detalle}>
                        {item.producto.stockActual !== null
                          ? `Hay ${conUnidad(item.producto.stockActual, item.producto.unidad)}`
                          : item.producto.presentacion}
                      </Text>
                    </View>
                    <Ionicons name={activo ? 'chevron-up' : 'chevron-down'} size={20} color={colores.textoSecundario} />
                  </Pressable>
                  {item.receta.length === 0 ? (
                    <Text style={estilos.textoError}>No tiene receta cargada: se carga desde la web.</Text>
                  ) : activo ? (
                    <>
                      <CampoTexto
                        etiqueta="¿Cuántas salieron?"
                        icono="hash"
                        placeholder="Ej.: 24"
                        valor={cantidad}
                        alCambiar={(texto) => {
                          setCantidad(texto);
                          setErrores((anteriores) => ({ ...anteriores, cantidad: '' }));
                        }}
                        error={errores.cantidad}
                        keyboardType="decimal-pad"
                        maxLength={12}
                        editable={!enviando}
                      />
                      {item.producto.controlaVencimiento ? (
                        <SelectorFecha
                          etiqueta="¿Hasta cuándo vale?"
                          valor={vence}
                          alCambiar={(fecha) => {
                            setVence(fecha);
                            setErrores((anteriores) => ({ ...anteriores, vence: '' }));
                          }}
                          minimo={hoyMas(0)}
                          maximo={hoyMas(DIAS_MAXIMOS)}
                          atajos={ATAJOS}
                          error={errores.vence}
                          deshabilitado={enviando}
                        />
                      ) : null}
                      <CampoTexto
                        etiqueta="Observación"
                        opcional
                        icono="edit-3"
                        placeholder="Ej.: tanda de la mañana"
                        valor={observacion}
                        alCambiar={setObservacion}
                        maxLength={120}
                        editable={!enviando}
                      />
                      <Text style={estilos.etiqueta}>Se descuentan</Text>
                      {renderReceta(item)}
                      {vence ? <Text style={estilos.detalle}>Vence el {formatearFechaLarga(vence)}.</Text> : null}
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
                          <Text style={estilos.textoBotonPrincipal}>Cargar tanda</Text>
                        )}
                      </Pressable>
                    </>
                  ) : null}
                </View>
              );
            })
          )}

          <CuadroAyuda
            icono="information-circle-outline"
            titulo="Si la receta usa más de lo cargado"
            texto="La tanda entra igual y ese insumo queda «a revisar» hasta que se cargue la compra o se cuente: en el local sí está, falta registrarlo. Los insumos que van por lote, como la leche, no: necesitan un lote vigente."
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
