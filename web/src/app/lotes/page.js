'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/Modal';
import { api } from '../../services/api';

export default function LotesPage() {
    return (
        <ProtectedRoute papeis={['admin', 'cadastrador']}>
            <GestaoDeLotes />
        </ProtectedRoute>
    );
}

function GestaoDeLotes() {
    const [pendentes, setPendentes] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [gerando, setGerando] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [loteSelecionadoId, setLoteSelecionadoId] = useState(null);
    // Quais itens pendentes vão entrar no próximo lote. Começa com
    // todos marcados (comportamento de antes, quando não dava pra
    // escolher), mas agora pode desmarcar o que não quer imprimir
    // agora.
    const [selecionados, setSelecionados] = useState(new Set());

    async function carregar() {
        setCarregando(true);
        try {
            const itens = await api.listarLotesPendentes();
            setPendentes(itens);
            setSelecionados(new Set(itens.map((item) => item.id)));
            setLotes(await api.listarLotes());
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

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
            atual.size === pendentes.length ? new Set() : new Set(pendentes.map((item) => item.id))
        );
    }

    async function handleGerarLote() {
        setGerando(true);
        try {
            await api.gerarLote({ itemIds: [...selecionados] });
            carregar();
        } catch (err) {
            alert(err.message);
        } finally {
            setGerando(false);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Etiquetas</h1>
                    <p className="subtitle">Lotes de QR Code para transferir à PT-7600</p>
                </div>
            </div>

            <div className="section">
                <h2>Itens pendentes de etiqueta ({pendentes.length})</h2>
                <p className="subtitle" style={{ maxWidth: 640, marginTop: 4 }}>
                    Escolha quais itens entram no lote (todos vêm marcados por padrão) e gere um
                    CSV pronto para importar como banco de dados no template do P-touch Editor e
                    transferir para a etiquetadora PT-7600.
                </p>

                {carregando ? (
                    <div className="loading-shell">Carregando...</div>
                ) : (
                    <div className="table-wrap" style={{ marginTop: 12 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 32 }}>
                                        <input
                                            type="checkbox"
                                            checked={pendentes.length > 0 && selecionados.size === pendentes.length}
                                            onChange={alternarSelecaoTodos}
                                            aria-label="Selecionar todos"
                                        />
                                    </th>
                                    <th>Código</th>
                                    <th>Descrição</th>
                                    <th>Setor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendentes.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selecionados.has(item.id)}
                                                onChange={() => alternarSelecao(item.id)}
                                                aria-label={`Selecionar item ${item.codigo ?? item.id}`}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {item.codigo ?? <span className="subtitle">gerado ao imprimir</span>}
                                        </td>
                                        <td>{item.descricao}</td>
                                        <td>{item.setorAtual?.nome ?? '—'}</td>
                                    </tr>
                                ))}
                                {pendentes.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="table-empty">Nenhum item pendente</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <button
                    className="btn btn-accent"
                    style={{ marginTop: 16 }}
                    disabled={gerando || selecionados.size === 0}
                    onClick={handleGerarLote}
                >
                    {gerando ? 'Gerando...' : `Gerar lote com ${selecionados.size} item(ns) selecionado(s)`}
                </button>
            </div>

            <div className="section">
                <h2>Histórico de lotes</h2>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Qtd. itens</th>
                                <th>Gerado por</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lotes.map((lote) => (
                                <tr key={lote.id}>
                                    <td>{new Date(lote.criadoEm).toLocaleString('pt-BR')}</td>
                                    <td>{lote.quantidadeItens}</td>
                                    <td>{lote.usuario?.nome}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setLoteSelecionadoId(lote.id)}>
                                                Ver itens
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => api.baixarCsvLote(lote.id)}>
                                                Baixar CSV
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {lotes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="table-empty">Nenhum lote gerado ainda</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ModalItensDoLote loteId={loteSelecionadoId} onFechar={() => setLoteSelecionadoId(null)} />
        </div>
    );
}

function ModalItensDoLote({ loteId, onFechar }) {
    const [lote, setLote] = useState(null);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (!loteId) {
            setLote(null);
            return;
        }
        setCarregando(true);
        api.buscarLote(loteId)
            .then(setLote)
            .finally(() => setCarregando(false));
    }, [loteId]);

    return (
        <Modal titulo={lote ? `Itens do lote #${lote.id}` : 'Itens do lote'} aberto={!!loteId} onFechar={onFechar}>
            {carregando || !lote ? (
                <div className="loading-shell" style={{ minHeight: 120 }}>Carregando...</div>
            ) : (
                <>
                    <p className="subtitle" style={{ marginTop: -8, marginBottom: 12 }}>
                        Gerado em {new Date(lote.criadoEm).toLocaleString('pt-BR')} por {lote.usuario?.nome}
                        {lote.observacao && ` — ${lote.observacao}`}
                    </p>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Descrição</th>
                                    <th>Setor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lote.itens.map(({ item }) => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 600 }}>{item.codigo}</td>
                                        <td>{item.descricao}</td>
                                        <td>{item.setorAtual?.nome ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Modal>
    );
}
