// Rótulos legíveis do enum Terminal (ver schema.prisma) — usado em
// mensagens de log e para montar o "nomeCompleto" de um setor
// (terminal + nome), consumido por qualquer tela que só precisa
// MOSTRAR o setor (seletor de item, histórico, cache offline do
// app), sem lidar com o enum diretamente. A tela de administração
// de Setores é a única que trata terminal e nome como campos
// separados de verdade.
const ROTULOS_TERMINAL = {
    sao_joaquim: 'São Joaquim',
    bom_despacho: 'Bom Despacho',
};

function rotuloTerminal(terminal) {
    return ROTULOS_TERMINAL[terminal] ?? terminal;
}

function nomeCompletoSetor(setor) {
    if (!setor) return null;
    return `${rotuloTerminal(setor.terminal)} — ${setor.nome}`;
}

module.exports = { ROTULOS_TERMINAL, rotuloTerminal, nomeCompletoSetor };
