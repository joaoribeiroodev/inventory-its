import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

export default function Cartao({ children, style }) {
    return <View style={[styles.cartao, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    cartao: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        ...shadow,
    },
});
