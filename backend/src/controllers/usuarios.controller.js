const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const { registrarEvento } = require('../utils/logger');

// Todas as rotas deste controller são restritas a admin
// (ver middleware autorizar('admin') nas rotas)

const listar = asyncHandler(async (req, res) => {
    const usuarios = await prisma.usuario.findMany({
        select: { id: true, nome: true, usuario: true, email: true, papel: true, ativo: true, criadoEm: true },
        orderBy: { nome: 'asc' },
    });
    res.json(usuarios);
});

const criar = asyncHandler(async (req, res) => {
    const { nome, usuario: nomeDeUsuario, email, senha, papel } = req.body;

    if (!nome || !nomeDeUsuario || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, usuário, email e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    let usuario;
    try {
        usuario = await prisma.usuario.create({
            data: { nome, usuario: nomeDeUsuario.trim(), email, senhaHash, papel: papel ?? 'operador' },
            select: { id: true, nome: true, usuario: true, email: true, papel: true, ativo: true },
        });
    } catch (err) {
        // P2002 = violação de unique (email OU usuario já cadastrado) —
        // devolve 409 em vez do 500 genérico do errorHandler, pra tela
        // mostrar uma mensagem que faz sentido pra quem tá cadastrando.
        if (err.code === 'P2002') {
            const campo = err.meta?.target?.includes('usuario') ? 'usuário' : 'email';
            const mensagem = `Esse ${campo} já está em uso`;
            registrarEvento({
                nivel: 'erro',
                origem: req.origemCliente,
                acao: 'criar_usuario',
                mensagem: `Falha ao criar usuário "${nome}": ${mensagem}`,
                usuarioId: req.usuario.id,
                usuarioNome: req.usuario.nome,
                rota: 'POST /usuarios',
            });
            return res.status(409).json({ erro: mensagem });
        }
        throw err;
    }

    registrarEvento({
        nivel: 'sucesso',
        origem: req.origemCliente,
        acao: 'criar_usuario',
        mensagem: `${req.usuario.nome} cadastrou o usuário "${usuario.nome}" (${usuario.papel})`,
        usuarioId: req.usuario.id,
        usuarioNome: req.usuario.nome,
        rota: 'POST /usuarios',
    });

    res.status(201).json(usuario);
});

const atualizar = asyncHandler(async (req, res) => {
    const { nome, usuario: nomeDeUsuario, papel, ativo, senha } = req.body;

    const dados = {
        ...(nome !== undefined ? { nome } : {}),
        ...(nomeDeUsuario !== undefined ? { usuario: nomeDeUsuario.trim() || null } : {}),
        ...(papel !== undefined ? { papel } : {}),
        ...(ativo !== undefined ? { ativo } : {}),
    };

    if (senha) {
        dados.senhaHash = await bcrypt.hash(senha, 10);
    }

    let usuario;
    try {
        usuario = await prisma.usuario.update({
            where: { id: BigInt(req.params.id) },
            data: dados,
            select: { id: true, nome: true, usuario: true, email: true, papel: true, ativo: true },
        });
    } catch (err) {
        if (err.code === 'P2002') {
            registrarEvento({
                nivel: 'erro',
                origem: req.origemCliente,
                acao: 'atualizar_usuario',
                mensagem: `Falha ao atualizar usuário #${req.params.id}: nome de usuário já em uso`,
                usuarioId: req.usuario.id,
                usuarioNome: req.usuario.nome,
                rota: `PUT /usuarios/${req.params.id}`,
            });
            return res.status(409).json({ erro: 'Esse usuário já está em uso' });
        }
        throw err;
    }

    registrarEvento({
        nivel: 'sucesso',
        origem: req.origemCliente,
        acao: 'atualizar_usuario',
        mensagem: `${req.usuario.nome} atualizou o usuário "${usuario.nome}"${senha ? ' (incluindo senha)' : ''}`,
        usuarioId: req.usuario.id,
        usuarioNome: req.usuario.nome,
        rota: `PUT /usuarios/${req.params.id}`,
    });

    res.json(usuario);
});

module.exports = { listar, criar, atualizar };
