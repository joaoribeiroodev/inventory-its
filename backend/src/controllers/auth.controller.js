const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { gerarToken } = require('../utils/jwt');
const { asyncHandler } = require('../utils/asyncHandler');
const { registrarEvento } = require('../utils/logger');

// Login aceita tanto o nome de usuário quanto o email no mesmo campo
// ("identificador") — não precisa a pessoa lembrar qual dos dois
// cadastrou. "email" continua aceito isolado só por compatibilidade
// com uma sessão de app/painel antiga que ainda não atualizou.
const login = asyncHandler(async (req, res) => {
    const identificador = String(req.body.identificador ?? req.body.email ?? '').trim();
    const { senha } = req.body;

    if (!identificador || !senha) {
        return res.status(400).json({ erro: 'Informe usuário/email e senha' });
    }

    const usuario = await prisma.usuario.findFirst({
        where: { OR: [{ email: identificador }, { usuario: identificador }] },
    });

    if (!usuario || !usuario.ativo) {
        registrarEvento({
            nivel: 'erro',
            origem: req.origemCliente,
            acao: 'login',
            mensagem: `Tentativa de login falhou (credenciais inválidas): "${identificador}"`,
            rota: 'POST /auth/login',
        });
        return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
        registrarEvento({
            nivel: 'erro',
            origem: req.origemCliente,
            acao: 'login',
            mensagem: `Tentativa de login falhou (senha incorreta) para "${usuario.nome}"`,
            usuarioId: usuario.id,
            usuarioNome: usuario.nome,
            rota: 'POST /auth/login',
        });
        return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = gerarToken(usuario);

    registrarEvento({
        nivel: 'sucesso',
        origem: req.origemCliente,
        acao: 'login',
        mensagem: `${usuario.nome} entrou no sistema`,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        rota: 'POST /auth/login',
    });

    res.json({
        token,
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            usuario: usuario.usuario,
            email: usuario.email,
            papel: usuario.papel,
        },
    });
});

module.exports = { login };
