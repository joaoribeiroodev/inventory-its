// Handler de erro central. Qualquer erro passado via next(err)
// (inclusive os capturados pelo asyncHandler) cai aqui.
function errorHandler(err, req, res, next) {
    console.error(err);

    // Erro conhecido de violação de UNIQUE do Prisma (ex: código
    // de item duplicado, email duplicado)
    if (err.code === 'P2002') {
        return res.status(409).json({
            erro: 'Já existe um registro com esse valor único',
            campo: err.meta?.target,
        });
    }

    const status = err.status || 500;
    const mensagem = err.status ? err.message : 'Erro interno do servidor';

    res.status(status).json({ erro: mensagem });
}

module.exports = { errorHandler };
