'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';

const ROTULOS_SITUACAO = {
    bom: 'Bom',
    ruim: 'Ruim',
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
    const router = useRouter();
    const { usuario } = useAuth();
    const [item, setItem] = useState(null);
    const [eventos, setEventos] = useState([]);
    const [setores, setSetores] = useState([]);
    const [editando, setEditando] = useState(false);
    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState('');
    const [excluindo, setExcluindo] = useState(false);
    const [baixandoCsv, setBaixandoCsv] = useState(false);
    const [modalLoteAberto, setModalLoteAberto] = useState(false);

    const [editandoMovimentacao, setEditandoMovimentacao] = useState(false);
    const [setorSelecionado, setSetorSelecionado] = useState('');
    const [situacaoSelecionada, setSituacaoSelecionada] = useState('bom');
    const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false);

    const podeEditar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';
    const podeExcluir = usuario?.papel === 'admin';

    async function carregar() {
        const itemAtual = await api.buscarItem(id);
        const historico = await api.buscarHistoricoItem(id);
        setItem(itemAtual);
        setEventos(historico);
        setDescricao(itemAtual.descricao);
        setCategoria(itemAtual.categoria ?? '');
        setSetorSelecionado(itemAtual.setorAtualId ? String(itemAtual.setorAtualId) : '');
        setSituacaoSelecionada(itemAtual.situacaoAtual ?? 'bom');
    }

    useEffect(() => {
        carregar();
        api.listarSetores().then(setSetores).catch(() => {});
    }, [id]);

    async function salvarEdicao() {
        await api.atualizarItem(id, { descricao, categoria: categoria || null });
        setEditando(false);
        carregar();
    }

    async function excluirItem() {
        const confirmou = window.confirm(
            `Excluir o item ${item.codigo}? Isso apaga também todo o histórico de movimentação dele. Essa ação não pode ser desfeita.`
        );
        if (!confirmou) return;

        setExcluindo(true);
        try {
            await api.excluirItem(id);
            router.push('/itens');
        } catch (err) {
            alert(err.message);
            setExcluindo(false);
        }
    }

    async function baixarCsv() {
        setBaixandoCsv(true);
        try {
            await api.baixarCsvItem(id, item.codigo);
            // Se o item ainda não tinha código, baixar o CSV acabou de
            // gerar um (ver backend) — recarrega pra mostrar na tela.
            if (!item.codigo) await carregar();
        } catch (err) {
            alert(err.message);
        } finally {
            setBaixandoCsv(false);
        }
    }

    async function salvarMovimentacao() {
        setSalvandoMovimentacao(true);
        try {
            await api.registrarMovimentacao(id, {
                setorNovoId: setorSelecionado || null,
                situacaoNova: situacaoSelecionada,
            });
            setEditandoMovimentacao(false);
            await carregar();
        } finally {
            setSalvandoMovimentacao(false);
        }
    }

    if (!item) return <div className="loading-shell">Carregando...</div>;

    return (
        <div>
            <p className="subtitle" style={{ marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.codigo ?? 'Sem código ainda — gerado ao imprimir a etiqueta'}
                {item.patrimonioDuplicado && <span className="badge badge-aviso">Etiqueta duplicada</span>}
            </p>

            {item.patrimonioDuplicado && (
                <p className="form-hint" style={{ marginTop: 4, maxWidth: 560 }}>
                    Essa etiqueta de patrimônio física ({item.codigo}) está colada em mais de um item —
                    outro bem no sistema usa o mesmo número. Ao bipar essa etiqueta, o sistema mostra os
                    itens pra escolher o certo. Vale conferir fisicamente e recolocar uma etiqueta nova
                    num dos dois, se possível.
                </p>
            )}

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
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                {podeEditar && (
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditando(true)}>
                                        Editar
                                    </button>
                                )}
                                <button className="btn btn-secondary btn-sm" onClick={baixarCsv} disabled={baixandoCsv}>
                                    {baixandoCsv ? 'Baixando...' : 'Baixar CSV'}
                                </button>
                                {podeEditar && (
                                    <button className="btn btn-secondary btn-sm" onClick={() => setModalLoteAberto(true)}>
                                        Adicionar a lote
                                    </button>
                                )}
                                {podeExcluir && (
                                    <button className="btn btn-danger btn-sm" onClick={excluirItem} disabled={excluindo}>
                                        {excluindo ? 'Excluindo...' : 'Excluir'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="card info-list">
                {editandoMovimentacao ? (
                    <>
                        <div className="form-group">
                            <label className="form-label">Setor</label>
                            <select className="form-control" value={setorSelecionado} onChange={(e) => setSetorSelecionado(e.target.value)}>
                                <option value="">Sem setor</option>
                                {setores.map((s) => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Situação</label>
                            <select className="form-control" value={situacaoSelecionada} onChange={(e) => setSituacaoSelecionada(e.target.value)}>
                                {Object.entries(ROTULOS_SITUACAO).map(([valor, rotulo]) => (
                                    <option key={valor} value={valor}>{rotulo}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" onClick={salvarMovimentacao} disabled={salvandoMovimentacao}>
                                {salvandoMovimentacao ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setEditandoMovimentacao(false)} disabled={salvandoMovimentacao}>
                                Cancelar
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="info-row">
                            <div className="info-row-label">Setor atual</div>
                            <div className="info-row-value">{item.setorAtual?.nome ?? '—'}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-row-label">Situação</div>
                            <div className="info-row-value">
                                <span className={`badge badge-${item.situacaoAtual}`}>
                                    {ROTULOS_SITUACAO[item.situacaoAtual] ?? item.situacaoAtual}
                                </span>
                            </div>
                        </div>
                        <div className="info-row">
                            <div className="info-row-label">Etiqueta</div>
                            <div className="info-row-value">
                                <span className={`badge ${item.etiquetaImpressa ? 'badge-bom' : 'badge-neutro'}`}>
                                    {item.etiquetaImpressa ? 'Impressa' : 'Pendente'}
                                </span>
                            </div>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setEditandoMovimentacao(true)}>
                            Alterar setor / situação
                        </button>
                    </>
                )}
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

            <ModalAdicionarALote
                item={item}
                aberto={modalLoteAberto}
                onFechar={() => setModalLoteAberto(false)}
                onAdicionado={carregar}
            />
        </div>
    );
}

function ModalAdicionarALote({ item, aberto, onFechar, onAdicionado }) {
    const [lotes, setLotes] = useState([]);
    const [loteId, setLoteId] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!aberto) return;
        setLoteId('');
        setCarregando(true);
        api.listarLotes().then(setLotes).finally(() => setCarregando(false));
    }, [aberto]);

    async function handleAdicionar(e) {
        e.preventDefault();
        if (!loteId) return;

        setSalvando(true);
        try {
            await api.adicionarItemALote(loteId, item.id);
            onAdicionado();
            onFechar();
        } catch (err) {
            alert(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal titulo={`Adicionar ${item.codigo} a um lote`} aberto={aberto} onFechar={onFechar}>
            {carregando ? (
                <div className="loading-shell" style={{ minHeight: 100 }}>Carregando...</div>
            ) : (
                <form onSubmit={handleAdicionar}>
                    <div className="form-group">
                        <label className="form-label">Lote</label>
                        <select
                            className="form-control"
                            value={loteId}
                            onChange={(e) => setLoteId(e.target.value)}
                            required
                        >
                            <option value="">Selecione um lote...</option>
                            {lotes.map((l) => (
                                <option key={l.id} value={l.id}>
                                    #{l.id} — {new Date(l.criadoEm).toLocaleString('pt-BR')} ({l.quantidadeItens} itens)
                                </option>
                            ))}
                        </select>
                        {lotes.length === 0 && (
                            <p className="subtitle" style={{ marginTop: 8 }}>Nenhum lote gerado ainda.</p>
                        )}
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={salvando || !loteId}>
                            {salvando ? 'Adicionando...' : 'Adicionar'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
