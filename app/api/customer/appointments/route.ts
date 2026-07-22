import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Obtém agendamentos do cliente
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        scheduled_datetime,
        status,
        notes,
        cancellation_reason,
        cancellation_fee,
        created_at,
        barber:barber_id(id, full_name),
        service:service_id(id, name, price, duration)
      `
      )
      .eq('customer_id', customerId)
      .order('scheduled_datetime', { ascending: false })

    if (error) throw error

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('[v0] Erro ao obter agendamentos:', error)
    return NextResponse.json(
      { error: 'Falha ao obter agendamentos' },
      { status: 500 }
    )
  }
}
