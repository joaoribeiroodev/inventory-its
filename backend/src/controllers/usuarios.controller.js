const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

// Todas as rotas deste controller são restritas a admin
// (ver middleware autorizar('admin') nas rotas)

const listar = asyncHandler(async (req, res) => {
    const usuarios = await prisma.usuario.findMany({
        select: { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true },
        orderBy: { nome: 'asc' },
    });
    res.json(usuarios);
});

const criar = asyncHandler(async (req, res) => {
    const { nome, email, senha, papel } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
        data: { nome, email, senhaHash, papel: papel ?? 'operador' },
        select: { id: true, nome: true, email: true, papel: true, ativo: true },
    });

    res.status(201).json(usuario);
});

const atualizar = asyncHandler(async (req, res) => {
    const { nome, papel, ativo, senha } = req.body;

    const dados = {
        ...(nome !== undefined ? { nome } : {}),
        ...(papel !== undefined ? { papel } : {}),
        ...(ativo !== undefined ? { ativo } : {}),
    };

    if (senha) {
        dados.senhaHash = await bcrypt.hash(senha, 10);
    }

    const usuario = await prisma.usuario.update({
        where: { id: BigInt(req.params.id) },
        data: dados,
        select: { id: true, nome: true, email: true, papel: true, ativo: true },
    });

    res.json(usuario);
});

module.exports = { listar, criar, atualizar };
