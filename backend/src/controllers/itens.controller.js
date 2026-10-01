const crypto = require('crypto');
const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

const ROTULOS_SITUACAO = {
    bom: 'Bom',
    ruim: 'Ruim',
};

// GET /itens — listagem completa (painel web), com filtros simples
const listar = asyncHandler(async (req, res) => {
    const { setorId, situacao, busca } = req.query;

    const itens = await prisma.item.findMany({
        where: {
            ...(setorId ? { setorAtualId: BigInt(setorId) } : {}),
            ...(situacao ? { situacaoAtual: situacao } : {}),
            ...(busca
                ? {
                      OR: [
                          { codigo: { contains: busca } },
                          { descricao: { contains: busca } },
                      ],
                  }
                : {}),
        },
        include: { setorAtual: true },
        orderBy: { criadoEm: 'desc' },
    });

    res.json(itens);
});

// GET /itens/exportar/xlsx — relatório da lista de itens em planilha
// formatada (mesmos filtros da listagem do painel).
const exportarXlsx = asyncHandler(async (req, res) => {
    const { setorId, situacao, busca } = req.query;

    const itens = await prisma.item.findMany({
        where: {
            ...(setorId ? { setorAtualId: BigInt(setorId) } : {}),
            ...(situacao ? { situacaoAtual: situacao } : {}),
            ...(busca
                ? {
                      OR: [
                          { codigo: { contains: busca } },
                          { descricao: { contains: busca } },
                      ],
                  }
                : {}),
        },
        include: { setorAtual: true },
        orderBy: { criadoEm: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'inventory-its';
    workbook.created = new Date();

    const planilha = workbook.addWorksheet('Itens', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    planilha.columns = [
        { header: 'Código', key: 'codigo', width: 16 },
        { header: 'Descrição', key: 'descricao', width: 40 },
        { header: 'Categoria', key: 'categoria', width: 20 },
        { header: 'Setor atual', key: 'setor', width: 24 },
        { header: 'Situação', key: 'situacao', width: 18 },
        { header: 'Etiqueta', key: 'etiqueta', width: 14 },
        { header: 'Cadastrado em', key: 'criadoEm', width: 20 },
    ];

    itens.forEach((item) => {
        planilha.addRow({
            codigo: item.codigo,
            descricao: item.descricao,
            categoria: item.categoria ?? '',
            setor: item.setorAtual?.nome ?? '',
            situacao: ROTULOS_SITUACAO[item.situacaoAtual] ?? item.situacaoAtual,
            etiqueta: item.etiquetaImpressa ? 'Impressa' : 'Pendente',
            criadoEm: item.criadoEm,
        });
    });

    const linhaCabecalho = planilha.getRow(1);
    linhaCabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    linhaCabecalho.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
    };
    linhaCabecalho.alignment = { vertical: 'middle' };
    linhaCabecalho.height = 20;

    planilha.getColumn('criadoEm').numFmt = 'dd/mm/yyyy hh:mm';

    planilha.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: planilha.columns.length },
    };

    planilha.eachRow((row, numeroLinha) => {
        row.eachCell((celula) => {
            celula.border = {
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            };
            if (numeroLinha > 1) {
                celula.alignment = { vertical: 'middle' };
            }
        });
    });

    const dataArquivo = new Date().toISOString().slice(0, 10);

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="itens-${dataArquivo}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
});

// GET /itens/sync — lista enxuta para o cache local do app
// (só os campos que o app precisa para funcionar offline —
// ver decisão de arquitetura: sem histórico, sem dados extras)
const sync = asyncHandler(async (req, res) => {
    const itens = await prisma.item.findMany({
        select: {
            codigo: true,
            descricao: true,
            categoria: true,
            situacaoAtual: true,
            setorAtual: { select: { nome: true } },
        },
    });

    res.json(
        itens.map((item) => ({
            codigo: item.codigo,
            descricao: item.descricao,
            categoria: item.categoria,
            situacaoAtual: item.situacaoAtual,
            setorAtual: item.setorAtual?.nome ?? null,
        }))
    );
});

// GET /itens/codigo/:codigo — busca por QR Code (modo online)
const buscarPorCodigo = asyncHandler(async (req, res) => {
    const item = await prisma.item.findUnique({
        where: { codigo: req.params.codigo },
        include: { setorAtual: true },
    });

    if (!item) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }

    res.json(item);
});

// GET /itens/:id — detalhe completo (painel / app online)
const buscarPorId = asyncHandler(async (req, res) => {
    const item = await prisma.item.findUnique({
        where: { id: BigInt(req.params.id) },
        include: { setorAtual: true },
    });

    if (!item) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }

    res.json(item);
});

// GET /itens/:id/eventos — histórico completo (buscado sob demanda,
// nunca cacheado localmente no app — ver decisão de arquitetura)
const listarHistorico = asyncHandler(async (req, res) => {
    const eventos = await prisma.eventoMovimentacao.findMany({
        where: { itemId: BigInt(req.params.id) },
        include: {
            usuario: { select: { nome: true } },
            setorAnterior: { select: { nome: true } },
            setorNovo: { select: { nome: true } },
        },
        orderBy: { timestampEvento: 'desc' },
    });

    res.json(eventos);
});

// POST /itens — cadastro de novo item (exige conexão; papel:
// admin ou cadastrador).
//
// O código do QR NÃO usa mais o id autoincrement direto — se usasse,
// excluir um item nunca liberaria o número dele (o Postgres não reusa
// valores de sequence), e o código ficaria crescendo pra sempre mesmo
// com poucos itens ativos. Em vez disso, procuramos o menor número
// "INV-NNNNNN" ainda não usado entre os itens existentes, preenchendo
// os buracos deixados por exclusões.
const proximoCodigoDisponivel = async (tx) => {
    const itens = await tx.item.findMany({
        where: { codigo: { startsWith: 'INV-' } },
        select: { codigo: true },
    });

    const numerosUsados = new Set();
    for (const { codigo } of itens) {
        const numero = parseInt(codigo.slice(4), 10);
        if (!Number.isNaN(numero)) numerosUsados.add(numero);
    }

    let proximo = 1;
    while (numerosUsados.has(proximo)) proximo++;

    return `INV-${String(proximo).padStart(6, '0')}`;
};

const criar = asyncHandler(async (req, res) => {
    const { descricao, categoria, setorInicialId, situacaoInicial } = req.body;

    if (!descricao) {
        return res.status(400).json({ erro: 'Descrição é obrigatória' });
    }

    const item = await prisma.$transaction(async (tx) => {
        const codigo = await proximoCodigoDisponivel(tx);

        return tx.item.create({
            data: {
                codigo,
                descricao,
                categoria: categoria ?? null,
                setorAtualId: setorInicialId ? BigInt(setorInicialId) : null,
                situacaoAtual: situacaoInicial ?? 'bom',
                criadoPor: BigInt(req.usuario.id),
            },
            include: { setorAtual: true },
        });
    });

    res.status(201).json(item);
});

// PUT /itens/:id — edição de dados cadastrais (descrição/categoria).
// Exige conexão — não passa pela fila de eventos offline (ver
// decisão de arquitetura: sem mecanismo de resolução de conflito
// para esse tipo de edição).
const atualizar = asyncHandler(async (req, res) => {
    const { descricao, categoria } = req.body;

    const item = await prisma.item.update({
        where: { id: BigInt(req.params.id) },
        data: {
            ...(descricao !== undefined ? { descricao } : {}),
            ...(categoria !== undefined ? { categoria } : {}),
        },
        include: { setorAtual: true },
    });

    res.json(item);
});

// POST /itens/:id/movimentar — registra mudança de setor e/ou
// situação pelo painel web (equivalente ao que o app mobile faz
// offline via fila de eventos, só que direto, já que o painel
// sempre está online). Gera um EventoMovimentacao normal, então
// entra no mesmo histórico e é compatível com a lógica de
// recomputo usada pela sincronização do app.
const registrarMovimentacao = asyncHandler(async (req, res) => {
    const { setorNovoId, situacaoNova, observacao } = req.body;
    const itemId = BigInt(req.params.id);

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }

    if (setorNovoId === undefined && !situacaoNova) {
        return res.status(400).json({ erro: 'Informe setorNovoId e/ou situacaoNova' });
    }

    await prisma.eventoMovimentacao.create({
        data: {
            uuidEvento: crypto.randomUUID(),
            itemId,
            usuarioId: BigInt(req.usuario.id),
            setorAnteriorId: item.setorAtualId,
            setorNovoId: setorNovoId ? BigInt(setorNovoId) : null,
            situacaoAnterior: item.situacaoAtual,
            situacaoNova: situacaoNova ?? null,
            observacao: observacao ?? null,
            timestampEvento: new Date(),
        },
    });

    const atualizado = await prisma.item.update({
        where: { id: itemId },
        data: {
            ...(setorNovoId !== undefined ? { setorAtualId: setorNovoId ? BigInt(setorNovoId) : null } : {}),
            ...(situacaoNova ? { situacaoAtual: situacaoNova } : {}),
        },
        include: { setorAtual: true },
    });

    res.json(atualizado);
});

// DELETE /itens/:id — exclui o item (só admin; ver rota). Os
// eventos de movimentação e vínculos com lotes de etiqueta são
// removidos em cascata pelo próprio banco (onDelete: Cascade no
// schema), não precisa limpar manualmente.
const excluir = asyncHandler(async (req, res) => {
    const itemId = BigInt(req.params.id);

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }

    await prisma.item.delete({ where: { id: itemId } });

    res.status(204).end();
});

// GET /itens/:id/csv — exporta o próprio item no mesmo formato usado
// na exportação de lote (codigo,descricao,setor), pra dar pra baixar
// de novo/reimprimir a etiqueta de um item avulso sem precisar gerar
// (ou achar) o lote inteiro em que ele entrou.
const exportarCsv = asyncHandler(async (req, res) => {
    const item = await prisma.item.findUnique({
        where: { id: BigInt(req.params.id) },
        include: { setorAtual: true },
    });

    if (!item) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }

    const escapar = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const linhas = [
        'codigo,descricao,setor',
        [escapar(item.codigo), escapar(item.descricao), escapar(item.setorAtual?.nome ?? '')].join(','),
    ];
    const csv = linhas.join('\n');

    // Mesmo encoding ANSI/Windows-1252 usado na exportação de lote —
    // ver comentário em lotes.controller.js#exportarCsv.
    const bufferLatin1 = Buffer.from(csv, 'latin1');

    res.setHeader('Content-Type', 'text/csv; charset=ISO-8859-1');
    res.setHeader('Content-Disposition', `attachment; filename="${item.codigo}.csv"`);
    res.send(bufferLatin1);
});

module.exports = {
    listar,
    exportarXlsx,
    sync,
    buscarPorCodigo,
    buscarPorId,
    listarHistorico,
    criar,
    atualizar,
    registrarMovimentacao,
    excluir,
    exportarCsv,
};
