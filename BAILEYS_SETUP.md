# 🤖 Baileys WhatsApp - Setup Completo

## O que é Baileys?

**Baileys** é uma biblioteca Node.js que automatiza interações com WhatsApp Web. É:
- ✅ 100% Gratuito
- ✅ Sem limites de mensagens
- ✅ Sem necessidade de aprovação
- ✅ Funciona com sua própria conta WhatsApp

## 📋 Pré-requisitos

- Uma conta WhatsApp ativa
- Node.js 16+ (seu servidor já tem)

## 🚀 Instalação

### Passo 1: Dependências Já Instaladas
As dependências já foram instaladas:
```bash
pnpm add @whiskeysockets/baileys axios sharp
```

### Passo 2: Acessar o Admin
1. Faça login em `/admin`
2. Vá para a aba **"Configurações"** (Settings)
3. Clique em **"WhatsApp"** ou procure pela seção de WhatsApp

### Passo 3: Escanear QR Code
1. Clique no botão **"Gerar QR Code"**
2. Você verá um QR code na tela
3. **Pegue seu WhatsApp pessoal e escaneie este QR code**
4. Autorize o acesso quando solicitado

### Passo 4: Confirmar Conexão
Após escanear, você verá:
- ✅ Status mudará para "Conectado"
- ✅ A mensagem "WhatsApp conectado com sucesso!"

## ✉️ Como Funciona

### Notificações Automáticas
Seu sistema enviará 3 tipos de notificação:

1. **Confirmação de Agendamento** (imediato)
   - Quando cliente marca um agendamento
   - Confirma data, hora e barbeiro

2. **Lembrete 24 Horas Antes** (automático)
   - Enviado 24 horas antes do agendamento
   - Pede confirmação de presença

3. **Lembrete 30 Minutos Antes** (automático)
   - Avisou cliente que está chegando a hora
   - Reduz faltas

### Exemplo de Mensagem Enviada
```
✅ Seu agendamento foi confirmado!

📋 Serviço: Corte Simples
💇 Barbeiro: Eliesio Monte
📅 Data/Hora: 21/07/2026 - 09:00

Até logo! 💇‍♂️
```

## 🔧 Troubleshooting

### "QR code não aparece"
- Espere 5-10 segundos
- Clique "Gerar QR Code" novamente
- Certifique-se que seu WhatsApp está aberto no celular

### "Mensagens não são enviadas"
1. Verifique se o status está "Conectado" ✅
2. Clique "Gerar QR Code" novamente para reconectar
3. Certifique-se que o número do cliente está correto

### "Perdi a conexão"
- Simplesmente escaneie um novo QR code
- A reconexão é automática

### "Erro: Baileys não está conectado"
- Acesse `/admin/settings` → WhatsApp
- Clique "Gerar QR Code"
- Escaneie com seu WhatsApp pessoal

## ⚙️ Configuração Avançada

### Variáveis de Ambiente (Opcional)
Você NÃO precisa de variáveis de ambiente para Baileys! A conexão é armazenada localmente.

Mas para segurança em produção, pode adicionar:
```
CRON_SECRET=sua_senha_aleatoria_aqui
```

Para autorizar o job de notificações automáticas.

## 🚨 Limitações

- Não funciona offline
- Se desligar o servidor, as notificações não serão enviadas
- Recomenda-se deixar o servidor sempre rodando

## ✅ Próximos Passos

1. ✅ Instalar Baileys (já feito)
2. ✅ Escanear QR Code no `/admin/settings`
3. ⏭️ Fazer um teste: criar um agendamento e receber mensagem WhatsApp
4. ⏭️ Configurar job de notificações automáticas (cron)

## 📞 Teste Manual

Para testar se está funcionando:

1. Acesse `/api/whatsapp/notify` (POST)
2. Envie este JSON:
```json
{
  "type": "confirmation",
  "appointmentId": "123",
  "phoneNumber": "11999999999",
  "customerName": "João",
  "serviceName": "Corte Simples",
  "scheduledDateTime": "2026-07-21T09:00:00",
  "barberName": "Eliesio Monte"
}
```

Você receberá a mensagem no WhatsApp em segundos!

## 🎉 Sucesso!

Agora você tem notificações automáticas de WhatsApp 100% gratuitas! 🎊
