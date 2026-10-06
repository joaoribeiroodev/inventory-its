'use client';

// Último nível de segurança: entra em ação só se o PRÓPRIO layout
// raiz (RootLayout, com o Nav/AuthProvider/ToastProvider) falhar ao
// renderizar — por isso não pode depender de nada do resto do app, e
// precisa declarar <html>/<body> própria (ver docs do Next.js sobre
// global-error.js). Estilo inline de propósito: não há garantia de
// que globals.css esteja disponível nesse ponto.

import { useEffect } from 'react';

export default function ErroGlobal({ error, reset }) {
    useEffect(() => {
        console.error(error);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Origem-Cliente': 'web',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    nivel: 'erro',
                    origem: 'web',
                    acao: 'erro_critico_global',
                    mensagem: error?.message || 'Falha crítica no painel',
                    detalhes: error?.stack,
                }),
            }).catch(() => {});
        } catch {
            // nunca deixa o próprio relato de erro quebrar a tela de erro
        }
    }, [error]);

    return (
        <html lang="pt-BR">
            <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f3f5f7', color: '#16222b' }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 14,
                        minHeight: '100vh',
                        textAlign: 'center',
                        padding: 24,
                    }}
                >
                    <h1 style={{ fontSize: 32, margin: 0 }}>O painel encontrou um problema</h1>
                    <p style={{ maxWidth: 420, color: '#5b6b79', lineHeight: 1.5 }}>
                        Algo impediu o sistema de carregar normalmente. Isso já foi registrado. Tente
                        recarregar a página — se continuar acontecendo, avise o time de TI.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#0b3b60',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        Recarregar
                    </button>
                </div>
            </body>
        </html>
    );
}
