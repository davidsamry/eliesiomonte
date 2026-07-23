import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BARBERSHOP_ID } from '@/lib/config'

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

    // Envia notificação de confirmação via API do Baileys (opcional).
    // Usa o servidor local (mesmo container) — fetch com URL relativa não
    // funciona no lado do servidor (Node não tem origem base).
    try {
      const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}`
      await fetch(`${baseUrl}/api/whatsapp/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'confirmation',
          appointmentId: appointment?.[0]?.id,
          phoneNumber,
          customerName: 'Cliente',
          serviceName: service?.[0]?.name || 'Serviço',
          scheduledDateTime,
          barberName: barberName || 'Barbeiro',
        }),
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
