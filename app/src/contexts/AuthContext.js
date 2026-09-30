// Estado de autenticação. Carrega a sessão salva no SQLite ao
// abrir o app — importante para continuar logado mesmo offline
// (a decisão de arquitetura é: app continua operando mesmo com
// token expirado, sem sinal para revalidar).

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { getUsuarioAtual, salvarSessao, limparSessao } from '../database/queries';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        (async () => {
            const salvo = await getUsuarioAtual();
            setUsuario(salvo);
            setCarregando(false);
        })();
    }, []);

    async function login(email, senha) {
        // Login em si EXIGE conexão — não há como validar credenciais
        // offline sem a senha estar salva em claro no aparelho.
        const resposta = await api.login(email, senha);
        await salvarSessao(resposta);
        setUsuario({ nome: resposta.usuario.nome, papel: resposta.usuario.papel });
    }

    async function logout() {
        await limparSessao();
        setUsuario(null);
    }

    return (
        <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
