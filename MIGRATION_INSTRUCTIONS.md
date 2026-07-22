# Instruções de Execução das Migrations

## Migration: Adicionar coluna `amount` à tabela `appointments`

### Por que essa migration é necessária?

A funcionalidade de rastreamento de valores (receita) requer que cada agendamento tenha um campo `amount` que armazena o valor cobrado pela consulta. Sem essa coluna, o sistema não consegue salvar e rastrear os valores.

### Como executar a migration:

#### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse https://app.supabase.com e faça login na sua conta
2. Selecione seu projeto
3. Vá para **SQL Editor** (ícone de chave no menu lateral esquerdo)
4. Clique em **New Query**
5. Copie o conteúdo do arquivo `migrations/add-amount-to-appointments.sql`
6. Cole no editor de SQL
7. Clique em **Run** (ou Ctrl+Enter)
8. Aguarde a conclusão da migration

#### Opção 2: Via Supabase CLI

```bash
# Se tiver o Supabase CLI instalado
supabase db push
```

### O que a migration faz:

1. **Adiciona coluna `amount`** à tabela `appointments` com valor padrão 0
2. **Cria um índice** para melhor performance nas queries
3. **Atualiza automaticamente** os agendamentos existentes com o preço do serviço

### Verificar se a migration foi executada:

Após executar a migration, você pode verificar se funcionou corretamente:

1. No Supabase Dashboard, vá para **Table Editor**
2. Selecione a tabela `appointments`
3. Verifique se há uma coluna chamada `amount`
4. Os agendamentos existentes devem ter o valor do serviço na coluna `amount`

### Se algo der errado:

Se receber um erro ao executar a migration, verifique:

1. **Erro: Column already exists** - A coluna já foi criada. Isso é normal se a migration já foi executada.
2. **Erro de permissão** - Certifique-se de que está usando a conta do Supabase com permissão de admin
3. **Erro de sintaxe** - Copie novamente o SQL do arquivo, certificando-se de copiar tudo corretamente

## Status da Aplicação Após Migration

Após executar a migration com sucesso:

✅ Usuário pode editar o valor de cada agendamento no painel admin
✅ O valor é salvo e persiste após recarregar a página
✅ Quando um agendamento é marcado como "Completo", o valor é registrado na tabela de receita
✅ O KPI de "Receita" mostra o total de valores dos agendamentos completados

## Próximos Passos

1. Execute a migration acima
2. Recarregue o aplicativo
3. Vá para o painel admin
4. Edite um valor de agendamento e clique em "Salvar"
5. Recarregue a página - o valor deve persistir
6. Marque o agendamento como "Completo"
7. Verifique o KPI de "Receita" para confirmar que foi registrado
