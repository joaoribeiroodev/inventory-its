// Importa em lote o levantamento patrimonial de TI (planilha de
// 2026) pro banco do inventory-its.
//
// Regras combinadas com o João:
//  - Item com etiqueta de patrimônio física -> codigo = numeroEtiqueta
//    (ex. "9637"). Sem prefixo, porque precisa bater exatamente com
//    o que o código de barras físico devolve quando é escaneado.
//  - Item com a MESMA etiqueta física repetida em mais de uma linha
//    (ex. duas linhas com "9123") -> os dois SÃO importados, com
//    codigo sufixado ("9123-A" / "9123-B") pra ficar único no banco,
//    mas numeroEtiqueta igual nos dois, e patrimonioDuplicado = true
//    (vira um aviso visual no painel).
//  - Item sem etiqueta nenhuma ("SEM ETIQUETA" ou "NOVO(CAIXA)" —
//    equipamento novo ainda na caixa) -> entra com codigo = null.
//    NÃO geramos um número aqui: o código só é gerado na hora que
//    alguém realmente for imprimir uma etiqueta nova pra ele (botão
//    "Gerar lote" no painel, ou "Baixar CSV" avulso do item) — assim
//    nunca existe código no sistema sem existir etiqueta física
//    correspondente (ver conversa com o João).
//  - Setor = "<PRÉDIO> - <DEPARTAMENTO>" (ex. "BOM DESPACHO - CCO"),
//    porque 18 departamentos têm o mesmo nome nos dois prédios e são
//    salas físicas diferentes.
//  - Situação "USADO" (1 item na planilha) vira "bom".
//
// USO:
//   node scripts/importar-levantamento.js            -> dry-run (não grava nada, só mostra o que faria)
//   node scripts/importar-levantamento.js --confirmar -> grava de verdade
//
// Itens com etiqueta física (codigo != null) são seguros de rodar de
// novo — o codigo já existente no banco é pulado, não duplica. JÁ OS
// ITENS SEM ETIQUETA (codigo null) NÃO TÊM COMO SER DEDUPLICADOS
// (não existe um identificador único pra eles) — rodar --confirmar
// duas vezes VAI duplicá-los. Rode --confirmar uma única vez.

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIRMAR = process.argv.includes('--confirmar');

async function main() {
    const dadosPath = path.join(__dirname, 'levantamento-patrimonial-2026.json');
    const linhas = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));

    console.log(`Lidas ${linhas.length} linhas de ${dadosPath}`);
    console.log(CONFIRMAR ? '*** MODO CONFIRMAR: vai gravar no banco ***' : 'Modo DRY-RUN (nada será gravado — rode com --confirmar pra valer)');
    console.log('');

    // 1) Garante os setores (um por combinação prédio+departamento)
    const nomesSetor = [...new Set(linhas.map((l) => `${l.predio} - ${l.departamento}`))].sort();
    const setorIdPorNome = new Map();

    for (const nome of nomesSetor) {
        let setor = await prisma.setor.findUnique({ where: { nome } });
        if (!setor) {
            if (CONFIRMAR) {
                setor = await prisma.setor.create({ data: { nome } });
            } else {
                setor = { id: `(novo)` };
            }
        }
        setorIdPorNome.set(nome, setor.id);
    }
    console.log(`Setores: ${nomesSetor.length} distintos (${[...setorIdPorNome.values()].filter((v) => v === '(novo)').length} novos a criar)`);

    // 2) Carrega os códigos já em uso no banco, só pra não duplicar
    // codigo de item com etiqueta física (itens sem etiqueta entram
    // com codigo = null e não passam por essa checagem).
    const existentes = await prisma.item.findMany({ select: { codigo: true } });
    const codigosExistentes = new Set(existentes.map((i) => i.codigo).filter(Boolean));

    let criados = 0;
    let pulados = 0;
    let duplicados = 0;
    let semEtiqueta = 0;
    const erros = [];
    const resumoDuplicados = [];

    for (const linha of linhas) {
        const nomeSetor = `${linha.predio} - ${linha.departamento}`;
        const setorAtualId = setorIdPorNome.get(nomeSetor);

        const codigo = linha.codigo; // null pra item sem etiqueta física — gerado só na hora de imprimir

        if (!codigo) {
            semEtiqueta++;
        } else if (codigosExistentes.has(codigo)) {
            pulados++;
            continue;
        }

        if (linha.duplicado) {
            duplicados++;
            resumoDuplicados.push(`  linha ${linha.linha}: codigo=${codigo} numeroEtiqueta=${linha.numeroEtiqueta} "${linha.descricao}" (${nomeSetor})`);
        }

        if (codigo) codigosExistentes.add(codigo); // evita colisão dentro do próprio lote

        if (CONFIRMAR) {
            try {
                await prisma.item.create({
                    data: {
                        codigo,
                        numeroEtiqueta: linha.numeroEtiqueta,
                        patrimonioDuplicado: linha.duplicado,
                        descricao: linha.descricao,
                        situacaoAtual: linha.situacao,
                        setorAtualId: typeof setorAtualId === 'object' ? null : setorAtualId,
                        etiquetaImpressa: false,
                    },
                });
            } catch (err) {
                erros.push(`  linha ${linha.linha} (codigo ${codigo}): ${err.message}`);
                continue;
            }
        }
        criados++;
    }

    console.log('');
    console.log(`Itens ${CONFIRMAR ? 'criados' : 'a criar'}: ${criados}`);
    console.log(`  - sem etiqueta física (entram com codigo = null — gerado só ao imprimir): ${semEtiqueta}`);
    console.log(`  - com etiqueta duplicada (sufixo -A/-B): ${duplicados}`);
    console.log(`Itens pulados (codigo já existia no banco): ${pulados}`);
    if (resumoDuplicados.length) {
        console.log('');
        console.log('Grupos com etiqueta física duplicada (revisar fisicamente depois):');
        console.log(resumoDuplicados.join('\n'));
    }
    if (erros.length) {
        console.log('');
        console.log('ERROS:');
        console.log(erros.join('\n'));
    }
}

main()
    .catch((err) => {
        console.error('Falha na importação:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
