import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { esOperacionRepetida, mensajeDeError, nuevaClaveOperacion } from '../src/api/cliente';
import { leerOrden, recepcionar, sonCostosRaros } from '../src/api/compras';
import { TIPOS_COMPROBANTE, conUnidad } from '../src/datos/ajustes';
import { aIso, diasHasta, formatearFechaLarga, formatearPrecio } from '../src/utilidades/formato';
import { hapticAdvertencia, hapticExito } from '../src/utilidades/haptics';
import { limpiar } from '../src/utilidades/texto';
import { leerCantidad, validarCantidad, validarTextoCatalogo } from '../src/utilidades/validaciones';
import BarraVolver from '../src/componentes/BarraVolver';
import CampoTexto from '../src/componentes/CampoTexto';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EscanerCodigo from '../src/componentes/EscanerCodigo';
import EstadoVacio from '../src/componentes/EstadoVacio';
import { BotonAyuda } from '../src/componentes/HojaAyuda';
import Opciones from '../src/componentes/Opciones';
import SelectorFecha from '../src/componentes/SelectorFecha';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

const AYUDA_RECEPCION = [
  {
    icono: 'cube-outline',
    titulo: 'Entregas parciales',
    texto: 'Cargá únicamente lo que llegó hoy. Si falta mercadería, dejá la cantidad real o en blanco y la orden quedará con diferencias.',
  },
  {
    icono: 'calendar-outline',
    titulo: 'Lotes y vencimientos',
    texto: 'Si vinieron varios lotes de un mismo producto con distinta fecha, sumalos con «+ Otro lote con otra fecha».',
  },
  {
    icono: 'pricetag-outline',
    titulo: 'Control de costos raros',
    texto: 'Si un costo varía mucho respecto al anterior, el sistema te avisará antes de guardar para evitar un cero de más.',
  },
];

const DIAS_DE_ATRASO = 30;
const DIAS_MAXIMOS_VENCIMIENTO = 3660;

function hoyMas(dias) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

function texto(numero) {
  return String(Math.round(numero * 1000) / 1000).replace('.', ',');
}

function redondear(numero) {
  return Math.round(numero * 1000) / 1000;
}

let siguienteLote = 1;
function loteVacio(cantidad = '') {
  siguienteLote += 1;
  return { clave: `l${siguienteLote}`, vence: null, numero: '', cantidad, errorCantidad: '', errorNumero: '' };
}

function filasIniciales(orden) {
  const filas = {};
  orden.detalle.forEach((renglon) => {
    const pendiente = Math.max(redondear(renglon.pedido - renglon.recibido), 0);
    filas[renglon.producto.id] = {
      cantidad: pendiente > 0 ? texto(pendiente) : '',
      costo: texto(renglon.precioUnitario),
      lotes: renglon.producto.controlaVencimiento ? [loteVacio(pendiente > 0 ? texto(pendiente) : '')] : [],
      errores: {},
    };
  });
  return filas;
}

export default function RecibirOrden({ navigation, route }) {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const propios = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;
  const idOrden = route?.params?.id;

  const [orden, setOrden] = useState(null);
  const [filas, setFilas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tipo, setTipo] = useState('REMITO');
  const [punto, setPunto] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(hoyMas(0));
  const [otros, setOtros] = useState('');
  const [erroresComprobante, setErroresComprobante] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [resaltado, setResaltado] = useState(null);
  const clave = useRef(nuevaClaveOperacion());
  const montado = useRef(true);
  const desplazador = useRef(null);
  const posiciones = useRef({});

  const cargar = useCallback(async () => {
    try {
      const leida = await leerOrden(token, idOrden);
      if (!montado.current) return;
      setOrden(leida);
      setFilas(filasIniciales(leida));
      setError('');
    } catch (problema) {
      if (!montado.current) return;
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setError(mensajeDeError(problema, 'No pudimos traer la orden.'));
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [token, idOrden, manejarError]);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  const cambiarFila = (id, cambios, camposLimpios = Object.keys(cambios)) =>
    setFilas((anteriores) => {
      const actual = anteriores[id];
      if (!actual) return anteriores;
      const nuevosErrores = { ...actual.errores };
      camposLimpios.forEach((campo) => {
        delete nuevosErrores[campo];
      });
      return { ...anteriores, [id]: { ...actual, ...cambios, errores: nuevosErrores } };
    });

  const establecerErrorFila = (id, campo, mensaje) =>
    setFilas((anteriores) => {
      const actual = anteriores[id];
      if (!actual) return anteriores;
      const nuevosErrores = { ...actual.errores };
      if (mensaje) nuevosErrores[campo] = mensaje;
      else delete nuevosErrores[campo];
      return { ...anteriores, [id]: { ...actual, errores: nuevosErrores } };
    });

  const cambiarLote = (id, claveLote, cambios) =>
    setFilas((anteriores) => {
      const actual = anteriores[id];
      if (!actual) return anteriores;
      const nuevosErrores = { ...actual.errores };
      delete nuevosErrores.lotes;
      return {
        ...anteriores,
        [id]: {
          ...actual,
          errores: nuevosErrores,
          lotes: actual.lotes.map((lote) => (lote.clave === claveLote ? { ...lote, ...cambios } : lote)),
        },
      };
    });

  const alEscanear = (codigo) => {
    setEscaneando(false);
    const renglon = orden?.detalle.find((item) => item.producto.codigoBarras === codigo);
    if (!renglon) {
      avisar('advertencia', 'No está en esta orden', `El código ${codigo} no corresponde a ningún producto de la orden. Si llegó sin pedirse, se carga desde la web.`);
      return;
    }
    setResaltado(renglon.producto.id);
    const y = posiciones.current[renglon.producto.id];
    if (y !== undefined) desplazador.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
  };

  const validarFila = (renglon, fila) => {
    const errores = {};
    const recibida = limpiar(fila.cantidad) === '' ? 0 : leerCantidad(fila.cantidad);
    if (recibida === 0) return { errores, recibida: 0 };
    errores.cantidad = validarCantidad(fila.cantidad, { etiqueta: 'La cantidad recibida', entera: renglon.producto.cantidadEntera });
    const costo = leerCantidad(fila.costo);
    if (costo === null || Number.isNaN(costo)) errores.costo = 'El costo va en números, por ejemplo 1500 o 1500,50.';
    if (renglon.producto.controlaVencimiento && !errores.cantidad) {
      if (fila.lotes.length === 0) errores.lotes = 'Cargá el o los lotes con su fecha.';
      const numeros = [];
      let suma = 0;
      fila.lotes.forEach((lote) => {
        const problemaCantidad = validarCantidad(lote.cantidad, { etiqueta: 'La cantidad del lote', entera: renglon.producto.cantidadEntera });
        if (problemaCantidad) errores.lotes = errores.lotes || problemaCantidad;
        else suma += leerCantidad(lote.cantidad);
        if (!lote.vence) errores.lotes = errores.lotes || 'A cada lote le falta la fecha de vencimiento.';
        else if (diasHasta(lote.vence, fecha) < 0) errores.lotes = errores.lotes || 'Un lote vence antes de la fecha del comprobante: no se recibe vencido.';
        else if (diasHasta(lote.vence, fecha) > DIAS_MAXIMOS_VENCIMIENTO) errores.lotes = errores.lotes || 'Un lote vence dentro de más de 10 años. Revisá el año.';
        if (limpiar(lote.numero)) numeros.push(limpiar(lote.numero).toLowerCase());
      });
      if (!errores.lotes && redondear(suma) !== redondear(recibida)) {
        errores.lotes = `Los lotes suman ${texto(suma)} y se recibieron ${texto(recibida)}.`;
      }
      if (!errores.lotes && new Set(numeros).size !== numeros.length) errores.lotes = 'Hay un número de lote repetido.';
    }
    Object.keys(errores).forEach((campo) => {
      if (!errores[campo]) delete errores[campo];
    });
    return { errores, recibida };
  };

  const resumen = useMemo(() => {
    if (!orden) return { recibidos: 0, faltantes: [], sobrantes: [], total: 0 };
    let recibidos = 0;
    let total = 0;
    const faltantes = [];
    const sobrantes = [];
    orden.detalle.forEach((renglon) => {
      const fila = filas[renglon.producto.id];
      const valor = fila && limpiar(fila.cantidad) !== '' ? leerCantidad(fila.cantidad) : 0;
      const recibida = Number.isFinite(valor) ? valor : 0;
      const costo = fila ? leerCantidad(fila.costo) : 0;
      if (recibida > 0) {
        recibidos += 1;
        total += recibida * (Number.isFinite(costo) ? costo : 0);
      }
      const diferencia = redondear(renglon.recibido + recibida - renglon.pedido);
      if (diferencia < 0) faltantes.push({ renglon, cantidad: -diferencia });
      if (diferencia > 0) sobrantes.push({ renglon, cantidad: diferencia });
    });
    return { recibidos, faltantes, sobrantes, total };
  }, [orden, filas]);

  const marcarCostos = (raros) => {
    setFilas((anteriores) => {
      const nuevas = { ...anteriores };
      raros.forEach(({ producto, anterior }) => {
        const fila = nuevas[producto.id];
        if (!fila) return;
        nuevas[producto.id] = {
          ...fila,
          errores: {
            ...fila.errores,
            costo: `Antes lo pagabas ${formatearPrecio(anterior)}. Fijate que no sobre ni falte un cero.`,
          },
        };
      });
      return nuevas;
    });
    const primero = raros.find(({ producto }) => posiciones.current[producto.id] !== undefined);
    if (primero) {
      desplazador.current?.scrollTo({ y: Math.max(posiciones.current[primero.producto.id] - 20, 0), animated: true });
    }
  };

  const registrar = async (pedido) => {
    setEnviando(true);
    try {
      const resultado = await recepcionar(token, pedido, clave.current);
      clave.current = nuevaClaveOperacion();
      if (!montado.current) return;
      if (resultado.orden.estado === 'CON_DIFERENCIAS') {
        hapticAdvertencia();
        navigation.goBack();
        avisar(
          'advertencia',
          'Recibida con diferencias',
          `Entró la mercadería. La orden quedó con diferencias para que la administradora lo resuelva con el proveedor: ${resultado.diferencias
            .map((fila) => `${fila.producto.nombre} (${fila.diferencia > 0 ? '+' : ''}${texto(fila.diferencia)})`)
            .join(', ')}.`
        );
      } else {
        hapticExito();
        navigation.goBack();
        avisar('exito', 'Orden recibida', 'Entró toda la mercadería y la orden quedó completa.');
      }
    } catch (problema) {
      if (!montado.current) return;
      setEnviando(false);
      if (esOperacionRepetida(problema)) {
        navigation.goBack();
        avisar('exito', 'Ya estaba cargada', 'Esa recepción ya se había registrado. No se repitió.');
        return;
      }
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      if (sonCostosRaros(problema)) {
        hapticAdvertencia();
        const raros = problema.costosRaros ?? [];
        marcarCostos(raros);
        const lista = raros
          .map(({ producto, anterior, nuevo }) => `${producto.nombre}: antes ${formatearPrecio(anterior)}, ahora ${formatearPrecio(nuevo)}`)
          .join('. ');
        avisar(
          'advertencia',
          'Revisá estos costos',
          `${lista ? `${lista}. ` : ''}Casi siempre es un cero de más o de menos. Si están bien, confirmalos.`,
          [
            { texto: 'Corregir', estilo: 'cancelar' },
            { texto: 'Están bien', alPresionar: () => registrar({ ...pedido, confirmo_costos: true }) },
          ]
        );
        return;
      }
      if (problema?.estado === 404 || problema?.estado === 409) {
        navigation.goBack();
        avisar('advertencia', 'La orden cambió', mensajeDeError(problema));
        return;
      }
      setErrorGeneral(mensajeDeError(problema, 'No pudimos registrar la recepción.'));
    }
  };

  const enviar = () => {
    if (enviando || !orden) return;
    setErrorGeneral('');
    const comprobante = {};
    if (!/^\d{1,5}$/.test(limpiar(punto)) || Number(punto) < 1) comprobante.punto = 'El punto de venta va de 1 a 99999.';
    if (!/^\d{1,8}$/.test(limpiar(numero)) || Number(numero) < 1) comprobante.numero = 'El número va de 1 a 99999999.';
    const dias = diasHasta(fecha);
    if (dias > 0) comprobante.fecha = 'La fecha no puede ser posterior a hoy.';
    else if (dias < -DIAS_DE_ATRASO) comprobante.fecha = `Tiene más de ${DIAS_DE_ATRASO} días: cargalo desde la web.`;
    const otrosLeido = limpiar(otros) === '' ? 0 : leerCantidad(otros);
    if (otrosLeido === null || Number.isNaN(otrosLeido)) comprobante.otros = 'Va en números, por ejemplo 350 o 350,50.';
    setErroresComprobante(comprobante);

    const nuevas = { ...filas };
    const renglones = [];
    let hayErrores = Object.keys(comprobante).length > 0;
    orden.detalle.forEach((renglon) => {
      const fila = filas[renglon.producto.id];
      const { errores, recibida } = validarFila(renglon, fila);
      nuevas[renglon.producto.id] = { ...fila, errores };
      if (Object.keys(errores).length > 0) hayErrores = true;
      if (recibida > 0 && Object.keys(errores).length === 0) {
        renglones.push({
          producto: renglon.producto.id,
          cantidad: recibida,
          costo_unitario: leerCantidad(fila.costo),
          lotes: renglon.producto.controlaVencimiento
            ? fila.lotes.map((lote) => ({
                fecha_vencimiento: aIso(lote.vence),
                numero_lote: limpiar(lote.numero) || null,
                cantidad: leerCantidad(lote.cantidad),
              }))
            : [],
        });
      }
    });
    setFilas(nuevas);
    if (hayErrores) {
      setErrorGeneral('Revisá los datos marcados en rojo.');
      return;
    }
    if (renglones.length === 0) {
      setErrorGeneral('No marcaste nada recibido. Escribí la cantidad que llegó de cada producto.');
      return;
    }

    const faltan = resumen.faltantes.map((item) => `${texto(item.cantidad)} de ${item.renglon.producto.nombre}`).join(', ');
    const pedido = {
      orden: orden.id,
      tipo_comprobante: tipo,
      punto_venta: Number(punto),
      numero_comprobante: Number(numero),
      fecha_compra: aIso(fecha),
      importe_otros_conceptos: otrosLeido,
      renglones,
    };
    avisar(
      'advertencia',
      '¿Registrar la recepción?',
      `Entra el stock y queda cargado el comprobante. ${faltan ? `La orden va a quedar con diferencias: faltan ${faltan}.` : 'La orden queda completa.'}`,
      [
        { texto: 'Revisar', estilo: 'cancelar' },
        { texto: 'Registrar', alPresionar: () => registrar(pedido) },
      ]
    );
  };

  if (cargando || error || !orden) {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <StatusBar style={colores.barraEstado} />
        <View style={estilos.contenido}>
          <BarraVolver />
          {cargando ? (
            <EstadoVacio cargando texto="Abriendo la orden..." />
          ) : (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos abrir la orden"
              texto={error || 'Probá de nuevo.'}
              accion={{
                texto: 'Reintentar',
                alPresionar: () => {
                  setCargando(true);
                  cargar();
                },
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={desplazador} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <BarraVolver
            deshabilitado={enviando}
            derecha={
              <View style={propios.accionesDerecha}>
                <BotonAyuda
                  titulo="Recibir mercadería"
                  subtitulo="Control de entrega del proveedor"
                  items={AYUDA_RECEPCION}
                  deshabilitado={enviando}
                />
                <Pressable
                  style={({ pressed }) => [propios.botonEscanear, pressed && estilos.presionado]}
                  onPress={() => setEscaneando(true)}
                  disabled={enviando}
                  accessibilityRole="button"
                  accessibilityLabel="Escanear un producto de la orden"
                >
                  <Ionicons name="scan-outline" size={18} color={colores.textoSobreMarca} />
                  <Text style={propios.textoEscanear}>Escanear</Text>
                </Pressable>
              </View>
            }
          />
          <Text style={estilos.titulo}>{orden.proveedor.nombre}</Text>
          <Text style={estilos.subtitulo}>
            Orden N° {orden.id}
            {orden.fecha ? ` del ${formatearFechaLarga(orden.fecha)}` : ''}.{' '}
            {orden.estado === 'CON_DIFERENCIAS' ? 'Ya llegó una parte: completá lo que falta.' : 'Contá lo que llegó y anotalo.'}
          </Text>
          <CuadroAyuda
            id="recibir-cantidades"
            cerrable
            titulo="Anotá lo que llegó de verdad"
            texto="Dejamos cargado lo que falta recibir. Si llegó menos, corregilo; si no llegó, dejalo vacío. Los productos con vencimiento llevan su lote y fecha."
          />

          <Text style={estilos.seccion}>COMPROBANTE DEL PROVEEDOR</Text>
          <Opciones opciones={TIPOS_COMPROBANTE} elegida={tipo} alElegir={setTipo} deshabilitado={enviando} />
          <View style={propios.filaCampos}>
            <CampoTexto
              estiloContenedor={propios.campoChico}
              etiqueta="Punto de venta"
              placeholder="0001"
              valor={punto}
              alCambiar={(valor) => {
                setPunto(valor.replace(/\D/g, ''));
                setErroresComprobante((anteriores) => ({ ...anteriores, punto: '' }));
              }}
              alSalir={() => {
                const limpio = limpiar(punto);
                if (!limpio) return;
                const problema =
                  !/^\d{1,5}$/.test(limpio) || Number(limpio) < 1 ? 'El punto de venta va de 1 a 99999.' : '';
                setErroresComprobante((anteriores) => ({ ...anteriores, punto: problema }));
              }}
              error={erroresComprobante.punto ?? ''}
              keyboardType="number-pad"
              maxLength={5}
              editable={!enviando}
            />
            <CampoTexto
              estiloContenedor={propios.campoGrande}
              etiqueta="Número"
              placeholder="00001234"
              valor={numero}
              alCambiar={(valor) => {
                setNumero(valor.replace(/\D/g, ''));
                setErroresComprobante((anteriores) => ({ ...anteriores, numero: '' }));
              }}
              alSalir={() => {
                const limpio = limpiar(numero);
                if (!limpio) return;
                const problema =
                  !/^\d{1,8}$/.test(limpio) || Number(limpio) < 1 ? 'El número va de 1 a 99999999.' : '';
                setErroresComprobante((anteriores) => ({ ...anteriores, numero: problema }));
              }}
              error={erroresComprobante.numero ?? ''}
              keyboardType="number-pad"
              maxLength={8}
              editable={!enviando}
            />
          </View>
          <SelectorFecha
            etiqueta="Fecha del comprobante"
            valor={fecha}
            alCambiar={(valor) => {
              setFecha(valor);
              setErroresComprobante((anteriores) => ({ ...anteriores, fecha: '' }));
            }}
            minimo={hoyMas(-DIAS_DE_ATRASO)}
            maximo={hoyMas(0)}
            error={erroresComprobante.fecha ?? ''}
            deshabilitado={enviando}
          />

          <Text style={estilos.seccion}>LO QUE LLEGÓ</Text>
          {orden.detalle.map((renglon) => {
            const fila = filas[renglon.producto.id];
            if (!fila) return null;
            const { producto } = renglon;
            return (
              <View
                key={producto.id}
                style={[estilos.tarjeta, resaltado === producto.id && propios.resaltado]}
                onLayout={(evento) => {
                  posiciones.current[producto.id] = evento.nativeEvent.layout.y;
                }}
              >
                <View style={estilos.textos}>
                  <Text style={estilos.nombre}>{producto.nombre}</Text>
                  <Text style={estilos.detalle}>
                    Pedido {conUnidad(renglon.pedido, producto.unidad)}
                    {renglon.recibido > 0 ? ` · ya llegó ${conUnidad(renglon.recibido, producto.unidad)}` : ''}
                    {producto.presentacion ? ` · ${producto.presentacion}` : ''}
                  </Text>
                </View>
                <View style={propios.filaCampos}>
                  <CampoTexto
                    estiloContenedor={propios.campoMitad}
                    etiqueta="Llegó"
                    placeholder="0"
                    valor={fila.cantidad}
                    alCambiar={(valor) => {
                      const cambios = { cantidad: valor };
                      if (producto.controlaVencimiento && fila.lotes.length === 1) {
                        cambios.lotes = [{ ...fila.lotes[0], cantidad: valor, errorCantidad: '' }];
                      }
                      cambiarFila(producto.id, cambios, ['cantidad', 'lotes']);
                    }}
                    alSalir={() => {
                      const limpio = limpiar(fila.cantidad);
                      if (!limpio || leerCantidad(limpio) === 0) {
                        establecerErrorFila(producto.id, 'cantidad', '');
                        return;
                      }
                      establecerErrorFila(
                        producto.id,
                        'cantidad',
                        validarCantidad(fila.cantidad, {
                          etiqueta: 'La cantidad recibida',
                          entera: producto.cantidadEntera,
                        })
                      );
                    }}
                    error={fila.errores.cantidad ?? ''}
                    keyboardType="decimal-pad"
                    maxLength={12}
                    editable={!enviando}
                  />
                  <CampoTexto
                    estiloContenedor={propios.campoMitad}
                    etiqueta="Costo unitario"
                    prefijo={<Text style={estilos.detalle}>$</Text>}
                    valor={fila.costo}
                    alCambiar={(valor) => cambiarFila(producto.id, { costo: valor }, ['costo'])}
                    alSalir={() => {
                      const limpio = limpiar(fila.costo);
                      if (!limpio) return;
                      const costoLeido = leerCantidad(limpio);
                      const problema =
                        costoLeido === null || Number.isNaN(costoLeido) || costoLeido < 0
                          ? 'El costo va en números, por ejemplo 1500 o 1500,50.'
                          : '';
                      establecerErrorFila(producto.id, 'costo', problema);
                    }}
                    error={fila.errores.costo ?? ''}
                    keyboardType="decimal-pad"
                    maxLength={14}
                    editable={!enviando}
                  />
                </View>
                {producto.controlaVencimiento ? (
                  <View style={propios.lotes}>
                    {fila.lotes.map((lote, posicion) => (
                      <View key={lote.clave} style={propios.lote}>
                        <View style={estilos.filaEntre}>
                          <Text style={estilos.etiqueta}>Lote {posicion + 1}</Text>
                          {fila.lotes.length > 1 ? (
                            <Pressable
                              onPress={() =>
                                setFilas((anteriores) => ({
                                  ...anteriores,
                                  [producto.id]: {
                                    ...anteriores[producto.id],
                                    errores: {},
                                    lotes: anteriores[producto.id].lotes.filter((actual) => actual.clave !== lote.clave),
                                  },
                                }))
                              }
                              hitSlop={8}
                              disabled={enviando}
                              accessibilityLabel={`Quitar el lote ${posicion + 1}`}
                            >
                              <Feather name="x" size={18} color={colores.textoTenue} />
                            </Pressable>
                          ) : null}
                        </View>
                        <SelectorFecha
                          valor={lote.vence}
                          alCambiar={(valor) => cambiarLote(producto.id, lote.clave, { vence: valor })}
                          minimo={fecha}
                          maximo={hoyMas(DIAS_MAXIMOS_VENCIMIENTO)}
                          deshabilitado={enviando}
                        />
                        <View style={propios.filaCampos}>
                          <CampoTexto
                            estiloContenedor={propios.campoMitad}
                            etiqueta="N° de lote"
                            opcional
                            valor={lote.numero}
                            alCambiar={(valor) => cambiarLote(producto.id, lote.clave, { numero: valor, errorNumero: '' })}
                            alSalir={() => {
                              if (!limpiar(lote.numero)) return;
                              cambiarLote(producto.id, lote.clave, {
                                errorNumero: validarTextoCatalogo(lote.numero, {
                                  etiqueta: 'El número de lote',
                                  minimo: 1,
                                  maximo: 40,
                                  obligatorio: false,
                                }),
                              });
                            }}
                            error={lote.errorNumero ?? ''}
                            maxLength={40}
                            editable={!enviando}
                          />
                          <CampoTexto
                            estiloContenedor={propios.campoMitad}
                            etiqueta="Cantidad"
                            valor={lote.cantidad}
                            alCambiar={(valor) => cambiarLote(producto.id, lote.clave, { cantidad: valor, errorCantidad: '' })}
                            alSalir={() => {
                              if (!limpiar(lote.cantidad)) return;
                              cambiarLote(producto.id, lote.clave, {
                                errorCantidad: validarCantidad(lote.cantidad, {
                                  etiqueta: 'La cantidad del lote',
                                  entera: producto.cantidadEntera,
                                }),
                              });
                            }}
                            error={lote.errorCantidad ?? ''}
                            keyboardType="decimal-pad"
                            maxLength={12}
                            editable={!enviando}
                          />
                        </View>
                      </View>
                    ))}
                    {fila.errores.lotes ? <Text style={estilos.textoError}>{fila.errores.lotes}</Text> : null}
                    <Pressable
                      onPress={() =>
                        setFilas((anteriores) => ({
                          ...anteriores,
                          [producto.id]: { ...anteriores[producto.id], errores: {}, lotes: [...anteriores[producto.id].lotes, loteVacio()] },
                        }))
                      }
                      hitSlop={8}
                      disabled={enviando}
                    >
                      <Text style={estilos.enlace}>+ Otro lote con otra fecha</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          <CampoTexto
            etiqueta="Otros conceptos (percepciones, flete)"
            opcional
            prefijo={<Text style={estilos.detalle}>$</Text>}
            placeholder="0"
            valor={otros}
            alCambiar={(valor) => {
              setOtros(valor);
              setErroresComprobante((anteriores) => ({ ...anteriores, otros: '' }));
            }}
            alSalir={() => {
              const limpio = limpiar(otros);
              if (!limpio) return;
              const leido = leerCantidad(limpio);
              const problema =
                leido === null || Number.isNaN(leido) || leido < 0 ? 'Va en números, por ejemplo 350 o 350,50.' : '';
              setErroresComprobante((anteriores) => ({ ...anteriores, otros: problema }));
            }}
            error={erroresComprobante.otros ?? ''}
            keyboardType="decimal-pad"
            maxLength={14}
            editable={!enviando}
          />

          <View style={[estilos.tarjeta, propios.resumen]}>
            <Text style={estilos.nombre}>
              {resumen.recibidos} de {orden.detalle.length} productos con mercadería · {formatearPrecio(resumen.total)}
            </Text>
            {resumen.faltantes.length > 0 ? (
              <Text style={estilos.detalle}>
                Faltan: {resumen.faltantes.map((item) => `${texto(item.cantidad)} de ${item.renglon.producto.nombre}`).join(', ')}.
              </Text>
            ) : (
              <Text style={estilos.detalle}>Con esto la orden queda completa.</Text>
            )}
            {resumen.sobrantes.length > 0 ? (
              <Text style={estilos.detalle}>
                Llegó de más: {resumen.sobrantes.map((item) => `${texto(item.cantidad)} de ${item.renglon.producto.nombre}`).join(', ')}.
              </Text>
            ) : null}
          </View>

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
            {enviando ? <ActivityIndicator color={colores.textoSobreMarca} /> : <Text style={estilos.textoBotonPrincipal}>Registrar recepción</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <EscanerCodigo
        visible={escaneando}
        titulo="¿Qué producto llegó?"
        alCerrar={() => setEscaneando(false)}
        alLeer={alEscanear}
      />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    accionesDerecha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    botonEscanear: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 19,
      backgroundColor: c.marca,
    },
    textoEscanear: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.textoSobreMarca },
    filaCampos: { flexDirection: 'row', gap: 10 },
    campoChico: { flex: 2 },
    campoGrande: { flex: 3 },
    campoMitad: { flex: 1 },
    resaltado: { borderColor: c.marca, borderWidth: 2 },
    lotes: { gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.divisor },
    lote: { gap: 4 },
    resumen: { borderColor: c.bordeAdvertencia, backgroundColor: c.marcaSuave },
  });
}
