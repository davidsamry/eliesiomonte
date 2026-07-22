# ELIESIO MONTE - Sistema de Agendamentos para Barbearia

Um sistema completo de agendamentos desenvolvido com Next.js 16, Supabase e TailwindCSS.

## 🚀 Visão Geral

O sistema oferece três interfaces principais:

1. **Portal de Agendamentos** (`/booking`) - Clientes podem agendar serviços 24/7
2. **Dashboard do Cliente** (`/dashboard`) - Acompanhamento de agendamentos
3. **Painel Administrativo** (`/admin`) - Gerenciamento completo da barbearia

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: TailwindCSS v4
- **Components**: shadcn/ui
- **Date Handling**: date-fns
- **Icons**: lucide-react

## 📋 Funcionalidades Implementadas

### ✅ Fase 1: Database & Authentication
- Schema de banco de dados com 7 tabelas principais
- Autenticação via WhatsApp (portal de agendamentos)
- RLS policies para segurança

### ✅ Fase 2: Booking Portal & Customer Dashboard
- Seleção de barbeiro, serviço, data e hora
- Validação de disponibilidade
- Dashboard cliente com histórico
- Notificações WhatsApp de confirmação

### ✅ Fase 3: Admin Panel
- Login com email/senha
- Dashboard com 6 KPIs (receita, ocupação, etc)
- Gerenciar status dos agendamentos
- Filtro por data e status
- Histórico de notificações

### ✅ Fase 4: Notifications & Integrations
- API para enviar notificações WhatsApp
- Job automático para lembretes (24h antes)
- Logs de notificações no admin
- API documentada

## 📁 Estrutura de Pastas

```
.
├── app/
│   ├── (routes)/
│   │   ├── booking/         # Portal de agendamentos
│   │   ├── dashboard/       # Dashboard cliente
│   │   └── admin/          # Painel administrativo
│   ├── api/
│   │   ├── admin/          # APIs administrativas
│   │   ├── notifications/  # APIs de notificações
│   │   └── jobs/           # Jobs automáticos
│   ├── docs/               # Documentação
│   └── layout.tsx          # Layout raiz
├── components/
│   ├── ui/                 # Componentes shadcn
│   ├── admin/              # Componentes do admin
│   ├── booking/            # Componentes de agendamento
│   └── ...
├── lib/
│   ├── supabase/           # Cliente Supabase
│   └── seed.ts             # Seed de dados
└── public/                 # Assets estáticos
```

## 🔑 Credenciais de Teste

### Admin Panel
- **URL**: `http://localhost:3000/admin`
- **Email**: `admin@eliesio.com`
- **Senha**: `admin123`

### Dados Iniciais
- **3 Barbeiros**: Carlos, João, Pedro
- **5 Serviços**: Corte, Corte+Barba, Barba Premium, Fade, Tratamento
- **Horário**: Seg-Sex 09h-18h (pausa 12h-13h)

## 🚀 Como Começar

### 1. Instalar Dependências
```bash
npm install
# ou
pnpm install
```

### 2. Setup do Banco de Dados

Certifique-se de que suas variáveis de ambiente estão configuradas:
```bash
NEXT_PUBLIC_SUPABASE_URL=<sua_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua_chave>
```

Execute o seed para popular dados de teste:
```bash
curl http://localhost:3000/api/seed
```

### 3. Iniciar o Servidor
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 🔌 APIs Principais

### Admin
- `POST /api/admin/login` - Autenticação
- `GET /api/admin/kpis?date=YYYY-MM-DD` - Métricas
- `GET /api/admin/appointments?date=YYYY-MM-DD` - Agendamentos
- `PUT /api/admin/appointments` - Atualizar status
- `GET /api/admin/notifications?date=YYYY-MM-DD` - Notificações

### Notificações
- `POST /api/notifications/send` - Enviar notificação
- `GET /api/jobs/send-reminders` - Enviar lembretes

## 📊 Banco de Dados

### Tabelas Principais

**appointments**
- id, customer_id, barber_id, service_id
- scheduled_datetime, status, notes

**customers**
- id, full_name, email, phone, whatsapp_id

**barbers**
- id, barbershop_id, full_name, specialty
- average_service_time, is_active

**services**
- id, name, description, duration, price
- barbers_available, is_active

**staff_users** (Admins)
- id, email, phone, full_name, role
- password_hash, is_active

**barber_availability**
- id, barber_id, day_of_week
- start_time, end_time, is_available

**notifications**
- id, appointment_id, type, phone_number
- message, status, sent_at

## 🔐 Segurança

- Senhas hasheadas com SHA256 (considere migrar para bcrypt em produção)
- RLS policies no Supabase para isolamento por conta
- Validação de entrada em todas as APIs
- CORS configurado adequadamente

## 🚀 Deploy

O projeto está pronto para deploy em Vercel:

```bash
vercel deploy
```

Ou conecte seu repositório GitHub e deploy automático será ativado.

## 📝 Documentação

Para documentação completa das APIs, acesse:
```
http://localhost:3000/docs
```

## 🐛 Troubleshooting

### Erro: "Notifications table does not exist"
- Confirme que você executou o seed (`/api/seed`)
- Verifique suas credenciais do Supabase

### Erro de CORS
- Verifique a variável `NEXT_PUBLIC_APP_URL`
- Confirme que a origem está permitida

### WhatsApp não funcionando
- Integração com WhatsApp real não está implementada
- Atualmente envia para logs do console
- Para ativar, integre com Twilio ou WhatsApp Business API

## 📞 Suporte

Para problemas ou dúvidas sobre o projeto, consulte a documentação em `/docs`.

## 📄 Licença

Todos os direitos reservados © 2025 ELIESIO MONTE Barbearia.
