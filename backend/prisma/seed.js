// Cria o primeiro usuário admin, caso ainda não exista nenhum.
// Necessário porque o endpoint POST /usuarios já nasce restrito
// a quem tem papel admin — sem isso, ninguém consegue criar o
// primeiro usuário do sistema.
//
// Uso:
//   node prisma/seed.js
//
// As credenciais podem ser customizadas por variáveis de ambiente:
//   SEED_ADMIN_EMAIL, SEED_ADMIN_SENHA, SEED_ADMIN_NOME

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL || 'tisalvador';
    const senha = process.env.SEED_ADMIN_SENHA || 'tisalvador@26';
    const nome = process.env.SEED_ADMIN_NOME || 'Administrador';

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
        console.log(`Usuário admin já existe (${email}), nada a fazer.`);
        return;
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    await prisma.usuario.create({
        data: { nome, email, senhaHash, papel: 'admin' },
    });

    console.log(`Admin criado: ${email} / senha: ${senha}`);
    console.log('IMPORTANTE: troque essa senha assim que fizer o primeiro login.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
