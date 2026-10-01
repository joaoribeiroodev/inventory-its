'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const ROTULOS_SITUACAO = {
    bom: 'Bom',
    ruim: 'Ruim',
};

export default function ItensPage() {
    return (
        <ProtectedRoute>
            <ListaDeItens />
        </ProtectedRoute>
    );
}

function ListaDeItens() {
    const { usuario } = useAuth();
    const [itens, setItens] = useState([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [selecionados, setSelecionados] = useState(new Set());
    const [excluindo, setExcluindo] = useState(false);

    const podeCriar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';
    // Mesma regra do detalhe do item: só admin exclui.
    const podeExcluir = usuario?.papel === 'admin';

    async function carregar(filtros = {}) {
        setCarregando(true);
        try {
            setItens(await api.listarItens(filtros));
            setSelecionados(new Set());
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    function handleBuscar(e) {
        e.preventDefault();
        carregar(busca ? { busca } : {});
    }

    async function handleExportar() {
        setExportando(true);
        try {
            await api.baixarXlsxItens(busca ? { busca } : {});
        } catch (err) {
            alert(err.message);
        } finally {
            setExportando(false);
        }
    }

    function alternarSelecao(id) {
        setSelecionados((atual) => {
            const novo = new Set(atual);
            if (novo.has(id)) novo.delete(id);
            else novo.add(id);
            return novo;
        });
    }

    function alternarSelecaoTodos() {
        setSelecionados((atual) =>
            atual.size === itens.length ? new Set() : new Set(itens.map((item) => item.id))
        );
    }

    async function handleExcluirSelecionados() {
        const confirmou = window.confirm(
            `Excluir ${selecionados.size} item(ns) selecionado(s)? Isso apaga também o histórico de movimentação deles. Essa ação não pode ser desfeita.`
        );
        if (!confirmou) return;

        setExcluindo(true);
        try {
            await api.excluirItensEmLote([...selecionados]);
            await carregar(busca ? { busca } : {});
        } catch (err) {
            alert(err.message);
        } finally {
            setExcluindo(false);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Itens</h1>
                    <p className="subtitle">Equipamentos e itens cadastrados no inventário</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={handleExportar} disabled={exportando}>
                        {exportando ? 'Exportando...' : 'Exportar XLSX'}
                    </button>
                    {podeCriar && (
                        <Link href="/itens/novo" className="btn btn-accent">+ Novo item</Link>
                    )}
                </div>
            </div>

            <form onSubmit={handleBuscar} className="form-group" style={{ maxWidth: 420 }}>
                <input
                    className="form-control"
                    placeholder="Buscar por código ou descrição..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                />
            </form>

            {podeExcluir && selecionados.size > 0 && (
                <div
                    className="card"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 12,
                        padding: '10px 16px',
                    }}
                >
                    <span>{selecionados.size} item(ns) selecionado(s)</span>
                    <button className="btn btn-danger btn-sm" onClick={handleExcluirSelecionados} disabled={excluindo}>
                        {excluindo ? 'Excluindo...' : 'Excluir selecionados'}
                    </button>
                </div>
            )}

            {carregando ? (
                <div className="loading-shell">Carregando...</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                {podeExcluir && (
                                    <th style={{ width: 32 }}>
                                        <input
                                            type="checkbox"
                                            checked={itens.length > 0 && selecionados.size === itens.length}
                                            onChange={alternarSelecaoTodos}
                                            aria-label="Selecionar todos"
                                        />
                                    </th>
                                )}
                                <th>Código</th>
                                <th>Descrição</th>
                                <th>Setor</th>
                                <th>Situação</th>
                                <th>Etiqueta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.map((item) => (
                                <tr key={item.id}>
                                    {podeExcluir && (
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selecionados.has(item.id)}
                                                onChange={() => alternarSelecao(item.id)}
                                                aria-label={`Selecionar item ${item.codigo ?? item.id}`}
                                            />
                                        </td>
                                    )}
                                    <td>
                                        <Link href={`/itens/${item.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                            {item.codigo ?? 'Sem código ainda'}
                                        </Link>
                                    </td>
                                    <td>{item.descricao}</td>
                                    <td>{item.setorAtual?.nome ?? '—'}</td>
                                    <td>
                                        <span className={`badge badge-${item.situacaoAtual}`}>
                                            {ROTULOS_SITUACAO[item.situacaoAtual] ?? item.situacaoAtual}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${item.etiquetaImpressa ? 'badge-bom' : 'badge-neutro'}`}>
                                            {item.etiquetaImpressa ? 'Impressa' : 'Pendente'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {itens.length === 0 && (
                                <tr>
                                    <td colSpan={podeExcluir ? 6 : 5} className="table-empty">Nenhum item encontrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
