import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addHours, format } from 'date-fns'

/**
 * Job para enviar lembretes de agendamentos
 * Envia notificações para agendamentos que ocorrem em 24 horas
 * Pode ser chamado via cron job ou manualmente
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica se há um token de autenticação (para proteção)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Calcula range de 24 horas
    const now = new Date()
    const tomorrow = addHours(now, 24)

    // Busca agendamentos para amanhã que ainda não receberam lembrete
    const { data: appointmentsToRemind, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        scheduled_datetime,
        customer:customer_id(id, full_name, phone),
        service:service_id(id, name),
        barber:barber_id(id, full_name)
      `
      )
      .gte('scheduled_datetime', now.toISOString())
      .lt('scheduled_datetime', tomorrow.toISOString())
      .eq('status', 'confirmed')

    if (fetchError) {
      console.error('[v0] Erro ao buscar agendamentos para lembrete:', fetchError)
      throw fetchError
    }

    if (!appointmentsToRemind || appointmentsToRemind.length === 0) {
      return NextResponse.json({
        message: 'Nenhum agendamento para lembrete',
        count: 0,
      })
    }

    // Envia notificação para cada agendamento
    let sentCount = 0
    for (const apt of appointmentsToRemind as any) {
      if (!apt.customer || !apt.customer.phone) continue

      try {
        // Envia notificação via API interna
        const reminderResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'reminder',
              appointmentId: apt.id,
              phoneNumber: apt.customer.phone,
              customerName: apt.customer.full_name,
              serviceName: apt.service.name,
              scheduledDateTime: apt.scheduled_datetime,
              barberName: apt.barber.full_name,
            }),
          }
        )

        if (reminderResponse.ok) {
          sentCount++
          console.log(
            `[v0] Lembrete enviado para ${apt.customer.full_name} (${apt.customer.phone})`
          )
        }
      } catch (err) {
        console.error('[v0] Erro ao enviar lembrete:', err)
      }
    }

    return NextResponse.json({
      message: 'Lembretes enviados com sucesso',
      count: sentCount,
      total: appointmentsToRemind.length,
    })
  } catch (error) {
    console.error('[v0] Erro no job de lembretes:', error)
    return NextResponse.json(
      { error: 'Falha ao executar job de lembretes' },
      { status: 500 }
    )
  }
}

// GET também é suportado para testes
export async function GET(request: NextRequest) {
  return POST(request)
}
