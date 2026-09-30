'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { api } from '../../../services/api';

export default function NovoItemPage() {
    return (
        <ProtectedRoute papeis={['admin', 'cadastrador']}>
            <FormularioNovoItem />
        </ProtectedRoute>
    );
}

function FormularioNovoItem() {
    const router = useRouter();
    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState('');
    const [setores, setSetores] = useState([]);
    const [setorId, setSetorId] = useState('');
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        api.listarSetores().then(setSetores).catch(() => {});
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setErro(null);
        setSalvando(true);
        try {
            const item = await api.criarItem({
                descricao,
                categoria: categoria || null,
                setorInicialId: setorId || null,
            });
            router.push(`/itens/${item.id}`);
        } catch (err) {
            setErro(err.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Novo item</h1>
                    <p className="subtitle">Cadastre um equipamento no inventário</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 480 }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <input className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Categoria (opcional)</label>
                        <input className="form-control" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Setor inicial</label>
                        <select className="form-control" value={setorId} onChange={(e) => setSetorId(e.target.value)}>
                            <option value="">Sem setor inicial</option>
                            {setores.map((s) => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>
                    </div>

                    {erro && <p className="form-error">{erro}</p>}

                    <button className="btn btn-accent" style={{ marginTop: 8 }} disabled={salvando}>
                        {salvando ? 'Salvando...' : 'Salvar item'}
                    </button>
                </form>
            </div>
        </div>
    );
}
