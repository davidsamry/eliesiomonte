import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const {
      customer_id,
      barber_id,
      service_id,
      scheduled_datetime,
      notes,
    } = await request.json()

    if (!customer_id || !barber_id || !service_id || !scheduled_datetime) {
      return NextResponse.json(
        { error: 'Cliente, barbeiro, serviço e data/hora são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o cliente existe
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflito de agendamento
    const { data: conflictingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barber_id)
      .eq('status', 'confirmed')
      .lte('scheduled_datetime', scheduled_datetime)
      .gte('scheduled_datetime', new Date(new Date(scheduled_datetime).getTime() - 2 * 60 * 60 * 1000).toISOString())
      .single()

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'Barbeiro já tem agendamento neste horário' },
        { status: 409 }
      )
    }

    // Criar agendamento
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        customer_id,
        barber_id,
        service_id,
        scheduled_datetime,
        notes,
        status: 'confirmed',
        barbershop_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      .select()

    if (error) throw error

    return NextResponse.json(appointment[0], { status: 201 })
  } catch (error) {
    console.error('[v0] Erro ao criar agendamento manual:', error)
    return NextResponse.json(
      { error: 'Falha ao criar agendamento manual' },
      { status: 500 }
    )
  }
}
