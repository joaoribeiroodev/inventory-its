'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const ROTULOS_SITUACAO = {
    em_uso: 'Em uso',
    em_manutencao: 'Em manutenção',
    estoque: 'Estoque',
    baixado: 'Baixado',
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

    const podeCriar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';

    async function carregar(filtros = {}) {
        setCarregando(true);
        try {
            setItens(await api.listarItens(filtros));
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

            {carregando ? (
                <div className="loading-shell">Carregando...</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
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
                                    <td>
                                        <Link href={`/itens/${item.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                            {item.codigo}
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
                                        <span className={`badge ${item.etiquetaImpressa ? 'badge-em_uso' : 'badge-neutro'}`}>
                                            {item.etiquetaImpressa ? 'Impressa' : 'Pendente'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {itens.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="table-empty">Nenhum item encontrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
