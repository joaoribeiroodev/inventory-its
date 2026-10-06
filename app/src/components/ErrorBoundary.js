// Error boundary de classe (React só suporta esse mecanismo via
// classe, mesmo em 2026 — não existe hook equivalente) envolvendo o
// app inteiro (ver App.js). Sem isso, um erro de renderização em
// qualquer tela trava o app inteiro na "tela vermelha" nativa, sem
// nenhuma forma de voltar sem fechar e abrir de novo. Com isso, pelo
// menos aparece uma tela amigável com botão de "Tentar novamente".
//
// Também reporta o erro ao log central do sistema (POST /logs) pra
// aparecer no Monitoramento do painel web — best-effort: se o
// aparelho estiver offline, o fetch falha silenciosamente (o app
// mobile não tem fila de retry para isso, ao contrário dos eventos
// de movimentação — não vale a complexidade para só um relato de
// crash).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Botao from './Botao';
import { colors, spacing, typography } from '../theme';
import { getServerUrl, getToken, getUsuarioAtual } from '../database/queries';

async function reportarCrash(error, info) {
    try {
        const baseUrl = await getServerUrl();
        const token = await getToken();
        const usuario = await getUsuarioAtual();
        await fetch(`${baseUrl}/api/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Origem-Cliente': 'app',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                nivel: 'erro',
                origem: 'app',
                acao: 'erro_renderizacao_app',
                mensagem: error?.message || 'Erro inesperado no app',
                detalhes: `${error?.stack ?? ''}\n${info?.componentStack ?? ''}`.trim(),
                rota: `app (${usuario?.nome ?? 'não logado'})`,
            }),
        });
    } catch {
        // offline ou servidor fora do ar — sem fila de retry pra isso,
        // só desiste silenciosamente (ver comentário acima)
    }
}

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { temErro: false };
    }

    static getDerivedStateFromError() {
        return { temErro: true };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error);
        reportarCrash(error, info);
    }

    handleTentarNovamente = () => {
        this.setState({ temErro: false });
    };

    render() {
        if (this.state.temErro) {
            return (
                <View style={styles.container}>
                    <Text style={styles.titulo}>Algo deu errado</Text>
                    <Text style={styles.texto}>
                        O app encontrou um problema inesperado nessa tela. Isso já foi registrado. Toque
                        no botão abaixo para tentar novamente.
                    </Text>
                    <Botao titulo="Tentar novamente" onPress={this.handleTentarNovamente} />
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        gap: spacing.md,
        backgroundColor: colors.bg,
    },
    titulo: { ...typography.title },
    texto: { ...typography.subtitle, textAlign: 'center', marginBottom: spacing.sm },
});
