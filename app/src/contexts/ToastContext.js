// Sistema central de notificações do app — um banner discreto no
// topo da tela, que desaparece sozinho. Usado para feedback de
// sucesso/erro que não exige uma decisão da pessoa (ao contrário de
// Alert.alert, que continua sendo usado só quando é preciso
// confirmar algo ou escolher entre opções — ver ScannerScreen).

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const ToastContext = createContext(null);

const CORES_POR_TIPO = {
    sucesso: { bg: colors.accentDark, icone: '✓' },
    erro: { bg: colors.danger, icone: '✕' },
    aviso: { bg: colors.warning, icone: '!' },
    info: { bg: colors.primaryLight, icone: 'i' },
};

const DURACAO_PADRAO = { sucesso: 3000, info: 3500, aviso: 4500, erro: 5500 };

export function ToastProvider({ children }) {
    const [toastAtual, setToastAtual] = useState(null);
    const opacidade = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef(null);

    const esconder = useCallback(() => {
        Animated.timing(opacidade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
            setToastAtual(null);
        });
    }, [opacidade]);

    const mostrar = useCallback(
        (tipo, mensagem) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setToastAtual({ tipo, mensagem });
            opacidade.setValue(0);
            Animated.timing(opacidade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
            timeoutRef.current = setTimeout(esconder, DURACAO_PADRAO[tipo] ?? 3500);
        },
        [opacidade, esconder]
    );

    const toast = {
        sucesso: (mensagem) => mostrar('sucesso', mensagem),
        erro: (mensagem) => mostrar('erro', mensagem),
        aviso: (mensagem) => mostrar('aviso', mensagem),
        info: (mensagem) => mostrar('info', mensagem),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {toastAtual && (
                <Animated.View
                    style={[
                        styles.container,
                        { backgroundColor: CORES_POR_TIPO[toastAtual.tipo]?.bg ?? colors.primary, opacity: opacidade },
                    ]}
                >
                    <View style={styles.icone}>
                        <Text style={styles.iconeTexto}>{CORES_POR_TIPO[toastAtual.tipo]?.icone ?? 'i'}</Text>
                    </View>
                    <Text style={styles.mensagem}>{toastAtual.mensagem}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 54,
        left: 16,
        right: 16,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
    },
    icone: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconeTexto: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    mensagem: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
});
