const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
    const setores = await prisma.setor.findMany({ orderBy: { nome: 'asc' } });
    res.json(setores);
});

const criar = asyncHandler(async (req, res) => {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });

    const setor = await prisma.setor.create({ data: { nome, descricao: descricao ?? null } });
    res.status(201).json(setor);
});

const atualizar = asyncHandler(async (req, res) => {
    const { nome, descricao, ativo } = req.body;

    const setor = await prisma.setor.update({
        where: { id: BigInt(req.params.id) },
        data: {
            ...(nome !== undefined ? { nome } : {}),
            ...(descricao !== undefined ? { descricao } : {}),
            ...(ativo !== undefined ? { ativo } : {}),
        },
    });

    res.json(setor);
});

// DELETE /setores/:id — só admin (ver rota). Recusa excluir um setor
// que ainda tem item alocado nele, pra não "sumir" com a localização
// de um bem sem ninguém perceber — a pessoa precisa mover os itens
// pra outro setor antes (ou editar/inativar o setor, se é só pra
// parar de usar, sem apagar o histórico).
const excluir = asyncHandler(async (req, res) => {
    const setorId = BigInt(req.params.id);

    const setor = await prisma.setor.findUnique({ where: { id: setorId } });
    if (!setor) {
        return res.status(404).json({ erro: 'Setor não encontrado' });
    }

    const itensNoSetor = await prisma.item.count({ where: { setorAtualId: setorId } });
    if (itensNoSetor > 0) {
        return res.status(400).json({
            erro: `Esse setor ainda tem ${itensNoSetor} item(ns) alocado(s) nele. Mova os itens para outro setor antes de excluir.`,
        });
    }

    // Histórico de movimentação que referencia esse setor (origem ou
    // destino de algum evento passado) fica preservado — só perde a
    // referência ao setor em si (setorAnteriorId/setorNovoId viram
    // null), que é o comportamento padrão da relação opcional.
    await prisma.setor.delete({ where: { id: setorId } });

    res.status(204).end();
});

module.exports = { listar, criar, atualizar, excluir };
