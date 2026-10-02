// Correção pontual (rodar uma vez): itens que já têm uma etiqueta de
// patrimônio física (numeroEtiqueta preenchido) mas foram criados
// ANTES da correção em itens.controller.js/importar-levantamento.js
// ficaram com etiquetaImpressa = false pra sempre — porque aquele bug
// só afetava o valor gravado no momento da criação/importação, e não
// tinha como corrigir retroativamente quem já estava no banco.
//
// É por isso que "todos os itens aparecem como pendente de etiqueta,
// até os que já têm uma física": o código novo está certo pros itens
// criados a partir de agora, mas os que já existiam continuam com o
// valor antigo (false) até alguém corrigir o dado em si — é o que
// este script faz.
//
// Regra (mesma do resto do sistema): quem já tem etiqueta física
// (numeroEtiqueta != null) não está pendente de nada — a etiqueta já
// existe colada no equipamento. Só quem não tem etiqueta nenhuma
// continua pendente de verdade.
//
// USO:
//   node scripts/corrigir-etiqueta-impressa.js            -> dry-run (só mostra quantos itens seriam corrigidos)
//   node scripts/corrigir-etiqueta-impressa.js --confirmar -> corrige de verdade
//
// Seguro de rodar mais de uma vez — só atualiza quem ainda estiver
// errado (etiquetaImpressa=false com numeroEtiqueta preenchido),
// então uma segunda rodada não muda nada.

// Diferente de src/server.js, scripts standalone não carregam o
// .env automaticamente — precisa pedir explicitamente.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIRMAR = process.argv.includes('--confirmar');

async function main() {
    const afetados = await prisma.item.findMany({
        where: {
            etiquetaImpressa: false,
            numeroEtiqueta: { not: null },
        },
        select: { id: true, codigo: true, numeroEtiqueta: true, descricao: true },
    });

    console.log(CONFIRMAR ? '*** MODO CONFIRMAR: vai gravar no banco ***' : 'Modo DRY-RUN (nada será gravado — rode com --confirmar pra valer)');
    console.log('');
    console.log(`Itens com etiqueta física mas marcados como pendente: ${afetados.length}`);

    if (afetados.length > 0) {
        console.log('');
        afetados.slice(0, 20).forEach((item) => {
            console.log(`  id=${item.id} codigo=${item.codigo} numeroEtiqueta=${item.numeroEtiqueta} "${item.descricao}"`);
        });
        if (afetados.length > 20) {
            console.log(`  ... e mais ${afetados.length - 20}`);
        }
    }

    if (CONFIRMAR && afetados.length > 0) {
        const resultado = await prisma.item.updateMany({
            where: {
                etiquetaImpressa: false,
                numeroEtiqueta: { not: null },
            },
            data: { etiquetaImpressa: true },
        });
        console.log('');
        console.log(`Corrigidos: ${resultado.count} item(ns).`);
    }
}

main()
    .catch((err) => {
        console.error('Falha na correção:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
