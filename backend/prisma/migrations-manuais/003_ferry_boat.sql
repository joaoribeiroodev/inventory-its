-- =========================================================
-- Migração manual 003 — adiciona "ferry_boat" ao enum Terminal e
-- move os setores de embarcação pra ele.
--
-- Contexto: a migração 002 só previa os dois terminais físicos
-- (São Joaquim / Bom Despacho). Os setores que representam
-- embarcações da frota (ex. "EMBARCAÇÃO - FB RIO PARAGUAÇU") não são
-- nenhum dos dois prédios, e caíram em "Bom Despacho" por padrão
-- (ver aviso da migração 002 e conversa com o João). Pra essas, o
-- "Setor" passa a ser só o nome do barco (sem o prefixo
-- "EMBARCAÇÃO - ", que vira redundante já que agora tem o terminal
-- "Ferry Boat" como campo próprio).
--
-- IMPORTANTE — rodar em DOIS passos separados, nessa ordem. Um novo
-- valor de enum (ALTER TYPE ... ADD VALUE) não pode ser usado na
-- mesma transação em que foi criado, então não dá pra juntar os dois
-- blocos abaixo num DO $$ ... $$ só, nem rodar tudo de uma vez numa
-- ferramenta que envia tudo como uma transação única.
--
-- USO: cole e rode o PASSO 1 sozinho, espere confirmar que rodou, e
-- só depois cole e rode o PASSO 2.
-- =========================================================

-- PASSO 1 — roda sozinho, espera terminar antes do passo 2.
ALTER TYPE "Terminal" ADD VALUE IF NOT EXISTS 'ferry_boat';


-- PASSO 2 — roda depois que o passo 1 já foi confirmado.
-- Ajuste o WHERE/regex aqui se o padrão de nome dos setores de
-- embarcação na sua base for diferente de "EMBARCAÇÃO - <barco>".
DO $$
BEGIN
    UPDATE "setores"
    SET "terminal" = 'ferry_boat',
        "nome" = regexp_replace("nome", '^EMBARCAÇÃO - ', '')
    WHERE "nome" ~ '^EMBARCAÇÃO - ';
END $$;
