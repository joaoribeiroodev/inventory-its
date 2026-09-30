'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../services/api';

export default function UsuariosPage() {
    return (
        <ProtectedRoute papeis={['admin']}>
            <ListaDeUsuarios />
        </ProtectedRoute>
    );
}

function ListaDeUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [papel, setPapel] = useState('operador');
    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(true);

    async function carregar() {
        setCarregando(true);
        try {
            setUsuarios(await api.listarUsuarios());
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
            await api.criarUsuario({ nome, email, senha, papel });
            setNome(''); setEmail(''); setSenha(''); setPapel('operador');
            carregar();
        } catch (err) {
            setErro(err.message);
        }
    }

    async function handleAlterarStatus(usuario) {
        await api.atualizarUsuario(usuario.id, { ativo: !usuario.ativo });
        carregar();
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Usuários</h1>
                    <p className="subtitle">Contas com acesso ao painel e ao app</p>
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
                                <th>Email</th>
                                <th>Papel</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 600 }}>{u.nome}</td>
                                    <td>{u.email}</td>
                                    <td><span className="badge badge-neutro">{u.papel}</span></td>
                                    <td>
                                        <span className={`badge ${u.ativo ? 'badge-em_uso' : 'badge-baixado'}`}>
                                            {u.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleAlterarStatus(u)}>
                                            {u.ativo ? 'Desativar' : 'Ativar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {usuarios.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="table-empty">Nenhum usuário cadastrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="section">
                <h2>Novo usuário</h2>
                <div className="card" style={{ maxWidth: 420, marginTop: 12 }}>
                    <form onSubmit={handleCriar}>
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Senha provisória</label>
                            <input className="form-control" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Papel</label>
                            <select className="form-control" value={papel} onChange={(e) => setPapel(e.target.value)}>
                                <option value="operador">Operador</option>
                                <option value="cadastrador">Cadastrador</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        {erro && <p className="form-error">{erro}</p>}
                        <button className="btn btn-accent">Criar usuário</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
