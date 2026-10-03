// Correção pontual (rodar uma vez): o campo "usuario" (nome de login,
// alternativo ao email — ver auth.controller.js) é novo no schema e
// toda conta já cadastrada fica sem ele até rodar esse backfill.
//
// Gera o nome de usuário a partir da parte antes do "@" do email
// (ex: joao.ribeiro@its.com.br -> joao.ribeiro), normalizado (sem
// acento, minúsculo, só letras/números/ponto/underscore). Se duas
// contas gerarem o mesmo valor, acrescenta um número no final da
// segunda em diante (joao, joao2, joao3...) pra não violar o
// @unique.
//
// USO:
//   node scripts/preencher-usuario-login.js             -> dry-run (só mostra o que mudaria)
//   node scripts/preencher-usuario-login.js --confirmar -> grava de verdade
//
// Seguro de rodar mais de uma vez — só pega quem ainda está com
// usuario=null.

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIRMAR = process.argv.includes('--confirmar');

function normalizar(texto) {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, ''); // só o que o formulário de login aceita bem
}

async function main() {
    console.log(CONFIRMAR ? '*** MODO CONFIRMAR: vai gravar no banco ***' : 'Modo DRY-RUN (nada será gravado — rode com --confirmar pra valer)');
    console.log('');

    const usuariosSemLogin = await prisma.usuario.findMany({
        where: { usuario: null },
        select: { id: true, nome: true, email: true },
        orderBy: { id: 'asc' },
    });

    if (usuariosSemLogin.length === 0) {
        console.log('Nenhuma conta sem "usuario" — nada a fazer.');
        return;
    }

    // Pega os nomes de usuário já em uso (contas que, por algum motivo,
    // já tenham sido preenchidas antes) pra não colidir.
    const existentes = await prisma.usuario.findMany({
        where: { usuario: { not: null } },
        select: { usuario: true },
    });
    const emUso = new Set(existentes.map((u) => u.usuario));

    const atribuicoes = [];
    for (const u of usuariosSemLogin) {
        const base = normalizar(u.email.split('@')[0]) || `usuario${u.id}`;
        let candidato = base;
        let sufixo = 2;
        while (emUso.has(candidato)) {
            candidato = `${base}${sufixo}`;
            sufixo += 1;
        }
        emUso.add(candidato);
        atribuicoes.push({ id: u.id, nome: u.nome, email: u.email, usuario: candidato });
    }

    console.log(`Contas sem "usuario": ${atribuicoes.length}`);
    atribuicoes.forEach((a) => {
        console.log(`  id=${a.id} "${a.nome}" <${a.email}>  ->  usuario="${a.usuario}"`);
    });

    if (CONFIRMAR) {
        for (const a of atribuicoes) {
            await prisma.usuario.update({ where: { id: a.id }, data: { usuario: a.usuario } });
        }
    }

    console.log('');
    console.log(CONFIRMAR ? 'Concluído.' : 'Dry-run concluído — rode com --confirmar pra aplicar.');
}

main()
    .catch((err) => {
        console.error('Falha no backfill:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
