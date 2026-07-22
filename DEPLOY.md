# ELIESIO MONTE - Guia de Deploy e Setup

## Credenciais de Acesso

### Admin Panel
- **URL**: `/admin`
- **Email**: `admin@eliesio.com`
- **Senha**: `admin123`

### Barbeiros (Para Testes)
1. **Carlos Silva** - Especialista em corte, barba e design
2. **João Santos** - Especialista em corte, fade e design
3. **Pedro Oliveira** - Especialista em corte, barba e tratamento

### Serviços Disponíveis
1. Corte Simples - R$ 50 (30 min)
2. Corte + Barba - R$ 75 (45 min)
3. Barba Premium - R$ 65 (40 min)
4. Fade Moderno - R$ 60 (35 min)
5. Tratamento Capilar - R$ 55 (30 min)

## Variáveis de Ambiente Necessárias

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Baileys WhatsApp (100% Gratuito)
# Não requer credenciais - usa sua própria conta WhatsApp
# Configurado via QR code na página /admin/settings

# Database (if not using Supabase)
DATABASE_URL=your_database_url
```

## Deploy na Vercel

1. **Conectar repositório GitHub**
   ```bash
   git push origin main
   ```

2. **Configure as variáveis de ambiente**
   - Acesse Project Settings → Environment Variables
   - Adicione todas as variáveis listadas acima

3. **Deploy automático**
   - A Vercel detectará automaticamente Next.js
   - Build e deploy acontecem automaticamente

## API Endpoints

### Autenticação (Cliente)
- `POST /api/auth/request-otp` - Enviar OTP via WhatsApp
- `POST /api/auth/verify-otp` - Verificar código OTP

### Agendamentos (Cliente)
- `GET /api/appointments/available` - Listar horários disponíveis
- `POST /api/appointments/create` - Criar agendamento
- `POST /api/appointments/cancel` - Cancelar agendamento

### Dashboard (Cliente)
- `GET /api/customer/appointments` - Listar agendamentos do cliente

### Admin
- `POST /api/admin/login` - Login admin
- `GET /api/admin/kpis` - Obter KPIs do dia
- `GET /api/admin/appointments` - Listar agendamentos para admin
- `GET /api/admin/notifications` - Histórico de notificações

### Jobs (Background)
- `GET /api/jobs/send-reminders` - Enviar lembretes automáticos (24h antes)
- `GET /api/seed` - Popular banco de dados com dados iniciais

## Configurações do Banco de Dados

### Tabelas Principais
1. **customers** - Clientes cadastrados
2. **staff_users** - Administradores e barbeiros
3. **barbers** - Informações dos barbeiros
4. **services** - Serviços oferecidos
5. **appointments** - Agendamentos
6. **revenue** - Histórico de receitas
7. **notifications** - Log de notificações
8. **otp_sessions** - Sessões de autenticação
9. **barber_availability** - Disponibilidade dos barbeiros
10. **blocked_dates** - Datas bloqueadas (férias, feriados)

## Regras de Negócio

### Agendamentos
- Máximo de **30 dias** no futuro
- Horário: **seg-sex, 09:00-18:00** (pausa 12:00-13:00)
- Cancelamento: **mínimo 24h de antecedência**
- Taxa de cancelamento: **R$ 50,00**

### Notificações
- Confirmação imediata quando agendado
- Lembrete **24 horas antes** do compromisso
- Cancelamento/rejeição quando necessário
- Todas via WhatsApp via Baileys (100% Gratuito)
- Conectar WhatsApp: /admin/settings → WhatsApp → Gerar QR Code

## Monitoramento e Logs

### Ver Logs em Tempo Real
```bash
vercel logs --follow
```

### Verificar Status
```bash
vercel status
```

## Troubleshooting

### Notificações WhatsApp não estão sendo enviadas
- Acesse /admin/settings → WhatsApp
- Clique em "Gerar QR Code" e escaneie com seu WhatsApp
- Aguarde até que o status mude para "Conectado ✅"
- Se não conectar, recarregue a página e tente novamente

### WhatsApp está conectado mas mensagens não aparecem no cliente
- Verifique que o número do cliente está em formato internacional (Ex: 5511999999999)
- Verifique se o Baileys está recebendo corretamente os horários de lembretes
- Consulte os logs: `vercel logs --follow`

### Agendamentos não aparecem
- Confirme que o barbeiro está ativo (`is_active = true`)
- Verifique a disponibilidade do barbeiro para o dia/hora
- Confirme que não há bloqueios de data

### Admin não consegue fazer login
- Verifique se a senha está correta (hash SHA256)
- Confirme que o usuário tem `role = 'admin'`
- Verifique que `is_active = true`

## Próximas Melhorias

- Integração com pagamento online (Stripe/PIX)
- Aplicativo mobile nativo
- Dashboard com gráficos mais avançados
- Sistema de avaliação do barbeiro
- Marketing via email/SMS
- Integração com Google Calendar

## Suporte

Para dúvidas ou problemas, entre em contato através de:
- Email: admin@eliesio.com
- WhatsApp: +55 11 99999-9999
