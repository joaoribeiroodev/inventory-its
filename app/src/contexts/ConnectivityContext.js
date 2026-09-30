// Monitor de conectividade — a fonte da verdade é um HEALTH-CHECK
// REAL contra o servidor (não apenas "tem Wi-Fi"). NetInfo é usado
// só como gatilho para testar mais cedo (ex: Wi-Fi acabou de
// conectar), não como resposta final.
//
// Estratégia:
//   - Testa o servidor a cada INTERVALO_PROVA_MS enquanto o app
//     está em primeiro plano (AppState 'active')
//   - Também testa imediatamente quando: o NetInfo detecta rede
//     nova, ou o app volta do segundo plano
//   - Ao passar de "inalcançável" para "alcançável", dispara
//     sincronização automática

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { servidorEstaAlcancavel } from '../services/api';
import { sincronizacaoCompleta } from '../services/syncService';

const INTERVALO_PROVA_MS = 30000; // 30s enquanto em primeiro plano

const ConnectivityContext = createContext({ isOnline: false, sincronizando: false, testarAgora: () => {} });

export function ConnectivityProvider({ children }) {
    const [isOnline, setIsOnline] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const estavaAlcancavel = useRef(false);
    const testando = useRef(false); // evita testes sobrepostos

    async function testarAgora() {
        if (testando.current) return;
        testando.current = true;

        const alcancavel = await servidorEstaAlcancavel();
        setIsOnline(alcancavel);

        if (alcancavel && !estavaAlcancavel.current) {
            // Acabou de voltar a alcançar o servidor: sincroniza
            setSincronizando(true);
            try {
                await sincronizacaoCompleta();
            } catch (err) {
                console.warn('Sync automático falhou:', err.message);
            } finally {
                setSincronizando(false);
            }
        }

        estavaAlcancavel.current = alcancavel;
        testando.current = false;
    }

    useEffect(() => {
        testarAgora(); // primeira checagem ao abrir o app

        // Gatilho 1: mudança de rede (Wi-Fi conectou/trocou) — testa
        // logo em seguida, sem esperar o próximo ciclo do intervalo
        const unsubscribeNetInfo = NetInfo.addEventListener((estado) => {
            if (estado.isConnected) testarAgora();
            else setIsOnline(false); // sem rede nenhuma, nem tenta
        });

        // Gatilho 2: app voltou pro primeiro plano
        const unsubscribeAppState = AppState.addEventListener('change', (proximoEstado) => {
            if (proximoEstado === 'active') testarAgora();
        });

        // Gatilho 3: teste periódico enquanto em primeiro plano
        const intervalo = setInterval(() => {
            if (AppState.currentState === 'active') testarAgora();
        }, INTERVALO_PROVA_MS);

        return () => {
            unsubscribeNetInfo();
            unsubscribeAppState.remove();
            clearInterval(intervalo);
        };
    }, []);

    return (
        <ConnectivityContext.Provider value={{ isOnline, sincronizando, testarAgora }}>
            {children}
        </ConnectivityContext.Provider>
    );
}

export function useConnectivity() {
    return useContext(ConnectivityContext);
}
