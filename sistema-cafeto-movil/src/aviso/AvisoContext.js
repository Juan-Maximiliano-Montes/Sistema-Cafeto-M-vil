import React, { createContext, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTema } from '../tema/TemaContext';

const AvisoContext = createContext(null);

const ICONOS = {
  error: 'alert-circle',
  advertencia: 'alert-triangle',
  exito: 'check-circle',
};

const ESTILOS_BOTON = {
  cancelar: ['botonCancelar', 'textoCancelar'],
  destructivo: ['botonDestructivo', 'textoDestructivo'],
};

export function AvisoProvider({ children }) {
  const { colores } = useTema();
  const estilos = useMemo(() => crearEstilos(colores), [colores]);
  const [aviso, setAviso] = useState(null);

  const valor = useMemo(
    () => ({
      avisar: (tipo, titulo, mensaje, botones = [{ texto: 'Entendido' }]) => {
        setAviso({ tipo, titulo, mensaje, botones });
      },
    }),
    []
  );

  const colorDelIcono = {
    error: colores.peligro,
    advertencia: colores.marca,
    exito: colores.exito,
  };

  const tocarBoton = (boton) => {
    setAviso(null);
    if (boton.alPresionar) boton.alPresionar();
  };

  return (
    <AvisoContext.Provider value={valor}>
      {children}
      <Modal
        visible={aviso !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAviso(null)}
      >
        <View style={estilos.velo}>
          {aviso && (
            <View style={[estilos.tarjeta, estilos[aviso.tipo]]}>
              <View style={estilos.cabecera}>
                <Feather name={ICONOS[aviso.tipo]} size={22} color={colorDelIcono[aviso.tipo]} />
                <Text style={estilos.titulo}>{aviso.titulo}</Text>
              </View>
              <Text style={estilos.mensaje}>{aviso.mensaje}</Text>
              <View style={estilos.botones}>
                {aviso.botones.map((boton) => {
                  const [estiloBoton, estiloTexto] = ESTILOS_BOTON[boton.estilo] ?? [
                    'botonPrincipal',
                    'textoPrincipal',
                  ];
                  return (
                    <Pressable
                      key={boton.texto}
                      style={({ pressed }) => [estilos.boton, estilos[estiloBoton], pressed && estilos.presionado]}
                      onPress={() => tocarBoton(boton)}
                    >
                      <Text style={[estilos.textoBoton, estilos[estiloTexto]]}>{boton.texto}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </AvisoContext.Provider>
  );
}

export function useAviso() {
  return useContext(AvisoContext);
}

function crearEstilos(c) {
  return StyleSheet.create({
    velo: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      backgroundColor: c.velo,
    },
    tarjeta: {
      padding: 20,
      borderRadius: 18,
      borderWidth: 1,
    },
    error: {
      backgroundColor: c.fondoPeligro,
      borderColor: c.bordePeligro,
    },
    advertencia: {
      backgroundColor: c.fondoAdvertencia,
      borderColor: c.bordeAdvertencia,
    },
    exito: {
      backgroundColor: c.fondoExito,
      borderColor: c.bordeExito,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    titulo: {
      flex: 1,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: c.texto,
    },
    mensaje: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14.5,
      lineHeight: 21,
      color: c.textoSecundario,
      marginTop: 8,
      marginLeft: 32,
    },
    botones: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 20,
    },
    boton: {
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    botonPrincipal: {
      backgroundColor: c.marca,
    },
    botonCancelar: {
      borderWidth: 1,
      borderColor: c.borde,
    },
    botonDestructivo: {
      backgroundColor: c.peligro,
    },
    presionado: {
      opacity: 0.85,
    },
    textoBoton: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
    },
    textoPrincipal: {
      color: c.textoSobreMarca,
    },
    textoCancelar: {
      color: c.texto,
    },
    textoDestructivo: {
      color: '#FFFFFF',
    },
  });
}
