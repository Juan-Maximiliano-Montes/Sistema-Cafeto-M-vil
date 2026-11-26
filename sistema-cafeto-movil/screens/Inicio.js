import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useErrorEquipo } from '../src/sesion/useErrorEquipo';
import { mensajeDeError } from '../src/api/cliente';
import { SECCIONES, listarBeneficios, listarDestacados, listarProductos } from '../src/api/catalogo';
import { leerPanel } from '../src/api/panel';
import { coloresCategoria } from '../src/datos/categorias';
import { useCuentaCliente } from '../src/cliente/CuentaClienteContext';
import { formatearNumero, formatearPrecio } from '../src/utilidades/formato';
import { primerNombre } from '../src/utilidades/texto';
import { alcanzaCategoria, ordenDeCategorias, ordenarBeneficios, resumirPuntos } from '../src/utilidades/puntos';
import CarruselOfertas from '../src/componentes/CarruselOfertas';
import TarjetaProducto from '../src/componentes/TarjetaProducto';
import DetalleProducto from '../src/componentes/DetalleProducto';
import Esqueleto from '../src/componentes/Esqueleto';
import AvisoCuentaCliente from '../src/componentes/AvisoCuentaCliente';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import { iconoSeguro } from '../src/componentes/iconos';

const MAXIMO_POR_SECCION = 8;
const MAXIMO_BENEFICIOS = 3;

const DESCRIPCION_SECCION = {
  CAFETERIA: 'Cafés, comidas y combos hechos en el local',
  MINISUPER: 'Bebidas, almacén y lo que te haga falta',
};

const PASOS = [
  { icono: 'person-add-outline', titulo: 'Creá tu cuenta', texto: 'Es gratis y tarda un minuto.' },
  { icono: 'qr-code-outline', titulo: 'Mostrá tu QR en la caja', texto: 'Cada compra te suma puntos.' },
  { icono: 'gift-outline', titulo: 'Canjeá tus puntos', texto: 'Por productos y descuentos.' },
];

const GRUPOS_TAREAS_EQUIPO = [
  {
    clave: 'mostrador',
    titulo: 'MOSTRADOR Y COCINA',
    tareas: [
      {
        clave: 'produccion',
        permiso: 'registrar_produccion',
        icono: 'flame-outline',
        titulo: 'Cargar producción',
        detalle: 'Una tanda de lo que se hace en el local.',
        pantalla: 'Produccion',
      },
      {
        clave: 'merma',
        permiso: 'registrar_merma',
        icono: 'trash-outline',
        titulo: 'Cargar merma',
        detalle: 'Lo que se rompió o se venció.',
        pantalla: 'Merma',
      },
      {
        clave: 'ofertas',
        permiso: 'imprimir_ofertas',
        icono: 'pricetag-outline',
        titulo: 'Ofertas para etiquetar',
        detalle: 'Los lotes rebajados de hoy.',
        pantalla: 'OfertasEtiquetar',
      },
    ],
  },
  {
    clave: 'deposito',
    titulo: 'DEPÓSITO',
    tareas: [
      {
        clave: 'recepcion',
        permiso: 'registrar_compra',
        icono: 'cube-outline',
        titulo: 'Recibir mercadería',
        detalle: 'Controlá lo que entregó el proveedor.',
        pantalla: 'Recepciones',
      },
      {
        clave: 'conteo',
        permiso: 'contar_stock',
        icono: 'clipboard-outline',
        titulo: 'Contar stock',
        detalle: 'Inventario de góndola o depósito.',
        pantalla: 'Conteo',
      },
      {
        clave: 'traspaso',
        permiso: 'registrar_traspaso',
        icono: 'swap-horizontal-outline',
        titulo: 'Traspaso',
        detalle: 'De un producto a otro, por ejemplo a la cafetería.',
        pantalla: 'Traspaso',
      },
    ],
  },
  {
    clave: 'control',
    titulo: 'CONTROL',
    tareas: [
      {
        clave: 'autorizar',
        permiso: 'autorizar_ajustes',
        icono: 'checkmark-done-outline',
        titulo: 'Autorizar ajustes',
        detalle: 'Conteos, mermas y traspasos pendientes.',
        pantalla: 'Autorizaciones',
      },
      {
        clave: 'alertas',
        permiso: 'ver_stock',
        icono: 'notifications-outline',
        titulo: 'Alertas',
        detalle: 'Faltantes y vencimientos.',
        pantalla: 'Alertas',
      },
      {
        clave: 'consulta',
        permiso: 'ver_productos',
        icono: 'barcode-outline',
        titulo: 'Consultar producto',
        detalle: 'Precio, stock y vencimiento al instante.',
        pantalla: 'ConsultaProducto',
      },
    ],
  },
  {
    clave: 'catalogo',
    titulo: 'CATÁLOGO',
    tareas: [
      {
        clave: 'marcas',
        permiso: 'ver_marcas',
        icono: 'pricetags-outline',
        titulo: 'Marcas',
        detalle: 'Cargá y corregí marcas.',
        pantalla: 'Marcas',
      },
      {
        clave: 'rubros',
        permiso: 'ver_rubros',
        icono: 'albums-outline',
        titulo: 'Rubros',
        detalle: 'Corregí nombres o dejá de ofrecer un rubro.',
        pantalla: 'Rubros',
      },
    ],
  },
];

const DESTINOS_AVISO = {
  ALERTAS: { pantalla: 'Alertas', permisos: ['ver_stock'] },
  AJUSTES: { pantalla: 'Autorizaciones', permisos: ['autorizar_ajustes'] },
  ORDENES: { pantalla: 'Recepciones', permisos: ['registrar_compra', 'gestionar_ordenes'] },
};

const PERMISOS_AVISO_WEB = ['ver_egresos', 'gestionar_ordenes', 'ver_reportes', 'ver_auditoria'];

const PERMISO_POR_INDICADOR = {
  VENDIDO_HOY: 'ver_ventas',
  CAJAS_ABIERTAS: 'ver_caja',
};

const CARGANDO = { estado: 'cargando', datos: [], error: '' };

function combinar(anterior, resultado, porDefecto) {
  if (resultado.status === 'fulfilled') {
    return { estado: 'listo', datos: resultado.value.resultados, error: '' };
  }
  const error = mensajeDeError(resultado.reason, porDefecto);
  return anterior.datos.length > 0 ? { ...anterior, error } : { estado: 'error', datos: [], error };
}

function disponiblesPrimero(lista) {
  return [...lista].sort((a, b) => Number(b.disponible) - Number(a.disponible)).slice(0, MAXIMO_POR_SECCION);
}

function permisoRequeridoIndicador(clave = '') {
  const normalizada = clave.toUpperCase();
  if (PERMISO_POR_INDICADOR[normalizada]) return PERMISO_POR_INDICADOR[normalizada];
  if (normalizada.startsWith('VENTA') || normalizada.startsWith('TICKET')) return 'ver_ventas';
  if (normalizada.startsWith('CAJA') || normalizada.startsWith('ARQUEO')) return 'ver_caja';
  if (normalizada.startsWith('EGRESO') || normalizada.startsWith('PAGO')) return 'ver_egresos';
  if (normalizada.startsWith('AJUSTE')) return 'autorizar_ajustes';
  if (normalizada.startsWith('ALERTA') || normalizada.startsWith('STOCK')) return 'ver_stock';
  return null;
}

function EncabezadoSeccion({ icono, titulo, subtitulo, accion, estilos, colores }) {
  return (
    <View style={estilos.encabezadoSeccion}>
      {icono ? (
        <View style={estilos.iconoSeccion}>
          <Ionicons name={icono} size={18} color={colores.textoSobreMarca} />
        </View>
      ) : null}
      <View style={estilos.textosSeccion}>
        <Text style={estilos.tituloSeccion}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.subtituloSeccion}>{subtitulo}</Text> : null}
      </View>
      {accion ? (
        <Pressable onPress={accion.alPresionar} hitSlop={10} accessibilityRole="button">
          <Text style={estilos.enlace}>{accion.texto}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ErrorSeccion({ texto, alReintentar, estilos, colores }) {
  return (
    <View style={estilos.errorSeccion}>
      <Ionicons name="cloud-offline-outline" size={20} color={colores.textoTenue} />
      <Text style={estilos.textoErrorSeccion}>{texto}</Text>
      <Pressable onPress={alReintentar} hitSlop={8} accessibilityRole="button">
        <Text style={estilos.enlace}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function PanelOperativoEquipo() {
  const navigation = useNavigation();
  const { colores, isotipo, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const { equipo, tienePermiso } = useSesion();
  const manejarError = useErrorEquipo();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const token = equipo?.token;
  const esTitular = equipo?.esTitular === true;
  const esAdministrador = equipo?.esAdministrador === true;
  const puedeConsultar = esTitular || tienePermiso('ver_productos');
  const puedeVerFidelizacion = esTitular || tienePermiso('ver_reportes');

  const [panel, setPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const vigente = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!token) return;
    const consulta = ++vigente.current;
    try {
      const datos = await leerPanel(token);
      if (!montado.current || consulta !== vigente.current) return;
      setPanel(datos);
      setError('');
    } catch (problema) {
      if (!montado.current || consulta !== vigente.current) return;
      if (problema?.estado === 401) {
        manejarError(problema);
        return;
      }
      setError(mensajeDeError(problema, 'No pudimos traer el resumen operativo del día.'));
    } finally {
      if (montado.current && consulta === vigente.current) {
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

  const indicadoresVisibles = useMemo(() => {
    if (!panel?.indicadores?.length) return [];
    return panel.indicadores.filter((indicador) => {
      if (esTitular) return true;
      const permiso = permisoRequeridoIndicador(indicador.clave);
      return permiso ? tienePermiso(permiso) : true;
    });
  }, [panel, esTitular, tienePermiso]);

  const avisosVisibles = useMemo(() => {
    if (!panel?.avisos?.length) return [];
    return panel.avisos.filter((aviso) => {
      if (esTitular) return true;
      if (aviso.destino === 'WEB') {
        return PERMISOS_AVISO_WEB.some((permiso) => tienePermiso(permiso));
      }
      const destino = DESTINOS_AVISO[aviso.destino];
      if (!destino) return false;
      return destino.permisos.some((permiso) => tienePermiso(permiso));
    });
  }, [panel, esTitular, tienePermiso]);

  const fidelizacionVisible = puedeVerFidelizacion ? panel?.fidelizacion ?? null : null;

  const gruposOperativos = useMemo(
    () =>
      GRUPOS_TAREAS_EQUIPO.map((grupo) => ({
        ...grupo,
        tareas: grupo.tareas.filter((tarea) => esTitular || tienePermiso(tarea.permiso)),
      })).filter((grupo) => grupo.tareas.length > 0),
    [esTitular, tienePermiso]
  );

  const abrirAviso = (aviso) => {
    const destino = DESTINOS_AVISO[aviso.destino];
    if (destino && (esTitular || tienePermiso(destino.permisos[0]))) {
      navigation.navigate(destino.pantalla);
      return;
    }
    avisar(
      'advertencia',
      'Se gestiona en la web',
      `${aviso.texto} Esta tarea se resuelve desde el sistema web del local.`
    );
  };

  const etiquetaRol = esTitular
    ? 'TITULAR'
    : esAdministrador
    ? 'ADMINISTRADOR'
    : (equipo?.perfil ?? 'EQUIPO').toUpperCase();

  const saludo = `Hola, ${primerNombre(equipo?.nombre, 'equipo')}`;

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
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
        <View style={estilos.encabezado}>
          <View style={estilos.saludo}>
            <Image source={isotipo} style={estilos.isotipo} resizeMode="contain" />
            <View style={estilos.textosSeccion}>
              <Text style={estilos.titulo} numberOfLines={1}>
                {saludo}
              </Text>
              <View style={estilos.filaSubtituloEquipo}>
                <View style={[estilos.insigniaRol, esTitular && estilos.insigniaTitular]}>
                  <Text style={[estilos.textoInsigniaRol, esTitular && estilos.textoInsigniaTitular]} numberOfLines={1}>
                    {etiquetaRol}
                  </Text>
                </View>
                <Text style={estilos.subtitulo} numberOfLines={1}>
                  Cafeto · Las Lomitas
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            style={estilos.botonRedondo}
            onPress={cambiarTema}
            accessibilityRole="button"
            accessibilityLabel="Cambiar entre tema claro y oscuro"
          >
            <Ionicons name="contrast" size={20} color={colores.texto} />
          </Pressable>
        </View>

        {puedeConsultar ? (
          <View style={estilos.filaBuscadorOperativo}>
            <Pressable
              style={({ pressed }) => [estilos.buscadorOperativo, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('ConsultaProducto')}
              accessibilityRole="search"
              accessibilityLabel="Consultar precio, stock o vencimiento de un producto"
            >
              <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
              <Text style={estilos.textoBuscador} numberOfLines={1}>
                Consultar stock, precio o código...
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [estilos.botonEscanearRapido, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('ConsultaProducto', { escanear: Date.now() })}
              accessibilityRole="button"
              accessibilityLabel="Escanear código de barras"
            >
              <Ionicons name="scan-outline" size={22} color={colores.textoSobreMarca} />
            </Pressable>
          </View>
        ) : null}

        {error !== '' && panel ? (
          <View style={estilos.avisoRecarga}>
            <Ionicons name="warning-outline" size={18} color={colores.marca} />
            <Text style={estilos.textoAvisoRecarga}>
              Mostrando los últimos datos leídos. Deslizá hacia abajo para reintentar.
            </Text>
          </View>
        ) : null}

        {cargando && !panel ? (
          <View style={estilos.seccion}>
            <Esqueleto estilo={estilos.esqueletoPanel} />
            <Esqueleto estilo={estilos.filaEsqueletoBeneficio} />
          </View>
        ) : error !== '' && !panel ? (
          <ErrorSeccion
            texto={error}
            alReintentar={() => {
              setCargando(true);
              setError('');
              cargar();
            }}
            estilos={estilos}
            colores={colores}
          />
        ) : (
          <>
            {indicadoresVisibles.length > 0 ? (
              <View style={estilos.seccion}>
                <EncabezadoSeccion
                  icono="stats-chart-outline"
                  titulo="Resumen de hoy"
                  subtitulo={esTitular ? 'Indicadores generales del local' : 'Indicadores habilitados en tu perfil'}
                  estilos={estilos}
                  colores={colores}
                />
                <View style={estilos.grillaIndicadores}>
                  {indicadoresVisibles.map((indicador) => (
                    <View
                      key={indicador.clave}
                      style={[
                        estilos.tarjetaIndicador,
                        indicadoresVisibles.length === 1 && estilos.tarjetaIndicadorCompleta,
                      ]}
                    >
                      <Text style={estilos.tituloIndicador}>{indicador.titulo}</Text>
                      <Text style={estilos.valorIndicador}>
                        {indicador.formato === 'PESOS'
                          ? formatearPrecio(indicador.valor)
                          : formatearNumero(indicador.valor)}
                      </Text>
                      {indicador.detalle ? <Text style={estilos.detalleIndicador}>{indicador.detalle}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {avisosVisibles.length > 0 ? (
              <View style={estilos.seccion}>
                <EncabezadoSeccion
                  icono="notifications-outline"
                  titulo="Para atender ahora"
                  subtitulo={`${avisosVisibles.length} ${avisosVisibles.length === 1 ? 'pendiente' : 'pendientes'} en seguimiento`}
                  estilos={estilos}
                  colores={colores}
                />
                <View style={estilos.columnaAvisos}>
                  {avisosVisibles.map((aviso) => (
                    <Pressable
                      key={aviso.clave}
                      style={({ pressed }) => [
                        estilos.avisoOperativo,
                        aviso.tipo === 'error' && estilos.avisoOperativoCritico,
                        pressed && estilos.presionado,
                      ]}
                      onPress={() => abrirAviso(aviso)}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={
                          aviso.destino === 'WEB'
                            ? 'desktop-outline'
                            : aviso.tipo === 'error'
                            ? 'alert-circle'
                            : 'warning-outline'
                        }
                        size={20}
                        color={aviso.tipo === 'error' ? colores.peligro : colores.marca}
                      />
                      <Text style={estilos.textoAvisoOperativo}>{aviso.texto}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={estilos.tarjetaEstadoTurno}>
                <View style={estilos.iconoEstadoTurno}>
                  <Ionicons name="checkmark-circle" size={22} color={colores.exito} />
                </View>
                <View style={estilos.textosSeccion}>
                  <Text style={estilos.tituloBeneficio}>Todo en orden por ahora</Text>
                  <Text style={estilos.detalle}>No hay avisos ni alertas urgentes para tu sector en este momento.</Text>
                </View>
              </View>
            )}

            {fidelizacionVisible ? (
              <View style={estilos.seccion}>
                <EncabezadoSeccion
                  icono="gift-outline"
                  titulo="Club y beneficios"
                  subtitulo={fidelizacionVisible.periodo}
                  estilos={estilos}
                  colores={colores}
                />
                <View style={estilos.tarjetaFidelizacion}>
                  {(fidelizacionVisible.clientesActivos !== null ||
                    fidelizacionVisible.canjesPeriodo !== null ||
                    fidelizacionVisible.puntosEmitidosPeriodo !== null) && (
                    <View style={estilos.filaMetricasClub}>
                      {fidelizacionVisible.clientesActivos !== null ? (
                        <View style={estilos.metricaClub}>
                          <Text style={estilos.valorMetricaClub}>
                            {formatearNumero(fidelizacionVisible.clientesActivos)}
                          </Text>
                          <Text style={estilos.etiquetaMetricaClub}>Clientes activos</Text>
                        </View>
                      ) : null}
                      {fidelizacionVisible.canjesPeriodo !== null ? (
                        <View style={estilos.metricaClub}>
                          <Text style={estilos.valorMetricaClub}>
                            {formatearNumero(fidelizacionVisible.canjesPeriodo)}
                          </Text>
                          <Text style={estilos.etiquetaMetricaClub}>Canjes</Text>
                        </View>
                      ) : null}
                      {fidelizacionVisible.puntosEmitidosPeriodo !== null ? (
                        <View style={estilos.metricaClub}>
                          <Text style={estilos.valorMetricaClub}>
                            {formatearNumero(fidelizacionVisible.puntosEmitidosPeriodo)}
                          </Text>
                          <Text style={estilos.etiquetaMetricaClub}>Pts emitidos</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {fidelizacionVisible.beneficiosMasUsados.length > 0 ? (
                    <View style={estilos.listaRankingClub}>
                      <Text style={estilos.subtituloRankingClub}>MÁS ELEGIDOS</Text>
                      {fidelizacionVisible.beneficiosMasUsados.slice(0, 3).map((item, indice) => (
                        <View
                          key={item.id}
                          style={[estilos.filaRankingClub, indice > 0 && estilos.divisorArriba]}
                        >
                          <View style={estilos.posicionRanking}>
                            <Text style={estilos.textoPosicionRanking}>{indice + 1}</Text>
                          </View>
                          <View style={estilos.textosSeccion}>
                            <Text style={estilos.tituloBeneficio} numberOfLines={1}>
                              {item.titulo}
                            </Text>
                            <Text style={estilos.detalle}>
                              {[item.tipo === 'CANJEABLE' ? 'Canjeable' : 'Automático', item.categoria]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                          <Text style={estilos.usosRanking}>{formatearNumero(item.usos)} usos</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={estilos.seccion}>
          <EncabezadoSeccion
            icono="briefcase-outline"
            titulo="Tareas operativas"
            subtitulo="Operaciones habilitadas según tus permisos"
            estilos={estilos}
            colores={colores}
          />
          {gruposOperativos.length > 0 ? (
            <View style={estilos.columnaGruposOperativos}>
              {gruposOperativos.map((grupo) => (
                <View key={grupo.clave} style={estilos.grupoOperativo}>
                  <Text style={estilos.tituloGrupoOperativo}>{grupo.titulo}</Text>
                  <View style={estilos.listaGrupoOperativo}>
                    {grupo.tareas.map((tarea, indice) => (
                      <Pressable
                        key={tarea.clave}
                        style={({ pressed }) => [
                          estilos.filaTareaOperativa,
                          indice > 0 && estilos.divisorArriba,
                          pressed && estilos.presionado,
                        ]}
                        onPress={() => navigation.navigate(tarea.pantalla)}
                        accessibilityRole="button"
                        accessibilityLabel={tarea.titulo}
                      >
                        <View style={estilos.iconoTareaOperativa}>
                          <Ionicons name={tarea.icono} size={20} color={colores.marca} />
                        </View>
                        <View style={estilos.textosSeccion}>
                          <Text style={estilos.tituloTareaOperativa}>{tarea.titulo}</Text>
                          <Text style={estilos.detalle}>{tarea.detalle}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={estilos.tarjetaSinPermisos}>
              <Ionicons name="lock-closed-outline" size={24} color={colores.textoTenue} />
              <Text style={estilos.textoSinPermisos}>
                Tu perfil ({equipo?.perfil ?? 'Equipo'}) no tiene tareas operativas asignadas en el celular todavía. Si
                necesitás habilitar alguna, consultalo con el administrador.
              </Text>
            </View>
          )}
        </View>

        <CuadroAyuda
          id="panel-equipo-web"
          cerrable
          icono="desktop-outline"
          tipo="consejo"
          titulo="Lo pesado, en la web"
          texto="Ventas y caja, armar órdenes de compra, pagos, precios, productos, beneficios, usuarios y reportes se hacen en la versión web."
        />

        <Pressable style={estilos.ayuda} onPress={() => navigation.navigate('Ayuda')} accessibilityRole="button">
          <Ionicons name="help-circle-outline" size={18} color={colores.textoSecundario} />
          <Text style={estilos.textoAyuda}>
            ¿Dudas con tu sesión o permisos? <Text style={estilos.enlace}>Ver ayuda del equipo</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InicioCatalogo() {
  const navigation = useNavigation();
  const { colores, isotipo, cambiarTema } = useTema();
  const { rol, usuario, nombreVisible } = useSesion();
  const { cuenta, cargando: cargandoCuenta, actualizar: actualizarCuenta } = useCuentaCliente();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const [destacados, setDestacados] = useState(CARGANDO);
  const [secciones, setSecciones] = useState({ CAFETERIA: CARGANDO, MINISUPER: CARGANDO });
  const [beneficios, setBeneficios] = useState(CARGANDO);
  const [categorias, setCategorias] = useState([]);
  const [actualizando, setActualizando] = useState(false);
  const [elegido, setElegido] = useState(null);
  const consulta = useRef(0);
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    const actual = ++consulta.current;
    const resultados = await Promise.allSettled([
      listarDestacados(),
      ...SECCIONES.map((seccion) => listarProductos({ seccion: seccion.clave })),
      listarBeneficios(),
    ]);
    if (!montado.current || actual !== consulta.current) return;
    setDestacados((anterior) => combinar(anterior, resultados[0], 'No pudimos traer las ofertas.'));
    setSecciones((anteriores) => {
      const nuevas = {};
      SECCIONES.forEach((seccion, posicion) => {
        nuevas[seccion.clave] = combinar(
          anteriores[seccion.clave],
          resultados[posicion + 1],
          `No pudimos traer los productos de ${seccion.nombre}.`
        );
      });
      return nuevas;
    });
    const respuestaBeneficios = resultados[SECCIONES.length + 1];
    setBeneficios((anterior) => combinar(anterior, respuestaBeneficios, 'No pudimos traer los beneficios.'));
    if (respuestaBeneficios.status === 'fulfilled') setCategorias(respuestaBeneficios.value.categorias);
    setActualizando(false);
  }, []);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  const actualizar = () => {
    setActualizando(true);
    cargar();
    if (rol === 'cliente') actualizarCuenta();
  };

  const reintentar = () => {
    setDestacados((anterior) => (anterior.estado === 'error' ? CARGANDO : anterior));
    setSecciones((anteriores) => {
      const nuevas = { ...anteriores };
      SECCIONES.forEach((seccion) => {
        if (nuevas[seccion.clave].estado === 'error') nuevas[seccion.clave] = CARGANDO;
      });
      return nuevas;
    });
    setBeneficios((anterior) => (anterior.estado === 'error' ? CARGANDO : anterior));
    cargar();
  };

  const verSeccion = (clave) => navigation.navigate('Productos', { seccion: clave, pedido: Date.now() });
  const buscar = () => navigation.navigate('Productos', { enfocar: true, pedido: Date.now() });
  const abrirAyuda = () => navigation.navigate('Ayuda');

  const orden = ordenDeCategorias(cuenta?.categorias?.length ? cuenta.categorias : categorias);
  const puntos = resumirPuntos(cuenta, orden);
  const saludo =
    rol === 'cliente'
      ? `Hola, ${primerNombre(nombreVisible || usuario?.displayName, 'cliente')}`
      : '¡Bienvenido a Cafeto!';
  const desactualizado =
    !actualizando &&
    [destacados, beneficios, ...Object.values(secciones)].some((parte) => parte.estado === 'listo' && parte.error !== '');

  const beneficiosVisibles = ordenarBeneficios(beneficios.datos, orden).slice(0, MAXIMO_BENEFICIOS);

  const renderTarjetaRol = () => {
    if (rol === 'cliente') {
      if (!cuenta) {
        return cargandoCuenta ? <Esqueleto estilo={estilos.esqueletoPuntos} /> : <AvisoCuentaCliente />;
      }
      return (
        <View style={estilos.tarjetaPuntos}>
          <View style={estilos.filaEntre}>
            <View style={[estilos.chipCategoria, { backgroundColor: coloresCategoria[puntos.categoria] ?? colores.marca }]}>
              <Ionicons name="star" size={12} color="#161616" />
              <Text style={estilos.textoChipCategoria}>{puntos.categoria.toUpperCase()}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('MisPuntos')} hitSlop={10}>
              <Text style={estilos.enlace}>Ver mis puntos</Text>
            </Pressable>
          </View>
          <View style={estilos.filaPuntos}>
            <Text style={estilos.puntos}>{formatearNumero(puntos.disponibles)}</Text>
            <Text style={estilos.textoPuntos}>puntos para canjear</Text>
          </View>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${puntos.avance}%` }]} />
          </View>
          <Text style={estilos.detalle}>
            {puntos.proxima
              ? `Te faltan ${formatearNumero(puntos.faltan)} puntos para ser ${puntos.proxima}.`
              : 'Ya estás en la categoría más alta.'}
          </Text>
          <View style={estilos.acciones}>
            <Pressable
              style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('MiQR')}
            >
              <Ionicons name="qr-code-outline" size={18} color={colores.textoSobreMarca} />
              <Text style={estilos.textoBotonPrincipal}>Mi QR</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
              onPress={() => navigation.navigate('Beneficios')}
            >
              <Ionicons name="gift-outline" size={18} color={colores.texto} />
              <Text style={estilos.textoBotonSecundario}>Canjear</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={estilos.tarjetaInvitado}>
        <View style={estilos.filaInvitado}>
          <View style={estilos.textosSeccion}>
            <Text style={estilos.tituloInvitado}>Cada compra suma</Text>
            <Text style={estilos.textoInvitado}>
              Creá tu cuenta gratis, mostrá tu QR en la caja y canjeá tus puntos por productos.
            </Text>
          </View>
          <View style={estilos.regalo}>
            <Ionicons name="gift" size={30} color={colores.textoSobreMarca} />
          </View>
        </View>
        <View style={estilos.acciones}>
          <Pressable
            style={({ pressed }) => [estilos.botonPrincipal, pressed && estilos.presionado]}
            onPress={() => navigation.navigate('Registro')}
          >
            <Text style={estilos.textoBotonPrincipal}>Crear cuenta</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={estilos.textoBotonSecundario}>Ya tengo cuenta</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSeccion = (seccion) => {
    const parte = secciones[seccion.clave];
    return (
      <View key={seccion.clave} style={estilos.seccion}>
        <EncabezadoSeccion
          icono={seccion.icono}
          titulo={seccion.nombre}
          subtitulo={DESCRIPCION_SECCION[seccion.clave]}
          accion={{ texto: 'Ver todo', alPresionar: () => verSeccion(seccion.clave) }}
          estilos={estilos}
          colores={colores}
        />
        {parte.estado === 'cargando' ? (
          <View style={estilos.filaEsqueleto}>
            <Esqueleto estilo={estilos.tarjetaEsqueleto} />
            <Esqueleto estilo={estilos.tarjetaEsqueleto} />
            <Esqueleto estilo={estilos.tarjetaEsqueleto} />
          </View>
        ) : parte.estado === 'error' ? (
          <ErrorSeccion texto={parte.error} alReintentar={reintentar} estilos={estilos} colores={colores} />
        ) : parte.datos.length === 0 ? (
          <Text style={estilos.vacioSeccion}>Pronto vas a ver productos acá.</Text>
        ) : (
          <FlatList
            horizontal
            data={disponiblesPrimero(parte.datos)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TarjetaProducto producto={item} alPresionar={setElegido} estilo={estilos.tarjetaHorizontal} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.listaHorizontal}
            ListFooterComponent={
              <Pressable
                style={({ pressed }) => [estilos.verMas, pressed && estilos.presionado]}
                onPress={() => verSeccion(seccion.clave)}
                accessibilityRole="button"
                accessibilityLabel={`Ver todo ${seccion.nombre}`}
              >
                <Ionicons name="arrow-forward-circle-outline" size={30} color={colores.marca} />
                <Text style={estilos.textoVerMas}>Ver todo</Text>
              </Pressable>
            }
          />
        )}
      </View>
    );
  };

  const renderBeneficios = () => {
    const titulo = rol === 'cliente' ? 'Tus beneficios' : 'Beneficios por registrarte';
    const subtitulo =
      rol === 'cliente'
        ? `Sos ${puntos.categoria}. Mirá qué podés canjear.`
        : 'Apenas creás tu cuenta empezás a sumar.';

    return (
      <View style={estilos.seccion}>
        <EncabezadoSeccion
          icono="gift-outline"
          titulo={titulo}
          subtitulo={subtitulo}
          accion={{ texto: 'Ver todos', alPresionar: () => navigation.navigate('Beneficios') }}
          estilos={estilos}
          colores={colores}
        />
        {beneficios.estado === 'cargando' ? (
          <>
            <Esqueleto estilo={estilos.filaEsqueletoBeneficio} />
            <Esqueleto estilo={estilos.filaEsqueletoBeneficio} />
          </>
        ) : beneficios.estado === 'error' ? (
          <ErrorSeccion texto={beneficios.error} alReintentar={reintentar} estilos={estilos} colores={colores} />
        ) : (
          <View style={estilos.listaBeneficios}>
            {beneficiosVisibles.map((beneficio, posicion) => {
              const desbloqueado = rol === 'cliente' && alcanzaCategoria(puntos.categoria, beneficio.categoria, orden);
              return (
                <View key={beneficio.id} style={[estilos.filaBeneficio, posicion > 0 && estilos.divisorArriba]}>
                  <View style={estilos.iconoBeneficio}>
                    <Ionicons name={iconoSeguro(beneficio.icono, 'gift-outline')} size={18} color={colores.marca} />
                  </View>
                  <View style={estilos.textosSeccion}>
                    <Text style={estilos.tituloBeneficio}>{beneficio.titulo}</Text>
                    <Text style={estilos.detalle}>
                      {beneficio.tipo === 'CANJEABLE'
                        ? `${formatearNumero(beneficio.puntos)} pts · desde ${beneficio.categoria}`
                        : `${beneficio.detalle || 'Automático'} · desde ${beneficio.categoria}`}
                    </Text>
                  </View>
                  {desbloqueado ? (
                    <Ionicons name="checkmark-circle" size={20} color={colores.exito} />
                  ) : (
                    <Ionicons name="lock-closed" size={18} color={colores.textoTenue} />
                  )}
                </View>
              );
            })}
            {beneficiosVisibles.length === 0 && (
              <Text style={[estilos.vacioSeccion, estilos.vacioBeneficios]}>Pronto vas a ver beneficios acá.</Text>
            )}
          </View>
        )}
        {rol === 'invitado' && (
          <Pressable
            style={({ pressed }) => [estilos.botonPrincipal, estilos.botonAncho, pressed && estilos.presionado]}
            onPress={() => navigation.navigate('Registro')}
          >
            <Ionicons name="lock-open-outline" size={18} color={colores.textoSobreMarca} />
            <Text style={estilos.textoBotonPrincipal}>Crear mi cuenta gratis</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={actualizando} onRefresh={actualizar} tintColor={colores.marca} colors={[colores.marca]} />
        }
      >
        <View style={estilos.encabezado}>
          <View style={estilos.saludo}>
            <Image source={isotipo} style={estilos.isotipo} resizeMode="contain" />
            <View style={estilos.textosSeccion}>
              <Text style={estilos.titulo} numberOfLines={1}>
                {saludo}
              </Text>
              <Text style={estilos.subtitulo}>Cafeto · Las Lomitas</Text>
            </View>
          </View>
          <Pressable
            style={estilos.botonRedondo}
            onPress={cambiarTema}
            accessibilityRole="button"
            accessibilityLabel="Cambiar entre tema claro y oscuro"
          >
            <Ionicons name="contrast" size={20} color={colores.texto} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [estilos.buscador, pressed && estilos.presionado]}
          onPress={buscar}
          accessibilityRole="search"
          accessibilityLabel="Buscar productos"
        >
          <Ionicons name="search-outline" size={20} color={colores.textoSecundario} />
          <Text style={estilos.textoBuscador}>Buscar café, combos, bebidas...</Text>
        </Pressable>

        {desactualizado ? (
          <View style={estilos.avisoRecarga}>
            <Ionicons name="warning-outline" size={18} color={colores.marca} />
            <Text style={estilos.textoAvisoRecarga}>
              No pudimos actualizar todo. Deslizá hacia abajo para reintentar.
            </Text>
          </View>
        ) : null}

        {renderTarjetaRol()}

        {(destacados.estado !== 'listo' || destacados.datos.length > 0) && (
          <View style={estilos.seccion}>
            <EncabezadoSeccion
              icono="flame-outline"
              titulo="Ofertas y combos del día"
              subtitulo="Combos para el desayuno y la merienda, y rebajas de hoy"
              estilos={estilos}
              colores={colores}
            />
            {destacados.estado === 'cargando' ? (
              <Esqueleto estilo={estilos.carruselEsqueleto} />
            ) : destacados.estado === 'error' ? (
              <ErrorSeccion texto={destacados.error} alReintentar={reintentar} estilos={estilos} colores={colores} />
            ) : (
              <CarruselOfertas productos={destacados.datos} alElegir={setElegido} />
            )}
          </View>
        )}

        {SECCIONES.map(renderSeccion)}

        {renderBeneficios()}

        {rol === 'invitado' && (
          <View style={estilos.seccion}>
            <EncabezadoSeccion titulo="¿Cómo funciona?" estilos={estilos} colores={colores} />
            <View style={estilos.listaBeneficios}>
              {PASOS.map((paso, posicion) => (
                <View key={paso.titulo} style={[estilos.filaBeneficio, posicion > 0 && estilos.divisorArriba]}>
                  <View style={estilos.numeroPaso}>
                    <Text style={estilos.textoNumeroPaso}>{posicion + 1}</Text>
                  </View>
                  <View style={estilos.textosSeccion}>
                    <Text style={estilos.tituloBeneficio}>{paso.titulo}</Text>
                    <Text style={estilos.detalle}>{paso.texto}</Text>
                  </View>
                  <Ionicons name={paso.icono} size={20} color={colores.textoSecundario} />
                </View>
              ))}
            </View>
          </View>
        )}

        <Pressable style={estilos.ayuda} onPress={abrirAyuda} accessibilityRole="button">
          <Ionicons name="help-circle-outline" size={18} color={colores.textoSecundario} />
          <Text style={estilos.textoAyuda}>
            {rol === 'invitado' ? '¿Tenés problemas para ingresar? ' : '¿Necesitás ayuda? '}
            <Text style={estilos.enlace}>Mirá las soluciones</Text>
          </Text>
        </Pressable>
      </ScrollView>

      <DetalleProducto producto={elegido} alCerrar={() => setElegido(null)} />
    </SafeAreaView>
  );
}

export default function Inicio() {
  const { rol } = useSesion();
  return rol === 'equipo' ? <PanelOperativoEquipo /> : <InicioCatalogo />;
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 20, paddingBottom: 32, gap: 22 },
    encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    saludo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    isotipo: { width: 44, height: 44 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 32, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textoSecundario, flexShrink: 1 },
    filaSubtituloEquipo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    insigniaRol: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    insigniaTitular: {
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    textoInsigniaRol: {
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      letterSpacing: 1,
      color: c.textoSecundario,
    },
    textoInsigniaTitular: {
      color: c.marca,
    },
    botonRedondo: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buscador: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 50,
      paddingHorizontal: 16,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      marginTop: -6,
    },
    filaBuscadorOperativo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: -6,
    },
    buscadorOperativo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 50,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    botonEscanearRapido: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoBuscador: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14.5, color: c.textoTenue },
    avisoRecarga: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.fondoAdvertencia,
    },
    textoAvisoRecarga: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: c.texto },
    presionado: { opacity: 0.85 },
    filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tarjetaPuntos: {
      gap: 12,
      padding: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    chipCategoria: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    textoChipCategoria: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#161616' },
    filaPuntos: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    puntos: { fontFamily: 'Inter_700Bold', fontSize: 40, color: c.texto },
    textoPuntos: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    barra: { height: 6, borderRadius: 3, backgroundColor: c.bordeAdvertencia, overflow: 'hidden' },
    barraRelleno: { height: 6, borderRadius: 3, backgroundColor: c.marca },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 17, color: c.textoSecundario },
    acciones: { flexDirection: 'row', gap: 10 },
    botonPrincipal: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      height: 48,
      borderRadius: 12,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    botonAncho: { flex: 0, marginTop: 4 },
    textoBotonPrincipal: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.textoSobreMarca },
    botonSecundario: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoBotonSecundario: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    tarjetaInvitado: {
      gap: 16,
      padding: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    filaInvitado: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    tituloInvitado: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    textoInvitado: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: c.textoSecundario },
    regalo: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    grillaIndicadores: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    tarjetaIndicador: {
      flexGrow: 1,
      flexBasis: '46%',
      gap: 4,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.marcaSuave,
    },
    tarjetaIndicadorCompleta: {
      flexBasis: '100%',
    },
    tituloIndicador: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: c.textoSecundario },
    valorIndicador: { fontFamily: 'Inter_700Bold', fontSize: 24, color: c.texto },
    detalleIndicador: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: c.textoSecundario },
    columnaAvisos: { gap: 10 },
    avisoOperativo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.fondoAdvertencia,
    },
    avisoOperativoCritico: {
      borderColor: c.bordePeligro,
      backgroundColor: c.fondoPeligro,
    },
    textoAvisoOperativo: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13.5, lineHeight: 19, color: c.texto },
    tarjetaEstadoTurno: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    iconoEstadoTurno: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.fondoExito,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tarjetaFidelizacion: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      overflow: 'hidden',
    },
    filaMetricasClub: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      backgroundColor: c.marcaSuave,
      borderBottomWidth: 1,
      borderBottomColor: c.divisor,
    },
    metricaClub: { flex: 1, alignItems: 'center', gap: 2 },
    valorMetricaClub: { fontFamily: 'Inter_700Bold', fontSize: 20, color: c.texto },
    etiquetaMetricaClub: { fontFamily: 'Inter_500Medium', fontSize: 11.5, color: c.textoSecundario, textAlign: 'center' },
    listaRankingClub: { paddingVertical: 4 },
    subtituloRankingClub: {
      fontFamily: 'Inter_700Bold',
      fontSize: 10.5,
      letterSpacing: 1.5,
      color: c.textoTenue,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 4,
    },
    filaRankingClub: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    posicionRanking: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoPosicionRanking: { fontFamily: 'Inter_700Bold', fontSize: 12.5, color: c.marca },
    usosRanking: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.textoSecundario },
    columnaGruposOperativos: {
      gap: 16,
    },
    grupoOperativo: {
      gap: 8,
    },
    tituloGrupoOperativo: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11.5,
      letterSpacing: 1.6,
      color: c.textoSecundario,
      paddingHorizontal: 2,
    },
    listaGrupoOperativo: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      overflow: 'hidden',
    },
    filaTareaOperativa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    iconoTareaOperativa: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tituloTareaOperativa: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: c.texto,
    },
    tarjetaSinPermisos: {
      alignItems: 'center',
      gap: 10,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoSinPermisos: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textoSecundario,
      textAlign: 'center',
    },
    seccion: { gap: 12 },
    encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconoSeccion: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textosSeccion: { flex: 1, gap: 2 },
    tituloSeccion: { fontFamily: 'Inter_700Bold', fontSize: 17, color: c.texto },
    subtituloSeccion: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoSecundario },
    enlace: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: c.marca },
    carruselEsqueleto: { height: 196, borderRadius: 20 },
    esqueletoPuntos: { height: 200, borderRadius: 20 },
    esqueletoPanel: { height: 116, borderRadius: 18 },
    filaEsqueleto: { flexDirection: 'row', gap: 12, overflow: 'hidden' },
    tarjetaEsqueleto: { width: 156, height: 214 },
    filaEsqueletoBeneficio: { height: 64 },
    errorSeccion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoErrorSeccion: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: c.textoSecundario },
    vacioSeccion: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.textoTenue },
    vacioBeneficios: { padding: 14 },
    listaHorizontal: { gap: 12, paddingRight: 4 },
    tarjetaHorizontal: { width: 156 },
    verMas: {
      flex: 1,
      width: 96,
      minHeight: 200,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borde,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    textoVerMas: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    listaBeneficios: { borderRadius: 16, borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie },
    filaBeneficio: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    divisorArriba: { borderTopWidth: 1, borderTopColor: c.divisor },
    iconoBeneficio: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tituloBeneficio: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    numeroPaso: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textoNumeroPaso: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.textoSobreMarca },
    ayuda: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
    textoAyuda: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: c.textoSecundario },
  });
}
