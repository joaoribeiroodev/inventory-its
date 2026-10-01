// Banco local (SQLite) — cache offline-first.
//
// Tabelas:
//   config           chave/valor: endereço do servidor, token, dados do usuário logado
//   itens            cache ENXUTO dos itens (sem histórico — ver decisão de arquitetura)
//   setores          cache simples (id + nome)
//   eventos_pendentes  fila de movimentações feitas offline, aguardando sincronizar
//
// Nada aqui guarda histórico de movimentação: quando o operador
// quer ver o histórico completo de um item, isso é buscado sob
// demanda na API (só funciona online) e não é persistido no
// dispositivo.

import * as SQLite from 'expo-sqlite';

let dbInstance = null;

export async function getDb() {
    if (dbInstance) return dbInstance;

    dbInstance = await SQLite.openDatabaseAsync('inventory-its.db');

    await dbInstance.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS config (
            chave TEXT PRIMARY KEY NOT NULL,
            valor TEXT
        );

        CREATE TABLE IF NOT EXISTS itens (
            codigo TEXT PRIMARY KEY NOT NULL,
            numero_etiqueta TEXT,
            descricao TEXT NOT NULL,
            categoria TEXT,
            situacao_atual TEXT NOT NULL,
            setor_atual TEXT
        );

        CREATE TABLE IF NOT EXISTS setores (
            id INTEGER PRIMARY KEY NOT NULL,
            nome TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS eventos_pendentes (
            uuid_evento TEXT PRIMARY KEY NOT NULL,
            item_codigo TEXT NOT NULL,
            setor_novo_id INTEGER,
            situacao_nova TEXT,
            observacao TEXT,
            timestamp_evento TEXT NOT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    // Migração pra quem já tinha o app instalado antes da coluna
    // "numero_etiqueta" existir — CREATE TABLE IF NOT EXISTS não
    // altera uma tabela que já existe, então tenta adicionar a
    // coluna à parte e ignora o erro se ela já estiver lá.
    try {
        await dbInstance.execAsync('ALTER TABLE itens ADD COLUMN numero_etiqueta TEXT;');
    } catch (err) {
        if (!String(err.message).includes('duplicate column')) throw err;
    }

    return dbInstance;
}
