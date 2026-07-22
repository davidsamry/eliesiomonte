import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')

    const supabase = await createClient()
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    // Total de receita do dia (tabela revenue + amounts dos agendamentos completed)
    const { data: revenueData, error: revenueError } = await supabase
      .from('revenue')
      .select('amount')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))

    if (revenueError) throw revenueError
    
    // Também somar amounts dos agendamentos completed do dia
    const { data: appointmentAmounts, error: appointmentAmountsError } = await supabase
      .from('appointments')
      .select('amount')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .eq('status', 'completed')
      .gte('scheduled_datetime', startDate.toISOString())
      .lte('scheduled_datetime', endDate.toISOString())
    
    if (appointmentAmountsError) throw appointmentAmountsError
    
    const revenueFromTable = revenueData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
    const revenueFromAppointments = appointmentAmounts?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
    const totalRevenue = revenueFromTable + revenueFromAppointments

    // Total de agendamentos do dia
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, status')
      .gte('scheduled_datetime', startDate.toISOString())
      .lte('scheduled_datetime', endDate.toISOString())

    if (appointmentsError) throw appointmentsError
    const totalAppointments = appointmentsData?.length || 0
    const completedAppointments =
      appointmentsData?.filter((a) => a.status === 'completed').length || 0
    const cancelledAppointments =
      appointmentsData?.filter((a) => a.status === 'cancelled').length || 0

    // Taxa de ocupação (agendamentos confirmados/completados vs total de slots possíveis)
    const { data: barbers } = await supabase.from('barbers').select('id')
    const totalBarbers = barbers?.length || 1
    const slotsPerBarber = 8 // Aprox 8 slots de 1h por barbeiro (9h-18h com pausa)
    const totalSlots = totalBarbers * slotsPerBarber
    const occupancyRate = totalSlots > 0 ? (totalAppointments / totalSlots) * 100 : 0

    // Clientes do dia
    const { data: customersData } = await supabase
      .from('appointments')
      .select('customer_id')
      .gte('scheduled_datetime', startDate.toISOString())
      .lte('scheduled_datetime', endDate.toISOString())
      .in('status', ['confirmed', 'completed'])

    const uniqueCustomers = new Set(customersData?.map((a) => a.customer_id) || []).size

    return NextResponse.json({
      date: dateStr,
      totalRevenue,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      occupancyRate: Math.round(occupancyRate),
      uniqueCustomers,
    })
  } catch (error) {
    console.error('[v0] Erro ao obter KPIs:', error)
    return NextResponse.json({ error: 'Falha ao obter KPIs' }, { status: 500 })
  }
}
