// Cliente HTTP simples (fetch nativo), montando a base URL a
// partir do que está salvo no banco local (editável na tela de
// Configurações).

import { getServerUrl, getToken } from '../database/queries';

// Reporta uma falha ao log central do sistema (ver tela de
// Monitoramento no painel web, admin). Fire-and-forget e silencioso:
// o app passa a maior parte do tempo com conectividade instável em
// campo (ver ConnectivityContext), então isso NUNCA pode travar nem
// lançar — se o próprio report falhar (sem conexão), simplesmente
// não é registrado agora.
async function reportarFalha(caminho, mensagem, status) {
    if (caminho === '/logs') return; // nunca reporta falha do próprio endpoint de log
    try {
        const baseUrl = await getServerUrl();
        const token = await getToken();
        await fetch(`${baseUrl}/api/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Origem-Cliente': 'app',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                nivel: 'erro',
                origem: 'app',
                acao: 'requisicao_api',
                mensagem: `${caminho} — ${mensagem}`,
                rota: `app: ${caminho}`,
                detalhes: status ? `HTTP ${status}` : null,
            }),
        });
    } catch {
        // offline — ver comentário acima, desiste silenciosamente
    }
}

async function requisitar(caminho, opcoes = {}) {
    const baseUrl = await getServerUrl();
    const token = await getToken();

    let resposta;
    try {
        resposta = await fetch(`${baseUrl}/api${caminho}`, {
            ...opcoes,
            headers: {
                'Content-Type': 'application/json',
                'X-Origem-Cliente': 'app',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...opcoes.headers,
            },
        });
    } catch (falhaDeRede) {
        // Sem conexão com o servidor configurado — não reporta isso ao
        // log remoto (seria inútil: é exatamente a falta de conexão que
        // impede o report de chegar), só sinaliza pra quem chamou.
        const erro = new Error('Não foi possível conectar ao servidor. Verifique a conexão ou o endereço configurado.');
        erro.semConexao = true;
        throw erro;
    }

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        const mensagem = dados?.erro || `Erro ${resposta.status}`;
        if (resposta.status !== 401) {
            reportarFalha(caminho, mensagem, resposta.status);
        }
        const erro = new Error(mensagem);
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
    // "identificador" pode ser o nome de usuário OU o email (ver
    // auth.controller.js no backend) — a pessoa não precisa lembrar
    // qual dos dois cadastrou.
    login: (identificador, senha) =>
        requisitar('/auth/login', { method: 'POST', body: JSON.stringify({ identificador, senha }) }),

    buscarItensParaSync: () => requisitar('/itens/sync'),
    buscarSetores: () => requisitar('/setores'),
    buscarHistoricoItem: (id) => requisitar(`/itens/${id}/eventos`),
    criarItem: (dados) => requisitar('/itens', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarItem: (id, dados) =>
        requisitar(`/itens/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),

    listarLotesPendentes: () => requisitar('/lotes/pendentes'),
    gerarLote: (dados) => requisitar('/lotes', { method: 'POST', body: JSON.stringify(dados) }),

    sincronizarEventos: (dispositivoIdentificador, eventos) =>
        requisitar('/eventos/sync', {
            method: 'POST',
            body: JSON.stringify({ dispositivoIdentificador, eventos }),
        }),
};
