// Cliente HTTP simples (fetch nativo), montando a base URL a
// partir do que está salvo no banco local (editável na tela de
// Configurações).

import { getServerUrl, getToken } from '../database/queries';

async function requisitar(caminho, opcoes = {}) {
    const baseUrl = await getServerUrl();
    const token = await getToken();

    const resposta = await fetch(`${baseUrl}/api${caminho}`, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opcoes.headers,
        },
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        const erro = new Error(dados?.erro || `Erro ${resposta.status}`);
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

// Health-check com timeout curto — usado pelo botão "Testar e
// reconectar" (lança erro se falhar) e pelo monitor de
// conectividade em segundo plano (usa a variante que não lança,
// abaixo). Não passa por /api nem exige token.
export async function testarConexao(baseUrlCandidata, timeoutMs = 4000) {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), timeoutMs);

    try {
        const resposta = await fetch(`${baseUrlCandidata}/health`, {
            method: 'GET',
            signal: controlador.signal,
        });
        if (!resposta.ok) throw new Error('Servidor não respondeu corretamente');
        return true;
    } finally {
        clearTimeout(timeout);
    }
}

// Mesma checagem, mas nunca lança — devolve true/false. É o que o
// monitor de conectividade usa continuamente em segundo plano, sem
// precisar de try/catch em todo lugar que chama.
export async function servidorEstaAlcancavel(timeoutMs = 4000) {
    try {
        const baseUrl = await getServerUrl();
        await testarConexao(baseUrl, timeoutMs);
        return true;
    } catch {
        return false;
    }
}

export const api = {
    login: (email, senha) =>
        requisitar('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),

    buscarItensParaSync: () => requisitar('/itens/sync'),
    buscarSetores: () => requisitar('/setores'),
    buscarItemPorCodigo: (codigo) => requisitar(`/itens/codigo/${codigo}`),
    buscarHistoricoItem: (id) => requisitar(`/itens/${id}/eventos`),
    criarItem: (dados) => requisitar('/itens', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarItem: (id, dados) =>
        requisitar(`/itens/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),

    criarSetor: (dados) => requisitar('/setores', { method: 'POST', body: JSON.stringify(dados) }),

    listarLotesPendentes: () => requisitar('/lotes/pendentes'),
    gerarLote: (dados) => requisitar('/lotes', { method: 'POST', body: JSON.stringify(dados) }),

    sincronizarEventos: (dispositivoIdentificador, eventos) =>
        requisitar('/eventos/sync', {
            method: 'POST',
            body: JSON.stringify({ dispositivoIdentificador, eventos }),
        }),
};
