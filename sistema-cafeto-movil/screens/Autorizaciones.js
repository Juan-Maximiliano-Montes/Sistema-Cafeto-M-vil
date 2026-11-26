import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { mensajeDeError } from '../src/api/cliente';
import { aprobarAjuste, listarAjustesPendientes, rechazarAjuste } from '../src/api/ajustes';
import { TIPOS_AJUSTE, conUnidad, stockARevisar, textoMotivo } from '../src/datos/ajustes';
import { formatearFechaLarga } from '../src/utilidades/formato';
import { hapticAdvertencia, hapticExito } from '../src/utilidades/haptics';
import { limpiar } from '../src/utilidades/texto';
import { validarTextoCatalogo } from '../src/utilidades/validaciones';
import BarraVolver from '../src/componentes/BarraVolver';
import CampoTexto from '../src/componentes/CampoTexto';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import { crearEstilosTarea } from '../src/componentes/estilosTarea';

function formatearDiferencia(numero, unidad) {
  if (numero === null) return '';
  return `${numero > 0 ? '+' : ''}${conUnidad(numero, unidad)}`;
}

export default function Autorizaciones() {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilosTarea(colores), [colores]);
  const propios = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;

  const [ajustes, setAjustes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(null);
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const lista = await listarAjustesPendientes(token);
      if (!montado.current) return;
      setAjustes(lista);
      setError('');
    } catch (problema) {
      if (!montado.current) return;
      if (problema?.estado === 401 || problema?.estado === 403) {
        manejarError(problema);
        return;
      }
      setError(mensajeDeError(problema, 'No pudimos traer los ajustes.'));
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

  const nombreDe = (ajuste) => `${TIPOS_AJUSTE[ajuste.tipo].texto.toLowerCase()} N° ${ajuste.id}`;

  const tratarFallo = (problema, titulo) => {
    if (problema?.estado === 401 || problema?.estado === 403) {
      manejarError(problema);
      return;
    }
    if (problema?.estado === 404 || problema?.estado === 409) {
      avisar('advertencia', 'Ya se resolvió', 'Ese ajuste ya lo resolvió otra persona. Actualizamos la lista.');
      cargar();
      return;
    }
    avisar('advertencia', titulo, mensajeDeError(problema));
  };

  const aprobar = (ajuste) => {
    avisar(
      'advertencia',
      `¿Aprobar la ${nombreDe(ajuste)}?`,
      ajuste.tipo === 'CONTEO'
        ? 'Se corrige el stock con la diferencia de cada renglón.'
        : 'Se mueve el stock ahora. No se puede deshacer desde el celular.',
      [
        { texto: 'Cancelar', estilo: 'cancelar' },
        {
          texto: 'Aprobar',
          alPresionar: async () => {
            setProcesando(ajuste.id);
            try {
              await aprobarAjuste(token, ajuste.id);
              if (!montado.current) return;
              hapticExito();
              setAjustes((anteriores) => anteriores.filter((actual) => actual.id !== ajuste.id));
              avisar('exito', 'Aprobado', `La ${nombreDe(ajuste)} quedó aprobada y el stock ya se actualizó.`);
            } catch (problema) {
              if (montado.current) tratarFallo(problema, 'No se pudo aprobar');
            } finally {
              if (montado.current) setProcesando(null);
            }
          },
        },
      ]
    );
  };

  const validarMotivoRechazo = (valor, { obligatorio = false } = {}) => {
    const limpio = limpiar(valor);
    if (!limpio) return obligatorio ? 'Contá por qué se rechaza.' : '';
    return validarTextoCatalogo(valor, { etiqueta: 'El motivo', minimo: 3, maximo: 120, obligatorio });
  };

  const confirmarRechazo = async (ajuste) => {
    const problema = validarMotivoRechazo(motivo, { obligatorio: true });
    if (problema) {
      setErrorMotivo(problema);
      return;
    }
    const texto = limpiar(motivo);
    setProcesando(ajuste.id);
    try {
      await rechazarAjuste(token, ajuste.id, texto);
      if (!montado.current) return;
      hapticAdvertencia();
      setAjustes((anteriores) => anteriores.filter((actual) => actual.id !== ajuste.id));
      setRechazando(null);
      setMotivo('');
      avisar('exito', 'Rechazado', `La ${nombreDe(ajuste)} quedó rechazada. El stock no se tocó.`);
    } catch (problema) {
      if (montado.current) tratarFallo(problema, 'No se pudo rechazar');
    } finally {
      if (montado.current) setProcesando(null);
    }
  };

  const renderRenglon = (ajuste, renglon) => {
    const unidad = renglon.producto.unidad;
    let derecha = conUnidad(renglon.cantidad ?? 0, unidad);
    let detalle = renglon.lote ? `Lote ${renglon.lote.numero}` : renglon.producto.presentacion;
    if (ajuste.tipo === 'CONTEO') {
      derecha = formatearDiferencia(renglon.diferencia, unidad);
      const sistema = stockARevisar(renglon.teorica)
        ? `el sistema tenía ${conUnidad(Math.abs(renglon.teorica), unidad)} usados sin cargar`
        : `sistema ${conUnidad(renglon.teorica ?? 0, unidad)}`;
      detalle = `Contado ${conUnidad(renglon.contada ?? 0, unidad)} · ${sistema}${renglon.lote ? ` · lote ${renglon.lote.numero}` : ''}`;
    }
    if (ajuste.tipo === 'TRASPASO' && renglon.destino) {
      detalle = `Entra ${conUnidad(renglon.cantidadDestino ?? 0, renglon.destino.unidad)} en ${renglon.destino.nombre}`;
    }
    return (
      <View key={renglon.clave} style={propios.renglon}>
        <View style={estilos.textos}>
          <Text style={propios.producto}>{renglon.producto.nombre}</Text>
          {detalle ? <Text style={estilos.detalle}>{detalle}</Text> : null}
        </View>
        <Text style={[propios.cantidad, ajuste.tipo === 'CONTEO' && renglon.diferencia < 0 && propios.negativo]}>{derecha}</Text>
      </View>
    );
  };

  const renderAjuste = ({ item }) => {
    const ocupado = procesando === item.id;
    const enRechazo = rechazando === item.id;
    return (
      <View style={estilos.tarjeta}>
        <View style={estilos.filaEntre}>
          <View style={propios.filaTipo}>
            <Ionicons name={TIPOS_AJUSTE[item.tipo].icono} size={18} color={colores.marca} />
            <Text style={estilos.nombre}>
              {TIPOS_AJUSTE[item.tipo].texto} N° {item.id}
            </Text>
          </View>
          <Text style={estilos.chipEstado}>{textoMotivo(item.tipo, item.motivo).toUpperCase()}</Text>
        </View>
        <Text style={estilos.detalle}>
          Lo cargó {item.propio ? 'vos' : item.cargadoPor}
          {item.fecha ? ` el ${formatearFechaLarga(item.fecha)}` : ''}.
          {item.detalle ? ` «${item.detalle}»` : ''}
        </Text>
        <View style={propios.renglones}>{item.renglones.map((renglon) => renderRenglon(item, renglon))}</View>
        {!item.puedeAprobar ? (
          <Text style={propios.nota}>Lo cargaste vos: lo tiene que aprobar otra persona. Si te equivocaste, podés rechazarlo.</Text>
        ) : null}
        {enRechazo ? (
          <>
            <CampoTexto
              etiqueta="¿Por qué lo rechazás?"
              icono="edit-3"
              placeholder="Ej.: el conteo de la heladera está mal"
              valor={motivo}
              alCambiar={(texto) => {
                setMotivo(texto);
                setErrorMotivo('');
              }}
              alSalir={() => setErrorMotivo(validarMotivoRechazo(motivo))}
              error={errorMotivo}
              maxLength={120}
              editable={!ocupado}
              autoFocus
            />
            <View style={propios.botones}>
              <Pressable
                style={[estilos.botonSecundario, propios.mitad]}
                onPress={() => {
                  setRechazando(null);
                  setMotivo('');
                  setErrorMotivo('');
                }}
                disabled={ocupado}
              >
                <Text style={estilos.textoBotonSecundario}>Volver</Text>
              </Pressable>
              <Pressable style={[estilos.botonPeligro, propios.mitad]} onPress={() => confirmarRechazo(item)} disabled={ocupado}>
                {ocupado ? <ActivityIndicator color={colores.peligro} /> : <Text style={estilos.textoBotonPeligro}>Rechazar</Text>}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={propios.botones}>
            <Pressable
              style={[estilos.botonPeligro, propios.mitad]}
              onPress={() => {
                setRechazando(item.id);
                setMotivo('');
                setErrorMotivo('');
              }}
              disabled={procesando !== null}
              accessibilityRole="button"
            >
              <Feather name="x" size={18} color={colores.peligro} />
              <Text style={estilos.textoBotonPeligro}>Rechazar</Text>
            </Pressable>
            <Pressable
              style={[estilos.botonPrincipal, propios.mitad, propios.sinMargen, !item.puedeAprobar && estilos.botonApagado]}
              onPress={() => aprobar(item)}
              disabled={procesando !== null || !item.puedeAprobar}
              accessibilityRole="button"
              accessibilityState={{ disabled: procesando !== null || !item.puedeAprobar }}
            >
              {ocupado ? (
                <ActivityIndicator color={colores.textoSobreMarca} />
              ) : (
                <>
                  <Feather name="check" size={18} color={item.puedeAprobar ? colores.textoSobreMarca : colores.textoTenue} />
                  <Text style={[estilos.textoBotonPrincipal, !item.puedeAprobar && estilos.textoApagado]}>Aprobar</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <FlatList
        data={ajustes}
        keyExtractor={(item) => item.id}
        renderItem={renderAjuste}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={propios.cabecera}>
            <BarraVolver />
            <Text style={estilos.titulo}>Autorizar ajustes</Text>
            <Text style={estilos.subtitulo}>Conteos, mermas y traspasos que esperan tu visto bueno.</Text>
            <CuadroAyuda
              id="autorizar-control"
              cerrable
              titulo="Control por oposición"
              texto="Quien carga un ajuste no lo puede aprobar, salvo la administradora. Así siempre lo mira otra persona."
            />
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <EstadoVacio cargando texto="Buscando lo pendiente..." />
          ) : error ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos traer los ajustes"
              texto={error}
              accion={{
                texto: 'Reintentar',
                alPresionar: () => {
                  setCargando(true);
                  cargar();
                },
              }}
            />
          ) : (
            <EstadoVacio icono="checkmark-done-outline" titulo="No hay nada pendiente" texto="Cuando alguien cargue un ajuste, aparece acá." />
          )
        }
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
      />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    cabecera: { gap: 14 },
    filaTipo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    renglones: { borderTopWidth: 1, borderTopColor: c.divisor },
    renglon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: c.divisor,
    },
    producto: { fontFamily: 'Inter_500Medium', fontSize: 14, color: c.texto },
    cantidad: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.texto },
    negativo: { color: c.peligro },
    nota: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 17, color: c.textoTenue },
    botones: { flexDirection: 'row', gap: 10 },
    mitad: { flex: 1 },
    sinMargen: { marginTop: 0, height: 48 },
  });
}
