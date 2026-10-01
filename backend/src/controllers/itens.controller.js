const crypto = require('crypto');
const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const { proximoNumeroDisponivel } = require('../utils/codigoGerado');

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
        // Item sem código ainda (sem etiqueta física impressa nem
        // gerada) não tem o que ser escaneado — não faz sentido levar
        // pro cache offline do app.
        where: { codigo: { not: null } },
        select: {
            codigo: true,
            numeroEtiqueta: true,
            descricao: true,
            categoria: true,
            situacaoAtual: true,
            setorAtual: { select: { nome: true } },
        },
    });

    res.json(
        itens.map((item) => ({
            codigo: item.codigo,
            numeroEtiqueta: item.numeroEtiqueta,
            descricao: item.descricao,
            categoria: item.categoria,
            situacaoAtual: item.situacaoAtual,
            setorAtual: item.setorAtual?.nome ?? null,
        }))
    );
});

// GET /itens/codigo/:codigo — busca pelo texto lido do código de
// barras/QR Code (modo online).
//
// Primeiro tenta bater exatamente com o "codigo" do sistema (caso
// normal: QR gerado por nós, ou etiqueta de patrimônio física sem
// duplicidade — nesses dois casos codigo === numeroEtiqueta). Se não
// achar, cai pro "numeroEtiqueta": cobre o caso de uma etiqueta de
// patrimônio física que foi colada em mais de um bem (ver levantamento
// patrimonial) — aí vários itens têm o mesmo numeroEtiqueta mas
// "codigo" com sufixo (-A, -B...). Se mais de um item bater, devolve
// a lista pra quem escaneou escolher qual é o item físico certo, em
// vez de abrir um item errado.
const buscarPorCodigo = asyncHandler(async (req, res) => {
    const codigo = req.params.codigo;

    const direto = await prisma.item.findUnique({
        where: { codigo },
        include: { setorAtual: true },
    });
    if (direto) {
        return res.json(direto);
    }

    const candidatos = await prisma.item.findMany({
        where: { numeroEtiqueta: codigo },
        include: { setorAtual: true },
    });

    if (candidatos.length === 0) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }
    if (candidatos.length === 1) {
        return res.json(candidatos[0]);
    }

    res.json({ ambiguo: true, itens: candidatos });
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
// O código do item (padrão patrimônio, só dígitos) só existe quando
// existe uma etiqueta física correspondente:
//
//  1. O item já tem uma etiqueta de patrimônio física (foi lida por
//     QR/código de barras, ou digitada na mão) — usamos esse número
//     direto como código, sem inventar nada.
//  2. O item não tem etiqueta física nenhuma ainda — NÃO geramos
//     código nenhum aqui. Ele fica com codigo=null (não entra na
//     listagem de "pendente de etiqueta" tecnicamente ele já entra,
//     já que etiquetaImpressa é false por padrão) até alguém decidir
//     imprimir uma etiqueta pra ele de verdade — é só nesse momento
//     (gerar lote, adicionar a um lote ou baixar o CSV avulso do
//     item — ver lotes.controller.js e exportarCsv abaixo) que um
//     número é gerado, pra nunca existir código no sistema sem
//     existir etiqueta física pra ele (ver conversa com o João).
const criar = asyncHandler(async (req, res) => {
    const { descricao, categoria, setorInicialId, situacaoInicial, numeroEtiqueta } = req.body;

    if (!descricao) {
        return res.status(400).json({ erro: 'Descrição é obrigatória' });
    }

    const codigo = numeroEtiqueta ? String(numeroEtiqueta).trim() : null;

    try {
        const item = await prisma.item.create({
            data: {
                codigo,
                numeroEtiqueta: codigo,
                descricao,
                categoria: categoria ?? null,
                setorAtualId: setorInicialId ? BigInt(setorInicialId) : null,
                situacaoAtual: situacaoInicial ?? 'bom',
                criadoPor: BigInt(req.usuario.id),
            },
            include: { setorAtual: true },
        });

        res.status(201).json(item);
    } catch (err) {
        // Código de patrimônio já cadastrado em outro item (constraint
        // unique de "codigo") — caso normal de digitação, não é um 500.
        if (err.code === 'P2002') {
            return res.status(409).json({ erro: `Já existe um item com o código "${numeroEtiqueta}"` });
        }
        throw err;
    }
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

// POST /itens/excluir-lote — exclui vários itens de uma vez (só
// admin; ver rota), pra não precisar entrar item por item quando dá
// pra selecionar uma leva direto na lista. Mesma cascata do excluir()
// de item único.
const excluirVarios = asyncHandler(async (req, res) => {
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ erro: 'Informe ao menos um item' });
    }

    const ids = itemIds.map((id) => BigInt(id));
    const resultado = await prisma.item.deleteMany({ where: { id: { in: ids } } });

    res.json({ excluidos: resultado.count });
});

// GET /itens/:id/csv — exporta o próprio item no mesmo formato usado
// na exportação de lote (codigo,descricao,setor), pra dar pra baixar
// de novo/reimprimir a etiqueta de um item avulso sem precisar gerar
// (ou achar) o lote inteiro em que ele entrou.
const exportarCsv = asyncHandler(async (req, res) => {
    let item = await prisma.item.findUnique({
        where: { id: BigInt(req.params.id) },
        include: { setorAtual: true },
    });

    if (!item) {
        return res.status(404).json({ erro: 'Item não encontrado' });
    }

    // Item sem etiqueta física ainda e sem código: baixar o CSV É a
    // intenção de imprimir agora, então é aqui que o código é gerado
    // (ver comentário em criar(), acima).
    if (!item.codigo) {
        const codigo = await proximoNumeroDisponivel(prisma);
        item = await prisma.item.update({
            where: { id: item.id },
            data: { codigo },
            include: { setorAtual: true },
        });
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
    excluirVarios,
    exportarCsv,
};
