// Tela de Configurações — endereço do servidor (editável) e botão
// de reconexão limpa (ver decisão de arquitetura: testa antes de
// aplicar, limpa cache de referência, NUNCA apaga fila pendente).

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getServerUrl, contarEventosPendentes } from '../database/queries';
import { testarEReconectar } from '../services/syncService';
import { useAuth } from '../contexts/AuthContext';
import { useConnectivity } from '../contexts/ConnectivityContext';
import { useToast } from '../contexts/ToastContext';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import Cartao from '../components/Cartao';
import Badge from '../components/Badge';
import { colors, spacing, typography } from '../theme';

export default function ConfiguracoesScreen() {
    const { usuario, logout } = useAuth();
    const { isOnline } = useConnectivity();
    const toast = useToast();

    const [endereco, setEndereco] = useState('');
    const [pendentes, setPendentes] = useState(0);
    const [processando, setProcessando] = useState(false);

    async function carregar() {
        setEndereco(await getServerUrl());
        setPendentes(await contarEventosPendentes());
    }

    useEffect(() => {
        carregar();
    }, []);

    async function handleReconectar() {
        setProcessando(true);
        try {
            const resultado = await testarEReconectar(endereco.trim());
            toast.sucesso(
                `Reconectado! ${resultado.totalItens} item(ns) e ${resultado.enviados} evento(s) sincronizados.`
            );
            await carregar();
        } catch (err) {
            toast.erro('Não foi possível conectar nesse endereço. Nada foi alterado.');
        } finally {
            setProcessando(false);
        }
    }

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
            <Cartao style={{ marginBottom: spacing.md }}>
                <Text style={styles.label}>Usuário logado</Text>
                <Text style={styles.valor}>{usuario?.nome} ({usuario?.papel})</Text>

                <Text style={styles.label}>Status da conexão</Text>
                <Badge
                    texto={isOnline ? 'Online' : 'Offline'}
                    bg={isOnline ? '#E8F5DB' : '#FDECEC'}
                    cor={isOnline ? colors.accentDark : colors.danger}
                />

                <Text style={[styles.label, { marginTop: spacing.md }]}>Eventos pendentes de sincronização</Text>
                <Text style={styles.valor}>{pendentes}</Text>
            </Cartao>

            <Cartao>
                <Campo
                    label="Endereço do servidor"
                    value={endereco}
                    onChangeText={setEndereco}
                    placeholder="http://192.168.0.10:3001"
                    autoCapitalize="none"
                />
                <Botao titulo="Testar e reconectar" variante="accent" onPress={handleReconectar} carregando={processando} />
            </Cartao>

            <Botao titulo="Sair" variante="danger" onPress={logout} style={{ marginTop: spacing.xl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: spacing.xl },
    label: { ...typography.label, marginTop: spacing.sm, marginBottom: 4 },
    valor: { fontSize: 16, color: colors.text, fontWeight: '600' },
});
