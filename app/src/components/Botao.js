import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const VARIANTES = {
    primary: { bg: colors.primary, texto: colors.white, borda: colors.primary },
    accent: { bg: colors.accent, texto: colors.primaryDark, borda: colors.accent },
    secondary: { bg: colors.surface, texto: colors.text, borda: colors.border },
    danger: { bg: colors.dangerBg, texto: colors.danger, borda: '#f4cccc' },
};

// Botão padronizado do app — substitui o <Button> nativo do RN
// (que não permite estilização) por algo consistente com o painel
// web e com a identidade visual da empresa.
export default function Botao({ titulo, onPress, variante = 'primary', carregando = false, disabled = false, style }) {
    const cores = VARIANTES[variante] ?? VARIANTES.primary;
    const desabilitado = disabled || carregando;

    return (
        <Pressable
            onPress={onPress}
            disabled={desabilitado}
            style={({ pressed }) => [
                styles.botao,
                { backgroundColor: cores.bg, borderColor: cores.borda },
                desabilitado && { opacity: 0.6 },
                pressed && !desabilitado && { opacity: 0.85 },
                style,
            ]}
        >
            {carregando ? (
                <ActivityIndicator color={cores.texto} />
            ) : (
                <Text style={[styles.texto, { color: cores.texto }]}>{titulo}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    botao: {
        paddingVertical: 13,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.sm,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    texto: {
        fontSize: 15,
        fontWeight: '700',
    },
});
