import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import { colors, spacing, typography } from '../theme';

export default function LoginScreen() {
    const { login } = useAuth();
    const [identificador, setIdentificador] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(false);

    async function handleLogin() {
        setErro(null);
        setCarregando(true);
        try {
            await login(identificador, senha);
        } catch (err) {
            setErro(
                err.status === 401
                    ? 'Usuário/email ou senha incorretos'
                    : 'Não foi possível conectar ao servidor. Verifique o endereço nas Configurações.'
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Image source={require('../../assets/logo.png')} style={styles.logo} />
                <Text style={styles.titulo}>Inventário ITS</Text>
                <Text style={styles.subtitulo}>Internacional Travessias</Text>

                <View style={styles.form}>
                    <Campo
                        label="Usuário ou email"
                        placeholder="seu.usuario ou seu.nome@empresa.com"
                        autoCapitalize="none"
                        value={identificador}
                        onChangeText={setIdentificador}
                    />
                    <Campo
                        label="Senha"
                        placeholder="••••••••"
                        secureTextEntry
                        value={senha}
                        onChangeText={setSenha}
                    />

                    {erro && <Text style={styles.erro}>{erro}</Text>}

                    <Botao titulo="Entrar" onPress={handleLogin} carregando={carregando} style={{ marginTop: spacing.sm }} />
                </View>

                <Text style={styles.aviso}>
                    O login exige conexão com o servidor na primeira vez. Depois, o app continua
                    funcionando mesmo sem sinal.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, maxWidth: 420, width: '100%', alignSelf: 'center' },
    logo: { width: 88, height: 88, borderRadius: 44, alignSelf: 'center', marginBottom: spacing.md },
    titulo: { ...typography.title, textAlign: 'center' },
    subtitulo: { ...typography.subtitle, textAlign: 'center', marginBottom: spacing.xl },
    form: { width: '100%' },
    erro: { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' },
    aviso: { marginTop: spacing.xl, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
