const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const { registrarEvento } = require('../utils/logger');

const NIVEIS_VALIDOS = ['sucesso', 'erro', 'aviso', 'info'];
const ORIGENS_VALIDAS = ['web', 'app', 'backend'];

const PAGE_SIZE_PADRAO = 50;
const PAGE_SIZE_MAXIMO = 200;

/**
 * POST /logs — relato de evento vindo do painel web ou do app
 * mobile (origem='web'|'app'; 'backend' é reservado para o próprio
 * servidor — ver errorHandler/registrarEvento nos controllers).
 *
 * Rota semi-pública (autenticarOpcional — ver rota): aceita token
 * válido (anexa o usuário ao log) mas também funciona sem ele, já
 * que um erro pode acontecer ANTES do login completar (ex: a tela
 * de login não conseguiu alcançar o servidor).
 */
const registrarLogCliente = asyncHandler(async (req, res) => {
    const { nivel, origem, acao, mensagem, detalhes, rota } = req.body;

    if (!NIVEIS_VALIDOS.includes(nivel)) {
        return res.status(400).json({ erro: 'nivel inválido' });
    }
    if (!['web', 'app'].includes(origem)) {
        return res.status(400).json({ erro: 'origem inválida (use "web" ou "app")' });
    }
    if (!acao || !mensagem) {
        return res.status(400).json({ erro: 'Informe acao e mensagem' });
    }

    await registrarEvento({
        nivel,
        origem,
        acao,
        mensagem,
        detalhes,
        rota,
        usuarioId: req.usuario?.id,
        usuarioNome: req.usuario?.nome,
    });

    res.status(201).json({ ok: true });
});

/**
 * GET /logs — listagem paginada para a tela de Monitoramento
 * (admin). Filtros opcionais via query string: nivel, origem,
 * usuarioId, de (data inicial ISO), ate (data final ISO), busca
 * (texto livre em acao/mensagem/usuarioNome).
 */
const listar = asyncHandler(async (req, res) => {
    const { nivel, origem, usuarioId, de, ate, busca } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(
        PAGE_SIZE_MAXIMO,
        Math.max(1, parseInt(req.query.pageSize, 10) || PAGE_SIZE_PADRAO)
    );

    const where = {
        ...(nivel && NIVEIS_VALIDOS.includes(nivel) ? { nivel } : {}),
        ...(origem && ORIGENS_VALIDAS.includes(origem) ? { origem } : {}),
        ...(usuarioId ? { usuarioId: BigInt(usuarioId) } : {}),
        ...((de || ate)
            ? {
                  criadoEm: {
                      ...(de ? { gte: new Date(de) } : {}),
                      ...(ate ? { lte: new Date(ate) } : {}),
                  },
              }
            : {}),
        ...(busca?.trim()
            ? {
                  OR: [
                      { acao: { contains: busca.trim(), mode: 'insensitive' } },
                      { mensagem: { contains: busca.trim(), mode: 'insensitive' } },
                      { usuarioNome: { contains: busca.trim(), mode: 'insensitive' } },
                  ],
              }
            : {}),
    };

    const [itens, total] = await Promise.all([
        prisma.logSistema.findMany({
            where,
            orderBy: { criadoEm: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.logSistema.count({ where }),
    ]);

    res.json({
        itens,
        total,
        pagina: page,
        totalPaginas: Math.max(1, Math.ceil(total / pageSize)),
    });
});

/**
 * GET /logs/resumo — números pra cards de visão geral da tela de
 * Monitoramento: contagem por nível nas últimas 24h e nos últimos
 * 7 dias, e total por origem nas últimas 24h.
 */
const resumo = asyncHandler(async (req, res) => {
    const agora = new Date();
    const desde24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    const desde7d = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [porNivel24h, porNivel7d, porOrigem24h, ultimoErro] = await Promise.all([
        prisma.logSistema.groupBy({
            by: ['nivel'],
            where: { criadoEm: { gte: desde24h } },
            _count: { _all: true },
        }),
        prisma.logSistema.groupBy({
            by: ['nivel'],
            where: { criadoEm: { gte: desde7d } },
            _count: { _all: true },
        }),
        prisma.logSistema.groupBy({
            by: ['origem'],
            where: { criadoEm: { gte: desde24h } },
            _count: { _all: true },
        }),
        prisma.logSistema.findFirst({
            where: { nivel: 'erro' },
            orderBy: { criadoEm: 'desc' },
        }),
    ]);

    const contarPor = (linhas, campo) =>
        linhas.reduce((acc, l) => ({ ...acc, [l[campo]]: l._count._all }), {});

    res.json({
        porNivel24h: contarPor(porNivel24h, 'nivel'),
        porNivel7d: contarPor(porNivel7d, 'nivel'),
        porOrigem24h: contarPor(porOrigem24h, 'origem'),
        ultimoErro,
    });
});

module.exports = { registrarLogCliente, listar, resumo };
