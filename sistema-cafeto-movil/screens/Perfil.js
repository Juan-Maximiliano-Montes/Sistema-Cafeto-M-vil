import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { cliente, coloresCategoria, movimientos } from '../src/datos/ejemplo';

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatearCumple(fecha) {
  if (!fecha) return 'Todavía no lo agregaste';
  const [, mes, dia] = fecha.split('-');
  return `${Number(dia)} de ${meses[Number(mes) - 1]}`;
}

export default function Perfil() {
  const { colores, tema, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [perfil, setPerfil] = useState(null);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({ nombre: '', telefono: '', cumple: '', aceptaPromociones: false });

  const usuario = auth.currentUser;
  const nombreCompleto = usuario?.displayName ?? 'Cliente Cafeto';
  const iniciales = nombreCompleto
    .split(' ')
    .map((palabra) => palabra[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!usuario) return;
    AsyncStorage.getItem(`cafeto:perfil:${usuario.uid}`).then((guardado) => {
      if (guardado) setPerfil(JSON.parse(guardado));
    });
  }, [usuario]);

  const abrirEditor = () => {
    let cumple = '';
    if (perfil?.fechaNacimiento) {
      const [anio, mes, dia] = perfil.fechaNacimiento.split('-');
      cumple = `${dia}/${mes}/${anio}`;
    }
    setBorrador({
      nombre: nombreCompleto,
      telefono: perfil?.telefono ?? '',
      cumple,
      aceptaPromociones: Boolean(perfil?.aceptaPromociones),
    });
    setEditando(true);
  };

  const guardar = async () => {
    const partes = borrador.cumple.split('/');
    const fechaValida = partes.length === 3 && partes[0].length === 2 && partes[1].length === 2 && partes[2].length === 4;
    if (borrador.cumple && !fechaValida) {
      avisar('advertencia', 'Revisá la fecha', 'Escribila como día/mes/año. Por ejemplo: 21/01/1990.');
      return;
    }

    const nombre = borrador.nombre.trim();
    const nuevo = {
      ...perfil,
      nombre,
      telefono: borrador.telefono.trim(),
      fechaNacimiento: fechaValida ? `${partes[2]}-${partes[1]}-${partes[0]}` : null,
      aceptaPromociones: borrador.aceptaPromociones,
    };

    await AsyncStorage.setItem(`cafeto:perfil:${usuario.uid}`, JSON.stringify(nuevo));
    if (nombre && nombre !== usuario.displayName) {
      await updateProfile(usuario, { displayName: nombre });
    }

    setPerfil(nuevo);
    setEditando(false);
    avisar('exito', 'Datos actualizados', 'Tus datos quedaron guardados.');
  };

  const cerrarSesion = () => {
    avisar('advertencia', '¿Cerrar sesión?', 'Vas a tener que volver a ingresar con tu correo y contraseña.', [
      { texto: 'Cancelar', estilo: 'cancelar' },
      { texto: 'Cerrar sesión', estilo: 'destructivo', alPresionar: () => signOut(auth) },
    ]);
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top']}>
      <StatusBar style={colores.barraEstado} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.encabezado}>
          <View style={estilos.avatar}>
            <Text style={estilos.iniciales}>{iniciales}</Text>
          </View>
          <View style={estilos.textos}>
            <Text style={estilos.nombre}>{nombreCompleto}</Text>
            <Text style={estilos.detalle}>{usuario?.email}</Text>
          </View>
          <Pressable style={estilos.botonEditar} onPress={abrirEditor}>
            <Ionicons name="pencil" size={18} color={colores.marca} />
          </Pressable>
        </View>

        <View style={estilos.tarjetaQr}>
          <View style={estilos.cuadroQr}>
            <Ionicons name="qr-code-outline" size={84} color={colores.textoSobreMarca} />
          </View>
          <Text style={estilos.codigo}>{cliente.codigoQr}</Text>
          <Text style={estilos.detalle}>Mostralo en caja para sumar puntos</Text>
          <View style={[estilos.chip, { backgroundColor: coloresCategoria[cliente.categoria] }]}>
            <Ionicons name="star" size={12} color={colores.textoSobreMarca} />
            <Text style={estilos.chipTexto}>{cliente.categoria.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={estilos.seccion}>MIS DATOS</Text>
        <View style={estilos.lista}>
          <View style={estilos.fila}>
            <Ionicons name="call-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Teléfono</Text>
            <Text style={estilos.valor}>{perfil?.telefono ?? 'Todavía no lo agregaste'}</Text>
          </View>
          <View style={[estilos.fila, estilos.divisor]}>
            <Ionicons name="calendar-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Cumpleaños</Text>
            <Text style={estilos.valor}>{formatearCumple(perfil?.fechaNacimiento)}</Text>
          </View>
          <View style={[estilos.fila, estilos.divisor]}>
            <Ionicons name="mail-outline" size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Querés recibir promos</Text>
            <Text style={estilos.valor}>{perfil?.aceptaPromociones ? 'Sí' : 'No'}</Text>
          </View>
        </View>

        <Text style={estilos.seccion}>HISTORIAL DE PUNTOS</Text>
        <View style={estilos.lista}>
          {movimientos.map((mov, indice) => (
            <View key={mov.id} style={[estilos.fila, indice > 0 && estilos.divisor]}>
              <View style={estilos.textos}>
                <Text style={estilos.valorIzquierda}>{mov.concepto}</Text>
                <Text style={estilos.detalle}>{mov.fecha}</Text>
              </View>
              <Text style={[estilos.puntos, mov.puntos > 0 && estilos.puntosSuma]}>
                {mov.puntos > 0 ? `+${mov.puntos}` : mov.puntos} pts
              </Text>
            </View>
          ))}
        </View>

        <Text style={estilos.seccion}>PREFERENCIAS</Text>
        <View style={estilos.lista}>
          <Pressable style={estilos.fila} onPress={cambiarTema}>
            <Ionicons name={tema === 'oscuro' ? 'moon-outline' : 'sunny-outline'} size={20} color={colores.textoSecundario} />
            <Text style={estilos.etiqueta}>Tema</Text>
            <Text style={estilos.valor}>{tema === 'oscuro' ? 'Oscuro' : 'Claro'}</Text>
          </Pressable>
          <Pressable style={[estilos.fila, estilos.divisor]} onPress={cerrarSesion}>
            <Ionicons name="log-out-outline" size={20} color={colores.peligro} />
            <Text style={[estilos.etiqueta, { color: colores.peligro }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={editando} transparent animationType="slide" onRequestClose={() => setEditando(false)}>
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>Editar mis datos</Text>

            <Text style={estilos.etiquetaCampo}>Nombre y apellido</Text>
            <TextInput
              style={estilos.campo}
              value={borrador.nombre}
              onChangeText={(texto) => setBorrador({ ...borrador, nombre: texto })}
              placeholderTextColor={colores.textoTenue}
            />

            <Text style={estilos.etiquetaCampo}>Teléfono</Text>
            <TextInput
              style={estilos.campo}
              value={borrador.telefono}
              onChangeText={(texto) => setBorrador({ ...borrador, telefono: texto })}
              keyboardType="phone-pad"
              placeholder="+54 387 000 0000"
              placeholderTextColor={colores.textoTenue}
            />

            <Text style={estilos.etiquetaCampo}>Cumpleaños</Text>
            <TextInput
              style={estilos.campo}
              value={borrador.cumple}
              onChangeText={(texto) => setBorrador({ ...borrador, cumple: texto })}
              keyboardType="numeric"
              placeholder="21/01/1990"
              placeholderTextColor={colores.textoTenue}
            />

            <View style={estilos.filaSwitch}>
              <Text style={estilos.etiqueta}>Querés recibir promos</Text>
              <Switch
                value={borrador.aceptaPromociones}
                onValueChange={(valor) => setBorrador({ ...borrador, aceptaPromociones: valor })}
                trackColor={{ true: colores.marca }}
              />
            </View>

            <View style={estilos.accionesModal}>
              <Pressable style={estilos.botonCancelar} onPress={() => setEditando(false)}>
                <Text style={estilos.textoCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable style={estilos.botonGuardar} onPress={guardar}>
                <Text style={estilos.textoGuardar}>Guardar</Text>
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
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.marca, justifyContent: 'center', alignItems: 'center' },
    iniciales: { fontFamily: 'Inter_700Bold', fontSize: 22, color: c.textoSobreMarca },
    textos: { flex: 1, gap: 2 },
    nombre: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo },
    detalle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textoSecundario },
    tarjetaQr: {
      alignItems: 'center', gap: 8, padding: 20,
      backgroundColor: c.marcaSuave, borderWidth: 1, borderColor: c.bordeAdvertencia, borderRadius: 20,
    },
    cuadroQr: { width: 140, height: 140, borderRadius: 16, backgroundColor: c.marca, justifyContent: 'center', alignItems: 'center' },
    codigo: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 2, color: c.texto },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    chipTexto: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: c.textoSobreMarca },
    seccion: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: c.textoSecundario, marginTop: 6 },
    lista: { backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 16 },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    divisor: { borderTopWidth: 1, borderTopColor: c.divisor },
    etiqueta: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: c.texto },
    valor: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textoSecundario },
    valorIzquierda: { fontFamily: 'Inter_500Medium', fontSize: 14, color: c.texto },
    puntos: { fontFamily: 'Inter_700Bold', fontSize: 14, color: c.textoSecundario },
    puntosSuma: { color: c.exito },
    botonEditar: {
      width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.bordeAdvertencia,
    },
    fondoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.55)' },
    modal: {
      gap: 8, padding: 22, paddingBottom: 34,
      backgroundColor: c.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderTopWidth: 1, borderColor: c.borde,
    },
    tituloModal: { fontFamily: 'Caveat_700Bold', fontSize: 30, color: c.titulo, marginBottom: 4 },
    etiquetaCampo: { fontFamily: 'Inter_500Medium', fontSize: 12, color: c.textoSecundario, marginTop: 6 },
    campo: {
      backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      fontFamily: 'Inter_400Regular', fontSize: 15, color: c.texto,
    },
    filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
    accionesModal: { flexDirection: 'row', gap: 12, marginTop: 22 },
    botonCancelar: {
      flex: 1, borderWidth: 1, borderColor: c.borde, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    textoCancelar: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: c.texto },
    botonGuardar: { flex: 1, backgroundColor: c.marca, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    textoGuardar: { fontFamily: 'Inter_700Bold', fontSize: 15, color: c.textoSobreMarca },
  });
}
