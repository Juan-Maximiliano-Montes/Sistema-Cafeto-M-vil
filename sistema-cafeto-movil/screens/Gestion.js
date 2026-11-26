import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { leerPanel } from '../src/api/panel';
import { formatearNumero, formatearPrecio } from '../src/utilidades/formato';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import Esqueleto from '../src/componentes/Esqueleto';

const GRUPOS = [
  {
    titulo: 'MOSTRADOR Y COCINA',
    tareas: [
      { clave: 'produccion', permiso: 'registrar_produccion', icono: 'flame-outline', titulo: 'Cargar producción', detalle: 'Una tanda de lo que se hace en el local.', pantalla: 'Produccion' },
      { clave: 'merma', permiso: 'registrar_merma', icono: 'trash-outline', titulo: 'Cargar merma', detalle: 'Lo que se rompió o se venció.', pantalla: 'Merma' },
      { clave: 'ofertas', permiso: 'imprimir_ofertas', icono: 'pricetag-outline', titulo: 'Ofertas para etiquetar', detalle: 'Los lotes rebajados de hoy.', pantalla: 'OfertasEtiquetar' },
    ],
  },
  {
    titulo: 'DEPÓSITO',
    tareas: [
      { clave: 'recepcion', permiso: 'registrar_compra', icono: 'cube-outline', titulo: 'Recibir mercadería', detalle: 'Controlá lo que entregó el proveedor.', pantalla: 'Recepciones' },
      { clave: 'conteo', permiso: 'contar_stock', icono: 'clipboard-outline', titulo: 'Contar stock', detalle: 'Inventario de góndola o depósito.', pantalla: 'Conteo' },
      { clave: 'traspaso', permiso: 'registrar_traspaso', icono: 'swap-horizontal-outline', titulo: 'Traspaso', detalle: 'De un producto a otro, por ejemplo a la cafetería.', pantalla: 'Traspaso' },
    ],
  },
  {
    titulo: 'CONTROL',
    tareas: [
      { clave: 'autorizar', permiso: 'autorizar_ajustes', icono: 'checkmark-done-outline', titulo: 'Autorizar ajustes', detalle: 'Conteos, mermas y traspasos pendientes.', pantalla: 'Autorizaciones' },
      { clave: 'alertas', permiso: 'ver_stock', icono: 'notifications-outline', titulo: 'Alertas', detalle: 'Faltantes y vencimientos.', pantalla: 'Alertas' },
      { clave: 'consulta', permiso: 'ver_productos', icono: 'barcode-outline', titulo: 'Consultar producto', detalle: 'Precio, stock y vencimiento al instante.', pantalla: 'ConsultaProducto' },
    ],
  },
  {
    titulo: 'CATÁLOGO',
    tareas: [
      { clave: 'marcas', permiso: 'ver_marcas', icono: 'pricetags-outline', titulo: 'Marcas', detalle: 'Cargá y corregí marcas.', pantalla: 'Marcas' },
      { clave: 'rubros', permiso: 'ver_rubros', icono: 'albums-outline', titulo: 'Rubros', detalle: 'Corregí nombres o dejá de ofrecer un rubro.', pantalla: 'Rubros' },
    ],
  },
];

const DESTINOS = { ALERTAS: { pantalla: 'Alertas', permiso: 'ver_stock' }, AJUSTES: { pantalla: 'Autorizaciones', permiso: 'autorizar_ajustes' }, ORDENES: { pantalla: 'Recepciones', permiso: 'registrar_compra' } };

export default function Gestion() {
  const navigation = useNavigation();
  const { colores, isotipo } = useTema();
  const { avisar } = useAviso();
  const { equipo, tienePermiso } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const token = equipo?.token;

  const [panel, setPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState(false);
  const vigente = useRef(0);

  const cargar = useCallback(async () => {
    if (!token) return;
    const consulta = ++vigente.current;
    try {
      const datos = await leerPanel(token);
      if (consulta !== vigente.current) return;
      setPanel(datos);
      setError(false);
    } catch (problema) {
      if (consulta !== vigente.current) return;
      if (problema?.estado === 401) {
        manejarError(problema);
        return;
      }
      setError(true);
    } finally {
      if (consulta === vigente.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
  }, [token, manejarError]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      return () => {
        vigente.current += 1;
      };
    }, [cargar])
  );

  const abrirAviso = (aviso) => {
    const destino = DESTINOS[aviso.destino];
    if (destino && tienePermiso(destino.permiso)) {
      navigation.navigate(destino.pantalla);
      return;
    }
    avisar('advertencia', 'Se resuelve en la web', `${aviso.texto} Esto se gestiona desde la versión web, donde está toda la información.`);
  };

  const grupos = GRUPOS.map((grupo) => ({ ...grupo, tareas: grupo.tareas.filter((tarea) => tienePermiso(tarea.permiso)) })).filter(
    (grupo) => grupo.tareas.length > 0
  );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
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
        <View style={estilos.encabezado}>
          <Image source={isotipo} style={estilos.isotipo} resizeMode="contain" />
          <View style={estilos.textos}>
            <Text style={estilos.titulo}>Gestión</Text>
            <Text style={estilos.subtitulo}>
              {equipo?.nombre ?? 'Equipo'} · {equipo?.perfil ?? 'Equipo Cafeto'}
              {equipo?.esTitular ? ' · Titular' : ''}
            </Text>
          </View>
        </View>

        {cargando ? (
          <Esqueleto estilo={estilos.esqueleto} />
        ) : error ? (
          <Pressable style={estilos.errorPanel} onPress={() => cargar()} accessibilityRole="button">
            <Ionicons name="cloud-offline-outline" size={18} color={colores.textoTenue} />
            <Text style={estilos.textoErrorPanel}>No pudimos traer el resumen del día. Tocá para reintentar.</Text>
          </Pressable>
        ) : panel ? (
          <>
            {panel.indicadores.length > 0 ? (
              <View style={estilos.indicadores}>
                {panel.indicadores.map((indicador) => (
                  <View key={indicador.clave} style={estilos.indicador}>
                    <Text style={estilos.tituloIndicador}>{indicador.titulo}</Text>
                    <Text style={estilos.valorIndicador}>
                      {indicador.formato === 'PESOS' ? formatearPrecio(indicador.valor) : formatearNumero(indicador.valor)}
                    </Text>
                    {indicador.detalle ? <Text style={estilos.detalleIndicador}>{indicador.detalle}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
            {panel.avisos.map((aviso) => (
              <Pressable
                key={aviso.clave}
                style={({ pressed }) => [estilos.aviso, aviso.tipo === 'error' && estilos.avisoError, pressed && estilos.presionado]}
                onPress={() => abrirAviso(aviso)}
                accessibilityRole="button"
              >
                <Ionicons
                  name={aviso.destino === 'WEB' ? 'desktop-outline' : aviso.tipo === 'error' ? 'alert-circle' : 'warning-outline'}
                  size={20}
                  color={aviso.tipo === 'error' ? colores.peligro : colores.marca}
                />
                <Text style={estilos.textoAviso}>{aviso.texto}</Text>
                <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
              </Pressable>
            ))}
            {panel.indicadores.length === 0 && panel.avisos.length === 0 ? (
              <Text style={estilos.todoBien}>Todo en orden por ahora: no hay nada urgente.</Text>
            ) : null}
          </>
        ) : null}

        {grupos.length === 0 ? (
          <View style={estilos.vacio}>
            <Ionicons name="lock-closed-outline" size={28} color={colores.textoTenue} />
            <Text style={estilos.vacioTexto}>
              Tu perfil todavía no tiene tareas para el celular. Si necesitás alguna, pedísela al administrador.
            </Text>
          </View>
        ) : (
          grupos.map((grupo) => (
            <View key={grupo.titulo} style={estilos.grupo}>
              <Text style={estilos.seccion}>{grupo.titulo}</Text>
              {grupo.tareas.map((tarea) => (
                <Pressable
                  key={tarea.clave}
                  style={({ pressed }) => [estilos.tarea, pressed && estilos.presionado]}
                  onPress={() => navigation.navigate(tarea.pantalla)}
                  accessibilityRole="button"
                  accessibilityLabel={tarea.titulo}
                >
                  <View style={estilos.iconoTarea}>
                    <Ionicons name={tarea.icono} size={22} color={colores.textoSobreMarca} />
                  </View>
                  <View style={estilos.textos}>
                    <Text style={estilos.tareaTitulo}>{tarea.titulo}</Text>
                    <Text style={estilos.tareaDetalle}>{tarea.detalle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colores.textoTenue} />
                </Pressable>
              ))}
            </View>
          ))
        )}

        <CuadroAyuda
          icono="desktop-outline"
          tipo="consejo"
          titulo="Lo pesado, en la web"
          texto="Ventas y caja, armar órdenes de compra, pagos, precios, productos, beneficios, usuarios y reportes se hacen en la versión web."
        />

        <Pressable
          style={estilos.ayuda}
          onPress={() => navigation.navigate('Ayuda')}
          accessibilityRole="button"
        >
          <Ionicons name="help-circle-outline" size={18} color={colores.textoSecundario} />
          <Text style={estilos.textoAyuda}>
            ¿Algo no funciona? <Text style={estilos.enlace}>Mirá las soluciones</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 20, paddingBottom: 32, gap: 12 },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    isotipo: { width: 40, height: 40 },
    textos: { flex: 1, gap: 2 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 34, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    esqueleto: { height: 110 },
    errorPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoErrorPanel: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.textoSecundario },
    indicadores: { flexDirection: 'row', gap: 10 },
    indicador: {
      flex: 1,
      gap: 4,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    tituloIndicador: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: c.textoSecundario },
    valorIndicador: { fontFamily: 'Inter_700Bold', fontSize: 22, color: c.texto },
    detalleIndicador: { fontFamily: 'Inter_400Regular', fontSize: 11.5, lineHeight: 16, color: c.textoSecundario },
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.fondoAdvertencia,
    },
    avisoError: { borderColor: c.bordePeligro, backgroundColor: c.fondoPeligro },
    textoAviso: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13.5, lineHeight: 19, color: c.texto },
    todoBien: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.textoSecundario },
    grupo: { gap: 10 },
    seccion: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: c.textoSecundario, marginTop: 8 },
    tarea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    iconoTarea: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tareaTitulo: { fontFamily: 'Inter_600SemiBold', fontSize: 15.5, color: c.texto },
    tareaDetalle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: c.textoSecundario },
    presionado: { opacity: 0.85 },
    vacio: {
      alignItems: 'center',
      gap: 10,
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    vacioTexto: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: c.textoSecundario, textAlign: 'center' },
    ayuda: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
    textoAyuda: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.textoSecundario },
    enlace: { fontFamily: 'Inter_600SemiBold', color: c.marca },
  });
}
