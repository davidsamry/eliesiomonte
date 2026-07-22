import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { format, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    const status = searchParams.get('status')
    const barberId = searchParams.get('barber_id')

    const supabase = await createClient()
    // Parseia a data como local para evitar bug de timezone (UTC midnight).
    // "2026-07-22" vira Date(2026, 6, 22) em vez de 2026-07-22T00:00:00Z
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    // Buscar agendamentos
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .gte('scheduled_datetime', startDate.toISOString())
      .lte('scheduled_datetime', endDate.toISOString())

    // Aplicar filtro de status se fornecido
    if (status) {
      query = query.eq('status', status)
    }

    // Aplicar filtro de barbeiro se fornecido
    if (barberId) {
      query = query.eq('barber_id', barberId)
    }

    const { data: appointments, error: appointmentsError } = await query.order('scheduled_datetime', { ascending: true })

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ appointments: [] })
    }

    // Buscar clientes, barbeiros e serviços relacionados
    const customerIds = [...new Set(appointments.map((a: any) => a.customer_id))]
    const barberIds = [...new Set(appointments.map((a: any) => a.barber_id))]
    const serviceIds = [...new Set(appointments.map((a: any) => a.service_id))]

    const [customersRes, barbersRes, servicesRes] = await Promise.all([
      customerIds.length > 0 ? supabase.from('customers').select('id, full_name, phone').in('id', customerIds) : Promise.resolve({ data: [] }),
      barberIds.length > 0 ? supabase.from('barbers').select('id, full_name').in('id', barberIds) : Promise.resolve({ data: [] }),
      serviceIds.length > 0 ? supabase.from('services').select('id, name, price, duration').in('id', serviceIds) : Promise.resolve({ data: [] }),
    ])

    const customers = Object.fromEntries(customersRes.data?.map((c: any) => [c.id, c]) || [])
    const barbers = Object.fromEntries(barbersRes.data?.map((b: any) => [b.id, b]) || [])
    const services = Object.fromEntries(servicesRes.data?.map((s: any) => [s.id, s]) || [])

    // Combinar dados
    const enrichedAppointments = appointments.map((apt: any) => ({
      ...apt,
      customers: customers[apt.customer_id] || null,
      barbers: barbers[apt.barber_id] || null,
      services: services[apt.service_id] || null,
    }))

    return NextResponse.json({ appointments: enrichedAppointments })
  } catch (error) {
    console.error('[v0] Erro ao obter agendamentos:', error)
    return NextResponse.json(
      { error: 'Falha ao obter agendamentos' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { appointmentId, status, notes, amount } = await request.json()

    console.log('[v0] PUT /api/admin/appointments - Input:', { appointmentId, status, notes, amount })

    if (!appointmentId || !status) {
      return NextResponse.json(
        { error: 'appointmentId e status são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Busca o agendamento atual para verificar status anterior
    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('status, barber_id, barbershop_id')
      .eq('id', appointmentId)
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .single()

    console.log('[v0] Fetch current appointment result:', { fetchError: !!fetchError, hasData: !!currentAppointment })

    if (fetchError || !currentAppointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Campo 'amount' é salvo quando fornecido
    if (amount !== undefined && amount !== null) {
      updateData.amount = parseFloat(amount.toString())
    }

    console.log('[v0] Update data:', updateData)

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')

    if (error) throw error

    // Se status mudou para "completed", registra na tabela de receita
    if (status === 'completed' && currentAppointment.status !== 'completed') {
      const revenueAmount = amount || 0

      if (revenueAmount > 0) {
        const { error: revenueError } = await supabase
          .from('revenue')
          .insert({
            appointment_id: appointmentId,
            barber_id: currentAppointment.barber_id,
            amount: parseFloat(revenueAmount.toString()),
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

    return NextResponse.json({ message: 'Agendamento atualizado' })
  } catch (error) {
    console.error('[v0] Erro ao atualizar agendamento:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'sem stack',
    })
    return NextResponse.json(
      { 
        error: 'Falha ao atualizar agendamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('id')

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar se o agendamento existe
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, barbershop_id, status')
      .eq('id', appointmentId)
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Deletar o agendamento
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')

    if (deleteError) throw deleteError

    console.log('[v0] Agendamento deletado:', appointmentId)
    return NextResponse.json({ message: 'Agendamento excluído com sucesso' })
  } catch (error) {
    console.error('[v0] Erro ao deletar agendamento:', error)
    return NextResponse.json(
      { 
        error: 'Falha ao excluir agendamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
