# Notas de Segurança — ELIESIO MONTE

Revisão feita antes de subir o projeto. Itens abaixo divididos entre o que **já foi corrigido** e o que **precisa de atenção** antes de operar em produção com dados reais.

## ✅ Corrigido nesta revisão

- **Rotas de setup/seed protegidas.** `/api/seed`, `/api/setup/whatsapp-table` e
  `/api/setup/notification-templates-table` agora exigem autorização em produção
  (variável `SETUP_SECRET` + header `x-setup-secret`). Em desenvolvimento continuam livres.
  Antes qualquer pessoa podia disparar seed/criação de tabelas.
- **`.gitignore` reforçado.** Passa a ignorar `.env` e `.env.*` (exceto `.env.example`),
  o estado de sessão do Baileys/WhatsApp e logs — evitando vazar segredos no repositório.
- **`.env.example` completo.** Documenta `SUPABASE_SERVICE_ROLE_KEY` e `SETUP_SECRET`,
  que eram usadas no código mas não estavam documentadas.

## ✅ Corrigido na 2ª rodada (autenticação)

- **Sessão de admin assinada.** `POST /api/admin/login` agora emite um cookie
  `admin_session` httpOnly assinado com HMAC (`SESSION_SECRET`), com expiração de 8h.
  Adicionado `POST /api/admin/logout`. Libs em `lib/auth/session.ts` e
  `lib/auth/require-admin.ts`.
- **Hash de senha forte (scrypt + salt).** `lib/auth/password.ts` usa `scrypt` com salt
  por usuário. Compatível com o hash legado SHA-256: valida e faz **upgrade automático**
  no próximo login bem-sucedido. Para definir/gerar senhas:
  `node scripts/hash-password.mjs "senha"`.
- **Guard nas rotas sensíveis.** `requireAdmin` aplicado a `/api/admin/*`,
  `GET /api/customers` (PII) e às rotas de gestão que usam service role
  (`barbers`, `services`, `blocked-dates`, `notification-templates`,
  `appointments/manual-create`, `appointments/[id]`, `barbers/[id]/availability`).
  As leituras públicas do portal (`/api/appointments/available`, `create`, `cancel`,
  `/api/auth/*`, `/api/customer/appointments`) permanecem abertas.

> **Requer** `SESSION_SECRET` definido no ambiente de produção (veja `.env.example`).
> Sem ele, o login retorna 500 (fail-closed) e as rotas de admin negam acesso.

## ⚠️ Precisa de atenção antes de produção

### 1. Credenciais de teste expostas na tela de login (MÉDIA prioridade)
`app/admin/page.tsx` mostra `admin@eliesio.com / admin123` na UI de login. Remova esse
bloco antes de produção e troque a senha do admin (gere o hash com o script acima).

### 2. Build ignorando erros de TypeScript (MÉDIA prioridade)
`next.config.mjs` tem `typescript.ignoreBuildErrors: true`. Isso permite subir com erros
de tipo escondidos. Recomendado: desligar, rodar `pnpm build` localmente, corrigir os
erros que aparecerem e manter desligado.

### 3. Rate limiting no OTP (MÉDIA prioridade)
`request-otp` não limita a frequência de envio por telefone. Sem Twilio configurado, o
OTP é fixo `111111` (modo teste). Garanta Twilio configurado em produção e adicione
rate limiting para evitar abuso.

### 4. `barbershop_id` fixo no código
O UUID `550e8400-...` está hardcoded em várias rotas. Funciona para uma única barbearia,
mas dificulta multi-tenant. Considere mover para variável de ambiente.
