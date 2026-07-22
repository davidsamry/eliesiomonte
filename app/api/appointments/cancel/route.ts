import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CANCELLATION_FEE = 50.0 // Taxa fixa de cancelamento

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, reason } = await request.json()

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Obtém o agendamento
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .limit(1)

    if (fetchError) throw fetchError
    if (!appointment || appointment.length === 0) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    const appt = appointment[0]

    // Verifica se pode cancelar (deve ter pelo menos 24 horas)
    const scheduledDate = new Date(appt.scheduled_datetime)
    const now = new Date()
    const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntil < 24) {
      return NextResponse.json(
        {
          error: 'Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência',
          hoursRemaining: hoursUntil,
        },
        { status: 400 }
      )
    }

    // Atualiza o agendamento
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || 'Cliente solicitou',
        cancellation_fee: CANCELLATION_FEE,
      })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    // Registra na receita (taxa de cancelamento)
    await supabase.from('revenue').insert({
      barber_id: appt.barber_id,
      appointment_id: appointmentId,
      amount: CANCELLATION_FEE,
      type: 'cancellation_fee',
      payment_method: 'cash',
      date: new Date().toISOString().split('T')[0],
      barbershop_id: appt.barbershop_id,
    })

    return NextResponse.json(
      {
        message: 'Agendamento cancelado com sucesso',
        cancellationFee: CANCELLATION_FEE,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Erro ao cancelar agendamento:', error)
    return NextResponse.json(
      { error: 'Falha ao cancelar agendamento' },
      { status: 500 }
    )
  }
}
