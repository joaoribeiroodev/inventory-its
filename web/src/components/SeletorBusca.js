'use client';

// Select com busca por texto — usado em listas longas (setores, por
// exemplo, chegam perto de 40 no levantamento: prédio + departamento),
// onde rolar um <select> nativo procurando um nome é trabalhoso. Digita
// uma parte do nome, filtra na hora, clica (ou Enter) pra escolher.
//
// Uso:
//   <SeletorBusca
//     opcoes={setores}              // [{ id, nome }, ...]
//     valorId={setorId}
//     onSelecionar={(id) => setSetorId(id)}
//     placeholder="Buscar setor..."
//     opcaoVazia="Sem setor inicial"
//   />

import React, { useEffect, useMemo, useRef, useState } from 'react';

function normalizar(texto) {
    return (texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

export default function SeletorBusca({ opcoes, valorId, onSelecionar, placeholder, opcaoVazia }) {
    const [aberto, setAberto] = useState(false);
    const [busca, setBusca] = useState('');
    const containerRef = useRef(null);

    const selecionado = opcoes.find((o) => String(o.id) === String(valorId)) ?? null;

    // Enquanto fechado, o campo mostra o nome do item escolhido (ou
    // vazio). Só vira campo de busca de verdade quando o usuário foca.
    const textoExibido = aberto ? busca : (selecionado?.nome ?? '');

    const opcoesFiltradas = useMemo(() => {
        const alvo = normalizar(busca.trim());
        const lista = alvo ? opcoes.filter((o) => normalizar(o.nome).includes(alvo)) : opcoes;
        return lista;
    }, [opcoes, busca]);

    useEffect(() => {
        function handleClickFora(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setAberto(false);
                setBusca('');
            }
        }
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    function escolher(id) {
        onSelecionar(id);
        setAberto(false);
        setBusca('');
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <input
                className="form-control"
                placeholder={placeholder ?? 'Buscar...'}
                value={textoExibido}
                onFocus={() => { setAberto(true); setBusca(''); }}
                onChange={(e) => setBusca(e.target.value)}
                autoComplete="off"
            />
            {aberto && (
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 20,
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        maxHeight: 240,
                        overflowY: 'auto',
                        background: 'var(--color-surface, #fff)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    }}
                >
                    {opcaoVazia && (
                        <div
                            onMouseDown={(e) => { e.preventDefault(); escolher(''); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-text-muted, #777)' }}
                            className="seletor-busca-opcao"
                        >
                            {opcaoVazia}
                        </div>
                    )}
                    {opcoesFiltradas.map((o) => (
                        <div
                            key={o.id}
                            onMouseDown={(e) => { e.preventDefault(); escolher(o.id); }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontWeight: String(o.id) === String(valorId) ? 600 : 400,
                            }}
                            className="seletor-busca-opcao"
                        >
                            {o.nome}
                        </div>
                    ))}
                    {opcoesFiltradas.length === 0 && (
                        <div style={{ padding: '8px 12px', color: 'var(--color-text-muted, #777)' }}>
                            Nenhum resultado
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
