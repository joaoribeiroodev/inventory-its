const { registrarEvento } = require('../utils/logger');

// Handler de erro central. Qualquer erro passado via next(err)
// (inclusive os capturados pelo asyncHandler) cai aqui.
//
// Além de responder ao cliente, TODO erro que passa por aqui é
// gravado no log do sistema (nivel=erro, origem=backend) — é essa
// captura automática e global que garante que nenhuma exceção do
// backend passa "despercebida" pelo monitoramento do admin, sem
// precisar lembrar de instrumentar cada rota manualmente.
function errorHandler(err, req, res, next) {
    console.error(err);

    // Erro conhecido de violação de UNIQUE do Prisma (ex: código
    // de item duplicado, email duplicado)
    if (err.code === 'P2002') {
        const mensagem = 'Já existe um registro com esse valor único';
        registrarEvento({
            nivel: 'erro',
            origem: 'backend',
            acao: 'violacao_unique',
            mensagem: `${mensagem} (${err.meta?.target})`,
            detalhes: err.stack,
            usuarioId: req.usuario?.id,
            usuarioNome: req.usuario?.nome,
            rota: `${req.method} ${req.originalUrl}`,
        });
        return res.status(409).json({
            erro: mensagem,
            campo: err.meta?.target,
        });
    }

    const status = err.status || 500;
    const mensagem = err.status ? err.message : 'Erro interno do servidor';

    registrarEvento({
        nivel: 'erro',
        origem: 'backend',
        acao: 'exception_nao_tratada',
        mensagem: `${req.method} ${req.originalUrl} — ${mensagem}`,
        detalhes: err.stack,
        usuarioId: req.usuario?.id,
        usuarioNome: req.usuario?.nome,
        rota: `${req.method} ${req.originalUrl}`,
    });

    res.status(status).json({ erro: mensagem });
}

module.exports = { errorHandler };
