import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { esOperacionRepetida, mensajeDeError, nuevaClaveOperacion } from '../src/api/cliente';
import { registrarTraspaso } from '../src/api/ajustes';
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

const SIN_ERRORES = { origen: '', lote: '', cantidad: '', destino: '', cantidadDestino: '', detalle: '' };

export default function Traspaso({ navigation }) {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const token = equipo?.token;

  const [motivo, setMotivo] = useState('USO_EN_CAFETERIA');
  const [detalle, setDetalle] = useState('');
  const [origen, setOrigen] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);
  const [errorLotes, setErrorLotes] = useState('');
  const [idLote, setIdLote] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [destino, setDestino] = useState(null);
  const [cantidadDestino, setCantidadDestino] = useState('');
  const [buscando, setBuscando] = useState(null);
  const [errores, setErrores] = useState(SIN_ERRORES);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const clave = useRef(nuevaClaveOperacion());
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargarLotes = async (producto) => {
    setCargandoLotes(true);
    setErrorLotes('');
    try {
      const encontrados = await listarLotes(token, producto.id);
      if (!montado.current) return;
      setLotes(encontrados);
      setIdLote(encontrados[0]?.id ?? null);
    } catch (problema) {
      if (!montado.current) return;
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setErrorLotes(mensajeDeError(problema, 'No pudimos traer los lotes.'));
    } finally {
      if (montado.current) setCargandoLotes(false);
    }
  };

  const elegir = (producto) => {
    const lado = buscando;
    setBuscando(null);
    setErrorGeneral('');
    if (lado === 'origen') {
      setOrigen(producto);
      setLotes([]);
      setIdLote(null);
      setErrores((anteriores) => ({ ...anteriores, origen: '', lote: '', cantidad: '' }));
      if (destino?.id === producto.id) setDestino(null);
      if (producto.controlaVencimiento) cargarLotes(producto);
    } else {
      setDestino(producto);
      setErrores((anteriores) => ({ ...anteriores, destino: '', cantidadDestino: '' }));
    }
  };

  const existencia = () => {
    if (!origen) return null;
    if (idLote !== null) return lotes.find((lote) => lote.id === idLote)?.cantidad ?? null;
    return origen.tipo === 'INSUMO' ? null : origen.stockActual;
  };

  const enviar = async () => {
    if (enviando) return;
    setErrorGeneral('');
    const nuevos = {
      origen: origen ? '' : 'Elegí de qué producto sale.',
      lote: origen?.controlaVencimiento && idLote === null ? 'Elegí el lote.' : '',
      cantidad: origen ? validarCantidad(cantidad, { entera: origen.cantidadEntera, existencia: existencia() }) : '',
      destino: destino ? '' : 'Elegí a qué producto entra.',
      cantidadDestino: destino ? validarCantidad(cantidadDestino, { etiqueta: 'La cantidad que entra', entera: destino.cantidadEntera }) : '',
      detalle: validarTextoCatalogo(detalle, { etiqueta: 'El detalle', minimo: 3, maximo: 120, obligatorio: motivo === 'OTRO' }),
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;
    setEnviando(true);
    try {
      const resultado = await registrarTraspaso(
        token,
        {
          motivo,
          detalle: limpiar(detalle) || null,
          renglones: [
            {
              producto: origen.id,
              lote: idLote,
              cantidad: leerCantidad(cantidad),
              destino: destino.id,
              cantidad_destino: leerCantidad(cantidadDestino),
            },
          ],
        },
        clave.current
      );
      clave.current = nuevaClaveOperacion();
      hapticExito();
      navigation.goBack();
      avisar('exito', 'Traspaso cargado', `El traspaso N° ${resultado.id} quedó esperando que lo apruebe quien autoriza los ajustes.`);
    } catch (problema) {
      if (!montado.current) return;
      setEnviando(false);
      if (esOperacionRepetida(problema)) {
        navigation.goBack();
        avisar('exito', 'Ya estaba cargado', 'Ese traspaso ya se había cargado. No se repitió.');
        return;
      }
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setErrorGeneral(mensajeDeError(problema, 'No pudimos cargar el traspaso.'));
    }
  };

  const renderProducto = (producto, lado, error) => (
    <View style={estilos.tarjeta}>
      {producto ? (
        <View style={estilos.filaEntre}>
          <View style={estilos.textos}>
            <Text style={estilos.nombre}>{producto.nombre}</Text>
            <Text style={estilos.detalle}>
              {[producto.presentacion, producto.stockActual !== null ? `Stock: ${textoDeStock(producto.stockActual, producto.unidad)}` : '']
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Pressable onPress={() => setBuscando(lado)} hitSlop={8} disabled={enviando}>
            <Text style={estilos.enlace}>Cambiar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
          onPress={() => setBuscando(lado)}
          disabled={enviando}
        >
          <Ionicons name="search-outline" size={18} color={colores.texto} />
          <Text style={estilos.textoBotonSecundario}>Elegir producto</Text>
        </Pressable>
      )}
      {error ? <Text style={estilos.textoError}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <BarraVolver deshabilitado={enviando} />
          <Text style={estilos.titulo}>Traspaso</Text>
          <Text style={estilos.subtitulo}>
            Pasá mercadería de un producto a otro, por ejemplo la leche de góndola que se usa en la cafetería.
          </Text>
          <CuadroAyuda
            id="traspaso-lote"
            cerrable
            titulo="Destino sin lote"
            texto="El producto que recibe no puede manejarse por lote: un traspaso no inventa vencimientos. Eso se carga como compra o conteo."
          />

          <Text style={estilos.etiqueta}>Motivo</Text>
          <Opciones
            opciones={MOTIVOS_AJUSTE.TRASPASO}
            elegida={motivo}
            alElegir={(valor) => {
              setMotivo(valor);
              setErrores((anteriores) => ({ ...anteriores, detalle: '' }));
            }}
            deshabilitado={enviando}
          />
          {motivo === 'OTRO' ? (
            <CampoTexto
              etiqueta="Detalle"
              icono="edit-3"
              placeholder="Contá qué pasó"
              valor={detalle}
              alCambiar={(texto) => {
                setDetalle(texto);
                setErrores((anteriores) => ({ ...anteriores, detalle: '' }));
              }}
              alSalir={() =>
                setErrores((anteriores) => ({
                  ...anteriores,
                  detalle: validarTextoCatalogo(detalle, { etiqueta: 'El detalle', minimo: 3, maximo: 120, obligatorio: true }),
                }))
              }
              error={errores.detalle}
              maxLength={130}
              editable={!enviando}
            />
          ) : null}

          <Text style={estilos.seccion}>SALE DE</Text>
          {renderProducto(origen, 'origen', errores.origen)}
          {origen?.controlaVencimiento ? (
            <SelectorLote
              lotes={lotes}
              elegido={idLote}
              alElegir={(lote) => {
                setIdLote(lote.id);
                setErrores((anteriores) => ({ ...anteriores, lote: '', cantidad: '' }));
              }}
              unidad={origen.unidad}
              cargando={cargandoLotes}
              error={errorLotes || errores.lote}
              alReintentar={() => cargarLotes(origen)}
            />
          ) : null}
          {origen ? (
            <CampoTexto
              etiqueta="Cuánto sale"
              icono="hash"
              placeholder={origen.cantidadEntera ? 'Ej.: 2' : 'Ej.: 1,5'}
              valor={cantidad}
              alCambiar={(texto) => {
                setCantidad(texto);
                setErrores((anteriores) => ({ ...anteriores, cantidad: '' }));
              }}
              alSalir={() => {
                if (limpiar(cantidad)) {
                  setErrores((anteriores) => ({
                    ...anteriores,
                    cantidad: validarCantidad(cantidad, { entera: origen.cantidadEntera, existencia: existencia() }),
                  }));
                }
              }}
              error={errores.cantidad}
              keyboardType="decimal-pad"
              maxLength={12}
              editable={!enviando}
            />
          ) : null}

          <Text style={estilos.seccion}>ENTRA EN</Text>
          {renderProducto(destino, 'destino', errores.destino)}
          {destino ? (
            <CampoTexto
              etiqueta={`Cuánto entra (${conUnidad(1, destino.unidad).replace('1 ', '')})`}
              icono="hash"
              placeholder={destino.cantidadEntera ? 'Ej.: 2' : 'Ej.: 1,5'}
              valor={cantidadDestino}
              alCambiar={(texto) => {
                setCantidadDestino(texto);
                setErrores((anteriores) => ({ ...anteriores, cantidadDestino: '' }));
              }}
              alSalir={() => {
                if (limpiar(cantidadDestino)) {
                  setErrores((anteriores) => ({
                    ...anteriores,
                    cantidadDestino: validarCantidad(cantidadDestino, {
                      etiqueta: 'La cantidad que entra',
                      entera: destino.cantidadEntera,
                    }),
                  }));
                }
              }}
              error={errores.cantidadDestino}
              ayudaAlEnfocar="Por ejemplo, 1 sachet de leche de góndola = 1 litro del insumo."
              keyboardType="decimal-pad"
              maxLength={12}
              editable={!enviando}
            />
          ) : null}

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
              <Text style={estilos.textoBotonPrincipal}>Cargar traspaso</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <BuscadorProducto
        visible={buscando !== null}
        titulo={buscando === 'destino' ? '¿En qué producto entra?' : '¿De qué producto sale?'}
        ayuda={buscando === 'destino' ? 'Solo aparecen productos con stock propio que no van por lote.' : 'Solo aparecen productos con stock propio.'}
        alCerrar={() => setBuscando(null)}
        alElegir={elegir}
        filtrar={(producto) =>
          producto.stockActual !== null &&
          (buscando !== 'destino' || (!producto.controlaVencimiento && producto.id !== origen?.id))
        }
      />
    </SafeAreaView>
  );
}
