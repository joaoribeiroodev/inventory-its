# =========================================================
# inventory-its web (painel) — Dockerfile
#
# NEXT_PUBLIC_API_URL é inlined no bundle JS NO MOMENTO DO BUILD
# (é assim que o Next.js funciona com variáveis NEXT_PUBLIC_*),
# então precisa chegar como build ARG, não só como env de runtime.
# O docker-compose.yml já passa isso automaticamente.
# =========================================================
FROM node:20-alpine AS build

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- imagem final, só com o necessário para rodar ----
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
