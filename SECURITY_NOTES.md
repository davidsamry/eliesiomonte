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

## ⚠️ Precisa de atenção antes de produção

### 1. Endpoints com service role sem autenticação (ALTA prioridade)
Várias rotas usam a `SUPABASE_SERVICE_ROLE_KEY` (que **ignora o RLS**) sem checar quem
está chamando. Ex.: `GET /api/customers` devolve **todos os clientes com telefone (PII)**
para qualquer requisição. Mesma exposição em rotas de `barbers`, `services`,
`blocked-dates`, `appointments/manual-create` e `appointments/[id]`.

Recomendado: adicionar verificação de sessão de admin no servidor (middleware ou guard)
antes de qualquer operação com service role, ou mover essas leituras para o cliente com
RLS adequado.

### 2. Autenticação de admin é apenas client-side (ALTA prioridade)
`POST /api/admin/login` valida a senha e devolve os dados do admin, mas **não cria sessão
nem token assinado**. A "sessão" fica no cliente, então as rotas de admin não têm como
confirmar que quem chama está autenticado. Recomendado: emitir cookie de sessão
assinado (httpOnly) e validar nas rotas `/api/admin/*`.

### 3. Hash de senha fraco (MÉDIA prioridade)
As senhas de admin usam `SHA-256` sem salt. O próprio código comenta "use bcrypt em
produção". Recomendado: migrar para `bcrypt`/`argon2` com salt.

### 4. Build ignorando erros de TypeScript (MÉDIA prioridade)
`next.config.mjs` tem `typescript.ignoreBuildErrors: true`. Isso permite subir com erros
de tipo escondidos. Recomendado: desligar, rodar `pnpm build` localmente, corrigir os
erros que aparecerem e manter desligado.

### 5. Rate limiting no OTP (MÉDIA prioridade)
`request-otp` não limita a frequência de envio por telefone. Sem Twilio configurado, o
OTP é fixo `111111` (modo teste). Garanta Twilio configurado em produção e adicione
rate limiting para evitar abuso.

### 6. `barbershop_id` fixo no código
O UUID `550e8400-...` está hardcoded em várias rotas. Funciona para uma única barbearia,
mas dificulta multi-tenant. Considere mover para variável de ambiente.
