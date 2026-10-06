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

// Variante "opcional" de autenticar(): se vier um token válido,
// preenche req.usuario normalmente; se não vier nenhum (ou vier
// inválido/expirado), segue sem erro com req.usuario undefined.
// Usada em rotas que aceitam tanto chamadas autenticadas quanto
// anônimas — ex: POST /logs, que o app/painel pode chamar para
// relatar um erro mesmo antes de completar o login (ex: falha de
// conexão na própria tela de login).
function autenticarOpcional(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    try {
        const payload = verificarToken(authHeader.substring('Bearer '.length));
        req.usuario = { id: payload.sub, papel: payload.papel, nome: payload.nome };
    } catch {
        // token presente mas inválido/expirado — segue como anônimo
        // em vez de bloquear o relato do evento
    }
    next();
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

module.exports = { autenticar, autenticarOpcional, autorizar };
