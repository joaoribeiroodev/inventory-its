// Lista completa de itens — igual ao painel web, mas só funciona
// online (busca direto na API, não usa o cache local reduzido).

import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Badge from '../components/Badge';
import Botao from '../components/Botao';
import { colors, spacing, infoSituacao } from '../theme';

export default function ItensListaScreen({ navigation }) {
    const { usuario } = useAuth();
    const [itens, setItens] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let ativo = true;
            (async () => {
                setCarregando(true);
                try {
                    const lista = await api.buscarItensParaSync();
                    if (ativo) setItens(lista);
                } finally {
                    if (ativo) setCarregando(false);
                }
            })();
            return () => { ativo = false; };
        }, [])
    );

    const podeCriar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';

    if (carregando) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {podeCriar && (
                <View style={styles.acao}>
                    <Botao titulo="+ Novo item" variante="accent" onPress={() => navigation.navigate('ItemForm')} />
                </View>
            )}
            <FlatList
                data={itens}
                keyExtractor={(item) => item.codigo}
                contentContainerStyle={{ padding: spacing.md, paddingTop: podeCriar ? 0 : spacing.md }}
                ListEmptyComponent={<Text style={styles.vazio}>Nenhum item encontrado</Text>}
                renderItem={({ item }) => {
                    const situacao = infoSituacao(item.situacaoAtual);
                    return (
                        <View style={styles.linha}>
                            <Text style={styles.codigo}>{item.codigo}</Text>
                            <Text style={styles.descricao}>{item.descricao}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
                                <Badge texto={situacao.rotulo} bg={situacao.bg} cor={situacao.cor} />
                                <Text style={styles.detalhe}>{item.setorAtual ?? 'Sem setor'}</Text>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    acao: { padding: spacing.md },
    linha: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    codigo: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    descricao: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
    detalhe: { fontSize: 13, color: colors.textMuted },
    vazio: { padding: 40, textAlign: 'center', color: colors.textMuted },
});
