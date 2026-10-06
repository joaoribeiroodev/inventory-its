// Tela de detalhe do item — funciona 100% offline para consulta
// e registro de movimentação. O botão de histórico completo só
// aparece quando o app está online (buscado sob demanda, nunca
// cacheado — ver decisão de arquitetura).

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Crypto from 'expo-crypto';
import { buscarItemPorId, listarSetoresLocais, enfileirarEvento, aplicarEventoNoCacheLocal, aplicarEdicaoNoCacheLocal } from '../database/queries';
import { useConnectivity } from '../contexts/ConnectivityContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import Botao from '../components/Botao';
import Badge from '../components/Badge';
import Cartao from '../components/Cartao';
import Campo from '../components/Campo';
import { colors, spacing, typography, infoSituacao } from '../theme';

const SITUACOES = ['bom', 'ruim'];

export default function ItemDetalheScreen({ route, navigation }) {
    const { id } = route.params;
    const { isOnline } = useConnectivity();
    const { usuario } = useAuth();
    const toast = useToast();
    const podeEditar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';

    const [item, setItem] = useState(null);
    const [setores, setSetores] = useState([]);
    const [setorSelecionado, setSetorSelecionado] = useState(null);
    const [situacaoSelecionada, setSituacaoSelecionada] = useState(null);
    const [salvando, setSalvando] = useState(false);

    const [editando, setEditando] = useState(false);
    const [descricaoEdit, setDescricaoEdit] = useState('');
    const [categoriaEdit, setCategoriaEdit] = useState('');
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);

    useEffect(() => {
        (async () => {
            const itemAtual = await buscarItemPorId(id);
            const setoresLocais = await listarSetoresLocais();
            setItem(itemAtual);
            setSetores(setoresLocais);
            setSituacaoSelecionada(itemAtual?.situacao_atual);
            const setorAtual = setoresLocais.find((s) => s.nome === itemAtual?.setor_atual);
            setSetorSelecionado(setorAtual?.id ?? null);
        })();
    }, [id]);

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

        try {
            // O timestamp é do PRÓPRIO APARELHO — decisão de arquitetura:
            // a ordem "oficial" dos eventos é definida por ele, não pela
            // ordem de chegada ao servidor.
            await enfileirarEvento({
                uuidEvento: Crypto.randomUUID(),
                itemId: item.id,
                itemCodigo: item.codigo,
                setorNovoId: mudouSetor ? setorSelecionado : null,
                situacaoNova: mudouSituacao ? situacaoSelecionada : null,
                timestampEvento: new Date().toISOString(),
            });

            // Reflete a mudança no cache local na hora, sem esperar sync
            await aplicarEventoNoCacheLocal(item.id, {
                setorNovoNome: mudouSetor ? novoSetorNome : null,
                situacaoNova: mudouSituacao ? situacaoSelecionada : null,
            });

            toast.sucesso('Movimentação registrada — será sincronizada com o servidor.');
            navigation.goBack();
        } catch (err) {
            toast.erro(`Não foi possível registrar a movimentação: ${err.message}`);
        } finally {
            setSalvando(false);
        }
    }

    // Edição cadastral (descrição/categoria) exige conexão — mas agora
    // o cache local guarda o id numérico do item, então não precisa
    // mais de um passo extra só pra descobrir o id no servidor.
    function iniciarEdicao() {
        setDescricaoEdit(item.descricao);
        setCategoriaEdit(item.categoria ?? '');
        setEditando(true);
    }

    async function salvarEdicao() {
        setSalvandoEdicao(true);
        try {
            await api.atualizarItem(item.id, {
                descricao: descricaoEdit,
                categoria: categoriaEdit || null,
            });
            await aplicarEdicaoNoCacheLocal(item.id, {
                descricao: descricaoEdit,
                categoria: categoriaEdit || null,
            });
            setItem({ ...item, descricao: descricaoEdit, categoria: categoriaEdit || null });
            setEditando(false);
            toast.sucesso('Item atualizado com sucesso.');
        } catch (err) {
            toast.erro(`Não foi possível salvar a edição: ${err.message}`);
        } finally {
            setSalvandoEdicao(false);
        }
    }

    const situacaoAtual = infoSituacao(item.situacao_atual);

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.codigo}>{item.codigo}</Text>
                {!!item.patrimonio_duplicado && (
                    <Badge texto="Etiqueta duplicada" bg={colors.warningBg} cor={colors.warning} />
                )}
            </View>
            {!!item.patrimonio_duplicado && (
                <Text style={styles.avisoDuplicado}>
                    Essa etiqueta física está colada em mais de um item — outro bem no sistema usa o
                    mesmo número. Confira fisicamente qual é este.
                </Text>
            )}

            {editando ? (
                <Cartao style={{ marginTop: spacing.xs }}>
                    <Campo label="Descrição" value={descricaoEdit} onChangeText={setDescricaoEdit} />
                    <Campo label="Categoria" placeholder="Categoria" value={categoriaEdit} onChangeText={setCategoriaEdit} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Botao titulo="Salvar" variante="accent" onPress={salvarEdicao} carregando={salvandoEdicao} style={{ flex: 1 }} />
                        <Botao titulo="Cancelar" variante="secondary" onPress={() => setEditando(false)} disabled={salvandoEdicao} style={{ flex: 1 }} />
                    </View>
                </Cartao>
            ) : (
                <>
                    <Text style={styles.descricao}>{item.descricao}</Text>
                    {item.categoria && <Text style={styles.categoria}>{item.categoria}</Text>}
                    {podeEditar && isOnline && (
                        <Text style={styles.linkEditar} onPress={iniciarEdicao}>
                            Editar
                        </Text>
                    )}
                </>
            )}

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
                    onPress={() => navigation.navigate('Historico', { id: item.id })}
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
    avisoDuplicado: { ...typography.body, fontSize: 12, color: colors.warning, marginTop: 4, marginBottom: spacing.xs },
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
    linkEditar: { marginTop: spacing.xs, color: colors.primary, fontWeight: '600' },
    linkHistorico: { marginTop: spacing.lg, color: colors.primary, fontWeight: '600', textAlign: 'center' },
    avisoOffline: { marginTop: spacing.lg, color: colors.textMuted, textAlign: 'center', fontSize: 12 },
});
