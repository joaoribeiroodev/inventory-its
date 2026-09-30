'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const salvo = localStorage.getItem('usuario');
        if (salvo) setUsuario(JSON.parse(salvo));
        setCarregando(false);
    }, []);

    async function login(email, senha) {
        const resposta = await api.login(email, senha);
        localStorage.setItem('auth_token', resposta.token);
        localStorage.setItem('usuario', JSON.stringify(resposta.usuario));
        setUsuario(resposta.usuario);
    }

    function logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('usuario');
        setUsuario(null);
        router.push('/login');
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
