const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { gerarToken } = require('../utils/jwt');
const { asyncHandler } = require('../utils/asyncHandler');

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
        return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
        return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = gerarToken(usuario);

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
