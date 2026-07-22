import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processNotificationTemplate } from '@/lib/notifications/template-processor'

/**
 * API para obter um template de notificação processado com variáveis
 * Query params:
 * - type: 'confirmation' | 'reminder_24h' | 'reminder_30min'
 * - customer_name: nome do cliente
 * - barber_name: nome do barbeiro
 * - service_name: nome do serviço
 * - appointment_date: data do agendamento
 * - appointment_time: horário do agendamento
 * - cancellation_reason: motivo do cancelamento (opcional)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    if (!type) {
      return NextResponse.json({ error: 'Type é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()

    // Busca o template
    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('message')
      .eq('type', type)
      .single()

    if (error) {
      console.error('[v0] Template não encontrado:', error)
      // Retorna template padrão se não encontrar
      return NextResponse.json(
        {
          message: getDefaultTemplate(type),
          type,
          isDefault: true,
        },
        { status: 200 }
      )
    }

    // Extrai as variáveis dos query params
    const variables = {
      customer_name: searchParams.get('customer_name') || undefined,
      barber_name: searchParams.get('barber_name') || undefined,
      service_name: searchParams.get('service_name') || undefined,
      appointment_date: searchParams.get('appointment_date') || undefined,
      appointment_time: searchParams.get('appointment_time') || undefined,
      cancellation_reason: searchParams.get('cancellation_reason') || undefined,
    }

    // Processa o template com as variáveis
    const processedMessage = processNotificationTemplate(template.message, variables)

    return NextResponse.json(
      {
        message: processedMessage,
        type,
        isDefault: false,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Erro ao buscar template:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar template' },
      { status: 500 }
    )
  }
}

/**
 * Templates padrão caso nenhum customizado seja encontrado
 */
function getDefaultTemplate(type: string): string {
  const templates: Record<string, string> = {
    confirmation:
      'Olá {{customer_name}}! Seu agendamento com {{barber_name}} para {{service_name}} foi confirmado para {{appointment_date}} às {{appointment_time}}. Não se esqueça! 💈',
    reminder_24h:
      'Oi {{customer_name}}! Lembrete: seu agendamento com {{barber_name}} para {{service_name}} é amanhã às {{appointment_time}}. Aguardamos você! 😊',
    reminder_30min:
      'Oi {{customer_name}}! Faltam apenas 30 minutos para seu agendamento com {{barber_name}}. Estamos esperando! 💈',
  }

  return templates[type] || ''
}
