// Tela principal do app: abre a câmera, lê o QR Code, resolve o
// item no cache LOCAL (funciona 100% offline) e navega pro detalhe.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { buscarItemPorCodigo, buscarItensPorEtiqueta } from '../database/queries';
import Botao from '../components/Botao';
import { colors, radius, spacing, typography } from '../theme';

export default function ScannerScreen({ navigation }) {
    const [permissao, solicitarPermissao] = useCameraPermissions();
    const [travado, setTravado] = useState(false);

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
        setTravado(true);

        const codigo = data.trim();
        const item = await buscarItemPorCodigo(codigo);

        if (item) {
            navigation.navigate('ItemDetalhe', { codigo: item.codigo });
            // Libera a trava depois de um instante, para quando o usuário voltar pra essa tela
            setTimeout(() => setTravado(false), 1500);
            return;
        }

        // Não achou pelo código exato — pode ser uma etiqueta de
        // patrimônio física colada em mais de um bem (ver levantamento
        // patrimonial). Nesse caso vários itens compartilham o mesmo
        // número de etiqueta; deixa a pessoa escolher qual é o certo.
        const candidatos = await buscarItensPorEtiqueta(codigo);

        if (candidatos.length === 0) {
            Alert.alert(
                'Item não reconhecido',
                `O código "${codigo}" não foi encontrado no cache local. Se o item foi cadastrado recentemente, sincronize na tela de Configurações.`,
                [{ text: 'OK', onPress: () => setTravado(false) }]
            );
            return;
        }

        if (candidatos.length === 1) {
            navigation.navigate('ItemDetalhe', { codigo: candidatos[0].codigo });
            setTimeout(() => setTravado(false), 1500);
            return;
        }

        Alert.alert(
            'Etiqueta duplicada',
            'Essa etiqueta está colada em mais de um item. Qual deles é?',
            [
                ...candidatos.map((c) => ({
                    text: `${c.descricao} — ${c.setor_atual ?? 'sem setor'}`,
                    onPress: () => {
                        navigation.navigate('ItemDetalhe', { codigo: c.codigo });
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
