// Tela principal do app: abre a câmera, lê o QR Code, resolve o
// item no cache LOCAL (funciona 100% offline) e navega pro detalhe.

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { buscarItensPorCodigo } from '../database/queries';
import Botao from '../components/Botao';
import { colors, radius, spacing, typography } from '../theme';

// Quantas leituras seguidas IGUAIS a câmera precisa decodificar antes
// de confiar no resultado. Código de barras Code-128 (etiquetas de
// patrimônio físicas antigas) é bem mais sensível a erro de leitura
// num único frame do que QR Code — um ângulo ruim ou desfoque troca um
// dígito e devolve um número que não existe (ou existe, mas é de
// outro item). Exigir a mesma leitura 3x seguidas filtra bem mais
// ruído de frame isolado do que 2x, sem atraso perceptível pro
// usuário (ainda é questão de frações de segundo na câmera).
//
// IMPORTANTE: isso só protege contra uma leitura ruim OCASIONAL. Não
// protege contra o caso mais perigoso — a câmera decodificar ERRADO
// de forma CONSISTENTE (ex.: ângulo/luz ruins fazem o decodificador
// "ler" sempre o mesmo número errado, que passa no checksum do
// Code-128 por coincidência e não dispara erro nenhum). Pra esse
// caso, a defesa real é a confirmação visual antes de agir — ver
// handleQrLido() abaixo, que sempre mostra o código lido pro usuário
// conferir contra a etiqueta física antes de navegar pro item.
const LEITURAS_NECESSARIAS = 3;

export default function ScannerScreen({ navigation }) {
    const [permissao, solicitarPermissao] = useCameraPermissions();
    const [travado, setTravado] = useState(false);
    const ultimaLeituraRef = useRef({ valor: null, contagem: 0 });

    if (!permissao) {
        return <View style={styles.container} />;
    }

    if (!permissao.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.texto}>Precisamos da câmera para ler o QR Code das etiquetas.</Text>
                <Botao titulo="Permitir acesso" variante="accent" onPress={solicitarPermissao} style={{ marginTop: spacing.md }} />
            </SafeAreaView>
        );
    }

    async function handleQrLido({ data }) {
        if (travado) return; // evita disparar várias leituras da mesma etiqueta

        const codigo = data.trim();
        const ultima = ultimaLeituraRef.current;

        // Só age depois de ver a MESMA leitura se repetir — um frame
        // isolado com erro (comum em código de barras Code-128 das
        // etiquetas físicas antigas) não passa a confiança sozinho.
        if (ultima.valor === codigo) {
            ultima.contagem += 1;
        } else {
            ultimaLeituraRef.current = { valor: codigo, contagem: 1 };
            return;
        }
        if (ultima.contagem < LEITURAS_NECESSARIAS) return;

        ultimaLeituraRef.current = { valor: null, contagem: 0 };
        setTravado(true);

        // "codigo" não é mais único no cache local (uma etiqueta física
        // pode estar colada em mais de um bem por engano — ver
        // "patrimonio_duplicado") — a busca sempre pode voltar 0, 1 ou
        // vários itens.
        const candidatos = await buscarItensPorCodigo(codigo);

        if (candidatos.length === 0) {
            // Nada no cache local com esse código — ou é um item realmente
            // novo (etiqueta nunca cadastrada), ou foi cadastrado há pouco
            // e ainda não sincronizou neste aparelho. Avisa e já oferece ir
            // direto pro cadastro, com o código pré-preenchido.
            Alert.alert(
                'Item não reconhecido',
                `O código "${codigo}" não foi encontrado no cache local. Se foi cadastrado recentemente, sincronize na tela de Configurações. Ou cadastre um item novo com esse código.`,
                [
                    { text: 'Cancelar', style: 'cancel', onPress: () => setTravado(false) },
                    {
                        text: 'Cadastrar item novo',
                        onPress: () => {
                            navigation.navigate('ItemForm', { codigo });
                            setTimeout(() => setTravado(false), 1500);
                        },
                    },
                ]
            );
            return;
        }

        if (candidatos.length === 1) {
            const item = candidatos[0];
            // Confirmação obrigatória antes de abrir o item — a câmera
            // pode decodificar um código de barras ERRADO de forma
            // consistente (não é ruído de frame isolado, que já é
            // filtrado acima pelas leituras repetidas) e ainda assim
            // passar no checksum do Code-128, resolvendo pra outro item
            // que existe de verdade no cache. Sem esse passo, o app abria
            // direto o item errado e uma movimentação registrada ali
            // ficava incorretamente atribuída a ele. Mostrar o código
            // lido (não só a descrição do item) é o que permite o
            // usuário notar a discrepância contra a etiqueta física.
            Alert.alert(
                'Confirmar item',
                `Código lido: "${codigo}"\n\n${item.descricao}${item.setor_atual ? ` — ${item.setor_atual}` : ''}\n\nConfira se o número bate com o impresso na etiqueta física antes de continuar.`,
                [
                    { text: 'Cancelar', style: 'cancel', onPress: () => setTravado(false) },
                    {
                        text: 'Confirmar',
                        onPress: () => {
                            navigation.navigate('ItemDetalhe', { id: item.id });
                            setTimeout(() => setTravado(false), 1500);
                        },
                    },
                ]
            );
            return;
        }

        Alert.alert(
            'Etiqueta duplicada',
            `Código lido: "${codigo}"\n\nEssa etiqueta está colada em mais de um item. Qual deles é?`,
            [
                ...candidatos.map((c) => ({
                    text: `${c.descricao} — ${c.setor_atual ?? 'sem setor'}`,
                    onPress: () => {
                        navigation.navigate('ItemDetalhe', { id: c.id });
                        setTimeout(() => setTravado(false), 1500);
                    },
                })),
                { text: 'Cancelar', style: 'cancel', onPress: () => setTravado(false) },
            ]
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
                onBarcodeScanned={travado ? undefined : handleQrLido}
            />

            <SafeAreaView style={styles.overlayTop} pointerEvents="none">
                <Text style={styles.marca}>Inventário ITS</Text>
            </SafeAreaView>

            <View style={styles.miraContainer} pointerEvents="none">
                <View style={styles.mira} />
            </View>

            <View style={styles.overlayBottom} pointerEvents="none">
                <Text style={styles.instrucao}>Aponte a câmera para o QR Code da etiqueta</Text>
            </View>
        </View>
    );
}

const TAMANHO_MIRA = 240;

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    texto: { color: colors.text, textAlign: 'center', margin: spacing.lg, ...typography.body },
    overlayTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: spacing.md,
    },
    marca: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
        backgroundColor: 'rgba(11, 59, 96, 0.55)',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        overflow: 'hidden',
    },
    miraContainer: {
        position: 'absolute',
        width: TAMANHO_MIRA,
        height: TAMANHO_MIRA,
        alignSelf: 'center',
        top: '50%',
        marginTop: -TAMANHO_MIRA / 2,
    },
    mira: {
        flex: 1,
        borderWidth: 3,
        borderColor: colors.accent,
        borderRadius: radius.lg,
    },
    overlayBottom: {
        position: 'absolute',
        bottom: 48,
        left: 24,
        right: 24,
        alignItems: 'center',
    },
    instrucao: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        overflow: 'hidden',
    },
});
