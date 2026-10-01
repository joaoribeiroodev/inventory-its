'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function SetoresPage() {
    return (
        <ProtectedRoute>
            <ListaDeSetores />
        </ProtectedRoute>
    );
}

function ListaDeSetores() {
    const { usuario } = useAuth();
    const [setores, setSetores] = useState([]);
    const [carregando, setCarregando] = useState(true);

    const [modalCriar, setModalCriar] = useState(false);
    const [modalEditar, setModalEditar] = useState(null); // setor sendo editado, ou null

    const podeEditar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';

    async function carregar() {
        setCarregando(true);
        try {
            setSetores(await api.listarSetores());
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Setores</h1>
                    <p className="subtitle">Locais e setores usados para localizar os itens</p>
                </div>
                {podeEditar && (
                    <div className="page-header-actions">
                        <button className="btn btn-accent" onClick={() => setModalCriar(true)}>
                            + Novo setor
                        </button>
                    </div>
                )}
            </div>

            {carregando ? (
                <div className="loading-shell">Carregando...</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Descrição</th>
                                <th>Status</th>
                                {podeEditar && <th></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {setores.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.nome}</td>
                                    <td>{s.descricao ?? '—'}</td>
                                    <td>
                                        <span className={`badge ${s.ativo ? 'badge-bom' : 'badge-neutro'}`}>
                                            {s.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    {podeEditar && (
                                        <td>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setModalEditar(s)}>
                                                Editar
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {setores.length === 0 && (
                                <tr>
                                    <td colSpan={podeEditar ? 4 : 3} className="table-empty">Nenhum setor cadastrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <ModalNovoSetor
                aberto={modalCriar}
                onFechar={() => setModalCriar(false)}
                onCriado={() => { setModalCriar(false); carregar(); }}
            />
            <ModalEditarSetor
                setor={modalEditar}
                onFechar={() => setModalEditar(null)}
                onSalvo={() => { setModalEditar(null); carregar(); }}
            />
        </div>
    );
}

function ModalNovoSetor({ aberto, onFechar, onCriado }) {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (aberto) {
            setNome(''); setDescricao(''); setErro(null);
        }
    }, [aberto]);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setSalvando(true);
        try {
            await api.criarSetor({ nome, descricao: descricao || null });
            onCriado();
        } catch (err) {
            setErro(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal titulo="Novo setor" aberto={aberto} onFechar={onFechar}>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Descrição (opcional)</label>
                    <input className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                {erro && <p className="form-error">{erro}</p>}
                <div className="modal-actions">
                    <button className="btn btn-accent" disabled={salvando}>
                        {salvando ? 'Adicionando...' : 'Adicionar setor'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ModalEditarSetor({ setor, onFechar, onSalvo }) {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [ativo, setAtivo] = useState(true);
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (setor) {
            setNome(setor.nome);
            setDescricao(setor.descricao ?? '');
            setAtivo(setor.ativo);
            setErro(null);
        }
    }, [setor]);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setSalvando(true);
        try {
            await api.atualizarSetor(setor.id, { nome, descricao: descricao || null, ativo });
            onSalvo();
        } catch (err) {
            setErro(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal titulo="Editar setor" aberto={!!setor} onFechar={onFechar}>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Descrição (opcional)</label>
                    <input className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={ativo ? 'ativo' : 'inativo'} onChange={(e) => setAtivo(e.target.value === 'ativo')}>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                    </select>
                </div>
                {erro && <p className="form-error">{erro}</p>}
                <div className="modal-actions">
                    <button className="btn btn-primary" disabled={salvando}>
                        {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
}
