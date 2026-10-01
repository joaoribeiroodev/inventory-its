'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../services/api';

// html5-qrcode só pode rodar no navegador (usa a câmera), então
// desativamos a renderização no servidor para esse componente.
const QrScanner = dynamic(() => import('../../components/QrScanner'), { ssr: false });

export default function ScannerPage() {
    return (
        <ProtectedRoute>
            <LeitorDeQrCode />
        </ProtectedRoute>
    );
}

function LeitorDeQrCode() {
    const router = useRouter();
    const [ativo, setAtivo] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [erro, setErro] = useState(null);
    const [codigoManual, setCodigoManual] = useState('');
    // Preenchido quando a etiqueta lida está duplicada entre mais de
    // um item (ver levantamento patrimonial) — nesse caso não dá pra
    // ir direto pro item, tem que deixar a pessoa escolher qual bem
    // físico ela tem na mão.
    const [candidatosAmbiguos, setCandidatosAmbiguos] = useState(null);

    const handleLeitura = useCallback(
        async (codigo) => {
            setAtivo(false); // pausa a câmera enquanto processa, evita leituras duplicadas
            setBuscando(true);
            setErro(null);
            setCandidatosAmbiguos(null);
            try {
                const resultado = await api.buscarItemPorCodigo(codigo.trim());
                if (resultado.ambiguo) {
                    setCandidatosAmbiguos(resultado.itens);
                    setBuscando(false);
                    return;
                }
                router.push(`/itens/${resultado.id}`);
            } catch (err) {
                setErro(
                    err.status === 404
                        ? `Nenhum item encontrado para o código "${codigo}"`
                        : 'Erro ao buscar o item. Tente novamente.'
                );
                setBuscando(false);
            }
        },
        [router]
    );

    function handleTentarNovamente() {
        setErro(null);
        setCandidatosAmbiguos(null);
        setCodigoManual('');
        setAtivo(true);
    }

    function handleBuscarManual(e) {
        e.preventDefault();
        if (!codigoManual.trim()) return;
        handleLeitura(codigoManual);
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Bipar item</h1>
                    <p className="subtitle">Leia o QR Code ou o código de barras (patrimônio) da etiqueta pela webcam</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 460 }}>
                <div className="scanner-frame">
                    {ativo && <QrScanner onLeitura={handleLeitura} ativo={ativo} />}
                </div>
                {!ativo && buscando && <p className="subtitle" style={{ marginTop: 12 }}>Buscando item...</p>}

                {erro && (
                    <div style={{ marginTop: 16 }}>
                        <p className="form-error">{erro}</p>
                        <button className="btn btn-primary" onClick={handleTentarNovamente}>
                            Tentar novamente
                        </button>
                    </div>
                )}

                {!candidatosAmbiguos && (
                    <form onSubmit={handleBuscarManual} style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                        <label className="form-label" htmlFor="codigo-manual">
                            Câmera não lê a etiqueta? Digite ou cole o código
                        </label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <input
                                id="codigo-manual"
                                className="form-control"
                                placeholder="Ex: 9637"
                                value={codigoManual}
                                onChange={(e) => setCodigoManual(e.target.value)}
                                disabled={buscando}
                            />
                            <button type="submit" className="btn btn-secondary" disabled={buscando || !codigoManual.trim()}>
                                Buscar
                            </button>
                        </div>
                        <p className="form-hint" style={{ marginTop: 6 }}>
                            Também funciona com um leitor de código de barras USB conectado — ele digita o
                            número aqui e aperta Enter sozinho.
                        </p>
                    </form>
                )}

                {candidatosAmbiguos && (
                    <div style={{ marginTop: 16 }}>
                        <p className="form-error">
                            Essa etiqueta está colada em mais de um item (patrimônio duplicado). Qual deles é?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {candidatosAmbiguos.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ textAlign: 'left' }}
                                    onClick={() => router.push(`/itens/${item.id}`)}
                                >
                                    {item.descricao} — {item.setorAtual?.nome ?? 'sem setor'}
                                </button>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleTentarNovamente}>
                            Nenhum desses / tentar de novo
                        </button>
                    </div>
                )}
            </div>

            <p className="form-hint" style={{ marginTop: 16, maxWidth: 480 }}>
                Se o navegador não pedir permissão de câmera, confira se o painel está sendo
                acessado por <code>http://localhost</code> ou por um endereço <code>https://</code> —
                por segurança, os navegadores bloqueiam o acesso à câmera em páginas
                <code> http://</code> que não sejam localhost (ex: acessar pelo IP da rede local
                em outro PC).
            </p>
        </div>
    );
}
