// Histórico completo de um item — SEMPRE buscado da API, nunca
// cacheado localmente (ver decisão de arquitetura). Só funciona
// online; a tela de detalhe já esconde o link quando offline.

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import Badge from '../components/Badge';
import { colors, spacing, infoSituacao } from '../theme';

export default function HistoricoScreen({ route }) {
    const { id } = route.params;
    const [eventos, setEventos] = useState(null);

    useEffect(() => {
        (async () => {
            // "codigo" não é mais único, então a navegação já vem com o
            // id numérico do item (ver ItemDetalheScreen.js) — sem mais
            // precisar descobrir o id a partir do código.
            const lista = await api.buscarHistoricoItem(id).catch(() => []);
            setEventos(lista);
        })();
    }, [id]);

    if (!eventos) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

    return (
        <FlatList
            style={{ backgroundColor: colors.bg }}
            contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
            data={eventos}
            keyExtractor={(e) => String(e.id)}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhuma movimentação registrada ainda.</Text>}
            renderItem={({ item: evento }) => {
                const situacao = evento.situacaoNova ? infoSituacao(evento.situacaoNova) : null;
                return (
                    <View style={styles.linha}>
                        <Text style={styles.data}>
                            {new Date(evento.timestampEvento).toLocaleString('pt-BR')}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
                            {evento.setorNovo && <Text style={styles.texto}>{evento.setorNovo.nome}</Text>}
                            {situacao && <Badge texto={situacao.rotulo} bg={situacao.bg} cor={situacao.cor} />}
                        </View>
                        <Text style={styles.usuario}>por {evento.usuario?.nome}</Text>
                    </View>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    linha: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    data: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    texto: { fontSize: 15, color: colors.text },
    usuario: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
    vazio: { padding: 20, textAlign: 'center', color: colors.textMuted },
});
