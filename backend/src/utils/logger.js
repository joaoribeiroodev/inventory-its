const prisma = require('../lib/prisma');

// Limites de coluna do model LogSistema (ver schema.prisma) — corta
// defensivamente aqui também, pra nunca quebrar o INSERT por um
// texto maior do que a coluna aceita (ex: stack trace gigante).
const LIMITE_MENSAGEM = 500;
const LIMITE_ACAO = 100;
const LIMITE_ROTA = 255;
const LIMITE_NOME = 150;

function cortar(valor, limite) {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor);
    return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

/**
 * Grava um evento no log do sistema (sucesso, erro, aviso ou info),
 * vindo do backend, do painel web ou do app mobile — ver
 * schema.prisma#LogSistema e a tela de Monitoramento no painel.
 *
 * Propositalmente NUNCA lança: logging é "best-effort" — se o
 * próprio banco de logs falhar (ex: indisponível num instante), isso
 * não pode derrubar a requisição original que só queria registrar um
 * evento. Em caso de falha, só avisa no console do servidor.
 */
async function registrarEvento({
    nivel,
    origem,
    acao,
    mensagem,
    detalhes = null,
    usuarioId = null,
    usuarioNome = null,
    rota = null,
}) {
    try {
        await prisma.logSistema.create({
            data: {
                nivel,
                origem,
                acao: cortar(acao, LIMITE_ACAO) ?? 'desconhecida',
                mensagem: cortar(mensagem, LIMITE_MENSAGEM) ?? '(sem mensagem)',
                // detalhes não tem limite de coluna (TEXT), mas evita
                // guardar megabytes de stack trace sem necessidade
                detalhes: detalhes ? cortar(detalhes, 8000) : null,
                usuarioId: usuarioId ? BigInt(usuarioId) : null,
                usuarioNome: cortar(usuarioNome, LIMITE_NOME),
                rota: cortar(rota, LIMITE_ROTA),
            },
        });
    } catch (err) {
        console.error('[logger] falha ao registrar evento no log do sistema:', err.message);
    }
}

module.exports = { registrarEvento };
