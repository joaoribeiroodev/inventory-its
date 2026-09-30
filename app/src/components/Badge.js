import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, spacing } from '../theme';

export default function Badge({ texto, bg, cor }) {
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.texto, { color: cor }]}>{texto}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingVertical: 3,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radius.pill,
        alignSelf: 'flex-start',
    },
    texto: {
        fontSize: 12,
        fontWeight: '700',
    },
});
