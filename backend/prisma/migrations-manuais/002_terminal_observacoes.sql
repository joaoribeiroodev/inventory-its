-- =========================================================
-- Migração manual 002 — separa "Terminal" de "Setor" e adiciona
-- "observações" no item.
--
-- Contexto: até aqui, "setores.nome" misturava prédio + departamento
-- no mesmo texto (ex. "BOM DESPACHO - CCO" — ver
-- backend/scripts/importar-levantamento.js), porque o mesmo
-- departamento existe nos dois terminais físicos (São Joaquim e Bom
-- Despacho) em salas diferentes. Essa migração:
--   1. Cria o enum "Terminal" e a coluna setores.terminal
--   2. Faz o backfill: separa o prefixo "SÃO JOAQUIM - " /
--      "BOM DESPACHO - " de "setores.nome" pros registros que já
--      seguem esse padrão (criados pelo importar-levantamento.js)
--   3. Troca a constraint de unicidade de "nome" sozinho para
--      "terminal + nome"
--   4. Adiciona itens.observacoes (texto livre)
--
-- USO (banco já em produção, depois de aplicar o schema.sql
-- original uma vez):
--   cat backend/prisma/migrations-manuais/002_terminal_observacoes.sql | \
--     docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
--
-- ATENÇÃO: qualquer setor que tenha sido cadastrado manualmente pelo
-- painel (tela Setores) SEM seguir o padrão "PRÉDIO - DEPARTAMENTO"
-- cai no "ELSE" abaixo e é jogado em "bom_despacho" por padrão —
-- depois de rodar isso, confira na tela Setores se algum item ficou
-- no terminal errado e corrija manualmente (editar setor).
-- =========================================================

CREATE TYPE "Terminal" AS ENUM ('sao_joaquim', 'bom_despacho');

ALTER TABLE "setores" ADD COLUMN "terminal" "Terminal";

UPDATE "setores" SET "terminal" = CASE
    WHEN "nome" LIKE 'SÃO JOAQUIM - %' THEN 'sao_joaquim'::"Terminal"
    WHEN "nome" LIKE 'BOM DESPACHO - %' THEN 'bom_despacho'::"Terminal"
    ELSE 'bom_despacho'::"Terminal" -- ver aviso acima
END;

-- Precisa soltar a constraint de unicidade de "nome" sozinho ANTES
-- de limpar o prefixo: dois setores que viram o mesmo departamento
-- (ex. "CCO" nos dois terminais) violariam "setores_nome_key" no
-- meio do caminho, antes de ela ser trocada pela de terminal+nome.
ALTER TABLE "setores" DROP CONSTRAINT IF EXISTS "setores_nome_key";

UPDATE "setores"
SET "nome" = regexp_replace("nome", '^(SÃO JOAQUIM|BOM DESPACHO) - ', '')
WHERE "nome" ~ '^(SÃO JOAQUIM|BOM DESPACHO) - ';

ALTER TABLE "setores" ALTER COLUMN "terminal" SET NOT NULL;
ALTER TABLE "setores" ADD CONSTRAINT "setores_terminal_nome_key" UNIQUE ("terminal", "nome");

ALTER TABLE "itens" ADD COLUMN "observacoes" TEXT;
