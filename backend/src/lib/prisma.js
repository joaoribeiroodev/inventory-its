// Instância única do Prisma Client, reaproveitada em toda a app
// (evita esgotar conexões abrindo um client novo por requisição).
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
