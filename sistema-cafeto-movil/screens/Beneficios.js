import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import {
  beneficios as beneficiosIniciales,
  cliente,
  coloresCategoria,
  ordenCategorias,
} from '../src/datos/ejemplo';

const STORAGE_KEY = 'cafeto:beneficios_crud_v1';

const filtrosBase = [
  { clave: 'TODOS', texto: 'Todos' },
  { clave: 'AUTOMATICO', texto: 'Automáticos' },
  { clave: 'CANJEABLE', texto: 'Canjeables' },
];

const ICONOS_DISPONIBLES = [
  'pricetag-outline',
  'cafe-outline',
  'gift-outline',
  'restaurant-outline',
  'sparkles-outline',
];

export default function Beneficios() {
  const { colores } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const [filtro, setFiltro] = useState('TODOS');
  const [lista, setLista] = useState(beneficiosIniciales);
  const [modoCrud, setModoCrud] = useState(false);

  // Estados del formulario modal (atributos de BENEFICIOS + FK CATEGORIAS_FIDELIZACION)
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [categoria, setCategoria] = useState(ordenCategorias[0] || 'Bronze');
  const [tipo, setTipo] = useState('CANJEABLE'); // 'CANJEABLE' | 'AUTOMATICO'
  const [puntos, setPuntos] = useState('300');
  const [icono, setIcono] = useState('cafe-outline');

  const esInvitado = auth.currentUser?.isAnonymous ?? true;
  const nivelCliente = ordenCategorias.indexOf(cliente.categoria);

  // Cargar datos desde AsyncStorage al iniciar la vista
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const guardado = await AsyncStorage.getItem(STORAGE_KEY);
        if (guardado) {
          setLista(JSON.parse(guardado));
        } else {
          const inicialConControl = beneficiosIniciales.map((b, idx) => ({
            ...b,
            id_categoria: ordenCategorias.indexOf(b.categoria) + 1 || 1,
            borrado_logico: false,
            id: b.id ?? idx + 1,
          }));
          setLista(inicialConControl);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(inicialConControl));
        }
      } catch (e) {
        setLista(beneficiosIniciales);
      }
    };
    cargarDatos();
  }, []);

  const persistirLista = async (nuevaLista) => {
    setLista(nuevaLista);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaLista));
  };

  // En modo ABM se agrega el filtro para ver los dados de baja lógicamente
  const filtros = modoCrud
    ? [...filtrosBase, { clave: 'INACTIVOS', texto: 'Dados de baja' }]
    : filtrosBase;

  const visibles = lista.filter((b) => {
    const estaInactivo = Boolean(b.borrado_logico);
    if (filtro === 'INACTIVOS') return estaInactivo;
    if (estaInactivo) return false;
    return filtro === 'TODOS' || b.tipo === filtro;
  });

  const irARegistro = async () => {
    await AsyncStorage.setItem('cafeto:abrirRegistro', 'si');
    await signOut(auth);
  };

  const canjear = (beneficio) => {
    if (esInvitado) {
      avisar('advertencia', 'Necesitás una cuenta', 'Creá tu cuenta para sumar puntos y canjear beneficios.');
      return;
    }
    avisar('exito', '¡Canje listo!', `Mostrá tu QR en el mostrador para retirar: ${beneficio.titulo}.`);
  };

  // ALTA (Create)
  const abrirModalNuevo = () => {
    setEditandoId(null);
    setTitulo('');
    setDetalle('Retirás en el mostrador');
    setCategoria(ordenCategorias[0] || 'Bronze');
    setTipo('CANJEABLE');
    setPuntos('300');
    setIcono('cafe-outline');
    setModalVisible(true);
  };

  // MODIFICACIÓN (Update)
  const abrirModalEditar = (beneficio) => {
    setEditandoId(beneficio.id);
    setTitulo(beneficio.titulo);
    setDetalle(beneficio.detalle);
    setCategoria(beneficio.categoria);
    setTipo(beneficio.tipo);
    setPuntos(String(beneficio.puntos ?? 0));
    setIcono(beneficio.icono || 'cafe-outline');
    setModalVisible(true);
  };

  const guardarBeneficio = async () => {
    if (!titulo.trim()) {
      avisar('advertencia', 'Falta la descripción', 'Ingresá el nombre o descripción del beneficio.');
      return;
    }

    const puntosNum = tipo === 'AUTOMATICO' ? 0 : parseInt(puntos || '0', 10);
    if (Number.isNaN(puntosNum) || puntosNum < 0) {
      avisar('error', 'Puntos inválidos', 'Los puntos requeridos deben ser mayores o iguales a 0.');
      return;
    }

    const registro = {
      id: editandoId ?? Date.now(),
      id_categoria: ordenCategorias.indexOf(categoria) + 1, // FK a CATEGORIAS_FIDELIZACION
      categoria,
      titulo: titulo.trim(),
      detalle: detalle.trim() || (tipo === 'AUTOMATICO' ? 'Se aplica solo al pagar' : 'Retirás en el mostrador'),
      tipo,
      puntos: puntosNum,
      icono,
      borrado_logico: false,
      fecha_modificacion: new Date().toISOString(),
    };

    const nuevaLista = editandoId
      ? lista.map((item) => (item.id === editandoId ? { ...item, ...registro } : item))
      : [registro, ...lista];

    await persistirLista(nuevaLista);
    setModalVisible(false);
    avisar(
      'exito',
      editandoId ? 'Datos actualizados' : 'Beneficio creado',
      editandoId ? 'Los cambios quedaron guardados.' : `Se agregó "${registro.titulo}" al catálogo.`
    );
  };

  // BAJA LÓGICA / REACTIVACIÓN (borrado_logico)
  const alternarBajaLogica = async (beneficio) => {
    const pasaABaja = !beneficio.borrado_logico;
    const nuevaLista = lista.map((item) =>
      item.id === beneficio.id
        ? { ...item, borrado_logico: pasaABaja, fecha_modificacion: new Date().toISOString() }
        : item
    );
    await persistirLista(nuevaLista);
    avisar(
      pasaABaja ? 'advertencia' : 'exito',
      pasaABaja ? 'Baja lógica aplicada' : 'Beneficio reactivado',
      pasaABaja
        ? `"${beneficio.titulo}" fue desactivado sin borrar su historial.`
        : `"${beneficio.titulo}" volvió a estar activo para los clientes.`
    );
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.titulo}>Beneficios</Text>
            <Text style={estilos.subtitulo}>
              {modoCrud
                ? 'Modo ABM · Gestión de beneficios y categorías'
                : esInvitado
                ? 'Creá tu cuenta y empezá a sumar puntos'
                : `Sos ${cliente.categoria} · ${cliente.puntosDisponibles} pts para canjear`}
            </Text>
          </View>

          <View style={estilos.botonesCabecera}>
            {modoCrud && (
              <Pressable style={[estilos.chip, estilos.chipActivo]} onPress={abrirModalNuevo}>
                <Text style={[estilos.chipTexto, estilos.chipTextoActivo]}>+ Nuevo</Text>
              </Pressable>
            )}
            <Pressable
              style={[estilos.botonEditarCabecera, modoCrud && estilos.chipActivo]}
              onPress={() => {
                const proximoModo = !modoCrud;
                setModoCrud(proximoModo);
                if (!proximoModo && filtro === 'INACTIVOS') setFiltro('TODOS');
              }}
            >
              <Ionicons
                name={modoCrud ? 'checkmark' : 'pencil'}
                size={18}
                color={modoCrud ? colores.textoSobreMarca : colores.marca}
              />
            </Pressable>
          </View>
        </View>

        {esInvitado && !modoCrud ? (
          <Pressable style={estilos.aviso} onPress={irARegistro}>
            <Ionicons name="lock-closed" size={18} color={colores.marca} />
            <Text style={estilos.avisoTexto}>Mirá todos los beneficios. Para canjearlos necesitás tu cuenta.</Text>
            <Text style={estilos.avisoEnlace}>Crear cuenta</Text>
          </Pressable>
        ) : null}

        <View style={estilos.filtros}>
          {filtros.map((opcion) => {
            const activo = filtro === opcion.clave;
            return (
              <Pressable
                key={opcion.clave}
                style={[estilos.chip, activo && estilos.chipActivo]}
                onPress={() => setFiltro(opcion.clave)}
              >
                <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{opcion.texto}</Text>
              </Pressable>
            );
          })}
        </View>

        {visibles.map((beneficio) => {
          const bloqueado = !modoCrud && (esInvitado || ordenCategorias.indexOf(beneficio.categoria) > nivelCliente);
          const alcanza = cliente.puntosDisponibles >= beneficio.puntos;

          return (
            <Pressable
              key={beneficio.id}
              style={[estilos.fila, (bloqueado || beneficio.borrado_logico) && estilos.filaBloqueada]}
              onPress={esInvitado && !modoCrud ? () => canjear(beneficio) : undefined}
            >
              <View style={estilos.icono}>
                <Ionicons name={beneficio.icono || 'gift-outline'} size={20} color={colores.marca} />
              </View>
              <View style={estilos.textos}>
                <Text style={estilos.nombre}>{beneficio.titulo}</Text>
                <Text style={estilos.detalle}>
                  {beneficio.tipo === 'CANJEABLE'
                    ? `${beneficio.puntos} pts · ${beneficio.detalle}`
                    : beneficio.detalle}
                </Text>
                <View style={estilos.filaCategoria}>
                  <View style={[estilos.punto, { backgroundColor: coloresCategoria[beneficio.categoria] }]} />
                  <Text style={estilos.detalle}>Disponible desde {beneficio.categoria}</Text>
                </View>
              </View>

              {modoCrud ? (
                <View style={estilos.accionesCrud}>
                  <Pressable style={estilos.botonAccion} onPress={() => abrirModalEditar(beneficio)}>
                    <Ionicons name="create-outline" size={18} color={colores.marca} />
                  </Pressable>
                  <Pressable style={estilos.botonAccion} onPress={() => alternarBajaLogica(beneficio)}>
                    <Ionicons
                      name={beneficio.borrado_logico ? 'refresh-outline' : 'trash-outline'}
                      size={18}
                      color={beneficio.borrado_logico ? colores.exito : colores.textoTenue}
                    />
                  </Pressable>
                </View>
              ) : esInvitado ? (
                <Ionicons name="lock-closed" size={20} color={colores.textoTenue} />
              ) : bloqueado ? (
                <Ionicons name="lock-closed-outline" size={20} color={colores.textoTenue} />
              ) : beneficio.tipo === 'AUTOMATICO' ? (
                <Text style={estilos.activo}>ACTIVO</Text>
              ) : (
                <Pressable
                  style={[estilos.boton, !alcanza && estilos.botonApagado]}
                  disabled={!alcanza}
                  onPress={() => canjear(beneficio)}
                >
                  <Text style={[estilos.botonTexto, !alcanza && estilos.textoApagado]}>
                    {alcanza ? 'Canjear' : `Faltan ${beneficio.puntos - cliente.puntosDisponibles} pts`}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Modal CRUD con el mismo estilo visual de "Editar mis datos" de Perfil.js */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalHoja}>
            <Text style={estilos.modalTitulo}>
              {editandoId ? 'Editar beneficio' : 'Nuevo beneficio'}
            </Text>

            <Text style={estilos.etiqueta}>Descripción del beneficio</Text>
            <TextInput
              style={estilos.input}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={120}
              placeholder="Ej. Medialunas x3 o 10% off"
              placeholderTextColor={colores.textoTenue}
            />

            <Text style={estilos.etiqueta}>Detalle para el cliente</Text>
            <TextInput
              style={estilos.input}
              value={detalle}
              onChangeText={setDetalle}
              maxLength={80}
              placeholder="Ej. Retirás en el mostrador"
              placeholderTextColor={colores.textoTenue}
            />

            <Text style={estilos.etiqueta}>Categoría mínima (FK Categorías)</Text>
            <View style={estilos.filtros}>
              {ordenCategorias.map((cat) => {
                const activo = categoria === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[estilos.chip, activo && estilos.chipActivo]}
                    onPress={() => setCategoria(cat)}
                  >
                    <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={estilos.etiqueta}>Modo de entrega</Text>
            <View style={estilos.filtros}>
              {[
                { clave: 'CANJEABLE', texto: 'Canjeable por puntos' },
                { clave: 'AUTOMATICO', texto: 'Automático en caja' },
              ].map((op) => {
                const activo = tipo === op.clave;
                return (
                  <Pressable
                    key={op.clave}
                    style={[estilos.chip, activo && estilos.chipActivo]}
                    onPress={() => {
                      setTipo(op.clave);
                      setDetalle(op.clave === 'AUTOMATICO' ? 'Se aplica solo al pagar' : 'Retirás en el mostrador');
                    }}
                  >
                    <Text style={[estilos.chipTexto, activo && estilos.chipTextoActivo]}>{op.texto}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tipo === 'CANJEABLE' && (
              <>
                <Text style={estilos.etiqueta}>Puntos requeridos</Text>
                <TextInput
                  style={estilos.input}
                  value={puntos}
                  onChangeText={setPuntos}
                  keyboardType="numeric"
                  placeholder="300"
                  placeholderTextColor={colores.textoTenue}
                />
              </>
            )}

            <Text style={estilos.etiqueta}>Ícono</Text>
            <View style={estilos.filtros}>
              {ICONOS_DISPONIBLES.map((nombreIcono) => {
                const activo = icono === nombreIcono;
                return (
                  <Pressable
                    key={nombreIcono}
                    style={[estilos.botonIconoSelector, activo && estilos.chipActivo]}
                    onPress={() => setIcono(nombreIcono)}
                  >
                    <Ionicons
                      name={nombreIcono}
                      size={18}
                      color={activo ? colores.textoSobreMarca : colores.marca}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={estilos.filaBotonesModal}>
              <Pressable style={estilos.botonCancelar} onPress={() => setModalVisible(false)}>
                <Text style={estilos.chipTexto}>Cancelar</Text>
              </Pressable>
              <Pressable style={estilos.botonGuardar} onPress={guardarBeneficio}>
                <Text style={[estilos.chipTexto, estilos.chipTextoActivo]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 20, gap: 14 },
    cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    botonesCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    botonEditarCabecera: {
      width: 38, height: 38, borderRadius: 19,
      borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie,
      justifyContent: 'center', alignItems: 'center',
    },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 36, color: c.titulo },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    aviso: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.superficieActiva, borderWidth: 1, borderColor: c.bordeAdvertencia,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    },
    avisoTexto: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12.5, lineHeight: 17, color: c.texto },
    avisoEnlace: { fontFamily: 'Inter_700Bold', fontSize: 12.5, color: c.marca },
    chip: { borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    chipActivo: { backgroundColor: c.marca, borderColor: c.marca },
    chipTexto: { fontFamily: 'Inter_500Medium', fontSize: 13, color: c.texto },
    chipTextoActivo: { fontFamily: 'Inter_700Bold', color: c.textoSobreMarca },
    fila: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16, padding: 14,
    },
    filaBloqueada: { opacity: 0.55 },
    icono: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.superficieActiva, justifyContent: 'center', alignItems: 'center' },
    textos: { flex: 1, gap: 3 },
    nombre: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textoSecundario },
    filaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    punto: { width: 8, height: 8, borderRadius: 4 },
    activo: {
      fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, color: c.exito,
      backgroundColor: c.fondoExito, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden',
    },
    boton: { borderWidth: 1, borderColor: c.marca, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    botonApagado: { borderColor: c.borde },
    botonTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: c.marca },
    textoApagado: { color: c.textoTenue },
    accionesCrud: { flexDirection: 'row', gap: 8 },
    botonAccion: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.superficieActiva, borderWidth: 1, borderColor: c.borde,
      justifyContent: 'center', alignItems: 'center',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalHoja: {
      backgroundColor: c.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 22, gap: 10, borderTopWidth: 1, borderColor: c.borde,
    },
    modalTitulo: { fontFamily: 'Caveat_700Bold', fontSize: 32, color: c.titulo },
    etiqueta: { fontFamily: 'Inter_500Medium', fontSize: 12.5, color: c.textoSecundario, marginTop: 2 },
    input: {
      fontFamily: 'Inter_400Regular', fontSize: 14, color: c.texto,
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    },
    botonIconoSelector: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde,
      justifyContent: 'center', alignItems: 'center',
    },
    filaBotonesModal: { flexDirection: 'row', gap: 12, marginTop: 12 },
    botonCancelar: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      borderWidth: 1, borderColor: c.borde, backgroundColor: c.superficie, alignItems: 'center',
    },
    botonGuardar: {
      flex: 1, paddingVertical: 13, borderRadius: 12,
      backgroundColor: c.marca, alignItems: 'center',
    },
  });
}