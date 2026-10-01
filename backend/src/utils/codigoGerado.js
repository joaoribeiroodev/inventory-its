// Geração do código "padrão patrimônio" pra itens sem etiqueta física
// (ver itens.controller.js e lotes.controller.js). Centralizado aqui
// porque os dois controllers precisam gerar com a mesma regra, sempre
// dentro da mesma transação de quem chamou.

// Faixa reservada só pro sistema — nunca colide com um número de
// patrimônio real (os que a empresa já usa vão até ~10000, pelo
// levantamento de 2026).
const FAIXA_CODIGO_GERADO = 100000;

// Acha o menor número disponível nessa faixa, preenchendo os buracos
// deixados por exclusões. Recebe "tx" (o client ou a transação do
// Prisma) pra poder ser chamado tanto direto quanto dentro de um
// prisma.$transaction(...).
async function proximoNumeroDisponivel(tx) {
    // Busca todos os códigos (não dá pra filtrar numericamente no banco
    // com um WHERE direto, porque "codigo" é texto e a comparação
    // lexicográfica de string não bate com a numérica — ex.: "8644" >
    // "100000" como string, mas é menor como número). Com a escala do
    // inventário (algumas centenas/milhares de itens) isso é tranquilo.
    const itens = await tx.item.findMany({
        where: { codigo: { not: null } },
        select: { codigo: true },
    });

    const numerosUsados = new Set();
    for (const { codigo } of itens) {
        const numero = parseInt(codigo, 10);
        if (!Number.isNaN(numero) && numero >= FAIXA_CODIGO_GERADO) numerosUsados.add(numero);
    }

    let proximo = FAIXA_CODIGO_GERADO;
    while (numerosUsados.has(proximo)) proximo++;

    return String(proximo);
}

module.exports = { FAIXA_CODIGO_GERADO, proximoNumeroDisponivel };
