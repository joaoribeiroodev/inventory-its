// Cadastro de novo item — exige conexão (ver decisão de
// arquitetura: geração de código único não é segura offline).

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../services/api';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import Cartao from '../components/Cartao';
import { colors, spacing, typography } from '../theme';

export default function ItemFormScreen({ navigation }) {
    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState('');
    const [setores, setSetores] = useState([]);
    const [setorId, setSetorId] = useState(null);
    const [situacaoInicial, setSituacaoInicial] = useState('bom');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        api.buscarSetores().then(setSetores).catch(() => {});
    }, []);

    async function handleSalvar() {
        if (!descricao.trim()) {
            Alert.alert('Descrição é obrigatória');
            return;
        }

        setSalvando(true);
        try {
            await api.criarItem({
                descricao: descricao.trim(),
                categoria: categoria.trim() || null,
                setorInicialId: setorId,
                situacaoInicial,
            });
            navigation.goBack();
        } catch (err) {
            Alert.alert('Erro ao criar item', err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
            <Cartao>
                <Campo label="Descrição" placeholder="Ex: Notebook Dell Latitude" value={descricao} onChangeText={setDescricao} />
                <Campo label="Categoria (opcional)" placeholder="Ex: Informática" value={categoria} onChangeText={setCategoria} />

                <Text style={styles.label}>Setor inicial</Text>
                <View style={styles.pickerBorda}>
                    <Picker selectedValue={setorId} onValueChange={setSetorId}>
                        <Picker.Item label="Sem setor inicial" value={null} />
                        {setores.map((s) => (
                            <Picker.Item key={s.id} label={s.nome} value={s.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Situação</Text>
                <View style={styles.pickerBorda}>
                    <Picker selectedValue={situacaoInicial} onValueChange={setSituacaoInicial}>
                        <Picker.Item label="Bom" value="bom" />
                        <Picker.Item label="Ruim" value="ruim" />
                    </Picker>
                </View>

                <Botao titulo="Salvar item" variante="accent" onPress={handleSalvar} carregando={salvando} style={{ marginTop: spacing.md }} />
            </Cartao>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: spacing.lg },
    label: { ...typography.label, marginBottom: spacing.xs },
    pickerBorda: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        marginBottom: spacing.xs,
    },
});
