const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /lotes/pendentes — itens que ainda não tiveram etiqueta gerada
const listarPendentes = asyncHandler(async (req, res) => {
    const itens = await prisma.item.findMany({
        where: { etiquetaImpressa: false },
        include: { setorAtual: true },
        orderBy: { criadoEm: 'asc' },
    });
    res.json(itens);
});

// GET /lotes — histórico de lotes já gerados
const listar = asyncHandler(async (req, res) => {
    const lotes = await prisma.loteEtiquetas.findMany({
        include: { usuario: { select: { nome: true } }, _count: { select: { itens: true } } },
        orderBy: { criadoEm: 'desc' },
    });
    res.json(lotes);
});

// GET /lotes/:id — detalhe do lote, com a lista de itens que foram
// incluídos nele (pra identificar o que exatamente foi impresso,
// já que o histórico sozinho só mostra data/quantidade).
const buscarPorId = asyncHandler(async (req, res) => {
    const lote = await prisma.loteEtiquetas.findUnique({
        where: { id: BigInt(req.params.id) },
        include: {
            usuario: { select: { nome: true } },
            itens: { include: { item: { include: { setorAtual: true } } } },
        },
    });

    if (!lote) {
        return res.status(404).json({ erro: 'Lote não encontrado' });
    }

    res.json(lote);
});

// POST /lotes — gera um novo lote a partir dos itens pendentes
// (ou de uma lista específica de itemIds, se enviada no body)
const criar = asyncHandler(async (req, res) => {
    const { itemIds, observacao } = req.body;

    const itens = itemIds && itemIds.length
        ? await prisma.item.findMany({ where: { id: { in: itemIds.map(BigInt) }, etiquetaImpressa: false } })
        : await prisma.item.findMany({ where: { etiquetaImpressa: false } });

    if (itens.length === 0) {
        return res.status(400).json({ erro: 'Nenhum item pendente para gerar etiqueta' });
    }

    const lote = await prisma.$transaction(async (tx) => {
        const novoLote = await tx.loteEtiquetas.create({
            data: {
                usuarioId: BigInt(req.usuario.id),
                quantidadeItens: itens.length,
                observacao: observacao ?? null,
            },
        });

        await tx.loteEtiquetasItem.createMany({
            data: itens.map((item) => ({ loteId: novoLote.id, itemId: item.id })),
        });

        await tx.item.updateMany({
            where: { id: { in: itens.map((i) => i.id) } },
            data: { etiquetaImpressa: true, loteEtiquetaId: novoLote.id },
        });

        return novoLote;
    });

    res.status(201).json({ ...lote, itens });
});

// GET /lotes/:id/csv — exporta o lote no formato esperado pelo
// template do P-touch Editor (colunas: codigo,descricao,setor)
const exportarCsv = asyncHandler(async (req, res) => {
    const lote = await prisma.loteEtiquetas.findUnique({
        where: { id: BigInt(req.params.id) },
        include: { itens: { include: { item: { include: { setorAtual: true } } } } },
    });

    if (!lote) {
        return res.status(404).json({ erro: 'Lote não encontrado' });
    }

    const linhas = ['codigo,descricao,setor'];
    for (const { item } of lote.itens) {
        const setor = item.setorAtual?.nome ?? '';
        // Escapa vírgulas/aspas básicas para não quebrar o CSV
        const escapar = (v) => `"${String(v).replace(/"/g, '""')}"`;
        linhas.push([escapar(item.codigo), escapar(item.descricao), escapar(setor)].join(','));
    }

    const csv = linhas.join('\n');

    // O P-touch Editor não reconhece BOM UTF-8 (tentamos isso antes e só
    // piorou: os 3 bytes do BOM apareciam como "i»¿" colado no primeiro
    // cabeçalho). Ele espera o arquivo em ANSI/Windows-1252 mesmo — é
    // esse o encoding padrão que o Windows usa pra CSV sem BOM. Como o
    // conjunto de acentos do português (ã, ç, á, é, etc.) ocupa a mesma
    // faixa de bytes em Windows-1252 e em Latin-1 (ISO-8859-1), convertemos
    // a string (que está correta em memória, em UTF-16/JS) direto pra um
    // buffer Latin-1 — equivalente ao que o P-touch consegue ler.
    const bufferLatin1 = Buffer.from(csv, 'latin1');

    res.setHeader('Content-Type', 'text/csv; charset=ISO-8859-1');
    res.setHeader('Content-Disposition', `attachment; filename="lote-${lote.id}.csv"`);
    res.send(bufferLatin1);
});

module.exports = { listarPendentes, listar, buscarPorId, criar, exportarCsv };
