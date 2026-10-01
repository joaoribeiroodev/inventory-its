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

        import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
            if (cancelado) return;

            // Precisa ler tanto QR Code (etiquetas geradas pelo sistema)
            // quanto Code-128 (etiquetas de patrimônio físicas já
            // existentes — ver levantamento patrimonial). Deixando
            // explícito aqui porque, sem isso, algumas combinações de
            // navegador/fallback nativo da lib restringem o scan só a
            // QR Code, e aí bipar um código de barras de patrimônio
            // nunca gera leitura nenhuma — nem chega a pesquisar o
            // item no backend.
            const instancia = new Html5Qrcode(elementId, {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                ],
                verbose: false,
            });
            scannerRef.current = instancia;

            instancia
                .start(
                    { facingMode: 'environment' },
                    // Sem qrbox: escaneia o frame inteiro da câmera, em
                    // vez de só um quadrado central de 250x250 — uma
                    // etiqueta de código de barras é bem mais larga que
                    // alta, e o recorte quadrado pequeno cortava a
                    // etiqueta fora da área lida na maioria dos ângulos.
                    { fps: 10 },
                    (textoDecodificado) => {
                        onLeitura(textoDecodificado);
                    },
                    () => {
                        // erro de decodificação de um frame específico —
                        // acontece o tempo todo enquanto a etiqueta não
                        // está enquadrada direito, não é um problema real.
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
