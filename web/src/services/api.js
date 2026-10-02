// Cliente HTTP do painel. Diferente do app mobile, aqui a URL da
// API é fixa (definida em build-time via NEXT_PUBLIC_API_URL) —
// o painel roda sempre no mesmo servidor, não precisa de tela de
// configuração de endereço.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

async function requisitar(caminho, opcoes = {}) {
    const token = getToken();

    const resposta = await fetch(`${BASE_URL}/api${caminho}`, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opcoes.headers,
        },
    });

    if (resposta.status === 204) return null;

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        const erro = new Error(dados?.erro || `Erro ${resposta.status}`);
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

export const api = {
    login: (email, senha) =>
        requisitar('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),

    // itens
    listarItens: (filtros = {}) => {
        const params = new URLSearchParams(filtros).toString();
        return requisitar(`/itens${params ? `?${params}` : ''}`);
    },
    buscarItem: (id) => requisitar(`/itens/${id}`),
    // busca pelo texto lido do QR Code (mesmo endpoint que o app mobile usa)
    buscarItemPorCodigo: (codigo) => requisitar(`/itens/codigo/${encodeURIComponent(codigo)}`),
    buscarHistoricoItem: (id) => requisitar(`/itens/${id}/eventos`),
    criarItem: (dados) => requisitar('/itens', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarItem: (id, dados) =>
        requisitar(`/itens/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
    excluirItem: (id) => requisitar(`/itens/${id}`, { method: 'DELETE' }),
    // Exclui vários itens de uma vez (seleção múltipla na lista).
    excluirItensEmLote: (itemIds) =>
        requisitar('/itens/excluir-lote', { method: 'POST', body: JSON.stringify({ itemIds }) }),
    // Baixa o CSV (mesmo formato usado no lote) só desse item — pra
    // reimprimir a etiqueta de um item avulso sem precisar achar/baixar
    // o lote inteiro em que ele entrou.
    baixarCsvItem: async (id, codigo) => {
        const token = getToken();
        const resposta = await fetch(`${BASE_URL}/api/itens/${id}/csv`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resposta.ok) throw new Error('Falha ao baixar o CSV do item');

        const blob = await resposta.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${codigo || id}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
    // Registra mudança de setor e/ou situação (Bom/Ruim) do item,
    // gerando um evento de movimentação no histórico.
    registrarMovimentacao: (id, dados) =>
        requisitar(`/itens/${id}/movimentar`, { method: 'POST', body: JSON.stringify(dados) }),

    // Exportação da lista de itens (relatório) em xlsx formatado,
    // respeitando os mesmos filtros usados na tela (busca, setor,
    // situação — ver construirFiltro() no backend). Mesmo padrão de
    // download autenticado usado em baixarCsvLote.
    //
    // sufixoArquivo (opcional) é só cosmético: a tela monta um texto
    // curto descrevendo o filtro ativo (ex. "ti-bom-despacho") pra
    // deixar isso visível no nome do arquivo baixado, sem precisar
    // abrir a planilha pra saber o que foi exportado.
    baixarXlsxItens: async (filtros = {}, sufixoArquivo = '') => {
        const token = getToken();
        const params = new URLSearchParams(filtros).toString();
        const resposta = await fetch(`${BASE_URL}/api/itens/exportar/xlsx${params ? `?${params}` : ''}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resposta.ok) throw new Error('Falha ao exportar a planilha de itens');

        const blob = await resposta.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const data = new Date().toISOString().slice(0, 10);
        link.download = `itens${sufixoArquivo ? `-${sufixoArquivo}` : ''}-${data}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // setores
    listarSetores: () => requisitar('/setores'),
    criarSetor: (dados) => requisitar('/setores', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarSetor: (id, dados) =>
        requisitar(`/setores/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
    excluirSetor: (id) => requisitar(`/setores/${id}`, { method: 'DELETE' }),

    // usuarios (admin)
    listarUsuarios: () => requisitar('/usuarios'),
    criarUsuario: (dados) => requisitar('/usuarios', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarUsuario: (id, dados) =>
        requisitar(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
    // Mesma rota de atualizarUsuario (o backend já aceita "senha" no
    // corpo e faz o hash) — só um nome mais claro pro caso de uso.
    alterarSenhaUsuario: (id, senha) =>
        requisitar(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify({ senha }) }),

    // lotes de etiqueta
    listarLotesPendentes: () => requisitar('/lotes/pendentes'),
    listarLotes: () => requisitar('/lotes'),
    buscarLote: (id) => requisitar(`/lotes/${id}`),
    gerarLote: (dados) => requisitar('/lotes', { method: 'POST', body: JSON.stringify(dados) }),
    // Adiciona um item a um lote já existente (ex.: item esquecido, ou
    // reimpressão junto com outros), sem precisar gerar um lote novo.
    adicionarItemALote: (loteId, itemId) =>
        requisitar(`/lotes/${loteId}/itens`, { method: 'POST', body: JSON.stringify({ itemIds: [itemId] }) }),

    // O download do CSV precisa do header Authorization, então não
    // dá pra ser um <a href> simples — buscamos como blob e disparamos
    // o download programaticamente.
    baixarCsvLote: async (loteId) => {
        const token = getToken();
        const resposta = await fetch(`${BASE_URL}/api/lotes/${loteId}/csv`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resposta.ok) throw new Error('Falha ao baixar o CSV do lote');

        const blob = await resposta.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lote-${loteId}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};
