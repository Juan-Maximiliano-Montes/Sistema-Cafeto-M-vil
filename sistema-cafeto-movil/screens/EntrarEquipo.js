import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTema } from '../src/tema/TemaContext';
import { useAviso } from '../src/aviso/AvisoContext';
import { useSesion } from '../src/sesion/SesionContext';
import { MODO_DEMO, mensajeDeError } from '../src/api/cliente';
import { USUARIOS_DEMO } from '../src/api/demo';
import { normalizarUsuarioEquipo, validarUsuarioEquipo } from '../src/utilidades/validaciones';
import CampoTexto from '../src/componentes/CampoTexto';

export default function EntrarEquipo({ navigation }) {
  const { colores, cambiarTema } = useTema();
  const { avisar } = useAviso();
  const { entrarComoEquipo } = useSesion();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [errores, setErrores] = useState({});
  const [entrando, setEntrando] = useState(false);

  const completo = usuario.trim() !== '' && clave !== '';

  const cambiar = (campo, setter) => (texto) => {
    setter(texto);
    setErrores((anteriores) => ({ ...anteriores, [campo]: '' }));
  };

  const usarUsuarioDePrueba = (usuarioDemo) => {
    setUsuario(usuarioDemo.usuario);
    setClave(usuarioDemo.clave);
    setErrores({});
  };

  const salirDeUsuario = () => {
    setErrores((anteriores) => ({ ...anteriores, usuario: validarUsuarioEquipo(usuario) }));
  };

  const entrar = async () => {
    if (entrando) return;
    const errorUsuario = usuario.trim() ? validarUsuarioEquipo(usuario) : 'Ingresá tu usuario o tu DNI.';
    const errorClave = clave ? '' : 'Ingresá tu contraseña.';
    if (errorUsuario || errorClave) {
      setErrores({ usuario: errorUsuario, clave: errorClave });
      return;
    }

    setEntrando(true);
    try {
      await entrarComoEquipo(normalizarUsuarioEquipo(usuario), clave);
      avisar('exito', 'Listo', 'Entraste en modo equipo. Tus tareas están en la pestaña Gestión.');
    } catch (error) {
      setEntrando(false);
      if (error?.estado === 400 || error?.estado === 401) {
        setErrores({ clave: 'El usuario o la contraseña no coinciden.' });
        return;
      }
      avisar('error', 'No pudimos entrar', mensajeDeError(error));
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style={colores.barraEstado} />
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.barraSuperior}>
            <Pressable style={estilos.chip} onPress={() => navigation.goBack()} disabled={entrando}>
              <Feather name="chevron-left" size={16} color={colores.textoSecundario} />
              <Text style={estilos.textoChip}>Volver</Text>
            </Pressable>
            <Pressable style={estilos.botonTema} onPress={cambiarTema}>
              <Ionicons name="contrast" size={20} color={colores.texto} />
            </Pressable>
          </View>

          <View style={estilos.icono}>
            <Ionicons name="briefcase-outline" size={34} color={colores.marca} />
          </View>
          <Text style={estilos.titulo}>Equipo Cafeto</Text>
          <Text style={estilos.subtitulo}>Ingresá con el mismo usuario y contraseña que usás en el sistema web.</Text>

          {MODO_DEMO && (
            <View style={estilos.demo}>
              <View style={estilos.filaDemo}>
                <Ionicons name="flask-outline" size={18} color={colores.marca} />
                <Text style={estilos.tituloDemo}>Modo demo</Text>
              </View>
              <Text style={estilos.textoDemo}>
                Todavía no está conectado el sistema web. Elegí un usuario de prueba: lo que cargues queda guardado
                solo en este celular.
              </Text>
              {USUARIOS_DEMO.map((usuarioDemo) => (
                <Pressable
                  key={usuarioDemo.usuario}
                  style={({ pressed }) => [estilos.filaUsuarioDemo, pressed && estilos.presionado]}
                  onPress={() => usarUsuarioDePrueba(usuarioDemo)}
                  disabled={entrando}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar el usuario de prueba ${usuarioDemo.usuario}`}
                >
                  <Ionicons name="person-circle-outline" size={22} color={colores.marca} />
                  <View style={estilos.textosDemo}>
                    <Text style={estilos.tituloDemo}>{usuarioDemo.usuario}</Text>
                    <Text style={estilos.textoDemo}>{`${usuarioDemo.perfil} · DNI ${usuarioDemo.dni}`}</Text>
                  </View>
                  <Text style={estilos.enlaceDemo}>Usar</Text>
                </Pressable>
              ))}
            </View>
          )}

          <CampoTexto
            etiqueta="Usuario o DNI"
            icono="user"
            placeholder="montesj o 30123456"
            valor={usuario}
            alCambiar={cambiar('usuario', setUsuario)}
            alSalir={salirDeUsuario}
            error={errores.usuario ?? ''}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={35}
            editable={!entrando}
          />
          <CampoTexto
            etiqueta="Contraseña"
            icono="lock"
            placeholder="Tu contraseña"
            valor={clave}
            alCambiar={cambiar('clave', setClave)}
            error={errores.clave ?? ''}
            seguro
            autoCapitalize="none"
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={entrar}
            editable={!entrando}
          />

          <Pressable
            style={({ pressed }) => [
              estilos.botonPrincipal,
              !entrando && !completo && estilos.botonDeshabilitado,
              pressed && estilos.presionado,
            ]}
            onPress={entrar}
            disabled={entrando || !completo}
          >
            {entrando ? (
              <View style={estilos.filaCargando}>
                <ActivityIndicator color={colores.textoSobreMarca} />
                <Text style={estilos.textoBotonPrincipal}>Entrando...</Text>
              </View>
            ) : (
              <Text style={[estilos.textoBotonPrincipal, !completo && estilos.textoDeshabilitado]}>Entrar</Text>
            )}
          </Pressable>

          <Text style={estilos.nota}>
            ¿No te acordás la contraseña? Pedile al administrador que te la restablezca desde la web.
          </Text>
          <Pressable
            style={estilos.filaAyuda}
            onPress={() => navigation.navigate('Ayuda', { tipo: 'equipo' })}
            disabled={entrando}
            hitSlop={8}
          >
            <Text style={estilos.enlaceDemo}>¿Tenés problemas para ingresar?</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 12, paddingBottom: 24 },
    barraSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
    },
    textoChip: { fontFamily: 'Inter_500Medium', fontSize: 14, color: c.textoSecundario },
    botonTema: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.borde,
      backgroundColor: c.superficie,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icono: {
      alignSelf: 'center',
      width: 76,
      height: 76,
      borderRadius: 22,
      marginTop: 28,
      backgroundColor: c.marcaSuave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titulo: { fontFamily: 'Caveat_700Bold', fontSize: 38, color: c.titulo, textAlign: 'center', marginTop: 16 },
    subtitulo: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 21,
      color: c.textoSecundario,
      textAlign: 'center',
      marginBottom: 8,
    },
    botonPrincipal: {
      height: 54,
      borderRadius: 14,
      backgroundColor: c.marca,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    botonDeshabilitado: { backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde },
    textoBotonPrincipal: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: c.textoSobreMarca },
    textoDeshabilitado: { color: c.textoTenue },
    presionado: { opacity: 0.85 },
    filaCargando: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    demo: {
      gap: 8,
      padding: 14,
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordeAdvertencia,
      backgroundColor: c.fondoAdvertencia,
    },
    filaDemo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tituloDemo: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.texto },
    textoDemo: { fontFamily: 'Inter_400Regular', fontSize: 13.5, lineHeight: 19, color: c.textoSecundario },
    enlaceDemo: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.marca, textDecorationLine: 'underline' },
    filaUsuarioDemo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
    },
    textosDemo: { flex: 1, gap: 1 },
    filaAyuda: { alignSelf: 'center', marginTop: 14 },
    nota: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
      color: c.textoTenue,
      textAlign: 'center',
      marginTop: 20,
    },
  });
}
