-- =========================================================
-- inventory-its — schema SQL "puro", gerado a partir de
-- schema.prisma (backend/prisma/schema.prisma) pra quem está numa
-- rede que bloqueia o "prisma db push"/"prisma migrate" (esses
-- comandos fazem uma chamada de telemetria pra fora, além de o
-- "npx prisma ..." às vezes precisar baixar o próprio pacote do
-- registry do npm se não estiver em cache — em rede corporativa
-- restritiva isso trava ou falha).
--
-- Este arquivo cria as tabelas direto via "psql", que só precisa
-- falar com o Postgres (local, dentro do Docker) — nenhuma chamada
-- de rede externa. Fruto da mesma fonte de verdade que
-- schema.prisma; se o schema.prisma mudar no futuro, este arquivo
-- precisa ser atualizado junto (eu cuido disso quando fizer a
-- mudança).
--
-- USO (depois que o container "postgres" já está de pé):
--   cat backend/prisma/schema.sql | docker compose exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
--
-- Seguro de rodar só uma vez num banco vazio. Rodar de novo num
-- banco que já tem essas tabelas dá erro "already exists" (não
-- quebra nada, só não faz nada de novo — não é pensado pra
-- migração incremental, só pra criação inicial).
-- =========================================================

CREATE TYPE "Papel" AS ENUM ('admin', 'cadastrador', 'operador');
CREATE TYPE "Situacao" AS ENUM ('bom', 'ruim');

CREATE TABLE "usuarios" (
    "id"            BIGSERIAL PRIMARY KEY,
    "nome"          VARCHAR(150) NOT NULL,
    "usuario"       VARCHAR(60),
    "email"         VARCHAR(190) NOT NULL,
    "senha_hash"    VARCHAR(255) NOT NULL,
    "papel"         "Papel" NOT NULL DEFAULT 'operador',
    "ativo"         BOOLEAN NOT NULL DEFAULT true,
    "criado_em"     TIMESTAMP(3) NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "usuarios_usuario_key" UNIQUE ("usuario"),
    CONSTRAINT "usuarios_email_key" UNIQUE ("email")
);

CREATE TABLE "dispositivos" (
    "id"                       BIGSERIAL PRIMARY KEY,
    "usuario_id"               BIGINT NOT NULL,
    "identificador"            VARCHAR(190) NOT NULL,
    "apelido"                  VARCHAR(100),
    "ultima_sincronizacao_em"  TIMESTAMP(3),
    "criado_em"                TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "dispositivos_identificador_key" UNIQUE ("identificador"),
    CONSTRAINT "dispositivos_usuario_id_fkey" FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios" ("id") ON DELETE CASCADE
);

CREATE TABLE "setores" (
    "id"        BIGSERIAL PRIMARY KEY,
    "nome"      VARCHAR(150) NOT NULL,
    "descricao" VARCHAR(255),
    "ativo"     BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "setores_nome_key" UNIQUE ("nome")
);

CREATE TABLE "itens" (
    "id"                    BIGSERIAL PRIMARY KEY,
    "codigo"                VARCHAR(30),
    "descricao"             VARCHAR(255) NOT NULL,
    "categoria"             VARCHAR(100),
    "numero_etiqueta"       VARCHAR(30),
    "patrimonio_duplicado"  BOOLEAN NOT NULL DEFAULT false,
    "setor_atual_id"        BIGINT,
    "situacao_atual"        "Situacao" NOT NULL DEFAULT 'bom',
    "etiqueta_impressa"     BOOLEAN NOT NULL DEFAULT false,
    "lote_etiqueta_id"      BIGINT,
    "criado_por"            BIGINT,
    "criado_em"             TIMESTAMP(3) NOT NULL DEFAULT now(),
    "atualizado_em"         TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "itens_setor_atual_id_fkey" FOREIGN KEY ("setor_atual_id")
        REFERENCES "setores" ("id") ON DELETE SET NULL,
    CONSTRAINT "itens_criado_por_fkey" FOREIGN KEY ("criado_por")
        REFERENCES "usuarios" ("id") ON DELETE SET NULL
);

CREATE INDEX "itens_setor_atual_id_idx" ON "itens" ("setor_atual_id");
CREATE INDEX "itens_etiqueta_impressa_idx" ON "itens" ("etiqueta_impressa");
CREATE INDEX "itens_numero_etiqueta_idx" ON "itens" ("numero_etiqueta");
CREATE INDEX "itens_codigo_idx" ON "itens" ("codigo");

CREATE TABLE "eventos_movimentacao" (
    "id"                      BIGSERIAL PRIMARY KEY,
    "item_id"                 BIGINT NOT NULL,
    "usuario_id"              BIGINT NOT NULL,
    "dispositivo_id"          BIGINT,
    "setor_anterior_id"       BIGINT,
    "setor_novo_id"           BIGINT,
    "situacao_anterior"       VARCHAR(30),
    "situacao_nova"           VARCHAR(30),
    "observacao"              VARCHAR(255),
    "uuid_evento"             CHAR(36) NOT NULL,
    "timestamp_evento"        TIMESTAMP(3) NOT NULL,
    "timestamp_sincronizado"  TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "eventos_movimentacao_uuid_evento_key" UNIQUE ("uuid_evento"),
    CONSTRAINT "eventos_movimentacao_item_id_fkey" FOREIGN KEY ("item_id")
        REFERENCES "itens" ("id") ON DELETE CASCADE,
    CONSTRAINT "eventos_movimentacao_usuario_id_fkey" FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios" ("id"),
    CONSTRAINT "eventos_movimentacao_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id")
        REFERENCES "dispositivos" ("id") ON DELETE SET NULL,
    CONSTRAINT "eventos_movimentacao_setor_anterior_id_fkey" FOREIGN KEY ("setor_anterior_id")
        REFERENCES "setores" ("id") ON DELETE SET NULL,
    CONSTRAINT "eventos_movimentacao_setor_novo_id_fkey" FOREIGN KEY ("setor_novo_id")
        REFERENCES "setores" ("id") ON DELETE SET NULL
);

CREATE INDEX "eventos_movimentacao_item_id_timestamp_evento_idx" ON "eventos_movimentacao" ("item_id", "timestamp_evento");
CREATE INDEX "eventos_movimentacao_usuario_id_idx" ON "eventos_movimentacao" ("usuario_id");

CREATE TABLE "lotes_etiquetas" (
    "id"               BIGSERIAL PRIMARY KEY,
    "usuario_id"       BIGINT NOT NULL,
    "quantidade_itens" INTEGER NOT NULL DEFAULT 0,
    "observacao"       VARCHAR(255),
    "criado_em"        TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "lotes_etiquetas_usuario_id_fkey" FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios" ("id")
);

CREATE TABLE "lote_etiquetas_itens" (
    "lote_id" BIGINT NOT NULL,
    "item_id" BIGINT NOT NULL,
    PRIMARY KEY ("lote_id", "item_id"),
    CONSTRAINT "lote_etiquetas_itens_lote_id_fkey" FOREIGN KEY ("lote_id")
        REFERENCES "lotes_etiquetas" ("id") ON DELETE CASCADE,
    CONSTRAINT "lote_etiquetas_itens_item_id_fkey" FOREIGN KEY ("item_id")
        REFERENCES "itens" ("id") ON DELETE CASCADE
);

CREATE TYPE "NivelLog" AS ENUM ('sucesso', 'erro', 'aviso', 'info');
CREATE TYPE "OrigemLog" AS ENUM ('web', 'app', 'backend');

CREATE TABLE "logs_sistema" (
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

CREATE INDEX "logs_sistema_nivel_idx" ON "logs_sistema" ("nivel");
CREATE INDEX "logs_sistema_origem_idx" ON "logs_sistema" ("origem");
CREATE INDEX "logs_sistema_criado_em_idx" ON "logs_sistema" ("criado_em");
CREATE INDEX "logs_sistema_usuario_id_idx" ON "logs_sistema" ("usuario_id");
