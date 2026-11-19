import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { mensajeDeError } from '../src/api/cliente';
import { listarAlertas } from '../src/api/stock';
import { A_REVISAR, FILTROS_ALERTA, TIPOS_ALERTA } from '../src/datos/alertas';
import { stockARevisar } from '../src/datos/ajustes';
import { formatearFechaLarga } from '../src/utilidades/formato';
import BarraVolver from '../src/componentes/BarraVolver';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';

export default function Alertas({ navigation }) {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { equipo, tienePermiso, sesionVencida } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;
  const puedeConsultar = tienePermiso('ver_productos');
  const puedeMerma = tienePermiso('registrar_merma');
  const puedeEtiquetar = tienePermiso('imprimir_ofertas');

  const [filtro, setFiltro] = useState('TODAS');
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const ultimaConsulta = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(
    async (tipo) => {
      const consulta = ++ultimaConsulta.current;
      try {
        const respuesta = await listarAlertas(token, { tipo });
        if (!montado.current || consulta !== ultimaConsulta.current) return;
        setAlertas(respuesta.resultados);
        setError('');
      } catch (problema) {
        if (!montado.current || consulta !== ultimaConsulta.current) return;
        if (problema?.estado === 401) {
          sesionVencida();
          avisar('error', 'Tu sesión venció', 'Volvé a entrar con tu usuario del sistema.');
          return;
        }
        setAlertas([]);
        setError(mensajeDeError(problema, 'No pudimos traer las alertas.'));
      } finally {
        if (montado.current && consulta === ultimaConsulta.current) {
          setCargando(false);
          setActualizando(false);
        }
      }
    },
    [token, avisar, sesionVencida]
  );

  useFocusEffect(
    useCallback(() => {
      cargar(filtro);
    }, [filtro, cargar])
  );

  const actualizar = () => {
    setActualizando(true);
    cargar(filtro);
  };

  const graves = alertas.filter((alerta) => TIPOS_ALERTA[alerta.tipo].grave).length;

  const renderAlerta = ({ item }) => {
    const datos = stockARevisar(item.producto.stockActual) ? A_REVISAR : TIPOS_ALERTA[item.tipo];
    const contenido = (
      <>
        <View style={[estilos.icono, datos.grave ? estilos.iconoGrave : estilos.iconoLeve]}>
          <Ionicons name={datos.icono} size={20} color={datos.grave ? colores.peligro : colores.marca} />
        </View>
        <View style={estilos.textos}>
          <View style={estilos.filaTitulo}>
            <Text style={estilos.nombre} numberOfLines={1}>
              {item.producto.nombre}
            </Text>
            <Text style={[estilos.etiqueta, datos.grave ? estilos.etiquetaGrave : estilos.etiquetaLeve]}>
              {datos.etiqueta.toUpperCase()}
            </Text>
          </View>
          {item.producto.presentacion ? <Text style={estilos.presentacion}>{item.producto.presentacion}</Text> : null}
          <Text style={estilos.detalle}>{item.detalle}</Text>
          {item.fecha ? <Text style={estilos.fecha}>Fecha: {formatearFechaLarga(item.fecha)}</Text> : null}
          {item.tipo === 'VENCIDO' && item.lote && puedeMerma ? (
            <Pressable
              style={({ pressed }) => [estilos.botonMerma, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('Merma', { producto: item.producto, lote: item.lote, motivo: 'VENCIMIENTO' })}
              accessibilityRole="button"
              accessibilityLabel={`Cargar merma del lote ${item.lote.numero}`}
            >
              <Ionicons name="trash-outline" size={15} color={colores.peligro} />
              <Text style={estilos.textoMerma}>Cargar merma</Text>
            </Pressable>
          ) : null}
        </View>
        {puedeConsultar ? <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} /> : null}
      </>
    );

    if (!puedeConsultar) return <View style={estilos.fila}>{contenido}</View>;
    return (
      <Pressable
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionado]}
        onPress={() => navigation.navigate('ConsultaProducto', { busqueda: item.producto.nombre })}
        accessibilityRole="button"
        accessibilityLabel={`${datos.etiqueta}: ${item.producto.nombre}. Ver detalle`}
      >
        {contenido}
      </Pressable>
    );
  };

  const contenidoVacio = () => {
    if (cargando) return <EstadoVacio cargando texto="Revisando stock y vencimientos..." />;
    if (error) {
      return (
        <EstadoVacio
          icono="cloud-offline-outline"
          titulo="No pudimos traer las alertas"
          texto={error}
          accion={{
            texto: 'Reintentar',
            alPresionar: () => {
              setCargando(true);
              cargar(filtro);
            },
          }}
        />
      );
    }
    return (
      <EstadoVacio
        icono="checkmark-circle-outline"
        titulo="Todo en orden"
        texto={filtro === 'TODAS' ? 'No hay nada para revisar por ahora.' : 'No hay alertas de este tipo.'}
      />
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <FlatList
        data={cargando && !actualizando ? [] : alertas}
        keyExtractor={(item) => item.id}
        renderItem={renderAlerta}
        contentContainerStyle={estilos.lista}
        ListHeaderComponent={
          <View style={estilos.cabecera}>
            <BarraVolver texto="Volver" />
            <Text style={estilos.titulo}>Alertas</Text>
            <Text style={estilos.subtitulo}>
              {!cargando && !error && alertas.length > 0
                ? `${alertas.length} para revisar${graves > 0 ? `, ${graves} urgente${graves === 1 ? '' : 's'}` : ''}.`
                : 'Stock bajo y vencimientos para revisar hoy.'}
            </Text>
            <View style={estilos.filtros}>
              {FILTROS_ALERTA.map((opcion) => {
                const activo = filtro === opcion.clave;
                return (
                  <Pressable
                    key={opcion.clave}
                    style={[estilos.chip, activo && estilos.chipActivo]}
                    onPress={() => {
                      if (opcion.clave === filtro) return;
                      setCargando(true);
                      setAlertas([]);
                      setFiltro(opcion.clave);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text style={[estilos.textoChip, activo && estilos.textoChipActivo]}>{opcion.texto}</Text>
                  </Pressable>
                );
              })}
            </View>
            {puedeEtiquetar ? (
              <Pressable
                style={estilos.enlaceOfertas}
                onPress={() => navigation.navigate('OfertasEtiquetar')}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Ionicons name="pricetag-outline" size={16} color={colores.marca} />
                <Text style={estilos.textoEnlace}>Ver las ofertas para etiquetar</Text>
              </Pressable>
            ) : null}
            <CuadroAyuda
              id="alertas-como-funciona"
              cerrable
              titulo="¿De dónde salen?"
              texto="Se calculan con el stock y los lotes cargados en la web. Para reponer, retirar mercadería o corregir un lote, registralo en la web."
            />
          </View>
        }
        ListEmptyComponent={contenidoVacio}
        refreshControl={
          <RefreshControl refreshing={actualizando} onRefresh={actualizar} tintColor={colores.marca} colors={[colores.marca]} />
        }
      />
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    lista: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 10, flexGrow: 1 },
    cabecera: { gap: 12, marginBottom: 6 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 36, color: c.titulo, marginBottom: -8 },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    filtros: { flexDirection: 'row', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    chipActivo: { backgroundColor: c.marca, borderColor: c.marca },
    textoChip: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    textoChipActivo: { color: c.textoSobreMarca },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    presionado: { opacity: 0.85 },
    icono: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    iconoGrave: { backgroundColor: c.fondoPeligro },
    iconoLeve: { backgroundColor: c.fondoAdvertencia },
    textos: { flex: 1, gap: 3 },
    filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nombre: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    etiqueta: {
      fontFamily: 'Inter_700Bold',
      fontSize: 9.5,
      letterSpacing: 1,
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
      color: c.texto,
    },
    etiquetaGrave: { backgroundColor: c.fondoPeligro, borderColor: c.bordePeligro },
    etiquetaLeve: { backgroundColor: c.fondoAdvertencia, borderColor: c.bordeAdvertencia },
    presentacion: { fontFamily: 'Inter_500Medium', fontSize: 12.5, color: c.textoSecundario },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 19, color: c.texto },
    fecha: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoTenue },
    botonMerma: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.bordePeligro,
      backgroundColor: c.fondoPeligro,
    },
    textoMerma: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.peligro },
    enlaceOfertas: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    textoEnlace: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.marca },
  });
}
