const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
    const setores = await prisma.setor.findMany({ orderBy: { nome: 'asc' } });
    res.json(setores);
});

const criar = asyncHandler(async (req, res) => {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });

    const setor = await prisma.setor.create({ data: { nome, descricao: descricao ?? null } });
    res.status(201).json(setor);
});

const atualizar = asyncHandler(async (req, res) => {
    const { nome, descricao, ativo } = req.body;

    const setor = await prisma.setor.update({
        where: { id: BigInt(req.params.id) },
        data: {
            ...(nome !== undefined ? { nome } : {}),
            ...(descricao !== undefined ? { descricao } : {}),
            ...(ativo !== undefined ? { ativo } : {}),
        },
    });

    res.json(setor);
});

module.exports = { listar, criar, atualizar };
