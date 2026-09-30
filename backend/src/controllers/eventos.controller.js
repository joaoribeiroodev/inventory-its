const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Recalcula o cache de estado atual (setorAtualId / situacaoAtual)
 * de um item a partir do HISTÓRICO COMPLETO de eventos, ordenado
 * pelo timestamp do aparelho (não pela ordem de chegada).
 *
 * Isso é o que torna a sincronização robusta a eventos que chegam
 * fora de ordem (ex: um tablet ficou 2 dias offline e sincroniza
 * eventos "antigos" depois de eventos mais recentes de outro
 * aparelho): sempre refazemos o replay completo, então o resultado
 * final é sempre consistente, independente da ordem de chegada.
 */
async function recomputarCacheItem(tx, itemId) {
    const eventos = await tx.eventoMovimentacao.findMany({
        where: { itemId },
        orderBy: { timestampEvento: 'asc' },
    });

    let setorAtualId = null;
    let situacaoAtual = 'em_uso';

    for (const evento of eventos) {
        if (evento.setorNovoId !== null) setorAtualId = evento.setorNovoId;
        if (evento.situacaoNova !== null) situacaoAtual = evento.situacaoNova;
    }

    await tx.item.update({
        where: { id: itemId },
        data: { setorAtualId, situacaoAtual },
    });
}

/**
 * POST /eventos/sync
 *
 * Recebe a fila de eventos pendentes de um dispositivo (gerados
 * offline) e processa em lote. Idempotente por uuidEvento: reenviar
 * o mesmo evento (ex: app não recebeu confirmação e tenta de novo)
 * não duplica nada.
 *
 * Body esperado:
 * {
 *   "dispositivoIdentificador": "expo-device-id-xyz",
 *   "eventos": [
 *     {
 *       "uuidEvento": "uuid-gerado-no-app",
 *       "itemCodigo": "INV-000042",
 *       "setorNovoId": 3,            // opcional
 *       "situacaoNova": "em_uso",    // opcional
 *       "observacao": "...",         // opcional
 *       "timestampEvento": "2026-09-29T14:32:00-03:00"
 *     },
 *     ...
 *   ]
 * }
 */
const sincronizar = asyncHandler(async (req, res) => {
    const { dispositivoIdentificador, eventos } = req.body;

    if (!dispositivoIdentificador || !Array.isArray(eventos)) {
        return res.status(400).json({
            erro: 'Informe dispositivoIdentificador e um array de eventos',
        });
    }

    const dispositivo = await prisma.dispositivo.upsert({
        where: { identificador: dispositivoIdentificador },
        update: { ultimaSincronizacaoEm: new Date() },
        create: {
            identificador: dispositivoIdentificador,
            usuarioId: BigInt(req.usuario.id),
            ultimaSincronizacaoEm: new Date(),
        },
    });

    const resultados = [];
    const itensAfetados = new Set();

    for (const evento of eventos) {
        const { uuidEvento, itemCodigo, setorNovoId, situacaoNova, observacao, timestampEvento } = evento;

        if (!uuidEvento || !itemCodigo || !timestampEvento) {
            resultados.push({ uuidEvento, status: 'erro', motivo: 'campos obrigatórios ausentes' });
            continue;
        }

        // Idempotência: já processado antes? não faz nada, só confirma
        const jaExiste = await prisma.eventoMovimentacao.findUnique({ where: { uuidEvento } });
        if (jaExiste) {
            resultados.push({ uuidEvento, status: 'ja_processado' });
            continue;
        }

        const item = await prisma.item.findUnique({ where: { codigo: itemCodigo } });
        if (!item) {
            resultados.push({ uuidEvento, status: 'erro', motivo: 'item não encontrado' });
            continue;
        }

        await prisma.eventoMovimentacao.create({
            data: {
                uuidEvento,
                itemId: item.id,
                usuarioId: BigInt(req.usuario.id),
                dispositivoId: dispositivo.id,
                setorAnteriorId: item.setorAtualId,
                setorNovoId: setorNovoId ? BigInt(setorNovoId) : null,
                situacaoAnterior: item.situacaoAtual,
                situacaoNova: situacaoNova ?? null,
                observacao: observacao ?? null,
                timestampEvento: new Date(timestampEvento),
            },
        });

        itensAfetados.add(item.id.toString());
        resultados.push({ uuidEvento, status: 'sincronizado' });
    }

    // Recalcula o cache só dos itens que realmente receberam
    // eventos novos nesta chamada
    await prisma.$transaction(async (tx) => {
        for (const id of itensAfetados) {
            await recomputarCacheItem(tx, BigInt(id));
        }
    });

    res.json({ resultados });
});

module.exports = { sincronizar };
