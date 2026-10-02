// Funções de acesso ao banco local. Nada de SQL espalhado pelas
// telas — tudo passa por aqui.

import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { getDb } from './db';

// ---------- config (chave/valor) ----------

export async function getConfig(chave) {
    const db = await getDb();
    const linha = await db.getFirstAsync('SELECT valor FROM config WHERE chave = ?', [chave]);
    return linha?.valor ?? null;
}

export async function setConfig(chave, valor) {
    const db = await getDb();
    await db.runAsync(
        'INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
        [chave, valor]
    );
}

export async function getServerUrl() {
    const salvo = await getConfig('server_url');
    if (salvo) return salvo;
    // Endereço padrão que vem com o build do app (ver app.json -> extra.defaultServerUrl)
    return Constants.expoConfig?.extra?.defaultServerUrl ?? 'http://localhost:3001';
}

export async function getToken() {
    return getConfig('auth_token');
}

export async function getUsuarioAtual() {
    const nome = await getConfig('usuario_nome');
    const papel = await getConfig('usuario_papel');
    if (!nome) return null;
    return { nome, papel };
}

export async function salvarSessao({ token, usuario }) {
    await setConfig('auth_token', token);
    await setConfig('usuario_nome', usuario.nome);
    await setConfig('usuario_papel', usuario.papel);
}

export async function limparSessao() {
    const db = await getDb();
    await db.runAsync("DELETE FROM config WHERE chave IN ('auth_token', 'usuario_nome', 'usuario_papel')");
}

// Identificador estável do aparelho, gerado uma vez e reaproveitado
// em toda sincronização (permite ao backend registrar/auditar por
// dispositivo — ver tabela "dispositivos" no schema).
export async function getOrCreateDeviceId() {
    const existente = await getConfig('device_id');
    if (existente) return existente;

    const novoId = Crypto.randomUUID();
    await setConfig('device_id', novoId);
    return novoId;
}

// ---------- cache de referência (itens / setores) ----------
// Limpo pelo botão "Testar e reconectar" quando o endereço do
// servidor muda. NUNCA mexe em eventos_pendentes.

export async function limparCacheReferencia() {
    const db = await getDb();
    await db.execAsync('DELETE FROM itens; DELETE FROM setores;');
}

export async function upsertItens(itens) {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
        for (const item of itens) {
            await db.runAsync(
                `INSERT INTO itens (id, codigo, numero_etiqueta, patrimonio_duplicado, descricao, categoria, situacao_atual, setor_atual)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    codigo = excluded.codigo,
                    numero_etiqueta = excluded.numero_etiqueta,
                    patrimonio_duplicado = excluded.patrimonio_duplicado,
                    descricao = excluded.descricao,
                    categoria = excluded.categoria,
                    situacao_atual = excluded.situacao_atual,
                    setor_atual = excluded.setor_atual`,
                [
                    String(item.id),
                    item.codigo,
                    item.numeroEtiqueta ?? null,
                    item.patrimonioDuplicado ? 1 : 0,
                    item.descricao,
                    item.categoria,
                    item.situacaoAtual,
                    item.setorAtual,
                ]
            );
        }
    });
}

export async function upsertSetores(setores) {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
        for (const setor of setores) {
            await db.runAsync(
                `INSERT INTO setores (id, nome) VALUES (?, ?)
                 ON CONFLICT(id) DO UPDATE SET nome = excluded.nome`,
                [setor.id, setor.nome]
            );
        }
    });
}

export async function buscarItemPorId(id) {
    const db = await getDb();
    return db.getFirstAsync('SELECT * FROM itens WHERE id = ?', [String(id)]);
}

// Busca por código/etiqueta pode achar MAIS DE UM item — "codigo" não
// é mais único (uma etiqueta física colada em mais de um bem por
// engano, ver "patrimonio_duplicado"). Quem chama decide o que fazer
// com 0, 1 ou vários resultados (ver ScannerScreen.js: 1 → abre
// direto, mais de 1 → deixa escolher).
export async function buscarItensPorCodigo(codigo) {
    const db = await getDb();
    const exatos = await db.getAllAsync(
        'SELECT * FROM itens WHERE codigo = ? OR numero_etiqueta = ?',
        [codigo, codigo]
    );
    if (exatos.length > 0) return exatos;

    // Mesmo fallback do backend (ver buscarPorCodigo em
    // itens.controller.js, que faltava aqui): etiqueta de patrimônio
    // lida com zero(s) à esquerda a mais ou a menos do que está
    // gravado no cache local. Sem isso o app offline dava "não
    // encontrado" pra item que existe, só porque bipou "09637" e o
    // cache tem "9637" (ou vice-versa).
    if (/^\d+$/.test(codigo)) {
        const semZerosEsquerda = codigo.replace(/^0+(?=\d)/, '');
        if (semZerosEsquerda !== codigo) {
            return db.getAllAsync(
                'SELECT * FROM itens WHERE codigo = ? OR numero_etiqueta = ?',
                [semZerosEsquerda, semZerosEsquerda]
            );
        }
    }

    return exatos;
}

export async function listarItensLocais() {
    const db = await getDb();
    return db.getAllAsync('SELECT * FROM itens ORDER BY descricao ASC');
}

export async function listarSetoresLocais() {
    const db = await getDb();
    return db.getAllAsync('SELECT * FROM setores ORDER BY nome ASC');
}

// Aplica localmente o resultado de um evento já confirmado, para
// a tela refletir a mudança na hora, sem esperar o próximo full sync.
export async function aplicarEventoNoCacheLocal(itemId, { setorNovoNome, situacaoNova }) {
    const db = await getDb();
    await db.runAsync(
        `UPDATE itens SET
            setor_atual = COALESCE(?, setor_atual),
            situacao_atual = COALESCE(?, situacao_atual)
         WHERE id = ?`,
        [setorNovoNome ?? null, situacaoNova ?? null, String(itemId)]
    );
}

// Aplica localmente uma edição cadastral (descrição/categoria) já
// confirmada pelo servidor — mesma lógica de aplicarEventoNoCacheLocal,
// mas pros campos que não passam pela fila de eventos (ver PUT
// /itens/:id no backend: exige conexão, sem fila offline).
export async function aplicarEdicaoNoCacheLocal(itemId, { descricao, categoria }) {
    const db = await getDb();
    await db.runAsync(
        `UPDATE itens SET
            descricao = COALESCE(?, descricao),
            categoria = ?
         WHERE id = ?`,
        [descricao ?? null, categoria ?? null, String(itemId)]
    );
}

// ---------- fila de eventos pendentes ----------

export async function enfileirarEvento(evento) {
    const db = await getDb();
    await db.runAsync(
        `INSERT INTO eventos_pendentes
            (uuid_evento, item_id, item_codigo, setor_novo_id, situacao_nova, observacao, timestamp_evento)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            evento.uuidEvento,
            String(evento.itemId),
            evento.itemCodigo ?? null,
            evento.setorNovoId ?? null,
            evento.situacaoNova ?? null,
            evento.observacao ?? null,
            evento.timestampEvento,
        ]
    );
}

export async function listarEventosPendentes() {
    const db = await getDb();
    return db.getAllAsync('SELECT * FROM eventos_pendentes ORDER BY timestamp_evento ASC');
}

export async function contarEventosPendentes() {
    const db = await getDb();
    const linha = await db.getFirstAsync('SELECT COUNT(*) as total FROM eventos_pendentes');
    return linha?.total ?? 0;
}

export async function removerEventoPendente(uuidEvento) {
    const db = await getDb();
    await db.runAsync('DELETE FROM eventos_pendentes WHERE uuid_evento = ?', [uuidEvento]);
}
