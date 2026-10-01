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
                `INSERT INTO itens (codigo, numero_etiqueta, descricao, categoria, situacao_atual, setor_atual)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(codigo) DO UPDATE SET
                    numero_etiqueta = excluded.numero_etiqueta,
                    descricao = excluded.descricao,
                    categoria = excluded.categoria,
                    situacao_atual = excluded.situacao_atual,
                    setor_atual = excluded.setor_atual`,
                [item.codigo, item.numeroEtiqueta ?? null, item.descricao, item.categoria, item.situacaoAtual, item.setorAtual]
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

export async function buscarItemPorCodigo(codigo) {
    const db = await getDb();
    return db.getFirstAsync('SELECT * FROM itens WHERE codigo = ?', [codigo]);
}

// Fallback pro caso de uma etiqueta de patrimônio física duplicada
// entre vários itens (ver levantamento patrimonial): o "codigo" de
// cada um ganha um sufixo (-A, -B) pra ficar único, mas o número bruto
// lido do código de barras bate com "numero_etiqueta" dos dois.
export async function buscarItensPorEtiqueta(numeroEtiqueta) {
    const db = await getDb();
    return db.getAllAsync('SELECT * FROM itens WHERE numero_etiqueta = ?', [numeroEtiqueta]);
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
export async function aplicarEventoNoCacheLocal(itemCodigo, { setorNovoNome, situacaoNova }) {
    const db = await getDb();
    await db.runAsync(
        `UPDATE itens SET
            setor_atual = COALESCE(?, setor_atual),
            situacao_atual = COALESCE(?, situacao_atual)
         WHERE codigo = ?`,
        [setorNovoNome ?? null, situacaoNova ?? null, itemCodigo]
    );
}

// Aplica localmente uma edição cadastral (descrição/categoria) já
// confirmada pelo servidor — mesma lógica de aplicarEventoNoCacheLocal,
// mas pros campos que não passam pela fila de eventos (ver PUT
// /itens/:id no backend: exige conexão, sem fila offline).
export async function aplicarEdicaoNoCacheLocal(itemCodigo, { descricao, categoria }) {
    const db = await getDb();
    await db.runAsync(
        `UPDATE itens SET
            descricao = COALESCE(?, descricao),
            categoria = ?
         WHERE codigo = ?`,
        [descricao ?? null, categoria ?? null, itemCodigo]
    );
}

// ---------- fila de eventos pendentes ----------

export async function enfileirarEvento(evento) {
    const db = await getDb();
    await db.runAsync(
        `INSERT INTO eventos_pendentes
            (uuid_evento, item_codigo, setor_novo_id, situacao_nova, observacao, timestamp_evento)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            evento.uuidEvento,
            evento.itemCodigo,
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
