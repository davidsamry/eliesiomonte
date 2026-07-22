# Configuração do WhatsApp com Baileys

## Requisitos

O sistema de notificações via WhatsApp já está pré-configurado. Para começar a usar:

### 1. Conectar seu WhatsApp Pessoal

1. Abra o painel admin: `/admin`
2. Clique no botão verde **"WhatsApp"** no canto superior direito
3. Isso abrirá a página `/settings` com a aba WhatsApp
4. Clique em **"Gerar QR Code"**
5. Um QR code grande aparecerá na tela
6. Escaneie com seu WhatsApp pessoal (câmera ou escaneador nativo)
7. Confirme a conexão no seu telefone
8. O status mudará para **"Conectado ✅"**

### 2. Tabela de Credenciais (Opcional - para Persistência)

Se quiser que a conexão seja mantida mesmo após reinicializações do servidor, execute este SQL no Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_credentials (
  id SERIAL PRIMARY KEY,
  credentials JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Como Funciona

- **Sem a tabela**: Conexão permanece enquanto o servidor está rodando. Perdida ao reiniciar.
- **Com a tabela**: Credenciais são salvas no Supabase. Conexão é restaurada automaticamente ao reiniciar.

### 4. Personalizando Mensagens

Acesse a aba **"Templates de Notificações"** no admin para customizar as mensagens que serão enviadas:

- **Confirmação**: Enviada imediatamente quando cliente confirma agendamento
- **Lembrete 24h**: Enviado 24 horas antes do compromisso
- **Lembrete 30min**: Enviado 30 minutos antes do compromisso

## Variáveis Disponíveis

Use estas variáveis nas suas mensagens (elas serão substituídas automaticamente):

- `{{customer_name}}` - Nome do cliente
- `{{barber_name}}` - Nome do barbeiro
- `{{service_name}}` - Nome do serviço
- `{{appointment_date}}` - Data do agendamento (dd/mm/yyyy)
- `{{appointment_time}}` - Horário do agendamento (HH:mm)

## Troubleshooting

### QR Code não aparece
- Aguarde 3-5 segundos e tente novamente
- Se persistir, reinicie o servidor

### Conectado mas mensagens não chegam
- Verifique se o WhatsApp está aberto e ativo no seu telefone
- Teste enviando uma mensagem de confirmação de agendamento

### Conexão cai frequentemente
- Execute o SQL acima para criar a tabela de persistência
- Isso evita perder a conexão ao reiniciar
