import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const {
      status,
      barber_id,
      service_id,
      scheduled_datetime,
      notes,
      amount,
    } = await request.json()

    // Primeiro, busca o agendamento atual para verificar o status anterior
    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('status, barber_id')
      .eq('id', id)
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .single()

    if (fetchError || !currentAppointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status) updateData.status = status
    if (barber_id) updateData.barber_id = barber_id
    if (service_id) updateData.service_id = service_id
    if (scheduled_datetime) updateData.scheduled_datetime = scheduled_datetime
    if (notes !== undefined) updateData.notes = notes
    // Amount só será atualizado se foi fornecido - não força se coluna não existe
    if (amount !== undefined && amount !== null) {
      updateData.amount = parseFloat(amount.toString())
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .select()

    if (error) throw error
    if (!appointment || appointment.length === 0) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Se status mudou para "completed", registra na tabela de receita
    if (status === 'completed' && currentAppointment.status !== 'completed') {
      const revenueAmount = amount || 0
      
      if (revenueAmount > 0) {
        const { error: revenueError } = await supabase
          .from('revenue')
          .insert({
            appointment_id: id,
            barber_id: currentAppointment.barber_id,
            amount: revenueAmount,
            date: new Date().toISOString().split('T')[0],
            type: 'service',
            barbershop_id: '550e8400-e29b-41d4-a716-446655440000',
            payment_method: 'cash',
          })

        if (revenueError) {
          console.error('[v0] Erro ao registrar receita:', revenueError)
        }
      }
    }

    return NextResponse.json(appointment[0])
  } catch (error) {
    console.error('[v0] Erro ao atualizar agendamento:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar agendamento' },
      { status: 500 }
    )
  }
}
