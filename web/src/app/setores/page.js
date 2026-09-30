'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
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
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(true);

    const podeCriar = usuario?.papel === 'admin' || usuario?.papel === 'cadastrador';

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

    async function handleCriar(e) {
        e.preventDefault();
        setErro(null);
        try {
            await api.criarSetor({ nome, descricao: descricao || null });
            setNome('');
            setDescricao('');
            carregar();
        } catch (err) {
            setErro(err.message);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Setores</h1>
                    <p className="subtitle">Locais e setores usados para localizar os itens</p>
                </div>
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
                                </tr>
                            ))}
                            {setores.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="table-empty">Nenhum setor cadastrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {podeCriar && (
                <div className="section">
                    <h2>Novo setor</h2>
                    <div className="card" style={{ maxWidth: 420, marginTop: 12 }}>
                        <form onSubmit={handleCriar}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição (opcional)</label>
                                <input className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                            </div>
                            {erro && <p className="form-error">{erro}</p>}
                            <button className="btn btn-accent">Adicionar setor</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
