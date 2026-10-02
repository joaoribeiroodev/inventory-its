// Correção pontual (rodar uma vez): itens importados pelo
// levantamento patrimonial de 2026 que têm a MESMA etiqueta física
// colada em mais de um bem ganharam, na importação original, um
// "codigo" sufixado ("9123-A" / "9123-B") pra ficar único no banco —
// porque "codigo" era @unique naquela época.
//
// Isso quebrava o propósito do sistema: o código de barras físico
// tem "9123" gravado nele, sem sufixo nenhum. Quem bipava essa
// etiqueta nunca batia com "9123-A" nem "9123-B" — o item ficava
// "perdido" pro sistema mesmo estando cadastrado.
//
// "codigo" deixou de ser @unique no banco (ver schema.prisma) — agora
// dois itens PODEM ter o mesmo codigo de verdade, e o sistema já sabe
// lidar com isso (buscarPorCodigo devolve a lista pra escolher, e
// "patrimonioDuplicado" sinaliza visualmente no painel/app). Este
// script só precisa desfazer o sufixo que não serve mais pra nada:
// codigo volta a ser igual a numeroEtiqueta.
//
// Também aproveita pra garantir que TODO item que compartilha um
// numeroEtiqueta com outro item esteja com patrimonioDuplicado=true
// (defensivo — cobre qualquer caso que não tenha passado pela
// importação original).
//
// USO:
//   node scripts/corrigir-codigos-duplicados.js             -> dry-run (só mostra o que mudaria)
//   node scripts/corrigir-codigos-duplicados.js --confirmar -> corrige de verdade
//
// Seguro de rodar mais de uma vez — a segunda rodada não acha mais
// nada pra corrigir (codigo já bate com numeroEtiqueta, flag já setada).

// Diferente de src/server.js, scripts standalone não carregam o
// .env automaticamente — precisa pedir explicitamente.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIRMAR = process.argv.includes('--confirmar');

async function main() {
    console.log(CONFIRMAR ? '*** MODO CONFIRMAR: vai gravar no banco ***' : 'Modo DRY-RUN (nada será gravado — rode com --confirmar pra valer)');
    console.log('');

    // 1) Itens com sufixo sobrando: codigo != numeroEtiqueta, mas os
    // dois existem (item com etiqueta física de verdade — não é o
    // caso de codigo=null/gerado, que não tem numeroEtiqueta).
    // Prisma não compara duas colunas entre si num where simples de
    // forma portátil — busca todos com numeroEtiqueta e filtra em JS
    // (volume é pequeno, algumas centenas de itens, tranquilo).
    const todosComEtiqueta = await prisma.item.findMany({
        where: { numeroEtiqueta: { not: null } },
        select: { id: true, codigo: true, numeroEtiqueta: true, descricao: true, patrimonioDuplicado: true },
    });

    const paraCorrigirCodigo = todosComEtiqueta.filter((item) => item.codigo !== item.numeroEtiqueta);

    console.log(`Itens com código sufixado (codigo != numeroEtiqueta): ${paraCorrigirCodigo.length}`);
    paraCorrigirCodigo.slice(0, 20).forEach((item) => {
        console.log(`  id=${item.id} codigo="${item.codigo}" -> "${item.numeroEtiqueta}"  "${item.descricao}"`);
    });
    if (paraCorrigirCodigo.length > 20) console.log(`  ... e mais ${paraCorrigirCodigo.length - 20}`);

    if (CONFIRMAR) {
        for (const item of paraCorrigirCodigo) {
            await prisma.item.update({ where: { id: item.id }, data: { codigo: item.numeroEtiqueta } });
        }
    }

    // 2) patrimonioDuplicado defensivo: qualquer numeroEtiqueta que
    // aparece em mais de um item deveria ter a flag true nos dois.
    const contagem = new Map();
    for (const item of todosComEtiqueta) {
        contagem.set(item.numeroEtiqueta, (contagem.get(item.numeroEtiqueta) ?? 0) + 1);
    }
    const etiquetasDuplicadas = new Set([...contagem.entries()].filter(([, n]) => n > 1).map(([numero]) => numero));
    const paraMarcarDuplicado = todosComEtiqueta.filter(
        (item) => etiquetasDuplicadas.has(item.numeroEtiqueta) && !item.patrimonioDuplicado
    );

    console.log('');
    console.log(`Etiquetas físicas duplicadas entre itens: ${etiquetasDuplicadas.size}`);
    console.log(`Itens com patrimonioDuplicado faltando marcar: ${paraMarcarDuplicado.length}`);

    if (CONFIRMAR && paraMarcarDuplicado.length > 0) {
        await prisma.item.updateMany({
            where: { id: { in: paraMarcarDuplicado.map((i) => i.id) } },
            data: { patrimonioDuplicado: true },
        });
    }

    console.log('');
    console.log(CONFIRMAR ? 'Concluído.' : 'Dry-run concluído — rode com --confirmar pra aplicar.');
}

main()
    .catch((err) => {
        console.error('Falha na correção:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
