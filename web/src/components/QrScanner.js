'use client';

import React, { useEffect, useRef } from 'react';

// Este componente é carregado via next/dynamic com ssr:false (ver
// app/scanner/page.js), porque a biblioteca html5-qrcode acessa
// APIs do navegador (câmera) que não existem durante a
// renderização no servidor.
export default function QrScanner({ onLeitura, ativo }) {
    const scannerRef = useRef(null);
    const elementId = 'leitor-qrcode';

    useEffect(() => {
        if (!ativo) return undefined;

        let cancelado = false;

        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelado) return;

            const instancia = new Html5Qrcode(elementId);
            scannerRef.current = instancia;

            instancia
                .start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (textoDecodificado) => {
                        onLeitura(textoDecodificado);
                    },
                    () => {
                        // erro de decodificação de um frame específico —
                        // acontece o tempo todo enquanto o QR não está
                        // enquadrado direito, não é um problema real.
                    }
                )
                .catch((err) => {
                    console.error('Não foi possível iniciar a câmera:', err);
                });
        });

        return () => {
            cancelado = true;
            const instancia = scannerRef.current;
            if (instancia) {
                instancia
                    .stop()
                    .then(() => instancia.clear())
                    .catch(() => {
                        // já parado/limpo, ignora
                    });
                scannerRef.current = null;
            }
        };
    }, [ativo, onLeitura]);

    return <div id={elementId} style={{ width: '100%', maxWidth: 420 }} />;
}
