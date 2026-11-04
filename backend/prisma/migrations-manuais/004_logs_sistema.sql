-- =========================================================
-- Migração manual 004 — cria a tabela "logs_sistema" (tela de
-- Monitoramento) que nunca chegou a ser aplicada em produção.
--
-- Contexto: o commit que criou a tela de Monitoramento
-- (8d297c7, "Adiciona monitoramento de eventos...") adicionou o
-- model LogSistema no schema.prisma/schema.sql, mas como esse banco
-- de produção é aplicado via schema.sql + migrações manuais (não via
-- `prisma db push`, bloqueado em rede corporativa — ver DEPLOY.md),
-- essa tabela nunca foi criada de fato no Neon. Resultado: toda
-- tentativa de gravar ou ler um log falhava silenciosamente desde o
-- início (registrarEvento() nunca lança erro — ver utils/logger.js),
-- e a tela de Monitoramento sempre esteve vazia, mesmo com o código
-- do resto do sistema já gravando eventos normalmente há semanas.
--
-- USO: roda inteiro de uma vez (não precisa dividir em passos, não
-- cria nenhum enum usado em UPDATE na mesma transação).
-- =========================================================

DO $$ BEGIN
    CREATE TYPE "NivelLog" AS ENUM ('sucesso', 'erro', 'aviso', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "OrigemLog" AS ENUM ('web', 'app', 'backend');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "logs_sistema" (
    "id"            BIGSERIAL PRIMARY KEY,
    "nivel"         "NivelLog" NOT NULL,
    "origem"        "OrigemLog" NOT NULL,
    "acao"          VARCHAR(100) NOT NULL,
    "mensagem"      VARCHAR(500) NOT NULL,
    "detalhes"      TEXT,
    "usuario_id"    BIGINT,
    "usuario_nome"  VARCHAR(150),
    "rota"          VARCHAR(255),
    "criado_em"     TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "logs_sistema_nivel_idx" ON "logs_sistema" ("nivel");
CREATE INDEX IF NOT EXISTS "logs_sistema_origem_idx" ON "logs_sistema" ("origem");
CREATE INDEX IF NOT EXISTS "logs_sistema_criado_em_idx" ON "logs_sistema" ("criado_em");
CREATE INDEX IF NOT EXISTS "logs_sistema_usuario_id_idx" ON "logs_sistema" ("usuario_id");
