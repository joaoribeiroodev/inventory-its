'use client';

// Protege uma página: redireciona pro login se não houver sessão,
// e opcionalmente restringe por papel (ex: <ProtectedRoute papeis={['admin']}>)

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, papeis }) {
    const { usuario, carregando } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (carregando) return;
        if (!usuario) {
            router.push('/login');
            return;
        }
        if (papeis && !papeis.includes(usuario.papel)) {
            router.push('/itens');
        }
    }, [usuario, carregando]);

    if (carregando) return <div className="loading-shell">Carregando...</div>;
    if (!usuario) return null;
    if (papeis && !papeis.includes(usuario.papel)) return null;

    return children;
}
