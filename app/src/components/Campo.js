import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

// Campo de texto padronizado (label + input), substitui os
// <TextInput> soltos que cada tela estilizava na mão.
export default function Campo({ label, style, ...props }) {
    return (
        <View style={styles.grupo}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[styles.input, style]}
                placeholderTextColor={colors.textMuted}
                {...props}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    grupo: { marginBottom: spacing.md },
    label: { ...typography.label, marginBottom: spacing.xs },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        fontSize: 15,
        color: colors.text,
        backgroundColor: colors.surface,
    },
});
