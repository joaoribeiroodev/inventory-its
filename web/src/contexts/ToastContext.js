'use client';

// Sistema central de notificações do painel — substitui os antigos
// `alert()` do navegador (bloqueantes e feios) por avisos discretos
// no canto da tela, com cor/ícone por tipo. Qualquer página chama
// useToast() e dispara toast.sucesso(...) / toast.erro(...) / etc.

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

const DURACAO_PADRAO = { sucesso: 3500, info: 4000, aviso: 5000, erro: 7000 };

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const proximoId = useRef(1);

    const remover = useCallback((id) => {
        setToasts((atuais) => atuais.filter((t) => t.id !== id));
    }, []);

    const mostrar = useCallback(
        (tipo, mensagem, opcoes = {}) => {
            const id = proximoId.current++;
            const duracao = opcoes.duracao ?? DURACAO_PADRAO[tipo] ?? 4000;

            setToasts((atuais) => [...atuais, { id, tipo, mensagem, titulo: opcoes.titulo }]);

            if (duracao > 0) {
                setTimeout(() => remover(id), duracao);
            }
            return id;
        },
        [remover]
    );

    const toast = {
        sucesso: (mensagem, opcoes) => mostrar('sucesso', mensagem, opcoes),
        erro: (mensagem, opcoes) => mostrar('erro', mensagem, opcoes),
        aviso: (mensagem, opcoes) => mostrar('aviso', mensagem, opcoes),
        info: (mensagem, opcoes) => mostrar('info', mensagem, opcoes),
        remover,
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.tipo}`} role="status">
                        <span className="toast-icone">
                            {t.tipo === 'sucesso' && '✓'}
                            {t.tipo === 'erro' && '✕'}
                            {t.tipo === 'aviso' && '!'}
                            {t.tipo === 'info' && 'i'}
                        </span>
                        <div className="toast-corpo">
                            {t.titulo && <strong className="toast-titulo">{t.titulo}</strong>}
                            <span>{t.mensagem}</span>
                        </div>
                        <button
                            type="button"
                            className="toast-fechar"
                            onClick={() => remover(t.id)}
                            aria-label="Fechar aviso"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
