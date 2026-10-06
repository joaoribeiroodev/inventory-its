# =========================================================
# inventory-its backend — Dockerfile
# =========================================================

# Usamos a imagem Debian "slim" em vez de Alpine de propósito:
# o motor do Prisma tem um histórico de problemas para achar a
# versão certa de libssl no Alpine (musl + OpenSSL 3.x tem
# incompatibilidades conhecidas). No Debian isso não acontece.
FROM node:20-slim

# libssl é necessário em runtime pelo motor do Prisma.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala TODAS as dependências (incluindo devDependencies) nesse
# estágio — "prisma" (o CLI usado no "npx prisma generate" abaixo) é
# devDependency, e instalar só as de produção aqui faria o npx baixar
# o pacote de novo na hora, sem cache e dependendo da rede nesse
# passo específico do build (gerou erro 403 de registry bloqueado
# testando isso num ambiente com rede restrita — evitável instalando
# direto).
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Gera o Prisma Client (precisa do schema.prisma já copiado)
RUN npx prisma generate

# Remove as devDependencies agora que o Prisma Client já foi gerado —
# a imagem final roda só com o necessário em produção.
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "src/server.js"]
