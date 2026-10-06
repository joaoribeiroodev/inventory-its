'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

export default function UsuariosPage() {
    return (
        <ProtectedRoute papeis={['admin']}>
            <ListaDeUsuarios />
        </ProtectedRoute>
    );
}

function ListaDeUsuarios() {
    const toast = useToast();
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);

    const [modalCriar, setModalCriar] = useState(false);
    const [modalEditar, setModalEditar] = useState(null); // usuário sendo editado, ou null
    const [modalSenha, setModalSenha] = useState(null); // usuário com a senha sendo trocada, ou null

    async function carregar() {
        setCarregando(true);
        try {
            setUsuarios(await api.listarUsuarios());
        } catch (err) {
            toast.erro(`Não foi possível carregar os usuários: ${err.message}`);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function handleAlterarStatus(usuario) {
        try {
            await api.atualizarUsuario(usuario.id, { ativo: !usuario.ativo });
            await carregar();
            toast.sucesso(`Usuário "${usuario.nome}" ${usuario.ativo ? 'desativado' : 'ativado'} com sucesso.`);
        } catch (err) {
            toast.erro(`Não foi possível alterar o status do usuário: ${err.message}`);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Usuários</h1>
                    <p className="subtitle">Contas com acesso ao painel e ao app</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-accent" onClick={() => setModalCriar(true)}>
                        + Novo usuário
                    </button>
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
                                <th>Usuário</th>
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
                                    <td>{u.usuario ?? <span className="subtitle">não definido</span>}</td>
                                    <td>{u.email}</td>
                                    <td><span className="badge badge-neutro">{u.papel}</span></td>
                                    <td>
                                        <span className={`badge ${u.ativo ? 'badge-bom' : 'badge-ruim'}`}>
                                            {u.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setModalEditar(u)}>
                                                Editar
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setModalSenha(u)}>
                                                Alterar senha
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleAlterarStatus(u)}>
                                                {u.ativo ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {usuarios.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="table-empty">Nenhum usuário cadastrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <ModalNovoUsuario
                aberto={modalCriar}
                onFechar={() => setModalCriar(false)}
                onCriado={() => { setModalCriar(false); carregar(); toast.sucesso('Usuário cadastrado com sucesso.'); }}
            />
            <ModalEditarUsuario
                usuario={modalEditar}
                onFechar={() => setModalEditar(null)}
                onSalvo={() => { setModalEditar(null); carregar(); toast.sucesso('Usuário atualizado com sucesso.'); }}
            />
            <ModalAlterarSenha
                usuario={modalSenha}
                onFechar={() => setModalSenha(null)}
                onSalvo={() => { setModalSenha(null); toast.sucesso('Senha alterada com sucesso.'); }}
            />
        </div>
    );
}

function ModalNovoUsuario({ aberto, onFechar, onCriado }) {
    const [nome, setNome] = useState('');
    const [usuario, setUsuario] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [papel, setPapel] = useState('operador');
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);

    // Limpa o formulário sempre que o modal é reaberto
    useEffect(() => {
        if (aberto) {
            setNome(''); setUsuario(''); setEmail(''); setSenha(''); setPapel('operador'); setErro(null);
        }
    }, [aberto]);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setSalvando(true);
        try {
            await api.criarUsuario({ nome, usuario, email, senha, papel });
            onCriado();
        } catch (err) {
            setErro(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal titulo="Novo usuário" aberto={aberto} onFechar={onFechar}>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Usuário (login)</label>
                    <input
                        className="form-control"
                        placeholder="Ex: joao.ribeiro"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                    />
                    <p className="form-hint">Usado pra entrar no painel/app, como alternativa ao email.</p>
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
                <div className="modal-actions">
                    <button className="btn btn-accent" disabled={salvando}>
                        {salvando ? 'Criando...' : 'Criar usuário'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ModalEditarUsuario({ usuario, onFechar, onSalvo }) {
    const [nome, setNome] = useState('');
    const [nomeDeUsuario, setNomeDeUsuario] = useState('');
    const [papel, setPapel] = useState('operador');
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (usuario) {
            setNome(usuario.nome);
            setNomeDeUsuario(usuario.usuario ?? '');
            setPapel(usuario.papel);
            setErro(null);
        }
    }, [usuario]);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setSalvando(true);
        try {
            await api.atualizarUsuario(usuario.id, { nome, usuario: nomeDeUsuario, papel });
            onSalvo();
        } catch (err) {
            setErro(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal titulo="Editar usuário" aberto={!!usuario} onFechar={onFechar}>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Usuário (login)</label>
                    <input
                        className="form-control"
                        placeholder="Ex: joao.ribeiro"
                        value={nomeDeUsuario}
                        onChange={(e) => setNomeDeUsuario(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" value={usuario?.email ?? ''} disabled />
                    <p className="form-hint">O email não pode ser alterado.</p>
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

function ModalAlterarSenha({ usuario, onFechar, onSalvo }) {
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (usuario) {
            setSenha(''); setConfirmacao(''); setErro(null);
        }
    }, [usuario]);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);

        if (senha.length < 6) {
            setErro('A senha precisa ter pelo menos 6 caracteres');
            return;
        }
        if (senha !== confirmacao) {
            setErro('As senhas não conferem');
            return;
        }

        setSalvando(true);
        try {
            await api.alterarSenhaUsuario(usuario.id, senha);
            onSalvo();
        } catch (err) {
            setErro(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal titulo={`Alterar senha — ${usuario?.nome ?? ''}`} aberto={!!usuario} onFechar={onFechar}>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Nova senha</label>
                    <input className="form-control" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Confirmar nova senha</label>
                    <input className="form-control" type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
                </div>
                {erro && <p className="form-error">{erro}</p>}
                <div className="modal-actions">
                    <button className="btn btn-primary" disabled={salvando}>
                        {salvando ? 'Salvando...' : 'Alterar senha'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
}
