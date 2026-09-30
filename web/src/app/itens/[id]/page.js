'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';

const ROTULOS_SITUACAO = {
    em_uso: 'Em uso',
    em_manutencao: 'Em manutenção',
    estoque: 'Estoque',
    baixado: 'Baixado',
};

export default function ItemDetalhePage() {
    return (
        <ProtectedRoute>
            <DetalheDoItem />
        </ProtectedRoute>
    );
}

function DetalheDoItem() {
    const { id } = useParams();
    const { usuario } = useAuth();
    const [item, setItem] = useState(null);
    const [eventos, setEventos] = useState([]);
    const [editando, setEditando] = useState(false);
    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState('');

    const podeEditar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';

    async function carregar() {
        const itemAtual = await api.buscarItem(id);
        const historico = await api.buscarHistoricoItem(id);
        setItem(itemAtual);
        setEventos(historico);
        setDescricao(itemAtual.descricao);
        setCategoria(itemAtual.categoria ?? '');
    }

    useEffect(() => {
        carregar();
    }, [id]);

    async function salvarEdicao() {
        await api.atualizarItem(id, { descricao, categoria: categoria || null });
        setEditando(false);
        carregar();
    }

    if (!item) return <div className="loading-shell">Carregando...</div>;

    return (
        <div>
            <p className="subtitle" style={{ marginBottom: 0, fontWeight: 600 }}>{item.codigo}</p>

            <div className="page-header" style={{ marginTop: 4 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                    {editando ? (
                        <div className="card" style={{ maxWidth: 480 }}>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <input className="form-control" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Categoria" />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" onClick={salvarEdicao}>Salvar</button>
                                <button className="btn btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ marginTop: 4, marginBottom: 4 }}>{item.descricao}</h1>
                            {item.categoria && <p className="subtitle">{item.categoria}</p>}
                            {podeEditar && (
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setEditando(true)}>
                                    Editar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="card info-grid">
                <div className="info-item">
                    <div className="info-item-label">Setor atual</div>
                    <div className="info-item-value">{item.setorAtual?.nome ?? '—'}</div>
                </div>
                <div className="info-item">
                    <div className="info-item-label">Situação</div>
                    <div className="info-item-value">
                        <span className={`badge badge-${item.situacaoAtual}`}>
                            {ROTULOS_SITUACAO[item.situacaoAtual] ?? item.situacaoAtual}
                        </span>
                    </div>
                </div>
                <div className="info-item">
                    <div className="info-item-label">Etiqueta</div>
                    <div className="info-item-value">
                        <span className={`badge ${item.etiquetaImpressa ? 'badge-em_uso' : 'badge-neutro'}`}>
                            {item.etiquetaImpressa ? 'Impressa' : 'Pendente'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2>Histórico de movimentação</h2>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Setor</th>
                                <th>Situação</th>
                                <th>Usuário</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eventos.map((ev) => (
                                <tr key={ev.id}>
                                    <td>{new Date(ev.timestampEvento).toLocaleString('pt-BR')}</td>
                                    <td>{ev.setorNovo?.nome ?? '—'}</td>
                                    <td>{ev.situacaoNova ? (ROTULOS_SITUACAO[ev.situacaoNova] ?? ev.situacaoNova) : '—'}</td>
                                    <td>{ev.usuario?.nome}</td>
                                </tr>
                            ))}
                            {eventos.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="table-empty">Nenhuma movimentação registrada ainda</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
