const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { gerarToken } = require('../utils/jwt');
const { asyncHandler } = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Informe email e senha' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

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
            email: usuario.email,
            papel: usuario.papel,
        },
    });
});

module.exports = { login };
