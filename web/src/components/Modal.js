'use client';

import React, { useEffect } from 'react';

// Modal genérico reaproveitável — substitui os formulários "soltos"
// no fim das páginas de Usuários/Setores por um diálogo de verdade.
// Fecha com Esc, clique fora, ou pelo botão de fechar.
export default function Modal({ titulo, aberto, onFechar, children }) {
    useEffect(() => {
        if (!aberto) return;
        function handleKeyDown(e) {
            if (e.key === 'Escape') onFechar();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [aberto, onFechar]);

    if (!aberto) return null;

    return (
        <div className="modal-overlay" onClick={onFechar}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ margin: 0 }}>{titulo}</h2>
                    <button type="button" className="modal-close" onClick={onFechar} aria-label="Fechar">
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
