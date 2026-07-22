# Guia de Configuração - Rastreamento de Receita

## Problema Identificado

O botão "Salvar" estava mostrando mensagem de sucesso, mas os valores não eram persistidos após recarregar a página. Isso ocorria porque a coluna `amount` não existia na tabela `appointments` do banco de dados Supabase.

## Solução

Criamos uma migration SQL que adiciona a coluna `amount` à tabela `appointments`. Agora o sistema está pronto para salvar e rastrear valores.

## Passos para Implementação

### Passo 1: Executar a Migration no Supabase

**⚠️ IMPORTANTE: Você DEVE executar este SQL no Supabase para que o sistema funcione**

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** (ícone de chave no menu lateral)
4. Clique em **New Query**
5. Copie o SQL abaixo:

```sql
-- Migration: Add amount column to appointments table
ALTER TABLE appointments
ADD COLUMN amount numeric DEFAULT 0 NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN appointments.amount IS 'The amount/price charged for this appointment in BRL';

-- Create index for faster queries on amount
CREATE INDEX idx_appointments_amount ON appointments(amount);

-- Update existing appointments with the service price as default
UPDATE appointments
SET amount = (
  SELECT price FROM services WHERE services.id = appointments.service_id
)
WHERE amount = 0 AND service_id IS NOT NULL;
```

6. Cole no editor do Supabase
7. Clique em **Run** (ou Ctrl+Enter)
8. Aguarde a conclusão (deve aparecer "Query executed successfully")

### Passo 2: Verificar se a Migration Funcionou

1. No Supabase Dashboard, vá para **Table Editor**
2. Selecione a tabela `appointments`
3. Verifique se há uma coluna chamada `amount`
4. Os agendamentos existentes devem ter valores (preço do serviço)

### Passo 3: Testar o Sistema

1. Recarregue o aplicativo admin
2. Vá até a aba "Agendamentos"
3. Edite o valor de um agendamento (ex: 50.00 → 75.50)
4. Clique em "Salvar"
5. Você deve ver: **"Agendamento atualizado com sucesso!"** (em verde)
6. **RECARREGUE A PÁGINA** - o valor deve permanecer como 75.50
7. Marque o agendamento como "Completo"
8. Vá até o topo do painel e verifique o KPI "Receita" - deve mostrar o valor salvo

## Funcionalidades Após a Migration

✅ **Editar Valores**: Clique no campo de valor e altere conforme necessário
✅ **Salvar com Feedback**: Botão "Salvar" mostra mensagem de sucesso/erro
✅ **Persistência**: Valores são salvos permanentemente no banco de dados
✅ **Receita Automática**: Quando agendamento é marcado como "Completo", valor é registrado automaticamente
✅ **KPI em Tempo Real**: Dashboard mostra total de receita do dia

## Se Receber um Erro

### Erro: "Column already exists"
- Normal se a migration já foi executada
- Significa que a coluna `amount` já existe

### Erro: "Permission denied"
- Certifique-se de que está logado com a conta correta no Supabase
- Use a conta que criou o projeto

### Erro de Sintaxe
- Copie novamente o SQL com cuidado
- Certifique-se de que não há caracteres especiais faltando

## Fluxo Completo de Uso

1. Admin acessa o painel em `/admin`
2. Clica na aba "Agendamentos"
3. Vê a lista de agendamentos do dia com campos de valor
4. Edita o valor do agendamento (ex: 50.00)
5. Clica em "Salvar"
6. Vê mensagem verde de sucesso
7. Pode mudar o status para "Completo"
8. O valor é automaticamente registrado na tabela de receita
9. KPI "Receita" atualiza em tempo real

## Campos de Cada Agendamento

- **Horário e Serviço**: Ex "10:00 - Agendamento"
- **Cliente**: Nome do cliente
- **Barbeiro**: Nome do barbeiro
- **Valor (R$)**: Campo editável para inserir ou alterar o valor
- **Botão Salvar**: Azul, salva o valor e retorna feedback
- **Status**: Dropdown com opções (Pendente, Confirmado, Completo, Cancelado)
- **Notas**: Informações adicionais do agendamento

## Próximas Implementações (Futuro)

- [ ] Histórico de valores alterados
- [ ] Validação de valores mínimos/máximos
- [ ] Relatório de receita por período
- [ ] Receita por barbeiro
- [ ] Desconto automático para clientes frequentes
