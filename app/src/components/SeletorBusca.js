// Seletor com busca por texto, em modal — substitui o Picker nativo
// pra listas longas (setores chegam perto de 40: prédio +
// departamento), onde rolar item por item é trabalhoso. Toca, digita
// parte do nome, toca no resultado.

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

function normalizar(texto) {
    return (texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

export default function SeletorBusca({ opcoes, valorId, onSelecionar, placeholder, opcaoVazia }) {
    const [aberto, setAberto] = useState(false);
    const [busca, setBusca] = useState('');

    const selecionado = opcoes.find((o) => String(o.id) === String(valorId)) ?? null;

    const opcoesFiltradas = useMemo(() => {
        const alvo = normalizar(busca.trim());
        return alvo ? opcoes.filter((o) => normalizar(o.nome).includes(alvo)) : opcoes;
    }, [opcoes, busca]);

    function escolher(id) {
        onSelecionar(id);
        setAberto(false);
        setBusca('');
    }

    return (
        <>
            <TouchableOpacity style={styles.campo} onPress={() => setAberto(true)}>
                <Text style={selecionado ? styles.valorTexto : styles.placeholderTexto}>
                    {selecionado ? selecionado.nome : (opcaoVazia ?? 'Selecionar')}
                </Text>
            </TouchableOpacity>

            <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                    <View style={styles.cabecalho}>
                        <TextInput
                            style={styles.busca}
                            placeholder={placeholder ?? 'Buscar...'}
                            placeholderTextColor={colors.textMuted}
                            value={busca}
                            onChangeText={setBusca}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => { setAberto(false); setBusca(''); }} style={styles.botaoFechar}>
                            <Text style={styles.botaoFecharTexto}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={opcaoVazia ? [{ id: '', nome: opcaoVazia }, ...opcoesFiltradas] : opcoesFiltradas}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.item} onPress={() => escolher(item.id)}>
                                <Text style={[styles.itemTexto, String(item.id) === String(valorId) && styles.itemTextoSelecionado]}>
                                    {item.nome}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.vazio}>Nenhum resultado</Text>}
                    />
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    campo: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
    },
    valorTexto: { fontSize: 15, color: colors.text },
    placeholderTexto: { fontSize: 15, color: colors.textMuted },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    busca: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
        fontSize: 15,
        color: colors.text,
        backgroundColor: colors.surface,
    },
    botaoFechar: { paddingHorizontal: spacing.xs },
    botaoFecharTexto: { color: colors.primary, fontWeight: '600', fontSize: 15 },
    item: {
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemTexto: { ...typography.body, color: colors.text },
    itemTextoSelecionado: { fontWeight: '700', color: colors.primary },
    vazio: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
