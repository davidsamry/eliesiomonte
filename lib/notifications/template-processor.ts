/**
 * Processa templates de notificações substituindo variáveis
 */

interface TemplateVariables {
  customer_name?: string
  barber_name?: string
  service_name?: string
  appointment_date?: string
  appointment_time?: string
  cancellation_reason?: string
}

export function processNotificationTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let message = template

  // Substitui cada variável no template
  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      const placeholder = `{{${key}}}`
      message = message.replace(new RegExp(placeholder, 'g'), value)
    }
  })

  return message
}

/**
 * Extrai variáveis usadas em um template
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /{{(\w+)}}/g
  const matches = template.matchAll(regex)
  return Array.from(matches, (m) => m[1])
}

/**
 * Valida se todas as variáveis necessárias foram fornecidas
 */
export function validateTemplateVariables(
  template: string,
  variables: TemplateVariables
): { valid: boolean; missingVariables?: string[] } {
  const required = extractTemplateVariables(template)
  const missing = required.filter((variable) => !variables[variable as keyof TemplateVariables])

  if (missing.length > 0) {
    return { valid: false, missingVariables: missing }
  }

  return { valid: true }
}
