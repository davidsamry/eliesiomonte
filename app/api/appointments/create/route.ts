import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BARBERSHOP_ID } from '@/lib/config'
import { sendWhatsAppMessage } from '@/lib/whatsapp/baileys-connection'

export async function POST(request: NextRequest) {
  try {
    const {
      customerId,
      phoneNumber,
      barberName,
      barberId,
      serviceId,
      scheduledDateTime,
      notes,
    } = await request.json()

    if (!customerId || !barberId || !serviceId || !scheduledDateTime) {
      return NextResponse.json(
        { error: 'Dados do agendamento incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Obtém informações do serviço
    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .limit(1)

    // Verifica se o barbeiro já tem agendamento confirmado neste horário
    const { data: conflictingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .eq('status', 'confirmed')
      .eq('scheduled_datetime', scheduledDateTime)
      .limit(1)

    if (conflictingAppointment && conflictingAppointment.length > 0) {
      return NextResponse.json(
        { error: 'Este horário já foi agendado. Por favor, escolha outro horário.' },
        { status: 409 }
      )
    }

    // Cria o agendamento
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        customer_id: customerId,
        barber_id: barberId,
        service_id: serviceId,
        scheduled_datetime: scheduledDateTime,
        status: 'confirmed',
        notes,
        barbershop_id: BARBERSHOP_ID,
      })
      .select()

    if (error) throw error

    // Envia a confirmação por WhatsApp DIRETAMENTE (sem HTTP interno), usando o
    // socket compartilhado no globalThis. Não falha o agendamento se der erro.
    try {
      const dt = new Date(scheduledDateTime)
      const quando = dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      const serviceName = service?.[0]?.name || 'seu serviço'
      const mensagem =
        `Olá! Seu agendamento na *ELIESIO MONTE* foi confirmado ✅\n\n` +
        `💈 Serviço: ${serviceName}\n` +
        `✂️ Barbeiro: ${barberName || 'Barbeiro'}\n` +
        `📅 ${quando}\n\n` +
        `Qualquer imprevisto, é só chamar. Até breve!`

      const enviado = phoneNumber
        ? await sendWhatsAppMessage(phoneNumber, mensagem)
        : false

      console.log('[v0] Notificação de confirmação enviada?', enviado, '->', phoneNumber)

      // Registra no histórico de notificações do admin
      await supabase.from('notifications').insert({
        appointment_id: appointment?.[0]?.id,
        type: 'confirmation',
        phone_number: phoneNumber,
        message_content: mensagem,
        status: enviado ? 'sent' : 'failed',
        created_at: new Date().toISOString(),
      })
    } catch (notificationError) {
      console.error('[v0] Erro ao enviar notificação:', notificationError)
      // Não falha a requisição se a notificação não funcionar
    }

    return NextResponse.json(
      {
        message: 'Agendamento criado com sucesso',
        appointment: appointment?.[0],
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[v0] Erro ao criar agendamento:', errorMessage)
    console.error('[v0] Stack:', errorStack)
    return NextResponse.json(
      { 
        error: 'Falha ao criar agendamento',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
