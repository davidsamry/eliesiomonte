import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface NotificationPayload {
  type: 'confirmation' | 'reminder' | 'cancellation'
  appointmentId: string
  phoneNumber: string
  customerName: string
  serviceName: string
  scheduledDateTime: string
  barberName: string
}

async function sendWhatsAppNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    // Construir mensagem de acordo com o tipo
    let message = ''
    
    const appointmentTime = new Date(payload.scheduledDateTime).toLocaleString('pt-BR')

    switch (payload.type) {
      case 'confirmation':
        message = `Olá ${payload.customerName}! 👋\n\nSeu agendamento foi confirmado! ✅\n\nServiço: ${payload.serviceName}\nBarbeiro: ${payload.barberName}\nData/Hora: ${appointmentTime}\n\nEsloc: ELIESIO MONTE\n\nAté breve! 💈`
        break
      case 'reminder':
        message = `Olá ${payload.customerName}! 🔔\n\nLembrete de agendamento amanhã!\n\nServiço: ${payload.serviceName}\nBarbeiro: ${payload.barberName}\nHora: ${appointmentTime}\n\nEsloc: ELIESIO MONTE\n\nConfirme sua presença! 💈`
        break
      case 'cancellation':
        message = `Olá ${payload.customerName}! 😢\n\nSeu agendamento foi cancelado.\n\nServiço: ${payload.serviceName}\nData/Hora: ${appointmentTime}\n\nPara reagendar, acesse nosso portal ou nos contate! 💈`
        break
    }

    // Aqui você integraria com um serviço de WhatsApp (Twilio, WhatsApp Business API, etc)
    // Por enquanto, apenas simulamos o envio
    console.log(`[v0] WhatsApp Notification sent to ${payload.phoneNumber}: ${message}`)

    // Registra no banco de dados
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      appointment_id: payload.appointmentId,
      type: payload.type,
      phone_number: payload.phoneNumber,
      message,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error('[v0] Erro ao enviar notificação:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NotificationPayload

    // Valida os dados
    if (!payload.appointmentId || !payload.phoneNumber) {
      return NextResponse.json(
        { error: 'appointmentId e phoneNumber são obrigatórios' },
        { status: 400 }
      )
    }

    // Envia a notificação
    const success = await sendWhatsAppNotification(payload)

    if (!success) {
      return NextResponse.json(
        { error: 'Falha ao enviar notificação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Notificação enviada com sucesso',
    })
  } catch (error) {
    console.error('[v0] Erro na API de notificações:', error)
    return NextResponse.json(
      { error: 'Falha ao processar notificação' },
      { status: 500 }
    )
  }
}
