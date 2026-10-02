'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import SeletorBusca from '../../../components/SeletorBusca';
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
    const searchParams = useSearchParams();
    // Quando chega aqui vindo de um "bipar" que não achou nada
    // cadastrado (ver scanner/page.js e ScannerScreen.js no mobile), o
    // código lido vem na URL — já deixa pré-preenchido o número da
    // etiqueta, só falta o usuário completar a descrição.
    const codigoPreenchido = searchParams.get('codigo') ?? '';

    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState('');
    const [numeroEtiqueta, setNumeroEtiqueta] = useState(codigoPreenchido);
    const [setores, setSetores] = useState([]);
    const [setorId, setSetorId] = useState('');
    const [situacaoInicial, setSituacaoInicial] = useState('bom');
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
                numeroEtiqueta: numeroEtiqueta.trim() || null,
                setorInicialId: setorId || null,
                situacaoInicial,
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
                    <p className="subtitle">
                        {codigoPreenchido
                            ? `Etiqueta "${codigoPreenchido}" não encontrada — cadastre o item correspondente`
                            : 'Cadastre um equipamento no inventário'}
                    </p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 480 }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <input
                            className="form-control"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            autoFocus={!!codigoPreenchido}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Categoria (opcional)</label>
                        <input className="form-control" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Número da etiqueta de patrimônio (opcional)</label>
                        <input
                            className="form-control"
                            value={numeroEtiqueta}
                            onChange={(e) => setNumeroEtiqueta(e.target.value)}
                        />
                        <p className="form-hint">
                            Só preencha se o equipamento já tiver uma etiqueta física colada (patrimônio).
                            Deixe em branco se ainda não tem — o código é gerado automaticamente só na hora
                            de imprimir uma etiqueta nova.
                        </p>
                        {codigoPreenchido && (
                            <p className="form-hint" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                                Esse número veio da leitura da câmera — confira se bate com o que está
                                impresso na etiqueta física antes de salvar (código de barras de etiqueta
                                antiga às vezes é lido com um dígito trocado).
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Setor inicial</label>
                        <SeletorBusca
                            opcoes={setores}
                            valorId={setorId}
                            onSelecionar={setSetorId}
                            placeholder="Buscar setor por nome..."
                            opcaoVazia="Sem setor inicial"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Situação</label>
                        <select className="form-control" value={situacaoInicial} onChange={(e) => setSituacaoInicial(e.target.value)}>
                            <option value="bom">Bom</option>
                            <option value="ruim">Ruim</option>
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
