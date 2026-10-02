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

        -- Chave primária é "id" (o id numérico do item no servidor),
        -- NÃO "codigo" — uma etiqueta de patrimônio física pode estar
        -- colada em mais de um bem por engano, e nesse caso dois itens
        -- DIFERENTES têm o mesmo "codigo" de verdade (ver
        -- patrimonio_duplicado). "codigo" como chave primária impedia
        -- os dois de caberem no cache ao mesmo tempo — um sumia.
        CREATE TABLE IF NOT EXISTS itens (
            id TEXT PRIMARY KEY NOT NULL,
            codigo TEXT,
            numero_etiqueta TEXT,
            patrimonio_duplicado INTEGER NOT NULL DEFAULT 0,
            descricao TEXT NOT NULL,
            categoria TEXT,
            situacao_atual TEXT NOT NULL,
            setor_atual TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_itens_codigo ON itens (codigo);
        CREATE INDEX IF NOT EXISTS idx_itens_numero_etiqueta ON itens (numero_etiqueta);

        CREATE TABLE IF NOT EXISTS setores (
            id INTEGER PRIMARY KEY NOT NULL,
            nome TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS eventos_pendentes (
            uuid_evento TEXT PRIMARY KEY NOT NULL,
            item_id TEXT,
            item_codigo TEXT,
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

    // Migração pra quem já tinha o app instalado antes de "codigo"
    // deixar de ser a chave primária da tabela "itens" (ver comentário
    // acima). SQLite não permite "ALTER TABLE ... DROP/CHANGE PRIMARY
    // KEY" direto — mas "itens" é só um CACHE (sempre repovoado do
    // servidor), então o jeito seguro é apagar e recriar do zero: na
    // pior das hipóteses a tela de itens fica vazia até a próxima
    // sincronização (automática ao reconectar, ou puxão manual).
    const infoItens = await dbInstance.getAllAsync('PRAGMA table_info(itens)');
    const colunaId = infoItens.find((col) => col.name === 'id');
    if (!colunaId || colunaId.pk !== 1) {
        await dbInstance.execAsync('DROP TABLE itens;');
        await dbInstance.execAsync(`
            CREATE TABLE itens (
                id TEXT PRIMARY KEY NOT NULL,
                codigo TEXT,
                numero_etiqueta TEXT,
                patrimonio_duplicado INTEGER NOT NULL DEFAULT 0,
                descricao TEXT NOT NULL,
                categoria TEXT,
                situacao_atual TEXT NOT NULL,
                setor_atual TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_itens_codigo ON itens (codigo);
            CREATE INDEX IF NOT EXISTS idx_itens_numero_etiqueta ON itens (numero_etiqueta);
        `);
    }

    // Mesma ideia pra "patrimonio_duplicado", caso a tabela já exista
    // no formato novo (com "id") mas ainda sem essa coluna.
    try {
        await dbInstance.execAsync('ALTER TABLE itens ADD COLUMN patrimonio_duplicado INTEGER NOT NULL DEFAULT 0;');
    } catch (err) {
        if (!String(err.message).includes('duplicate column')) throw err;
    }

    // "eventos_pendentes" guarda uma fila real (não é só cache) — aqui
    // só ADICIONA a coluna nova (item_id), nunca apaga a tabela, pra
    // não perder movimentação feita offline que ainda não sincronizou.
    try {
        await dbInstance.execAsync('ALTER TABLE eventos_pendentes ADD COLUMN item_id TEXT;');
    } catch (err) {
        if (!String(err.message).includes('duplicate column')) throw err;
    }

    return dbInstance;
}
