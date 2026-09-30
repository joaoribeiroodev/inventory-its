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

# Instala dependências primeiro (aproveita cache do Docker)
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do código
COPY . .

# Gera o Prisma Client (precisa do schema.prisma já copiado)
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "src/server.js"]
