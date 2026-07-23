# syntax=docker/dockerfile:1

# ---------- deps: instala dependências (inclui git para deps do baileys) ----------
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      git python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- builder: compila o Next em modo standalone ----------
FROM node:22-bookworm-slim AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# As NEXT_PUBLIC_* são embutidas no bundle do cliente em tempo de BUILD.
# A SUPABASE_SERVICE_ROLE_KEY é necessária no build porque algumas rotas criam
# o cliente Supabase no escopo do módulo (avaliado durante "collect page data").
# O EasyPanel repassa as env vars do serviço como --build-arg automaticamente.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG SESSION_SECRET
ARG SETUP_SECRET
ARG BARBERSHOP_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV SESSION_SECRET=$SESSION_SECRET
ENV SETUP_SECRET=$SETUP_SECRET
ENV BARBERSHOP_ID=$BARBERSHOP_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---------- runner: imagem final mínima ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Caminho persistente para a sessão do WhatsApp/Baileys (monte um volume em /data).
ENV WHATSAPP_AUTH_DIR=/data/whatsapp_auth

# Diretório do volume persistente
RUN mkdir -p /data/whatsapp_auth

# Artefatos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Executa como root para poder escrever no volume montado em /data.
EXPOSE 3000

CMD ["node", "server.js"]
