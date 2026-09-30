const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Gera um token de longa duração (30 dias por padrão).
 * O app mobile mantém esse token salvo e continua operando
 * offline mesmo depois de expirado (decisão de arquitetura:
 * prioriza continuidade operacional em campo sobre revogação
 * imediata de acesso).
 */
function gerarToken(usuario) {
    return jwt.sign(
        {
            sub: usuario.id.toString(),
            papel: usuario.papel,
            nome: usuario.nome,
        },
        SECRET,
        { expiresIn: EXPIRES_IN }
    );
}

function verificarToken(token) {
    // Lança se inválido/expirado; quem chama decide o que fazer
    // com um token expirado (a regra de "continuar offline" é
    // do app cliente, não do servidor — aqui a API sempre exige
    // um token válido para responder).
    return jwt.verify(token, SECRET);
}

module.exports = { gerarToken, verificarToken };
