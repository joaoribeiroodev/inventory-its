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

    const handleLeitura = useCallback(
        async (codigo) => {
            setAtivo(false); // pausa a câmera enquanto processa, evita leituras duplicadas
            setBuscando(true);
            setErro(null);
            try {
                const item = await api.buscarItemPorCodigo(codigo.trim());
                router.push(`/itens/${item.id}`);
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
        setAtivo(true);
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Bipar item</h1>
                    <p className="subtitle">Leia o QR Code da etiqueta pela webcam do computador</p>
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
