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
    const [setores, setSetores] = useState([]);
    const [busca, setBusca] = useState('');
    const [setorId, setSetorId] = useState('');
    const [situacao, setSituacao] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [selecionados, setSelecionados] = useState(new Set());
    const [excluindo, setExcluindo] = useState(false);

    const podeCriar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';
    // Mesma regra do detalhe do item: só admin exclui.
    const podeExcluir = usuario?.papel === 'admin';
    const temFiltroAtivo = !!(busca || setorId || situacao);

    function filtrosAtuais() {
        const filtros = {};
        if (busca.trim()) filtros.busca = busca.trim();
        if (setorId) filtros.setorId = setorId;
        if (situacao) filtros.situacao = situacao;
        return filtros;
    }

    async function carregar(filtros) {
        setCarregando(true);
        try {
            setItens(await api.listarItens(filtros));
            setSelecionados(new Set());
        } catch (err) {
            alert(err.message);
        } finally {
            setCarregando(false);
        }
    }

    // Carrega a lista de setores uma vez, pro filtro por setor.
    useEffect(() => {
        api.listarSetores().then(setSetores).catch(() => {});
    }, []);

    // Busca ao vivo: qualquer mudança nos filtros (texto, setor ou
    // situação) recarrega a lista automaticamente, com um pequeno
    // atraso pra não disparar uma requisição a cada letra digitada.
    useEffect(() => {
        const timer = setTimeout(() => {
            carregar(filtrosAtuais());
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca, setorId, situacao]);

    function handleLimparFiltros() {
        setBusca('');
        setSetorId('');
        setSituacao('');
    }

    // Texto curto descrevendo o filtro ativo, só pra exibir perto do
    // botão de exportar e pro nome do arquivo baixado (ver
    // api.baixarXlsxItens) — deixa claro o que vai sair na planilha
    // sem precisar abrir o arquivo.
    function descricaoFiltro() {
        const partes = [];
        if (setorId) {
            const setor = setores.find((s) => String(s.id) === String(setorId));
            if (setor) partes.push(setor.nome);
        }
        if (situacao) partes.push(ROTULOS_SITUACAO[situacao] ?? situacao);
        if (busca.trim()) partes.push(`"${busca.trim()}"`);
        return partes.join(' · ');
    }

    function slugify(texto) {
        return texto
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '') // remove acentos
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    async function handleExportar() {
        setExportando(true);
        try {
            const descricao = descricaoFiltro();
            await api.baixarXlsxItens(filtrosAtuais(), descricao ? slugify(descricao) : '');
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
            await carregar(filtrosAtuais());
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
                <div className="page-header-actions" style={{ alignItems: 'center' }}>
                    {temFiltroAtivo && (
                        <span className="subtitle" style={{ fontSize: 13 }}>
                            Exportando: {descricaoFiltro()}
                        </span>
                    )}
                    <button className="btn btn-secondary" onClick={handleExportar} disabled={exportando}>
                        {exportando ? 'Exportando...' : 'Exportar XLSX'}
                    </button>
                    {podeCriar && (
                        <Link href="/itens/novo" className="btn btn-accent">+ Novo item</Link>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 4 }}>
                <div className="form-group" style={{ flex: '1 1 260px', minWidth: 220, marginBottom: 0 }}>
                    <input
                        className="form-control"
                        placeholder="Buscar por código, etiqueta ou descrição..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
                <div className="form-group" style={{ flex: '0 1 200px', minWidth: 160, marginBottom: 0 }}>
                    <select className="form-control" value={setorId} onChange={(e) => setSetorId(e.target.value)}>
                        <option value="">Todos os setores</option>
                        {setores.map((s) => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ flex: '0 1 160px', minWidth: 140, marginBottom: 0 }}>
                    <select className="form-control" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
                        <option value="">Bom e ruim</option>
                        {Object.entries(ROTULOS_SITUACAO).map(([valor, rotulo]) => (
                            <option key={valor} value={valor}>{rotulo}</option>
                        ))}
                    </select>
                </div>
                {temFiltroAtivo && (
                    <button type="button" className="btn btn-secondary" onClick={handleLimparFiltros}>
                        Limpar filtros
                    </button>
                )}
            </div>

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
