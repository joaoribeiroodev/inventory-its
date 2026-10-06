'use client';

// Error boundary do Next.js: captura qualquer erro de renderização
// não tratado dentro de uma página (ver docs do App Router) e mostra
// uma tela amigável em vez da tela branca/stack trace padrão do
// React. Também reporta o erro ao log central do sistema, pra o
// admin ver isso na tela de Monitoramento (/logs) mesmo sem o
// usuário avisar que algo quebrou.
//
// Fica dentro do layout raiz (Nav/Toast continuam de pé) — diferente
// de global-error.js, que só entra em ação se o próprio layout falhar.

import { useEffect } from 'react';

export default function ErroDaPagina({ error, reset }) {
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
                    acao: 'erro_renderizacao',
                    mensagem: error?.message || 'Erro inesperado na interface',
                    detalhes: error?.stack,
                    rota: typeof window !== 'undefined' ? window.location.pathname : null,
                }),
            }).catch(() => {});
        } catch {
            // nunca deixa o próprio relato de erro quebrar a tela de erro
        }
    }, [error]);

    return (
        <div className="erro-boundary-shell">
            <h1 style={{ fontSize: 40 }}>Algo deu errado</h1>
            <p className="subtitle" style={{ maxWidth: 420 }}>
                Encontramos um problema inesperado nessa tela. Isso já foi registrado para o time de TI
                acompanhar. Você pode tentar novamente ou voltar para a lista de itens.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-accent" onClick={() => reset()}>
                    Tentar novamente
                </button>
                <a className="btn btn-secondary" href="/itens">
                    Voltar para Itens
                </a>
            </div>
        </div>
    );
}
