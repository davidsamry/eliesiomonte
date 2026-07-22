import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Job agendado para enviar notificações automáticas:
 * - Confirmação quando agendamento é criado
 * - Lembrete 24 horas antes
 * - Lembrete 30 minutos antes
 *
 * Deve ser chamado por um cron job (ex: Vercel Crons, Upstash, etc)
 */

async function sendConfirmationNotifications() {
  const supabase = await createClient()

  const { data: appointmentsData, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      customer_id,
      scheduled_datetime,
      status,
      services!inner(name),
      barbers!inner(full_name),
      customers!inner(full_name, phone)
    `
    )
    .eq('status', 'confirmed')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .is('notification_confirmation_sent', false)

  const appointments = appointmentsData as any

  if (error) {
    console.error('[v0] Erro ao buscar agendamentos para confirmação:', error)
    return
  }

  console.log(`[v0] Enviando ${appointments?.length || 0} notificações de confirmação`)

  for (const apt of appointments || []) {
    try {
      const appointmentDate = new Date(apt.scheduled_datetime)
      const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
      const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const templateUrl = new URL(
        '/api/notification-templates/get',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      )
      templateUrl.searchParams.set('type', 'confirmation')
      templateUrl.searchParams.set('customer_name', apt.customers.full_name)
      templateUrl.searchParams.set('barber_name', apt.barbers.full_name)
      templateUrl.searchParams.set('service_name', apt.services.name)
      templateUrl.searchParams.set('appointment_date', formattedDate)
      templateUrl.searchParams.set('appointment_time', formattedTime)

      const templateResponse = await fetch(templateUrl.toString())
      const { message: notificationMessage } = await templateResponse.json()

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'confirmation',
            appointmentId: apt.id,
            phoneNumber: apt.customers.phone,
            message: notificationMessage,
          }),
        }
      )

      if (response.ok) {
        await supabase
          .from('appointments')
          .update({ notification_confirmation_sent: true })
          .eq('id', apt.id)
      }
    } catch (error) {
      console.error(`[v0] Erro ao enviar notificação para ${apt.id}:`, error)
    }
  }
}

async function send24hReminders() {
  const supabase = await createClient()

  const now = new Date()
  const in23hours = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in25hours = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: appointmentsData, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      customer_id,
      scheduled_datetime,
      status,
      services!inner(name),
      barbers!inner(full_name),
      customers!inner(full_name, phone)
    `
    )
    .eq('status', 'confirmed')
    .gte('scheduled_datetime', in23hours.toISOString())
    .lte('scheduled_datetime', in25hours.toISOString())
    .is('notification_24h_sent', false)

  const appointments = appointmentsData as any

  if (error) {
    console.error('[v0] Erro ao buscar agendamentos para lembrete 24h:', error)
    return
  }

  console.log(`[v0] Enviando ${appointments?.length || 0} lembretes de 24 horas`)

  for (const apt of appointments || []) {
    try {
      const appointmentDate = new Date(apt.scheduled_datetime)
      const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
      const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const templateUrl = new URL(
        '/api/notification-templates/get',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      )
      templateUrl.searchParams.set('type', 'reminder_24h')
      templateUrl.searchParams.set('customer_name', apt.customers.full_name)
      templateUrl.searchParams.set('barber_name', apt.barbers.full_name)
      templateUrl.searchParams.set('service_name', apt.services.name)
      templateUrl.searchParams.set('appointment_date', formattedDate)
      templateUrl.searchParams.set('appointment_time', formattedTime)

      const templateResponse = await fetch(templateUrl.toString())
      const { message: notificationMessage } = await templateResponse.json()

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reminder_24h',
            appointmentId: apt.id,
            phoneNumber: apt.customers.phone,
            message: notificationMessage,
          }),
        }
      )

      if (response.ok) {
        await supabase
          .from('appointments')
          .update({ notification_24h_sent: true })
          .eq('id', apt.id)
      }
    } catch (error) {
      console.error(`[v0] Erro ao enviar lembrete 24h para ${apt.id}:`, error)
    }
  }
}

async function send30minReminders() {
  const supabase = await createClient()

  const now = new Date()
  const in30min = new Date(now.getTime() + 30 * 60 * 1000)
  const in35min = new Date(now.getTime() + 35 * 60 * 1000)

  const { data: appointmentsData, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      customer_id,
      scheduled_datetime,
      status,
      services!inner(name),
      barbers!inner(full_name),
      customers!inner(full_name, phone)
    `
    )
    .eq('status', 'confirmed')
    .gte('scheduled_datetime', in30min.toISOString())
    .lte('scheduled_datetime', in35min.toISOString())
    .is('notification_30min_sent', false)

  const appointments = appointmentsData as any

  if (error) {
    console.error('[v0] Erro ao buscar agendamentos para lembrete 30min:', error)
    return
  }

  console.log(`[v0] Enviando ${appointments?.length || 0} lembretes de 30 minutos`)

  for (const apt of appointments || []) {
    try {
      const appointmentDate = new Date(apt.scheduled_datetime)
      const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
      const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const templateUrl = new URL(
        '/api/notification-templates/get',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      )
      templateUrl.searchParams.set('type', 'reminder_30min')
      templateUrl.searchParams.set('customer_name', apt.customers.full_name)
      templateUrl.searchParams.set('barber_name', apt.barbers.full_name)
      templateUrl.searchParams.set('service_name', apt.services.name)
      templateUrl.searchParams.set('appointment_date', formattedDate)
      templateUrl.searchParams.set('appointment_time', formattedTime)

      const templateResponse = await fetch(templateUrl.toString())
      const { message: notificationMessage } = await templateResponse.json()

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reminder_30min',
            appointmentId: apt.id,
            phoneNumber: apt.customers.phone,
            message: notificationMessage,
          }),
        }
      )

      if (response.ok) {
        await supabase
          .from('appointments')
          .update({ notification_30min_sent: true })
          .eq('id', apt.id)
      }
    } catch (error) {
      console.error(`[v0] Erro ao enviar lembrete 30min para ${apt.id}:`, error)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('[v0] Iniciando job de notificações agendadas')

    await sendConfirmationNotifications()
    await send24hReminders()
    await send30minReminders()

    return NextResponse.json({
      message: 'Notificações processadas com sucesso',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Erro no job de notificações:', error)
    return NextResponse.json(
      { error: 'Falha ao processar notificações' },
      { status: 500 }
    )
  }
}
