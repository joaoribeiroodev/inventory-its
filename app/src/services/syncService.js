// Orquestra a sincronização: puxar cache de referência (itens/
// setores) e empurrar a fila de eventos pendentes.
//
// Usado em 3 momentos:
//   1. Botão "Testar e reconectar" na tela de Configurações
//      (troca de servidor → limpa cache de referência → full sync)
//   2. Quando a conectividade volta (ver ConnectivityContext)
//   3. Puxão manual (ex: pull-to-refresh na lista de itens)

import { api, testarConexao } from './api';
import {
    upsertItens,
    upsertSetores,
    limparCacheReferencia,
    listarEventosPendentes,
    removerEventoPendente,
    aplicarEventoNoCacheLocal,
    getOrCreateDeviceId,
    setConfig,
} from '../database/queries';

// Baixa itens + setores do servidor e substitui o cache local.
// NÃO mexe na fila de eventos pendentes.
export async function atualizarCacheReferencia() {
    const [itens, setores] = await Promise.all([api.buscarItensParaSync(), api.buscarSetores()]);
    await upsertItens(itens);
    await upsertSetores(setores);
    return { totalItens: itens.length, totalSetores: setores.length };
}

// Envia a fila de eventos pendentes. Idempotente do lado do
// servidor (uuidEvento), então reenviar em caso de falha de rede
// no meio do caminho é seguro.
export async function enviarEventosPendentes() {
    const pendentes = await listarEventosPendentes();
    if (pendentes.length === 0) return { enviados: 0, falharam: 0 };

    const deviceId = await getOrCreateDeviceId();

    const payload = pendentes.map((e) => ({
        uuidEvento: e.uuid_evento,
        // itemId é o identificador preferido (ver eventos.controller.js
        // no backend) — "itemCodigo" não é mais único e fica só como
        // fallback pra eventos antigos que já estavam na fila antes
        // dessa mudança.
        itemId: e.item_id,
        itemCodigo: e.item_codigo,
        setorNovoId: e.setor_novo_id,
        situacaoNova: e.situacao_nova,
        observacao: e.observacao,
        timestampEvento: e.timestamp_evento,
    }));

    const { resultados } = await api.sincronizarEventos(deviceId, payload);

    let enviados = 0;
    let falharam = 0;

    for (const resultado of resultados) {
        if (resultado.status === 'sincronizado' || resultado.status === 'ja_processado') {
            await removerEventoPendente(resultado.uuidEvento);
            enviados += 1;
        } else {
            // Fica na fila para tentar de novo na próxima sincronização
            // (ex: item não encontrado pode ser só falta de cache atualizado)
            falharam += 1;
        }
    }

    return { enviados, falharam };
}

// Sincronização completa: primeiro envia o que está pendente
// (para não perder movimentações), depois atualiza o cache de
// referência com o estado mais recente do servidor.
export async function sincronizacaoCompleta() {
    const envio = await enviarEventosPendentes();
    const cache = await atualizarCacheReferencia();
    return { ...envio, ...cache };
}

// Chamado pela tela de Configurações ao trocar o endereço do
// servidor. Testa a conexão ANTES de aplicar qualquer mudança —
// se falhar, nada é alterado.
export async function testarEReconectar(novoEndereco) {
    await testarConexao(novoEndereco); // lança erro se não conseguir conectar

    await setConfig('server_url', novoEndereco);

    // Atualização limpa: descarta cache de referência antigo
    // (pode ser de outro servidor/ambiente). A fila de eventos
    // pendentes NUNCA é apagada aqui.
    await limparCacheReferencia();

    return sincronizacaoCompleta();
}
