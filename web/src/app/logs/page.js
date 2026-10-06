'use client';

// Tela de Monitoramento (admin): visão central de tudo que acontece
// no sistema — sucessos e erros, vindos do painel web, do app mobile
// e do próprio backend. É a "ferramenta de alta execução" que dá ao
// administrador controle sobre o que está rolando, sem precisar
// abrir console/logs de servidor (ver backend/src/utils/logger.js e
// o model LogSistema).

import React, { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../services/api';

const ROTULOS_NIVEL = { sucesso: 'Sucesso', erro: 'Erro', aviso: 'Aviso', info: 'Info' };
const ROTULOS_ORIGEM = { web: 'Painel web', app: 'App mobile', backend: 'Servidor' };

function formatarData(iso) {
    return new Date(iso).toLocaleString('pt-BR');
}

export default function LogsPage() {
    return (
        <ProtectedRoute papeis={['admin']}>
            <Monitoramento />
        </ProtectedRoute>
    );
}

function Monitoramento() {
    const [resumo, setResumo] = useState(null);
    const [itens, setItens] = useState([]);
    const [total, setTotal] = useState(0);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [carregando, setCarregando] = useState(true);
    const [expandidoId, setExpandidoId] = useState(null);
    const [autoAtualizar, setAutoAtualizar] = useState(true);

    const [nivel, setNivel] = useState('');
    const [origem, setOrigem] = useState('');
    const [busca, setBusca] = useState('');

    const carregar = useCallback(async () => {
        try {
            const filtros = { page: pagina, pageSize: 30 };
            if (nivel) filtros.nivel = nivel;
            if (origem) filtros.origem = origem;
            if (busca.trim()) filtros.busca = busca.trim();

            const [resumoResp, listaResp] = await Promise.all([api.resumoLogs(), api.listarLogs(filtros)]);
            setResumo(resumoResp);
            setItens(listaResp.itens);
            setTotal(listaResp.total);
            setTotalPaginas(listaResp.totalPaginas);
        } catch {
            // Falha ao carregar o próprio monitoramento não dispara toast
            // (evita ruído se o admin estiver numa rede instável) — a
            // tela simplesmente mantém os últimos dados carregados.
        } finally {
            setCarregando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagina, nivel, origem, busca]);

    useEffect(() => {
        setCarregando(true);
        carregar();
    }, [carregar]);

    // Atualização automática a cada 20s — mantém a tela "viva" sem
    // precisar apertar F5, útil pra deixar aberta num monitor.
    useEffect(() => {
        if (!autoAtualizar) return;
        const timer = setInterval(carregar, 20000);
        return () => clearInterval(timer);
    }, [autoAtualizar, carregar]);

    function limparFiltros() {
        setNivel('');
        setOrigem('');
        setBusca('');
        setPagina(1);
    }

    const card24h = resumo?.porNivel24h ?? {};

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Monitoramento</h1>
                    <p className="subtitle">Eventos do sistema — painel web, app mobile e servidor</p>
                </div>
                <div className="page-header-actions">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        <input
                            type="checkbox"
                            checked={autoAtualizar}
                            onChange={(e) => setAutoAtualizar(e.target.checked)}
                        />
                        Atualizar automaticamente
                    </label>
                    <button className="btn btn-secondary btn-sm" onClick={carregar}>
                        Atualizar agora
                    </button>
                </div>
            </div>

            <div className="logs-resumo">
                <div className="logs-card card-erro">
                    <div className="logs-card-valor">{card24h.erro ?? 0}</div>
                    <div className="logs-card-rotulo">Erros (24h)</div>
                </div>
                <div className="logs-card card-aviso">
                    <div className="logs-card-valor">{card24h.aviso ?? 0}</div>
                    <div className="logs-card-rotulo">Avisos (24h)</div>
                </div>
                <div className="logs-card card-sucesso">
                    <div className="logs-card-valor">{card24h.sucesso ?? 0}</div>
                    <div className="logs-card-rotulo">Sucessos (24h)</div>
                </div>
                <div className="logs-card card-info">
                    <div className="logs-card-valor">
                        {(resumo?.porOrigem24h?.web ?? 0) + (resumo?.porOrigem24h?.app ?? 0) + (resumo?.porOrigem24h?.backend ?? 0)}
                    </div>
                    <div className="logs-card-rotulo">Total de eventos (24h)</div>
                </div>
            </div>

            <div className="logs-filtros">
                <select className="form-control" style={{ width: 150 }} value={nivel} onChange={(e) => { setNivel(e.target.value); setPagina(1); }}>
                    <option value="">Todos os níveis</option>
                    <option value="erro">Erro</option>
                    <option value="aviso">Aviso</option>
                    <option value="sucesso">Sucesso</option>
                    <option value="info">Info</option>
                </select>
                <select className="form-control" style={{ width: 170 }} value={origem} onChange={(e) => { setOrigem(e.target.value); setPagina(1); }}>
                    <option value="">Todas as origens</option>
                    <option value="web">Painel web</option>
                    <option value="app">App mobile</option>
                    <option value="backend">Servidor</option>
                </select>
                <input
                    className="form-control"
                    style={{ flex: 1, minWidth: 180 }}
                    placeholder="Buscar por ação, mensagem ou usuário..."
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                />
                {(nivel || origem || busca) && (
                    <button className="btn btn-secondary btn-sm" onClick={limparFiltros}>
                        Limpar filtros
                    </button>
                )}
            </div>

            {carregando ? (
                <div className="loading-shell">Carregando...</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Quando</th>
                                <th>Nível</th>
                                <th>Origem</th>
                                <th>Ação</th>
                                <th>Mensagem</th>
                                <th>Usuário</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        style={{ cursor: log.detalhes ? 'pointer' : 'default' }}
                                        onClick={() => log.detalhes && setExpandidoId(expandidoId === log.id ? null : log.id)}
                                    >
                                        <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--color-text-muted)' }}>
                                            {formatarData(log.criadoEm)}
                                        </td>
                                        <td>
                                            <span className={`log-badge-nivel ${log.nivel}`}>{ROTULOS_NIVEL[log.nivel] ?? log.nivel}</span>
                                        </td>
                                        <td>
                                            <span className="log-badge-origem">{ROTULOS_ORIGEM[log.origem] ?? log.origem}</span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{log.acao}</td>
                                        <td style={{ fontSize: 13 }}>{log.mensagem}</td>
                                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{log.usuarioNome ?? '—'}</td>
                                    </tr>
                                    {expandidoId === log.id && log.detalhes && (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="log-linha-detalhes">{log.detalhes}</div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {itens.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="table-empty">Nenhum evento encontrado com esses filtros</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <button className="btn btn-secondary btn-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                        ← Anterior
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Página {pagina} de {totalPaginas} ({total} eventos)
                    </span>
                    <button className="btn btn-secondary btn-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                        Próxima →
                    </button>
                </div>
            )}
        </div>
    );
}
