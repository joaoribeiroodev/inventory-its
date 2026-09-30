const { verificarToken } = require('../utils/jwt');

// Exige um token JWT válido no header Authorization: Bearer <token>
function autenticar(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erro: 'Token não informado' });
    }

    const token = authHeader.substring('Bearer '.length);

    try {
        const payload = verificarToken(token);
        req.usuario = { id: payload.sub, papel: payload.papel, nome: payload.nome };
        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

// Restringe uma rota a determinados papéis.
// Uso: autorizar('admin'), autorizar('admin', 'cadastrador')
function autorizar(...papeisPermitidos) {
    return function (req, res, next) {
        if (!req.usuario) {
            return res.status(401).json({ erro: 'Não autenticado' });
        }
        if (!papeisPermitidos.includes(req.usuario.papel)) {
            return res.status(403).json({ erro: 'Sem permissão para esta ação' });
        }
        next();
    };
}

module.exports = { autenticar, autorizar };
