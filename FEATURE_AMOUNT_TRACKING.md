# Funcionalidade de Rastreamento de Valores - Agendamentos e Receita

## Descrição
Quando um agendamento é marcado como "Completo" (Realizado), o valor do serviço é automaticamente registrado na tabela de receita (`revenue`). Também é possível editar o valor do agendamento antes de finalizá-lo.

## Funcionalidades Implementadas

### 1. Campo de Valor nos Agendamentos
- Cada agendamento agora exibe um campo "Valor (R$)" com input editável
- O valor padrão é o preço do serviço contratado
- Pode ser alterado manualmente antes de marcar como completo

### 2. Registro Automático na Receita
- Quando o status muda para "Completo" (completed), o valor é registrado automaticamente
- A receita é registrada na tabela `revenue` com:
  - **appointment_id**: ID do agendamento
  - **barber_id**: ID do barbeiro
  - **amount**: Valor do agendamento/serviço
  - **date**: Data atual
  - **type**: "service"
  - **barbershop_id**: ID da barbearia
  - **payment_method**: "cash"

### 3. Dashboard de Receita
- O KPI "Receita" no dashboard atualiza automaticamente
- Mostra a soma de todos os valores dos agendamentos completos do dia

## Como Usar

### Editar Valor do Agendamento
1. No Admin → Aba "Agendamentos"
2. Localize o agendamento que deseja editar
3. Altere o valor no campo "Valor (R$)"
4. Marque o status como "Completo"

### Marcar Agendamento como Completo
1. No Admin → Aba "Agendamentos"
2. Clique no dropdown de status
3. Selecione "Completo"
4. O valor será registrado automaticamente na receita

## Banco de Dados

### Adição de Coluna (Migration)
Para adicionar o suporte a edição de valores, foi criado um script SQL em:
`scripts/add-amount-to-appointments.sql`

**Executar a migration (via Supabase SQL Editor):**
```sql
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

UPDATE public.appointments
SET amount = (
  SELECT price FROM public.services 
  WHERE services.id = appointments.service_id
)
WHERE amount = 0 AND service_id IS NOT NULL;
```

### Tabelas Envolvidas
- **appointments**: Nova coluna `amount` (numeric)
- **revenue**: Registra as transações quando agendamentos são completos

## APIs Modificadas

### PUT `/api/appointments/[id]`
**Parâmetros Adicionados:**
- `amount` (number, opcional): Valor customizado para o agendamento

**Comportamento:**
- Quando `status` muda para "completed", registra automaticamente na tabela `revenue`
- Usa o valor passado em `amount` ou valor padrão do serviço

## Componentes Modificados

1. **admin-dashboard.tsx**
   - Função `handleStatusUpdate` agora suporta `amount`
   - UI mostra campo input para editar valor
   - Passa automaticamente o valor quando muda status para "Completo"

2. **appointment-editor.tsx**
   - Adicionado campo input para "Valor (R$)"
   - Permite editar o valor antes de salvar

3. **app/api/appointments/[id]/route.ts**
   - API agora registra automaticamente na tabela `revenue` quando status muda para "completed"
   - Valida se há valor antes de registrar

## Exemplo de Fluxo

1. Admin visualiza agendamento: "14:00 - Corte Premium - Carlos Silva - R$ 80.00"
2. Admin pode editar o valor para R$ 100.00 (ex: cliente pagou extra por rush)
3. Admin seleciona status "Completo"
4. Sistema automaticamente:
   - Atualiza agendamento com status "completed" e amount "100"
   - Registra na tabela `revenue` com amount=100
   - KPI de "Receita" no dashboard atualiza para "R$ 100.00"

## Notas Importantes

- O registro na receita ocorre apenas quando transitando para "completed"
- Se o agendamento já estava "completed", não cria novo registro de receita
- É possível editar o valor manualmente no campo input
- O sistema usa o valor do serviço como padrão, mas permite override
