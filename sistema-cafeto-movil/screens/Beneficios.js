import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTema } from '../src/tema/TemaContext';
import { useSesion } from '../src/sesion/SesionContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { mensajeDeError } from '../src/api/cliente';
import { listarBeneficios } from '../src/api/catalogo';
import { coloresCategoria } from '../src/datos/ejemplo';
import { useCuentaCliente } from '../src/cliente/CuentaClienteContext';
import { formatearNumero } from '../src/utilidades/formato';
import { alcanzaCategoria, ordenDeCategorias, ordenarBeneficios, resumirPuntos } from '../src/utilidades/puntos';
import CuadroAyuda from '../src/componentes/CuadroAyuda';
import EstadoVacio from '../src/componentes/EstadoVacio';
import Esqueleto from '../src/componentes/Esqueleto';
import { iconoSeguro } from '../src/componentes/iconos';

const FILTROS = [
  { clave: 'TODOS', texto: 'Todos' },
  { clave: 'AUTOMATICO', texto: 'Automáticos' },
  { clave: 'CANJEABLE', texto: 'Canjeables' },
];

export default function Beneficios() {
  const navigation = useNavigation();
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { rol } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const [beneficios, setBeneficios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const montado = useRef(true);
  const ultimaConsulta = useRef(0);

  const esCliente = rol === 'cliente';
  const { cuenta } = useCuentaCliente();
  const orden = ordenDeCategorias(cuenta?.categorias?.length ? cuenta.categorias : categorias);
  const puntos = resumirPuntos(cuenta, orden);

  const cargar = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    try {
      const respuesta = await listarBeneficios();
      if (!montado.current || consulta !== ultimaConsulta.current) return;
      setBeneficios(respuesta.resultados);
      setCategorias(respuesta.categorias);
      setError('');
    } catch (problema) {
      if (!montado.current || consulta !== ultimaConsulta.current) return;
      setError(mensajeDeError(problema, 'No pudimos traer los beneficios.'));
    } finally {
      if (montado.current && consulta === ultimaConsulta.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
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
  };

  const visibles = ordenarBeneficios(beneficios, orden).filter((beneficio) => filtro === 'TODOS' || beneficio.tipo === filtro);

  const pedirCuenta = () => {
    avisar('advertencia', 'Necesitás una cuenta', 'Creá tu cuenta gratis para sumar puntos y canjear beneficios.', [
      { texto: 'Ahora no', estilo: 'cancelar' },
      { texto: 'Crear cuenta', alPresionar: () => navigation.navigate('Registro') },
    ]);
  };

  const canjear = (beneficio) => {
    if (!esCliente) {
      pedirCuenta();
      return;
    }
    if (!alcanzaCategoria(puntos.categoria, beneficio.categoria, orden)) {
      avisar(
        'advertencia',
        `Es para ${beneficio.categoria}`,
        `Este beneficio se desbloquea cuando llegás a ${beneficio.categoria}. Seguí sumando con tu QR.`
      );
      return;
    }
    if (puntos.disponibles < beneficio.puntos) {
      avisar(
        'advertencia',
        'Te faltan puntos',
        `Necesitás ${formatearNumero(beneficio.puntos - puntos.disponibles)} puntos más para este canje.`
      );
      return;
    }
    avisar(
      'advertencia',
      `¿Canjear ${beneficio.titulo}?`,
      `Se descuentan ${formatearNumero(beneficio.puntos)} puntos cuando el cajero escanee tu QR en el mostrador.`,
      [
        { texto: 'Cancelar', estilo: 'cancelar' },
        {
          texto: 'Mostrar mi QR',
          alPresionar: () => navigation.navigate('MiQR', { beneficio: { titulo: beneficio.titulo, puntos: beneficio.puntos } }),
        },
      ]
    );
  };

  const renderDerecha = (beneficio, bloqueado, alcanza) => {
    if (!esCliente) return <Ionicons name="lock-closed" size={20} color={colores.textoTenue} />;
    if (bloqueado) return <Ionicons name="lock-closed-outline" size={20} color={colores.textoTenue} />;
    if (beneficio.tipo === 'AUTOMATICO') return <Text style={estilos.activo}>ACTIVO</Text>;
    return (
      <Pressable
        style={[estilos.boton, !alcanza && estilos.botonApagado]}
        onPress={() => canjear(beneficio)}
        accessibilityRole="button"
        accessibilityLabel={`Canjear ${beneficio.titulo}`}
      >
        <Text style={[estilos.botonTexto, !alcanza && estilos.textoApagado]}>
          {alcanza ? 'Canjear' : `Faltan ${formatearNumero(beneficio.puntos - puntos.disponibles)}`}
        </Text>
      </Pressable>
    );
  };

  const renderLista = () => {
    if (cargando) {
      return [0, 1, 2, 3].map((posicion) => <Esqueleto key={posicion} estilo={estilos.esqueleto} />);
    }
    if (error && beneficios.length === 0) {
      return (
        <EstadoVacio
          icono="cloud-offline-outline"
          titulo="No pudimos cargar los beneficios"
          texto={error}
          accion={{
            texto: 'Reintentar',
            alPresionar: () => {
              setCargando(true);
              cargar();
            },
          }}
        />
      );
    }
    if (visibles.length === 0) {
      return <EstadoVacio icono="gift-outline" titulo="Pronto vas a ver beneficios acá" />;
    }
    return visibles.map((beneficio) => {
      const bloqueado = !esCliente || !alcanzaCategoria(puntos.categoria, beneficio.categoria, orden);
      const alcanza = puntos.disponibles >= beneficio.puntos;
      return (
        <Pressable
          key={beneficio.id}
          style={[estilos.fila, bloqueado && estilos.filaBloqueada]}
          onPress={!esCliente || bloqueado ? () => canjear(beneficio) : undefined}
          disabled={esCliente && !bloqueado}
        >
          <View style={estilos.icono}>
            <Ionicons name={iconoSeguro(beneficio.icono, 'gift-outline')} size={20} color={colores.marca} />
          </View>
          <View style={estilos.textos}>
            <Text style={estilos.nombre}>{beneficio.titulo}</Text>
            <Text style={estilos.detalle}>
              {beneficio.tipo === 'CANJEABLE'
                ? `${formatearNumero(beneficio.puntos)} pts${beneficio.detalle ? ` · ${beneficio.detalle}` : ''}`
                : beneficio.detalle || 'Se aplica solo'}
            </Text>
            <View style={estilos.filaCategoria}>
              <View style={[estilos.punto, { backgroundColor: coloresCategoria[beneficio.categoria] ?? colores.borde }]} />
              <Text style={estilos.detalle}>Desde {beneficio.categoria}</Text>
            </View>
          </View>
          {renderDerecha(beneficio, bloqueado, alcanza)}
        </Pressable>
      );
    });
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={actualizando} onRefresh={actualizar} tintColor={colores.marca} colors={[colores.marca]} />
        }
      >
        <View>
          <Text style={estilos.titulo}>Beneficios</Text>
          <Text style={estilos.subtitulo}>
            {esCliente
              ? `Sos ${puntos.categoria} · ${formatearNumero(puntos.disponibles)} pts para canjear`
              : 'Creá tu cuenta y empezá a sumar puntos'}
          </Text>
        </View>

        {esCliente ? (
          <CuadroAyuda
            id="beneficios-como-canjear"
            cerrable
            tipo="consejo"
            icono="qr-code-outline"
            titulo="¿Cómo canjeo?"
            texto="Tocá «Canjear» y mostrá tu QR en la caja. El cajero confirma el canje y ahí se descuentan los puntos."
          />
        ) : (
          <Pressable style={estilos.aviso} onPress={() => navigation.navigate('Registro')} accessibilityRole="button">
            <Ionicons name="lock-closed" size={18} color={colores.marca} />
            <Text style={estilos.avisoTexto}>Mirá todos los beneficios. Para canjearlos necesitás tu cuenta.</Text>
            <Text style={estilos.avisoEnlace}>Crear cuenta</Text>
          </Pressable>
        )}

        {error !== '' && beneficios.length > 0 && !actualizando ? (
          <Text style={estilos.desactualizado}>No pudimos actualizar. Deslizá hacia abajo para reintentar.</Text>
        ) : null}

        <View style={estilos.filtros}>
          {FILTROS.map((opcion) => {
            const activo = filtro === opcion.clave;
            return (
              <Pressable
                key={opcion.clave}
                style={[estilos.chip, activo && estilos.chipActivo]}
                onPress={() => setFiltro(opcion.clave)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
              >
                <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{opcion.texto}</Text>
              </Pressable>
            );
          })}
        </View>

        {renderLista()}
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 20, paddingBottom: 32, gap: 14 },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 36, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    filtros: { flexDirection: 'row', gap: 8 },
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.superficieActiva,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    avisoTexto: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12.5, lineHeight: 17, color: c.texto },
    avisoEnlace: { fontFamily: 'Inter_700Bold', fontSize: 12.5, color: c.marca },
    desactualizado: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: c.textoTenue },
    chip: {
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActivo: { backgroundColor: c.marca, borderColor: c.marca },
    chipTexto: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    chipTextoActivo: { color: c.textoSobreMarca },
    esqueleto: { height: 84 },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 16,
      padding: 14,
    },
    filaBloqueada: { opacity: 0.6 },
    icono: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.superficieActiva,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textos: { flex: 1, gap: 3 },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoSecundario },
    filaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    punto: { width: 8, height: 8, borderRadius: 4 },
    activo: {
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      letterSpacing: 1,
      color: c.exito,
      backgroundColor: c.fondoExito,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    boton: { borderWidth: 1, borderColor: c.marca, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    botonApagado: { borderColor: c.borde },
    botonTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    textoApagado: { color: c.textoTenue },
  });
}
