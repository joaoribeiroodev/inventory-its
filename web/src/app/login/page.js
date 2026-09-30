'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setCarregando(true);
        try {
            await login(email, senha);
            window.location.href = '/itens';
        } catch (err) {
            setErro(err.status === 401 ? 'Email ou senha incorretos' : 'Não foi possível conectar à API');
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.png" alt="Internacional Travessias" />
                </div>
                <h1 className="login-title">Inventário ITS</h1>
                <p className="login-subtitle">Internacional Travessias · controle de equipamentos</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            className="form-control"
                            type="email"
                            placeholder="seu.nome@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="senha">Senha</label>
                        <input
                            id="senha"
                            className="form-control"
                            type="password"
                            placeholder="••••••••"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            required
                        />
                    </div>

                    {erro && <p className="form-error">{erro}</p>}

                    <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={carregando}>
                        {carregando ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
