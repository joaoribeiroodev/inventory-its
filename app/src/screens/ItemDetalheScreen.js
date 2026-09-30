// Tela de detalhe do item — funciona 100% offline para consulta
// e registro de movimentação. O botão de histórico completo só
// aparece quando o app está online (buscado sob demanda, nunca
// cacheado — ver decisão de arquitetura).

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Crypto from 'expo-crypto';
import { buscarItemPorCodigo, listarSetoresLocais, enfileirarEvento, aplicarEventoNoCacheLocal } from '../database/queries';
import { useConnectivity } from '../contexts/ConnectivityContext';
import Botao from '../components/Botao';
import Badge from '../components/Badge';
import Cartao from '../components/Cartao';
import { colors, spacing, typography, infoSituacao } from '../theme';

const SITUACOES = ['bom', 'ruim'];

export default function ItemDetalheScreen({ route, navigation }) {
    const { codigo } = route.params;
    const { isOnline } = useConnectivity();

    const [item, setItem] = useState(null);
    const [setores, setSetores] = useState([]);
    const [setorSelecionado, setSetorSelecionado] = useState(null);
    const [situacaoSelecionada, setSituacaoSelecionada] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        (async () => {
            const itemAtual = await buscarItemPorCodigo(codigo);
            const setoresLocais = await listarSetoresLocais();
            setItem(itemAtual);
            setSetores(setoresLocais);
            setSituacaoSelecionada(itemAtual?.situacao_atual);
            const setorAtual = setoresLocais.find((s) => s.nome === itemAtual?.setor_atual);
            setSetorSelecionado(setorAtual?.id ?? null);
        })();
    }, [codigo]);

    if (!item) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

    async function registrarMovimentacao() {
        setSalvando(true);

        const novoSetorNome = setores.find((s) => s.id === setorSelecionado)?.nome ?? null;
        const mudouSetor = novoSetorNome !== item.setor_atual;
        const mudouSituacao = situacaoSelecionada !== item.situacao_atual;

        if (!mudouSetor && !mudouSituacao) {
            setSalvando(false);
            navigation.goBack();
            return;
        }

        // O timestamp é do PRÓPRIO APARELHO — decisão de arquitetura:
        // a ordem "oficial" dos eventos é definida por ele, não pela
        // ordem de chegada ao servidor.
        await enfileirarEvento({
            uuidEvento: Crypto.randomUUID(),
            itemCodigo: item.codigo,
            setorNovoId: mudouSetor ? setorSelecionado : null,
            situacaoNova: mudouSituacao ? situacaoSelecionada : null,
            timestampEvento: new Date().toISOString(),
        });

        // Reflete a mudança no cache local na hora, sem esperar sync
        await aplicarEventoNoCacheLocal(item.codigo, {
            setorNovoNome: mudouSetor ? novoSetorNome : null,
            situacaoNova: mudouSituacao ? situacaoSelecionada : null,
        });

        setSalvando(false);
        navigation.goBack();
    }

    const situacaoAtual = infoSituacao(item.situacao_atual);

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
            <Text style={styles.codigo}>{item.codigo}</Text>
            <Text style={styles.descricao}>{item.descricao}</Text>
            {item.categoria && <Text style={styles.categoria}>{item.categoria}</Text>}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.md }}>
                <Badge texto={situacaoAtual.rotulo} bg={situacaoAtual.bg} cor={situacaoAtual.cor} />
                <Badge
                    texto={item.setor_atual ?? 'Sem setor'}
                    bg="#E7EEF5"
                    cor={colors.primary}
                />
            </View>

            <Cartao>
                <Text style={styles.label}>Setor</Text>
                <View style={styles.pickerBorda}>
                    <Picker selectedValue={setorSelecionado} onValueChange={setSetorSelecionado}>
                        {setores.map((s) => (
                            <Picker.Item key={s.id} label={s.nome} value={s.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Situação</Text>
                <View style={styles.pickerBorda}>
                    <Picker selectedValue={situacaoSelecionada} onValueChange={setSituacaoSelecionada}>
                        {SITUACOES.map((s) => (
                            <Picker.Item key={s} label={infoSituacao(s).rotulo} value={s} />
                        ))}
                    </Picker>
                </View>

                <Botao
                    titulo="Confirmar movimentação"
                    variante="accent"
                    onPress={registrarMovimentacao}
                    carregando={salvando}
                    style={{ marginTop: spacing.sm }}
                />
            </Cartao>

            {isOnline ? (
                <Text
                    style={styles.linkHistorico}
                    onPress={() => navigation.navigate('Historico', { codigo: item.codigo })}
                >
                    Ver histórico completo
                </Text>
            ) : (
                <Text style={styles.avisoOffline}>
                    Histórico completo só está disponível com conexão.
                </Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: spacing.xl },
    codigo: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    descricao: { ...typography.title, marginBottom: 2 },
    categoria: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
    label: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.xs },
    pickerBorda: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    linkHistorico: { marginTop: spacing.lg, color: colors.primary, fontWeight: '600', textAlign: 'center' },
    avisoOffline: { marginTop: spacing.lg, color: colors.textMuted, textAlign: 'center', fontSize: 12 },
});
