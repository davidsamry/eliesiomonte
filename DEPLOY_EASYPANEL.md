# Deploy no EasyPanel (VPS) — ELIESIO MONTE

Guia passo a passo para publicar o app no seu EasyPanel a partir do GitHub,
usando o `Dockerfile` incluído (Next.js em modo standalone).

## Pré-requisitos
- EasyPanel instalado e rodando no VPS.
- Repositório no GitHub: `davidsamry/eliesiomonte` (branch `main`).
- Projeto Supabase criado (URL + chaves anônima e service role).
- Um domínio ou subdomínio apontando para o IP do VPS (registro A).

---

## 1. Criar o serviço
1. No EasyPanel, entre em um **Project** (ou crie um novo, ex.: `eliesio`).
2. **+ Service → App**. Dê um nome, ex.: `barbearia`.

## 2. Conectar o código (GitHub)
Na aba **Source** do serviço:
- **Provider:** GitHub
- **Repository:** `davidsamry/eliesiomonte`
- **Branch:** `main`
- Se o repositório for **privado**, conecte sua conta GitHub ao EasyPanel primeiro
  (Settings → GitHub) ou use um deploy token. Se for público, basta a URL.

## 3. Método de build → Dockerfile
Na aba **Build**:
- **Builder:** `Dockerfile`
- **File / Path:** `Dockerfile` (na raiz — já está lá)

## 4. Variáveis de ambiente
Na aba **Environment**, cole (ajustando os valores):

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SESSION_SECRET=coloque_um_valor_aleatorio_longo
SETUP_SECRET=coloque_um_segredo_forte
BARBERSHOP_ID=550e8400-e29b-41d4-a716-446655440000
NODE_ENV=production

# WhatsApp via Twilio (opcional — sem isso o OTP fica em modo teste: 111111)
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=+...
```

Gere segredos fortes com: `openssl rand -hex 32`.

> ⚠️ **Importante (build vs runtime):** as duas variáveis `NEXT_PUBLIC_*` são
> embutidas no site em **tempo de build**. O EasyPanel repassa as env vars do
> serviço para o build; se, após o deploy, o app abrir mas não conectar ao
> Supabase no navegador, vá em **Build → Args** e adicione lá também
> `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, e refaça o deploy.

## 5. Porta e domínio
- Na aba **Domains**, adicione seu domínio/subdomínio e defina **Port = 3000**.
- Ative **HTTPS** (Let's Encrypt) — o EasyPanel emite o certificado.

## 6. Deploy
Clique em **Deploy**. Acompanhe os logs de build. O primeiro build baixa
dependências (inclui pacotes do WhatsApp/Baileys via GitHub) e compila o Next —
pode levar alguns minutos.

---

## 7. Pós-deploy (banco e admin)
1. **Migrações/tabelas:** no Supabase, rode os SQLs de `migrations/` e
   `scripts/` (SQL Editor) se ainda não aplicou. Veja `MIGRATION_INSTRUCTIONS.md`.
2. **Inicializar tabelas de setup** (uma vez), se necessário — protegidas por
   `SETUP_SECRET`:
   ```
   curl -X POST https://SEU-DOMINIO/api/setup/notification-templates-table \
        -H "x-setup-secret: SEU_SETUP_SECRET"
   curl https://SEU-DOMINIO/api/setup/whatsapp-table \
        -H "x-setup-secret: SEU_SETUP_SECRET"
   ```
3. **Senha do admin:** gere o hash e grave em `staff_users.password_hash`:
   ```
   node scripts/hash-password.mjs "suaSenhaForte"
   ```
   Cole o resultado (`scrypt$...`) na coluna do admin no Supabase.

## 8. Atualizações futuras
Cada `git push` na branch `main` pode disparar novo deploy — ative
**Auto Deploy** no serviço (webhook do GitHub) ou clique em **Deploy** manualmente.

---

## Solução de problemas
- **Build falha ao instalar dependências:** garanta que o VPS tem acesso à
  internet (o Baileys puxa dependências do GitHub durante o `pnpm install`).
- **App abre mas não fala com o Supabase:** veja o aviso do passo 4 (build args).
- **Login de admin dá 500:** falta `SESSION_SECRET` no ambiente.
- **OTP sempre `111111`:** modo teste — configure as variáveis `TWILIO_*`.
- **WhatsApp desconecta a cada deploy:** normal (auth em `/tmp`); a reconexão
  usa as credenciais persistidas no Supabase.
