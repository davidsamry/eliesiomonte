/**
 * Configuração central da barbearia.
 *
 * O ID da barbearia vem da variável de ambiente BARBERSHOP_ID. Mantém-se o
 * UUID padrão (ELIESIO MONTE) como fallback para não quebrar instalações atuais.
 * Para outra barbearia / multi-tenant, basta definir BARBERSHOP_ID no ambiente.
 */
export const BARBERSHOP_ID =
  process.env.BARBERSHOP_ID || '550e8400-e29b-41d4-a716-446655440000'
